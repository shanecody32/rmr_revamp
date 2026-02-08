use sea_orm::*;
use sea_orm::PaginatorTrait;
use crate::utils::slug::{slug_it, sanitize_name};
use crate::utils::similarity::keys::{soundex, metaphone, double_metaphone};
use crate::models::*;
use crate::job_state::{BackfillJobState, EntityJobState};
use std::sync::Arc;
use tokio::sync::RwLock;

async fn update_progress(
    progress: &Arc<RwLock<BackfillJobState>>,
    entity_name: &str,
    processed: i32,
    total: i32,
    completed: bool,
    error: Option<String>,
) {
    let mut p = progress.write().await;
    p.current_entity = entity_name.to_string();

    if let Some(entity_p) = p.entities.iter_mut().find(|e| e.entity == entity_name) {
        entity_p.processed = processed;
        entity_p.total = total;
        entity_p.completed = completed;
        entity_p.error = error;
    } else {
        p.entities.push(EntityJobState {
            entity: entity_name.to_string(),
            processed,
            total,
            completed,
            error,
        });
    }

    // Calculate overall progress (based on 9 expected entities)
    let expected_entities = 9.0;
    let sum_progress: f32 = p.entities.iter().map(|e| {
        if e.total > 0 {
            (e.processed as f32 / e.total as f32) * 100.0
        } else if e.completed {
            100.0
        } else {
            0.0
        }
    }).sum();
    p.overall_progress = sum_progress / expected_entities;
}

pub async fn backfill_aliases(db: &DatabaseConnection, progress: Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    {
        let mut p = progress.write().await;
        p.is_running = true;
        p.overall_progress = 0.0;
        p.entities.clear();
        p.last_error = None;
        p.last_started_at = Some(chrono::Utc::now());
        p.last_finished_at = None;
    }

    if let Err(e) = backfill_band_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Band error: {}", e));
    }
    if let Err(e) = backfill_album_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Album error: {}", e));
    }
    if let Err(e) = backfill_song_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Song error: {}", e));
    }
    if let Err(e) = backfill_label_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Label error: {}", e));
    }
    if let Err(e) = backfill_state_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("State error: {}", e));
    }
    if let Err(e) = backfill_city_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("City error: {}", e));
    }
    if let Err(e) = backfill_postal_code_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Postal Code error: {}", e));
    }
    if let Err(e) = backfill_radio_station_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Radio Station error: {}", e));
    }
    if let Err(e) = backfill_staff_member_aliases(db, &progress).await {
        progress.write().await.last_error = Some(format!("Staff Member error: {}", e));
    }

    let mut p = progress.write().await;
    p.is_running = false;
    p.overall_progress = 100.0;
    p.last_finished_at = Some(chrono::Utc::now());
    Ok(())
}

