//! Album relation loading and creation utilities.

use crate::models::albums::{Entity as Album, Model as AlbumModel, ActiveModel as AlbumActiveModel};
use crate::models::albums_bands::{Entity as AlbumsBands, Column as AlbumsBandsColumn};
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::utils::similarity::keys;
use crate::utils::slug::{slug_it, sanitize_name};
use super::types::{AlbumResponse, SongWithTrackInfo};
use sea_orm::*;
use std::collections::{HashMap, HashSet};

/// Load relations (songs, genres, images, bands) for a list of albums.
pub async fn load_album_relations(
    db: &DatabaseConnection,
    albums: Vec<AlbumModel>,
) -> Result<Vec<AlbumResponse>, DbErr> {
    if albums.is_empty() {
        return Ok(vec![]);
    }

    let album_ids: Vec<u32> = albums.iter().map(|a| a.id).collect();
    tracing::debug!("load_album_relations for album_ids: {:?}", album_ids);

    // Load images and group by album_id - O(n) instead of O(albums × images)
    let images = crate::models::album_images::Entity::find()
        .filter(crate::models::album_images::Column::AlbumId.is_in(album_ids.clone()))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading album_images for {:?}: {}", album_ids, e); e })?;
    let images_by_album: HashMap<u32, Vec<_>> = images.into_iter()
        .filter_map(|img| img.album_id.map(|id| (id, img)))
        .fold(HashMap::new(), |mut acc, (id, img)| {
            acc.entry(id).or_default().push(img);
            acc
        });

    // Load songs through albums_songs and group by album_id
    let album_songs = crate::models::albums_songs::Entity::find()
        .filter(crate::models::albums_songs::Column::AlbumId.is_in(album_ids.clone()))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading albums_songs for {:?}: {}", album_ids, e); e })?;
    let album_songs_by_album: HashMap<u32, Vec<_>> = album_songs.iter()
        .map(|asong| (asong.album_id, asong.clone()))
        .fold(HashMap::new(), |mut acc, (id, asong)| {
            acc.entry(id).or_default().push(asong);
            acc
        });

    let song_ids: Vec<u32> = album_songs.iter().map(|asong| asong.song_id).collect();
    tracing::debug!("Loading {} songs for albums {:?}", song_ids.len(), album_ids);
    let songs = if song_ids.is_empty() {
        vec![]
    } else {
        crate::models::songs::Entity::find()
            .filter(crate::models::songs::Column::Id.is_in(song_ids))
            .all(db)
            .await
            .map_err(|e| { tracing::error!("Failed loading songs for albums {:?}: {}", album_ids, e); e })?
    };
    // Build song lookup map - O(1) lookup instead of O(songs)
    let song_map: HashMap<u32, _> = songs.into_iter()
        .map(|s| (s.id, s))
        .collect();

    // Load bands through albums_bands and group by album_id
    let albums_bands = crate::models::albums_bands::Entity::find()
        .filter(crate::models::albums_bands::Column::AlbumId.is_in(album_ids.clone()))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading albums_bands for {:?}: {}", album_ids, e); e })?;
    let albums_bands_by_album: HashMap<u32, Vec<_>> = albums_bands.iter()
        .filter_map(|ab| ab.album_id.map(|id| (id, ab.clone())))
        .fold(HashMap::new(), |mut acc, (id, ab)| {
            acc.entry(id).or_default().push(ab);
            acc
        });

    let band_ids: Vec<u32> = albums_bands.iter().filter_map(|ab| ab.band_id).collect();
    tracing::debug!("Loading {} bands for albums {:?}", band_ids.len(), album_ids);
    let bands = if band_ids.is_empty() {
        vec![]
    } else {
        crate::models::bands::Entity::find()
            .filter(crate::models::bands::Column::Id.is_in(band_ids))
            .all(db)
            .await
            .map_err(|e| { tracing::error!("Failed loading bands for albums {:?}: {}", album_ids, e); e })?
    };
    // Build band lookup map - O(1) lookup instead of O(bands)
    let band_map: HashMap<u32, _> = bands.into_iter()
        .map(|b| (b.id, b))
        .collect();

    // Load genres/sub-genres through albums_sub_genres and group by album_id
    // Filter out rows with NULL id (legacy data issue in junction table)
    let albums_sub_genres = crate::models::albums_sub_genres::Entity::find()
        .filter(crate::models::albums_sub_genres::Column::AlbumId.is_in(album_ids.clone()))
        .filter(crate::models::albums_sub_genres::Column::Id.is_not_null())
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading albums_sub_genres for {:?}: {}", album_ids, e); e })?;
    let albums_sub_genres_by_album: HashMap<u32, Vec<_>> = albums_sub_genres.iter()
        .filter_map(|asg| asg.album_id.map(|id| (id, asg.clone())))
        .fold(HashMap::new(), |mut acc, (id, asg)| {
            acc.entry(id).or_default().push(asg);
            acc
        });

    // Collect all sub_genre_ids we need
    let mut all_sub_genre_ids: HashSet<u32> = albums_sub_genres.iter()
        .filter_map(|asg| asg.sub_genre_id)
        .collect();

    // Add charting sub genre IDs from albums
    for album in &albums {
        if let Some(id) = album.sub_genre_for_charting {
            all_sub_genre_ids.insert(id);
        }
    }

    // Add sub genre IDs from songs
    for song in song_map.values() {
        if let Some(id) = song.sub_genre_id {
            all_sub_genre_ids.insert(id);
        }
    }

    let sub_genre_id_vec: Vec<_> = all_sub_genre_ids.into_iter().collect();
    tracing::debug!("Loading {} sub_genres for albums {:?}", sub_genre_id_vec.len(), album_ids);
    let sub_genres = if sub_genre_id_vec.is_empty() {
        vec![]
    } else {
        crate::models::sub_genres::Entity::find()
            .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_id_vec))
            .all(db)
            .await
            .map_err(|e| { tracing::error!("Failed loading sub_genres for albums {:?}: {}", album_ids, e); e })?
    };
    // Build sub_genre lookup map - O(1) lookup instead of O(sub_genres)
    let sub_genre_map: HashMap<u32, _> = sub_genres.into_iter()
        .map(|sg| (sg.id, sg))
        .collect();

    let genre_ids: Vec<u32> = sub_genre_map.values()
        .filter_map(|sg| sg.genre_id)
        .collect();
    let genres = if genre_ids.is_empty() {
        vec![]
    } else {
        crate::models::genres::Entity::find()
            .filter(crate::models::genres::Column::Id.is_in(genre_ids))
            .all(db)
            .await
            .map_err(|e| { tracing::error!("Failed loading genres for albums {:?}: {}", album_ids, e); e })?
    };
    // Build genre lookup map - O(1) lookup instead of O(genres)
    let genre_map: HashMap<u32, _> = genres.into_iter()
        .map(|g| (g.id, g))
        .collect();

    // Build results with O(1) lookups instead of O(n²) nested finds
    let mut results = Vec::with_capacity(albums.len());
    for album in albums {
        let album_id = album.id;

        // O(1) lookup + clone instead of O(images) filter
        let album_images = images_by_album.get(&album_id)
            .cloned()
            .unwrap_or_default();

        // O(album_songs for this album) instead of O(all_album_songs × songs × sub_genres)
        let current_album_songs: Vec<_> = album_songs_by_album.get(&album_id)
            .map(|asongs| {
                asongs.iter()
                    .filter_map(|asong| {
                        song_map.get(&asong.song_id).map(|s| {
                            let song_sub_genre = s.sub_genre_id
                                .and_then(|id| sub_genre_map.get(&id).cloned());
                            SongWithTrackInfo {
                                album_song: asong.clone(),
                                song: s.clone(),
                                sub_genre: song_sub_genre,
                            }
                        })
                    })
                    .collect()
            })
            .unwrap_or_default();

        // O(albums_bands for this album) instead of O(all_albums_bands × bands)
        let album_bands: Vec<_> = albums_bands_by_album.get(&album_id)
            .map(|abs| {
                abs.iter()
                    .filter_map(|ab| ab.band_id.and_then(|id| band_map.get(&id).cloned()))
                    .collect()
            })
            .unwrap_or_default();

        // O(albums_sub_genres for this album) instead of O(all_albums_sub_genres × sub_genres)
        let album_sub_genres: Vec<_> = albums_sub_genres_by_album.get(&album_id)
            .map(|asgs| {
                asgs.iter()
                    .filter_map(|asg| asg.sub_genre_id.and_then(|id| sub_genre_map.get(&id).cloned()))
                    .collect()
            })
            .unwrap_or_default();

        // O(album_sub_genres) instead of O(genres × album_genre_ids)
        let album_genre_ids: HashSet<u32> = album_sub_genres.iter()
            .filter_map(|sg| sg.genre_id)
            .collect();
        let album_genres: Vec<_> = album_genre_ids.iter()
            .filter_map(|id| genre_map.get(id).cloned())
            .collect();

        results.push(AlbumResponse {
            album,
            songs: current_album_songs,
            genres: album_genres,
            sub_genres: album_sub_genres,
            images: album_images,
            bands: album_bands,
        });
    }

    Ok(results)
}

