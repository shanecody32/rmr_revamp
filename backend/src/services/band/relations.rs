//! Band relation loading utilities.

use crate::models::bands::Model as BandModel;
use crate::services::{AlbumService, AlbumResponse};
use super::types::BandResponse;
use sea_orm::*;
use std::collections::{HashMap, HashSet};

/// Load relations (genres, sub-genres, locations, images) for a list of bands.
pub async fn load_band_relations(
    db: &DatabaseConnection,
    bands: Vec<BandModel>,
) -> Result<Vec<BandResponse>, DbErr> {
    if bands.is_empty() {
        return Ok(vec![]);
    }

    let band_ids: Vec<u32> = bands.iter().map(|b| b.id).collect();

    // Load sub-genres and group by band_id
    let bands_sub_genres = crate::models::bands_sub_genres::Entity::find()
        .filter(crate::models::bands_sub_genres::Column::BandId.is_in(band_ids.clone()))
        .all(db)
        .await?;
    let bands_sub_genres_by_band: HashMap<u32, Vec<_>> = bands_sub_genres.iter()
        .filter_map(|bsg| bsg.band_id.map(|id| (id, bsg.clone())))
        .fold(HashMap::new(), |mut acc, (id, bsg)| {
            acc.entry(id).or_default().push(bsg);
            acc
        });

    let sub_genre_ids: Vec<u32> = bands_sub_genres.iter().filter_map(|bsg| bsg.sub_genre_id).collect();
    let sub_genres = crate::models::sub_genres::Entity::find()
        .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
        .all(db)
        .await?;
    // Build sub_genre lookup map - O(1) instead of O(sub_genres)
    let sub_genre_map: HashMap<u32, _> = sub_genres.into_iter()
        .map(|sg| (sg.id, sg))
        .collect();

    // Load genres
    let genre_ids: Vec<u32> = sub_genre_map.values()
        .filter_map(|sg| sg.genre_id)
        .collect();
    let genres = crate::models::genres::Entity::find()
        .filter(crate::models::genres::Column::Id.is_in(genre_ids))
        .all(db)
        .await?;
    // Build genre lookup map - O(1) instead of O(genres)
    let genre_map: HashMap<u32, _> = genres.into_iter()
        .map(|g| (g.id, g))
        .collect();

    // Load locations and build lookup maps
    let country_ids: Vec<u32> = bands.iter().filter_map(|b| b.country_id).collect();
    let state_ids: Vec<u32> = bands.iter().filter_map(|b| b.state_id).collect();
    let city_ids: Vec<u32> = bands.iter().filter_map(|b| b.city_id).collect();

    let countries = crate::models::countries::Entity::find()
        .filter(crate::models::countries::Column::Id.is_in(country_ids))
        .all(db)
        .await?;
    let country_map: HashMap<u32, _> = countries.into_iter()
        .map(|c| (c.id, c))
        .collect();

    let states = crate::models::states::Entity::find()
        .filter(crate::models::states::Column::Id.is_in(state_ids))
        .all(db)
        .await?;
    let state_map: HashMap<u32, _> = states.into_iter()
        .map(|s| (s.id, s))
        .collect();

    let cities = crate::models::cities::Entity::find()
        .filter(crate::models::cities::Column::Id.is_in(city_ids))
        .all(db)
        .await?;
    let city_map: HashMap<u32, _> = cities.into_iter()
        .map(|c| (c.id, c))
        .collect();

    // Load images and group by band_id
    let images = crate::models::band_images::Entity::find()
        .filter(crate::models::band_images::Column::BandId.is_in(band_ids.clone()))
        .all(db)
        .await?;
    let images_by_band: HashMap<u32, Vec<_>> = images.into_iter()
        .filter_map(|img| img.band_id.map(|id| (id, img)))
        .fold(HashMap::new(), |mut acc, (id, img)| {
            acc.entry(id).or_default().push(img);
            acc
        });

    // Build results with O(1) lookups instead of O(n²) nested finds
    let mut results = Vec::with_capacity(bands.len());
    for band in bands {
        let band_id = band.id;

        // O(band_sub_genres for this band) instead of O(all_bands_sub_genres × sub_genres)
        let band_sub_genres: Vec<_> = bands_sub_genres_by_band.get(&band_id)
            .map(|bsgs| {
                bsgs.iter()
                    .filter_map(|bsg| bsg.sub_genre_id.and_then(|id| sub_genre_map.get(&id).cloned()))
                    .collect()
            })
            .unwrap_or_default();

        // O(band_sub_genres) instead of O(genres × band_genre_ids)
        let band_genre_ids: HashSet<u32> = band_sub_genres.iter()
            .filter_map(|sg| sg.genre_id)
            .collect();
        let band_genres: Vec<_> = band_genre_ids.iter()
            .filter_map(|id| genre_map.get(id).cloned())
            .collect();

        // O(1) lookups instead of O(countries/states/cities)
        let country = band.country_id.and_then(|id| country_map.get(&id).cloned());
        let state = band.state_id.and_then(|id| state_map.get(&id).cloned());
        let city = band.city_id.and_then(|id| city_map.get(&id).cloned());

        // O(1) lookup instead of O(images)
        let band_images = images_by_band.get(&band_id)
            .cloned()
            .unwrap_or_default();

        // Note: Discography is not loaded here for performance reasons
        // Use get_band_by_id or get_band_discography for full album data

        results.push(BandResponse {
            band,
            genres: band_genres,
            sub_genres: band_sub_genres,
            country,
            state,
            city,
            images: band_images,
            albums: vec![], // Empty for list view - load separately when needed
        });
    }

    Ok(results)
}

/// Get full discography for a band (with album relations).
pub async fn get_band_discography(db: &DatabaseConnection, id: u32) -> Result<Vec<AlbumResponse>, DbErr> {
    // Query through junction table explicitly to avoid find_related JOIN issues
    // with nullable columns in albums_bands
    let album_bands = crate::models::albums_bands::Entity::find()
        .filter(crate::models::albums_bands::Column::BandId.eq(id))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading albums_bands for band {}: {}", id, e); e })?;

    let album_ids: Vec<u32> = album_bands.iter()
        .filter_map(|ab| ab.album_id)
        .collect();

    tracing::debug!("Band {} has {} album associations, {} valid album_ids", id, album_bands.len(), album_ids.len());

    if album_ids.is_empty() {
        return Ok(vec![]);
    }

    let albums = crate::models::albums::Entity::find()
        .filter(crate::models::albums::Column::Id.is_in(album_ids))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading albums for band {}: {}", id, e); e })?;

    tracing::debug!("Loaded {} albums for band {}, calling load_album_relations", albums.len(), id);

    AlbumService::load_album_relations(db, albums).await
        .map_err(|e| { tracing::error!("load_album_relations failed for band {}: {}", id, e); e })
}

/// Get band images by band ID.
pub async fn get_band_images(db: &DatabaseConnection, band_id: u32) -> Result<Vec<crate::models::band_images::Model>, DbErr> {
    crate::models::band_images::Entity::find()
        .filter(crate::models::band_images::Column::BandId.eq(band_id))
        .all(db)
        .await
}
