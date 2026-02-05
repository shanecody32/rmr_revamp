//! Band merge operations.

use crate::models::bands::{Entity as Band, ActiveModel as BandActiveModel};
use crate::models::band_images::{Entity as BandImage, Column as BandImageColumn};
use crate::models::band_links::{Entity as BandLink, Column as BandLinkColumn};
use crate::models::band_contact::{Entity as BandContact, Column as BandContactColumn};
use crate::models::band_aliases::{Entity as BandAlias, Column as BandAliasColumn};
use crate::models::songs::{Entity as Song, Column as SongColumn};
use crate::models::albums_bands::{Entity as AlbumsBands, Column as AlbumsBandsColumn};
use crate::models::reviews::{Entity as Review, Column as ReviewColumn};
use crate::models::bands_users::{Entity as BandsUsers, Column as BandsUsersColumn};
use crate::models::bands_sub_genres::{Entity as BandsSubGenres, Column as BandsSubGenresColumn};
use crate::models::radio_playlists::{Entity as RadioPlaylist, Column as RadioPlaylistColumn};
use crate::models::radio_playlist_archives::{Entity as RadioPlaylistArchive, Column as RadioPlaylistArchiveColumn};
use crate::models::radio_raw_datas::{Entity as RadioRawData, Column as RadioRawDataColumn};
use crate::models::staff_playlists::{Entity as StaffPlaylist, Column as StaffPlaylistColumn};
use crate::models::staff_playlist_archives::{Entity as StaffPlaylistArchive, Column as StaffPlaylistArchiveColumn};
use crate::models::song_aliases::{Entity as SongAlias, Column as SongAliasColumn};
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::models::band_duplicate_candidates::{Entity as BandDuplicateCandidate, Column as BandDuplicateCandidateColumn};
use crate::services::action_log_service::ActionLogService;
use super::types::{MergeBandsRequest, MergeResult, MergeStats, SongDuplicate};
use sea_orm::*;
use std::collections::{HashMap, HashSet};

// Type aliases for complex HashMap types used in playlist aggregation
type PlaylistKey = (Option<u32>, Option<u32>, Option<u32>);
type PlaylistValue = (u32, i32, i32);
type ArchiveKey = (Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>);
type ArchiveValue = (u32, i32, i32);
type StaffPlaylistValue = (u32, Option<i32>);