/// Create a new album with automatic alias generation.
pub async fn create_album(db: &DatabaseConnection, data: AlbumModel, band_id: Option<u32>) -> Result<AlbumModel, DbErr> {
    let name = data.name.clone();
    let active_model: AlbumActiveModel = AlbumActiveModel {
        name: Set(data.name),
        slug: Set(name.as_ref().map(|n| slug_it(n))),
        label_id: Set(data.label_id),
        release_date: Set(data.release_date),
        img: Set(data.img),
        ..Default::default()
    };
    let album = active_model.insert(db).await?;

    // Create alias entry for similarity search
    if let Some(ref album_name) = name {
        create_album_alias(db, album.id, band_id.unwrap_or(0), album_name).await?;
    }

    Ok(album)
}

/// Create an album alias for similarity search indexing.
pub async fn create_album_alias(
    db: &DatabaseConnection,
    album_id: u32,
    band_id: u32,
    name: &str,
) -> Result<(), DbErr> {
    let slug = slug_it(name);
    let sanitized = sanitize_name(name);
    let soundex_key = keys::soundex(name);
    let metaphone_key = keys::metaphone(name);
    let (dmetaphone_key, dmetaphone_alt_key) = keys::double_metaphone(name);

    // Check if alias already exists for this album with this key
    let existing = AlbumAlias::find()
        .filter(AlbumAliasColumn::AlbumId.eq(album_id))
        .filter(AlbumAliasColumn::BandId.eq(band_id))
        .filter(AlbumAliasColumn::AliasKey.eq(name))
        .filter(AlbumAliasColumn::RadioStationId.is_null())
        .one(db)
        .await?;

    if existing.is_some() {
        return Ok(());
    }

    let alias = crate::models::album_aliases::ActiveModel {
        album_id: Set(album_id),
        band_id: Set(band_id),
        alias_key: Set(name.to_string()),
        slug: Set(Some(slug)),
        sanitized_name: Set(Some(sanitized)),
        soundex_key: Set(Some(soundex_key)),
        phonetic_key: Set(Some(metaphone_key.clone())),
        metaphone_key: Set(Some(metaphone_key)),
        dmetaphone_key: Set(Some(dmetaphone_key)),
        dmetaphone_alt_key: Set(dmetaphone_alt_key),
        ..Default::default()
    };

    alias.insert(db).await?;
    Ok(())
}