async fn backfill_band_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = bands::Entity::find().count(db).await? as i32;
    update_progress(progress, "Bands", 0, total, false, None).await;

    let paginator = bands::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for band in batch {
            let slug = slug_it(&band.name);
            let sanitized = sanitize_name(&band.name);
            let s_key = soundex(&band.name);
            let p_key = metaphone(&band.name);
            let (dm_p, dm_a) = double_metaphone(&band.name);

            // Update main band slug if missing
            if band.slug.is_none() {
                let mut active: bands::ActiveModel = band.clone().into();
                active.slug = Set(Some(slug.clone()));
                active.update(db).await?;
            }

            // Ensure alias exists
            let alias = band_aliases::Entity::find()
                .filter(band_aliases::Column::BandId.eq(band.id))
                .filter(band_aliases::Column::AliasKey.eq(&band.name))
                .one(db)
                .await?;

            let mut active_alias: band_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                band_aliases::ActiveModel {
                    band_id: Set(band.id),
                    alias_key: Set(band.name.clone()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 10 == 0 || i as i32 == total {
                update_progress(progress, "Bands", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Bands", total, total, true, None).await;
    Ok(())
}

async fn backfill_album_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = albums::Entity::find().count(db).await? as i32;
    update_progress(progress, "Albums", 0, total, false, None).await;

    let paginator = albums::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for album in batch {
            let name = album.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 10 == 0 || i as i32 == total {
                    update_progress(progress, "Albums", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            // Find primary band for this album to set parent_id (band_id)
            let band = album.find_related(bands::Entity).one(db).await?;
            let band_id = band.map(|b| b.id).unwrap_or(0);

            let alias = album_aliases::Entity::find()
                .filter(album_aliases::Column::AlbumId.eq(album.id))
                .filter(album_aliases::Column::AliasKey.eq(name))
                .one(db)
                .await?;

            let mut active_alias: album_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                album_aliases::ActiveModel {
                    album_id: Set(album.id),
                    band_id: Set(band_id),
                    alias_key: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 10 == 0 || i as i32 == total {
                update_progress(progress, "Albums", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Albums", total, total, true, None).await;
    Ok(())
}

async fn backfill_song_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = songs::Entity::find().count(db).await? as i32;
    update_progress(progress, "Songs", 0, total, false, None).await;

    let paginator = songs::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for song in batch {
            let name = song.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 25 == 0 || i as i32 == total {
                    update_progress(progress, "Songs", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = song_aliases::Entity::find()
                .filter(song_aliases::Column::SongId.eq(song.id))
                .filter(song_aliases::Column::AliasKey.eq(name))
                .one(db)
                .await?;

            let mut active_alias: song_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                song_aliases::ActiveModel {
                    song_id: Set(song.id),
                    band_id: Set(song.band_id.unwrap_or(0)),
                    alias_key: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 25 == 0 || i as i32 == total {
                update_progress(progress, "Songs", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Songs", total, total, true, None).await;
    Ok(())
}

async fn backfill_label_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = labels::Entity::find().count(db).await? as i32;
    update_progress(progress, "Labels", 0, total, false, None).await;

    let paginator = labels::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for label in batch {
            let name = label.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 10 == 0 || i as i32 == total {
                    update_progress(progress, "Labels", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = label_aliases::Entity::find()
                .filter(label_aliases::Column::LabelId.eq(label.id))
                .filter(label_aliases::Column::AliasKey.eq(name))
                .one(db)
                .await?;

            let mut active_alias: label_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                label_aliases::ActiveModel {
                    label_id: Set(label.id),
                    alias_key: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 10 == 0 || i as i32 == total {
                update_progress(progress, "Labels", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Labels", total, total, true, None).await;
    Ok(())
}

async fn backfill_state_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = states::Entity::find().count(db).await? as i32;
    update_progress(progress, "States", 0, total, false, None).await;

    let paginator = states::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for state in batch {
            let name = state.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 5 == 0 || i as i32 == total {
                    update_progress(progress, "States", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = state_aliases::Entity::find()
                .filter(state_aliases::Column::StateId.eq(state.id))
                .one(db)
                .await?;

            let mut active_alias: state_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                state_aliases::ActiveModel {
                    state_id: Set(state.id),
                    country_id: Set(state.country_id),
                    name: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 5 == 0 || i as i32 == total {
                update_progress(progress, "States", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "States", total, total, true, None).await;
    Ok(())
}

async fn backfill_city_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = cities::Entity::find().count(db).await? as i32;
    update_progress(progress, "Cities", 0, total, false, None).await;

    let paginator = cities::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for city in batch {
            let name = city.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 25 == 0 || i as i32 == total {
                    update_progress(progress, "Cities", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = city_aliases::Entity::find()
                .filter(city_aliases::Column::CityId.eq(city.id))
                .one(db)
                .await?;

            let mut active_alias: city_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                city_aliases::ActiveModel {
                    city_id: Set(city.id),
                    state_id: Set(city.state_id),
                    name: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 25 == 0 || i as i32 == total {
                update_progress(progress, "Cities", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Cities", total, total, true, None).await;
    Ok(())
}

async fn backfill_postal_code_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = postal_codes::Entity::find().count(db).await? as i32;
    update_progress(progress, "Postal Codes", 0, total, false, None).await;

    let paginator = postal_codes::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for pc in batch {
            let name = pc.code.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 25 == 0 || i as i32 == total {
                    update_progress(progress, "Postal Codes", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = postal_code_aliases::Entity::find()
                .filter(postal_code_aliases::Column::PostalCodeId.eq(pc.id))
                .one(db)
                .await?;

            let mut active_alias: postal_code_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                postal_code_aliases::ActiveModel {
                    postal_code_id: Set(pc.id),
                    country_id: Set(pc.country_id),
                    name: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 25 == 0 || i as i32 == total {
                update_progress(progress, "Postal Codes", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Postal Codes", total, total, true, None).await;
    Ok(())
}

async fn backfill_radio_station_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = radio_stations::Entity::find().count(db).await? as i32;
    update_progress(progress, "Radio Stations", 0, total, false, None).await;

    let paginator = radio_stations::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for station in batch {
            let name = station.name.as_deref().unwrap_or("");
            if name.is_empty() {
                i += 1;
                if i % 10 == 0 || i as i32 == total {
                    update_progress(progress, "Radio Stations", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(name);
            let sanitized = sanitize_name(name);
            let s_key = soundex(name);
            let p_key = metaphone(name);
            let (dm_p, dm_a) = double_metaphone(name);

            let alias = radio_station_aliases::Entity::find()
                .filter(radio_station_aliases::Column::RadioStationId.eq(station.id))
                .one(db)
                .await?;

            let mut active_alias: radio_station_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                radio_station_aliases::ActiveModel {
                    radio_station_id: Set(station.id),
                    name: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 10 == 0 || i as i32 == total {
                update_progress(progress, "Radio Stations", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Radio Stations", total, total, true, None).await;
    Ok(())
}

async fn backfill_staff_member_aliases(db: &DatabaseConnection, progress: &Arc<RwLock<BackfillJobState>>) -> Result<(), DbErr> {
    let total = staff_members::Entity::find().count(db).await? as i32;
    update_progress(progress, "Staff Members", 0, total, false, None).await;

    let paginator = staff_members::Entity::find().paginate(db, 500);
    let mut page = 0u64;
    let mut i = 0usize;
    loop {
        let batch = paginator.fetch_page(page).await?;
        if batch.is_empty() { break; }
        for member in batch {
            let name = member.on_air_name.clone().unwrap_or_else(|| {
                format!("{} {}", member.first_name.as_deref().unwrap_or(""), member.last_name.as_deref().unwrap_or("")).trim().to_string()
            });
            if name.is_empty() {
                i += 1;
                if i % 25 == 0 || i as i32 == total {
                    update_progress(progress, "Staff Members", i as i32, total, i as i32 == total, None).await;
                }
                continue;
            }

            let slug = slug_it(&name);
            let sanitized = sanitize_name(&name);
            let s_key = soundex(&name);
            let p_key = metaphone(&name);
            let (dm_p, dm_a) = double_metaphone(&name);

            let alias = staff_member_aliases::Entity::find()
                .filter(staff_member_aliases::Column::StaffMemberId.eq(member.id))
                .one(db)
                .await?;

            let mut active_alias: staff_member_aliases::ActiveModel = if let Some(a) = alias {
                a.into()
            } else {
                staff_member_aliases::ActiveModel {
                    staff_member_id: Set(member.id),
                    radio_station_id: Set(member.radio_station_id),
                    name: Set(name.to_string()),
                    ..Default::default()
                }
            };

            active_alias.slug = Set(Some(slug));
            active_alias.sanitized_name = Set(Some(sanitized));
            active_alias.soundex_key = Set(Some(s_key));
            active_alias.phonetic_key = Set(Some(dm_p.clone()));
            active_alias.metaphone_key = Set(Some(p_key));
            active_alias.dmetaphone_key = Set(Some(dm_p));
            active_alias.dmetaphone_alt_key = Set(dm_a);
            active_alias.save(db).await?;

            i += 1;
            if i % 25 == 0 || i as i32 == total {
                update_progress(progress, "Staff Members", i as i32, total, i as i32 == total, None).await;
            }
        }
        page += 1;
    }
    update_progress(progress, "Staff Members", total, total, true, None).await;
    Ok(())
}