/// Merge multiple bands into a target band.
pub async fn merge_bands(
    db: &DatabaseConnection,
    req: MergeBandsRequest,
    user_id: Option<u32>,
    ip_address: Option<String>,
) -> Result<MergeResult, DbErr> {
    // Validate target band exists
    let into_band = Band::find_by_id(req.into_id).one(db).await?;
    if into_band.is_none() {
        return Err(DbErr::RecordNotFound("Target band not found".to_string()));
    }

    // Capture before-state for audit logging
    let before_state = serde_json::json!({
        "target_id": req.into_id,
        "source_ids": &req.from_ids,
    });
    let from_ids_for_log = req.from_ids.clone();
    let target_id_for_log = req.into_id;

    // Perform merge in a transaction
    let result = db.transaction::<_, MergeResult, DbErr>(|txn| {
        Box::pin(async move {
            let mut stats = MergeStats::default();
            let mut duplicate_songs = Vec::new();
            let duplicate_albums = Vec::new();

            let target_id = req.into_id;
            let from_ids = req.from_ids.clone();

            // 1. Update target band with merged data fields
            if let Some(obj) = req.merged_data.as_object() {
                let band = Band::find_by_id(target_id).one(txn).await?
                    .ok_or(DbErr::RecordNotFound("Target band not found".to_string()))?;

                let mut active_model: BandActiveModel = band.into();

                if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                    active_model.name = Set(name.to_string());
                }
                if let Some(website) = obj.get("website").and_then(|v| v.as_str()) {
                    active_model.website = Set(Some(website.to_string()));
                }
                if let Some(email) = obj.get("email").and_then(|v| v.as_str()) {
                    active_model.email = Set(Some(email.to_string()));
                }
                if let Some(bio) = obj.get("bio").and_then(|v| v.as_str()) {
                    active_model.bio = Set(Some(bio.to_string()));
                }
                if let Some(country_id) = obj.get("country_id").and_then(|v| v.as_u64()) {
                    active_model.country_id = Set(Some(country_id as u32));
                }
                if let Some(state_id) = obj.get("state_id").and_then(|v| v.as_u64()) {
                    active_model.state_id = Set(Some(state_id as u32));
                }
                if let Some(city_id) = obj.get("city_id").and_then(|v| v.as_u64()) {
                    active_model.city_id = Set(Some(city_id as u32));
                }
                if let Some(twitter) = obj.get("twitter").and_then(|v| v.as_str()) {
                    active_model.twitter = Set(Some(twitter.to_string()));
                }
                if let Some(facebook_url) = obj.get("facebook_url").and_then(|v| v.as_str()) {
                    active_model.facebook_url = Set(Some(facebook_url.to_string()));
                }
                if let Some(lastfm_url) = obj.get("lastfm_url").and_then(|v| v.as_str()) {
                    active_model.lastfm_url = Set(Some(lastfm_url.to_string()));
                }
                if let Some(spotify_id) = obj.get("spotify_id").and_then(|v| v.as_str()) {
                    active_model.spotify_id = Set(Some(spotify_id.to_string()));
                }
                if let Some(instagram_url) = obj.get("instagram_url").and_then(|v| v.as_str()) {
                    active_model.instagram_url = Set(Some(instagram_url.to_string()));
                }
                if let Some(youtube_url) = obj.get("youtube_url").and_then(|v| v.as_str()) {
                    active_model.youtube_url = Set(Some(youtube_url.to_string()));
                }
                if let Some(reverb_url) = obj.get("reverb_url").and_then(|v| v.as_str()) {
                    active_model.reverb_url = Set(Some(reverb_url.to_string()));
                }
                if let Some(wikipedia_url) = obj.get("wikipedia_url").and_then(|v| v.as_str()) {
                    active_model.wikipedia_url = Set(Some(wikipedia_url.to_string()));
                }
                if let Some(myspace_url) = obj.get("myspace_url").and_then(|v| v.as_str()) {
                    active_model.myspace_url = Set(Some(myspace_url.to_string()));
                }
                if let Some(cdbaby_url) = obj.get("cdbaby_url").and_then(|v| v.as_str()) {
                    active_model.cdbaby_url = Set(Some(cdbaby_url.to_string()));
                }
                if let Some(pinterest_url) = obj.get("pinterest_url").and_then(|v| v.as_str()) {
                    active_model.pinterest_url = Set(Some(pinterest_url.to_string()));
                }
                if let Some(itunes_id) = obj.get("itunes_id").and_then(|v| v.as_u64()) {
                    active_model.itunes_id = Set(Some(itunes_id as u32));
                }
                if let Some(amg_id) = obj.get("amg_id").and_then(|v| v.as_u64()) {
                    active_model.amg_id = Set(Some(amg_id as u32));
                }
                if let Some(rovi_id) = obj.get("rovi_id").and_then(|v| v.as_str()) {
                    active_model.rovi_id = Set(Some(rovi_id.to_string()));
                }
                if let Some(echo_id) = obj.get("echo_id").and_then(|v| v.as_str()) {
                    active_model.echo_id = Set(Some(echo_id.to_string()));
                }
                if let Some(seven_digital_id) = obj.get("seven_digital_id").and_then(|v| v.as_u64()) {
                    active_model.seven_digital_id = Set(Some(seven_digital_id as u32));
                }
                if let Some(discogs_id) = obj.get("discogs_id").and_then(|v| v.as_u64()) {
                    active_model.discogs_id = Set(Some(discogs_id as u32));
                }
                if let Some(rdio_id) = obj.get("rdio_id").and_then(|v| v.as_u64()) {
                    active_model.rdio_id = Set(Some(rdio_id as u32));
                }

                active_model.update(txn).await?;
            }

            // 2. Move images (dedupe by path)
            let existing_paths: HashSet<String> = BandImage::find()
                .filter(BandImageColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|img| img.path)
                .collect();

            for from_id in &from_ids {
                let images = BandImage::find()
                    .filter(BandImageColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for img in images {
                    if let Some(ref path) = img.path
                        && existing_paths.contains(path) {
                            continue;
                        }
                    let mut active: crate::models::band_images::ActiveModel = img.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.images_moved += 1;
                }
            }

            // 3. Move links (dedupe by link URL)
            let existing_links: HashSet<String> = BandLink::find()
                .filter(BandLinkColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|lnk| lnk.link)
                .collect();

            for from_id in &from_ids {
                let links = BandLink::find()
                    .filter(BandLinkColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for lnk in links {
                    if let Some(ref url) = lnk.link
                        && existing_links.contains(url) {
                            continue;
                        }
                    let mut active: crate::models::band_links::ActiveModel = lnk.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.links_moved += 1;
                }
            }

            // 4. Move contact info (merge intelligently - keep target's, update nulls)
            let target_contact = BandContact::find()
                .filter(BandContactColumn::BandId.eq(target_id))
                .one(txn)
                .await?;

            for from_id in &from_ids {
                let from_contacts = BandContact::find()
                    .filter(BandContactColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for contact in from_contacts {
                    if target_contact.is_none() {
                        let mut active: crate::models::band_contact::ActiveModel = contact.into();
                        active.band_id = Set(Some(target_id));
                        active.update(txn).await?;
                    } else {
                        let active: crate::models::band_contact::ActiveModel = contact.into();
                        active.delete(txn).await?;
                    }
                }
            }

            // 5. Move band aliases (dedupe by alias_key)
            let mut existing_aliases: HashSet<String> = BandAlias::find()
                .filter(BandAliasColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .map(|a| a.alias_key)
                .collect();

            for from_id in &from_ids {
                let aliases = BandAlias::find()
                    .filter(BandAliasColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for alias in aliases {
                    if existing_aliases.contains(&alias.alias_key) {
                        let active: crate::models::band_aliases::ActiveModel = alias.into();
                        active.delete(txn).await?;
                        continue;
                    }
                    let alias_key = alias.alias_key.clone();
                    let mut active: crate::models::band_aliases::ActiveModel = alias.into();
                    active.band_id = Set(target_id);
                    active.update(txn).await?;
                    existing_aliases.insert(alias_key);
                    stats.aliases_moved += 1;
                }
            }

            // 6. Move songs (flag duplicates by name for review)
            let existing_songs: HashMap<String, u32> = Song::find()
                .filter(SongColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|s| s.name.clone().map(|n| (n.to_lowercase(), s.id)))
                .collect();

            for from_id in &from_ids {
                let songs = Song::find()
                    .filter(SongColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for song in songs {
                    if let Some(ref name) = song.name
                        && let Some(&target_song_id) = existing_songs.get(&name.to_lowercase()) {
                            duplicate_songs.push(SongDuplicate {
                                from_song_id: song.id,
                                from_song_name: name.clone(),
                                target_song_id,
                                target_song_name: name.clone(),
                            });
                            continue;
                        }
                    let mut active: crate::models::songs::ActiveModel = song.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.songs_moved += 1;
                }
            }

            // 7. Move album associations (flag duplicates)
            let existing_albums: HashMap<u32, String> = AlbumsBands::find()
                .filter(AlbumsBandsColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|ab| ab.album_id.map(|id| (id, String::new())))
                .collect();

            for from_id in &from_ids {
                let album_bands = AlbumsBands::find()
                    .filter(AlbumsBandsColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for ab in album_bands {
                    if let Some(album_id) = ab.album_id
                        && existing_albums.contains_key(&album_id) {
                            let active: crate::models::albums_bands::ActiveModel = ab.into();
                            active.delete(txn).await?;
                            continue;
                        }
                    let mut active: crate::models::albums_bands::ActiveModel = ab.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.albums_moved += 1;
                }
            }

            // 8. Move reviews
            for from_id in &from_ids {
                let reviews = Review::find()
                    .filter(ReviewColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for review in reviews {
                    let mut active: crate::models::reviews::ActiveModel = review.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.reviews_moved += 1;
                }
            }

            // 9. Merge user associations (dedupe)
            let existing_users: HashSet<u32> = BandsUsers::find()
                .filter(BandsUsersColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|bu| bu.user_id)
                .collect();

            for from_id in &from_ids {
                let band_users = BandsUsers::find()
                    .filter(BandsUsersColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for bu in band_users {
                    if let Some(user_id) = bu.user_id
                        && existing_users.contains(&user_id) {
                            let active: crate::models::bands_users::ActiveModel = bu.into();
                            active.delete(txn).await?;
                            continue;
                        }
                    let mut active: crate::models::bands_users::ActiveModel = bu.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.users_moved += 1;
                }
            }

            // 10. Merge sub-genre associations (dedupe)
            let existing_sub_genres: HashSet<u32> = BandsSubGenres::find()
                .filter(BandsSubGenresColumn::BandId.eq(target_id))
                .all(txn)
                .await?
                .into_iter()
                .filter_map(|bsg| bsg.sub_genre_id)
                .collect();

            for from_id in &from_ids {
                let band_sub_genres = BandsSubGenres::find()
                    .filter(BandsSubGenresColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for bsg in band_sub_genres {
                    if let Some(sg_id) = bsg.sub_genre_id
                        && existing_sub_genres.contains(&sg_id) {
                            let active: crate::models::bands_sub_genres::ActiveModel = bsg.into();
                            active.delete(txn).await?;
                            continue;
                        }
                    let mut active: crate::models::bands_sub_genres::ActiveModel = bsg.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.sub_genres_added += 1;
                }
            }

            // 11. Radio playlists — aggregate spins on composite key match
            {
                let target_playlists = RadioPlaylist::find()
                    .filter(RadioPlaylistColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                // Build map: (radio_station_id, album_id, song_id) -> (id, spins, subtract_spins)
                let mut target_map: HashMap<PlaylistKey, PlaylistValue> = HashMap::new();
                for pl in &target_playlists {
                    target_map.insert(
                        (pl.radio_station_id, pl.album_id, pl.song_id),
                        (pl.id, pl.spins, pl.subtract_spins),
                    );
                }

                for from_id in &from_ids {
                    let playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for pl in playlists {
                        let key = (pl.radio_station_id, pl.album_id, pl.song_id);
                        if let Some(&(target_pl_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                            // Aggregate: sum spins into target, delete source
                            let target_entry = RadioPlaylist::find_by_id(target_pl_id).one(txn).await?
                                .ok_or(DbErr::RecordNotFound("Target playlist entry not found".to_string()))?;
                            let mut active: crate::models::radio_playlists::ActiveModel = target_entry.into();
                            active.spins = Set(target_spins + pl.spins);
                            active.subtract_spins = Set(target_sub_spins + pl.subtract_spins);
                            active.update(txn).await?;

                            let source_active: crate::models::radio_playlists::ActiveModel = pl.into();
                            source_active.delete(txn).await?;
                            stats.radio_playlists_aggregated += 1;
                        } else {
                            // No match — move to target band
                            let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                            active.band_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.radio_playlists_moved += 1;
                        }
                    }
                }
            }

            // 12. Radio playlist archives — aggregate spins on composite key match
            {
                let target_archives = RadioPlaylistArchive::find()
                    .filter(RadioPlaylistArchiveColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                // Key includes week_ending: (radio_station_id, album_id, song_id, week_ending)
                let mut target_map: HashMap<ArchiveKey, ArchiveValue> = HashMap::new();
                for arch in &target_archives {
                    target_map.insert(
                        (arch.radio_station_id, arch.album_id, arch.song_id, arch.week_ending),
                        (arch.id, arch.spins, arch.subtract_spins),
                    );
                }

                for from_id in &from_ids {
                    let archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for arch in archives {
                        let key = (arch.radio_station_id, arch.album_id, arch.song_id, arch.week_ending);
                        if let Some(&(target_arch_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                            let target_entry = RadioPlaylistArchive::find_by_id(target_arch_id).one(txn).await?
                                .ok_or(DbErr::RecordNotFound("Target archive entry not found".to_string()))?;
                            let mut active: crate::models::radio_playlist_archives::ActiveModel = target_entry.into();
                            active.spins = Set(target_spins + arch.spins);
                            active.subtract_spins = Set(target_sub_spins + arch.subtract_spins);
                            active.update(txn).await?;

                            let source_active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                            source_active.delete(txn).await?;
                            stats.radio_playlist_archives_aggregated += 1;
                        } else {
                            let mut active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                            active.band_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.radio_playlist_archives_moved += 1;
                        }
                    }
                }
            }

            // 13. Staff playlists — aggregate spins on composite key match
            {
                let target_playlists = StaffPlaylist::find()
                    .filter(StaffPlaylistColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                // Key: (staff_member_id, album_id, song_id)
                let mut target_map: HashMap<PlaylistKey, StaffPlaylistValue> = HashMap::new();
                for pl in &target_playlists {
                    target_map.insert(
                        (pl.staff_member_id, pl.album_id, pl.song_id),
                        (pl.id, pl.spins),
                    );
                }

                for from_id in &from_ids {
                    let playlists = StaffPlaylist::find()
                        .filter(StaffPlaylistColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for pl in playlists {
                        let key = (pl.staff_member_id, pl.album_id, pl.song_id);
                        if let Some(&(target_pl_id, target_spins)) = target_map.get(&key) {
                            let target_entry = StaffPlaylist::find_by_id(target_pl_id).one(txn).await?
                                .ok_or(DbErr::RecordNotFound("Target staff playlist entry not found".to_string()))?;
                            let mut active: crate::models::staff_playlists::ActiveModel = target_entry.into();
                            active.spins = Set(Some(target_spins.unwrap_or(0) + pl.spins.unwrap_or(0)));
                            active.update(txn).await?;

                            let source_active: crate::models::staff_playlists::ActiveModel = pl.into();
                            source_active.delete(txn).await?;
                            stats.staff_playlists_aggregated += 1;
                        } else {
                            let mut active: crate::models::staff_playlists::ActiveModel = pl.into();
                            active.band_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.staff_playlists_moved += 1;
                        }
                    }
                }
            }

            // 14. Staff playlist archives — aggregate spins on composite key match
            {
                let target_archives = StaffPlaylistArchive::find()
                    .filter(StaffPlaylistArchiveColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                // Key: (staff_member_id, album_id, song_id, week_ending)
                let mut target_map: HashMap<ArchiveKey, StaffPlaylistValue> = HashMap::new();
                for arch in &target_archives {
                    target_map.insert(
                        (arch.staff_member_id, arch.album_id, arch.song_id, arch.week_ending),
                        (arch.id, arch.spins),
                    );
                }

                for from_id in &from_ids {
                    let archives = StaffPlaylistArchive::find()
                        .filter(StaffPlaylistArchiveColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for arch in archives {
                        let key = (arch.staff_member_id, arch.album_id, arch.song_id, arch.week_ending);
                        if let Some(&(target_arch_id, target_spins)) = target_map.get(&key) {
                            let target_entry = StaffPlaylistArchive::find_by_id(target_arch_id).one(txn).await?
                                .ok_or(DbErr::RecordNotFound("Target staff archive entry not found".to_string()))?;
                            let mut active: crate::models::staff_playlist_archives::ActiveModel = target_entry.into();
                            active.spins = Set(Some(target_spins.unwrap_or(0) + arch.spins.unwrap_or(0)));
                            active.update(txn).await?;

                            let source_active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                            source_active.delete(txn).await?;
                            stats.staff_playlist_archives_aggregated += 1;
                        } else {
                            let mut active: crate::models::staff_playlist_archives::ActiveModel = arch.into();
                            active.band_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.staff_playlist_archives_moved += 1;
                        }
                    }
                }
            }

            // 15. Update raw data (move all)
            for from_id in &from_ids {
                let raw_datas = RadioRawData::find()
                    .filter(RadioRawDataColumn::BandId.eq(*from_id))
                    .all(txn)
                    .await?;

                for rd in raw_datas {
                    let mut active: crate::models::radio_raw_datas::ActiveModel = rd.into();
                    active.band_id = Set(Some(target_id));
                    active.update(txn).await?;
                    stats.raw_data_updated += 1;
                }
            }

            // 16. Song aliases — dedupe on (radio_station_id, alias_key)
            {
                let target_song_aliases = SongAlias::find()
                    .filter(SongAliasColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut existing_song_alias_keys: HashSet<(Option<u32>, String)> = target_song_aliases
                    .into_iter()
                    .map(|a| (a.radio_station_id, a.alias_key))
                    .collect();

                for from_id in &from_ids {
                    let aliases = SongAlias::find()
                        .filter(SongAliasColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for alias in aliases {
                        let key = (alias.radio_station_id, alias.alias_key.clone());
                        if existing_song_alias_keys.contains(&key) {
                            let active: crate::models::song_aliases::ActiveModel = alias.into();
                            active.delete(txn).await?;
                            stats.song_aliases_deduped += 1;
                        } else {
                            let mut active: crate::models::song_aliases::ActiveModel = alias.into();
                            active.band_id = Set(target_id);
                            active.update(txn).await?;
                            existing_song_alias_keys.insert(key);
                            stats.song_aliases_moved += 1;
                        }
                    }
                }
            }

            // 17. Album aliases — dedupe on (radio_station_id, alias_key)
            {
                let target_album_aliases = AlbumAlias::find()
                    .filter(AlbumAliasColumn::BandId.eq(target_id))
                    .all(txn)
                    .await?;

                let mut existing_album_alias_keys: HashSet<(Option<u32>, String)> = target_album_aliases
                    .into_iter()
                    .map(|a| (a.radio_station_id, a.alias_key))
                    .collect();

                for from_id in &from_ids {
                    let aliases = AlbumAlias::find()
                        .filter(AlbumAliasColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for alias in aliases {
                        let key = (alias.radio_station_id, alias.alias_key.clone());
                        if existing_album_alias_keys.contains(&key) {
                            let active: crate::models::album_aliases::ActiveModel = alias.into();
                            active.delete(txn).await?;
                            stats.album_aliases_deduped += 1;
                        } else {
                            let mut active: crate::models::album_aliases::ActiveModel = alias.into();
                            active.band_id = Set(target_id);
                            active.update(txn).await?;
                            existing_album_alias_keys.insert(key);
                            stats.album_aliases_moved += 1;
                        }
                    }
                }
            }

            // 18. Band duplicate candidates — reassign, remove self-refs, deduplicate pairs
            {
                for from_id in &from_ids {
                    // Reassign band_id_1 references
                    let candidates_1 = BandDuplicateCandidate::find()
                        .filter(BandDuplicateCandidateColumn::BandId1.eq(*from_id))
                        .all(txn)
                        .await?;

                    for cand in candidates_1 {
                        let mut active: crate::models::band_duplicate_candidates::ActiveModel = cand.into();
                        active.band_id_1 = Set(target_id);
                        active.update(txn).await?;
                        stats.duplicate_candidates_updated += 1;
                    }

                    // Reassign band_id_2 references
                    let candidates_2 = BandDuplicateCandidate::find()
                        .filter(BandDuplicateCandidateColumn::BandId2.eq(*from_id))
                        .all(txn)
                        .await?;

                    for cand in candidates_2 {
                        let mut active: crate::models::band_duplicate_candidates::ActiveModel = cand.into();
                        active.band_id_2 = Set(target_id);
                        active.update(txn).await?;
                        stats.duplicate_candidates_updated += 1;
                    }
                }

                // Remove self-referencing rows (band_id_1 == band_id_2 == target_id)
                let self_refs = BandDuplicateCandidate::find()
                    .filter(BandDuplicateCandidateColumn::BandId1.eq(target_id))
                    .filter(BandDuplicateCandidateColumn::BandId2.eq(target_id))
                    .all(txn)
                    .await?;

                for cand in self_refs {
                    let active: crate::models::band_duplicate_candidates::ActiveModel = cand.into();
                    active.delete(txn).await?;
                    stats.duplicate_candidates_cleaned += 1;
                }

                // Deduplicate pairs: load all candidates involving target, remove duplicate pairs
                let all_target_candidates = BandDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(BandDuplicateCandidateColumn::BandId1.eq(target_id))
                            .add(BandDuplicateCandidateColumn::BandId2.eq(target_id))
                    )
                    .all(txn)
                    .await?;

                let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                for cand in all_target_candidates {
                    let pair = (
                        std::cmp::min(cand.band_id_1, cand.band_id_2),
                        std::cmp::max(cand.band_id_1, cand.band_id_2),
                    );
                    if !seen_pairs.insert(pair) {
                        // Duplicate pair — delete
                        let active: crate::models::band_duplicate_candidates::ActiveModel = cand.into();
                        active.delete(txn).await?;
                        stats.duplicate_candidates_cleaned += 1;
                    }
                }
            }

            // 19. Delete source bands
            for from_id in &from_ids {
                Band::delete_by_id(*from_id).exec(txn).await?;
                stats.bands_deleted += 1;
            }

            // 20. Get and return the updated target band
            let merged_band = Band::find_by_id(target_id).one(txn).await?
                .ok_or(DbErr::RecordNotFound("Merged band not found".to_string()))?;

            Ok(MergeResult {
                merged_band,
                duplicate_songs,
                duplicate_albums,
                stats,
            })
        })
    }).await.map_err(|e| match e {
        TransactionError::Connection(db_err) => db_err,
        TransactionError::Transaction(db_err) => db_err,
    })?;

    // Audit log (fire-and-forget — don't fail the merge if logging fails)
    let _ = ActionLogService::record_band_merge(
        db,
        target_id_for_log,
        user_id,
        &before_state,
        &result.merged_band,
        &result.stats,
        &from_ids_for_log,
        ip_address,
    ).await;

    Ok(result)
}