/// Get songs for an album.
pub async fn get_album_songs(db: &DatabaseConnection, id: u32) -> Result<Vec<crate::models::songs::Model>, DbErr> {
    let album = Album::find_by_id(id).one(db).await?;
    if let Some(album) = album {
        album.find_related(crate::models::songs::Entity).all(db).await
    } else {
        Ok(vec![])
    }
}

/// Get or create an "Unknown" album for a specific band.
/// This is used when creating playlist entries where the song's album is unknown.
pub async fn get_or_create_unknown_album(
    db: &DatabaseConnection,
    band_id: u32,
) -> Result<AlbumModel, DbErr> {
    // First, check if an "Unknown" album already exists for this band
    let existing = AlbumsBands::find()
        .filter(AlbumsBandsColumn::BandId.eq(band_id))
        .all(db)
        .await?;

    // Look through the band's albums for one named "Unknown"
    for album_band in existing {
        if let Some(album_id) = album_band.album_id {
            let album = Album::find_by_id(album_id).one(db).await?;
            if let Some(album) = album
                && let Some(ref name) = album.name
                    && name.eq_ignore_ascii_case("unknown") {
                        return Ok(album);
                    }
        }
    }

    // No existing "Unknown" album found, create one
    let album_name = "Unknown".to_string();
    let album = AlbumActiveModel {
        name: Set(Some(album_name.clone())),
        slug: Set(Some(slug_it(&album_name))),
        ..Default::default()
    }
    .insert(db)
    .await?;

    // Create the album alias for similarity search
    create_album_alias(db, album.id, band_id, &album_name).await?;

    // Create the albums_bands junction entry
    crate::models::albums_bands::ActiveModel {
        album_id: Set(Some(album.id)),
        band_id: Set(Some(band_id)),
        ..Default::default()
    }
    .insert(db)
    .await?;

    Ok(album)
}
