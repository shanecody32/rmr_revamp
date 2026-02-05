//! Band detail and single-record query functions.

use crate::models::bands::{Entity as Band, Model as BandModel};
use crate::models::band_images::{Entity as BandImage, Column as BandImageColumn};
use crate::models::albums_bands::{Entity as AlbumsBands, Column as AlbumsBandsColumn};
use crate::models::bands_sub_genres::Column as BandsSubGenresColumn;
use crate::views::band::BandDetailView;
use crate::views::album::AlbumSummary;
use super::types::BandResponse;
use super::relations::{load_band_relations, get_band_discography};
use sea_orm::*;
use std::collections::HashMap;

/// Get band by ID with optional album loading.
///
/// By default, albums are not loaded. Pass `include_albums: true` to include discography.
pub async fn get_band_by_id_detailed(
    db: &DatabaseConnection,
    id: u32,
    include_albums: bool,
) -> Result<Option<BandDetailView>, DbErr> {
    let band = Band::find_by_id(id).one(db).await?;
    if let Some(band) = band {
        let mut view = load_band_detail_view(db, band).await
            .map_err(|e| {
                tracing::error!("load_band_detail_view failed for band {}: {}", id, e);
                e
            })?;

        if include_albums {
            let albums = get_band_discography(db, id).await
                .map_err(|e| {
                    tracing::error!("get_band_discography failed for band {}: {}", id, e);
                    e
                })?;
            view = view.with_albums(albums);
        }

        Ok(Some(view))
    } else {
        Ok(None)
    }
}

/// Load a single band's detail view with all relations.
async fn load_band_detail_view(
    db: &DatabaseConnection,
    band: BandModel,
) -> Result<BandDetailView, DbErr> {
    let band_id = band.id;

    // Load sub-genres
    let bands_sub_genres = crate::models::bands_sub_genres::Entity::find()
        .filter(BandsSubGenresColumn::BandId.eq(band_id))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading bands_sub_genres for band {}: {}", band_id, e); e })?;

    let sub_genre_ids: Vec<u32> = bands_sub_genres.iter().filter_map(|bsg| bsg.sub_genre_id).collect();
    let sub_genres = crate::models::sub_genres::Entity::find()
        .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading sub_genres for band {}: {}", band_id, e); e })?;

    // Load genres from sub-genres
    let genre_ids: Vec<u32> = sub_genres.iter().filter_map(|sg| sg.genre_id).collect();
    let genres = crate::models::genres::Entity::find()
        .filter(crate::models::genres::Column::Id.is_in(genre_ids))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading genres for band {}: {}", band_id, e); e })?;

    // Load location data
    let country = if let Some(id) = band.country_id {
        crate::models::countries::Entity::find_by_id(id).one(db).await
            .map_err(|e| { tracing::error!("Failed loading country {} for band {}: {}", id, band_id, e); e })?
    } else {
        None
    };

    let state = if let Some(id) = band.state_id {
        crate::models::states::Entity::find_by_id(id).one(db).await
            .map_err(|e| { tracing::error!("Failed loading state {} for band {}: {}", id, band_id, e); e })?
    } else {
        None
    };

    let city = if let Some(id) = band.city_id {
        crate::models::cities::Entity::find_by_id(id).one(db).await
            .map_err(|e| { tracing::error!("Failed loading city {} for band {}: {}", id, band_id, e); e })?
    } else {
        None
    };

    // Load images
    let images = BandImage::find()
        .filter(BandImageColumn::BandId.eq(band_id))
        .all(db)
        .await
        .map_err(|e| { tracing::error!("Failed loading images for band {}: {}", band_id, e); e })?;

    Ok(BandDetailView::new(
        band,
        genres,
        sub_genres,
        country,
        state,
        city,
        images,
    ))
}

/// Get band discography as album summaries (lightweight).
pub async fn get_band_discography_summary(
    db: &DatabaseConnection,
    band_id: u32,
) -> Result<Vec<AlbumSummary>, DbErr> {
    let band = Band::find_by_id(band_id).one(db).await?;
    if band.is_none() {
        return Ok(vec![]);
    }

    // Get albums through albums_bands junction
    let album_bands = AlbumsBands::find()
        .filter(AlbumsBandsColumn::BandId.eq(band_id))
        .all(db)
        .await?;

    let album_ids: Vec<u32> = album_bands.iter().filter_map(|ab| ab.album_id).collect();
    if album_ids.is_empty() {
        return Ok(vec![]);
    }

    let albums = crate::models::albums::Entity::find()
        .filter(crate::models::albums::Column::Id.is_in(album_ids.clone()))
        .all(db)
        .await?;

    // Get song counts per album
    let album_songs = crate::models::albums_songs::Entity::find()
        .filter(crate::models::albums_songs::Column::AlbumId.is_in(album_ids.clone()))
        .all(db)
        .await?;

    let mut song_counts: HashMap<u32, usize> = HashMap::new();
    for as_ in &album_songs {
        *song_counts.entry(as_.album_id).or_default() += 1;
    }

    // Get sub-genre names for charting genre
    let sub_genre_ids: Vec<u32> = albums.iter().filter_map(|a| a.sub_genre_for_charting).collect();
    let sub_genres: HashMap<u32, String> = if !sub_genre_ids.is_empty() {
        crate::models::sub_genres::Entity::find()
            .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|sg| sg.name.map(|n| (sg.id, n)))
            .collect()
    } else {
        HashMap::new()
    };

    // Load first image from album_images table for each album.
    // TODO: Improve image handling - album.img is an external link from the old system.
    // In the future, all images should come from the album_images table exclusively.
    let album_images = crate::models::album_images::Entity::find()
        .filter(crate::models::album_images::Column::AlbumId.is_in(album_ids.clone()))
        .all(db)
        .await?;

    let mut first_image_by_album: HashMap<u32, String> = HashMap::new();
    for img in album_images {
        if let Some(album_id) = img.album_id {
            let filename = img.thumbname.as_ref().or(img.filename.as_ref());
            if let Some(name) = filename {
                let url = match &img.path {
                    Some(path) if !path.is_empty() => {
                        let clean = path.strip_prefix("img/").unwrap_or(path);
                        let clean = clean.trim_matches('/');
                        format!("/media/{}/{}", clean, name)
                    }
                    _ => format!("/media/{}", name),
                };
                first_image_by_album.entry(album_id).or_insert(url);
            }
        }
    }

    let mut summaries: Vec<AlbumSummary> = albums
        .into_iter()
        .map(|album| {
            let song_count = song_counts.get(&album.id).copied().unwrap_or(0);
            let genre_name = album.sub_genre_for_charting
                .and_then(|id| sub_genres.get(&id).cloned());

            // Image fallback chain: album_images table -> album.img (external link)
            let image_url = first_image_by_album
                .get(&album.id)
                .cloned()
                .or_else(|| album.img.clone());

            AlbumSummary::new(
                album.id,
                album.name,
                album.slug,
                album.release_date,
                album.img,
                image_url,
                song_count,
                genre_name,
            )
        })
        .collect();

    // Sort by release_date desc (newest first), then by id desc (newest created first)
    summaries.sort_by(|a, b| {
        match (&b.release_date, &a.release_date) {
            (Some(b_date), Some(a_date)) => b_date.cmp(a_date),
            (Some(_), None) => std::cmp::Ordering::Less,
            (None, Some(_)) => std::cmp::Ordering::Greater,
            (None, None) => std::cmp::Ordering::Equal,
        }
        .then_with(|| b.id.cmp(&a.id))
    });

    Ok(summaries)
}

/// Get band by ID with full relations (legacy endpoint).
pub async fn get_band_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<BandResponse>, DbErr> {
    let band = Band::find_by_id(id).one(db).await?;
    if let Some(band) = band {
        let mut results = load_band_relations(db, vec![band]).await?;
        // Load discography for single band detail view
        if let Some(ref mut band_response) = results.first_mut() {
            band_response.albums = get_band_discography(db, id).await?;
        }
        Ok(results.into_iter().next())
    } else {
        Ok(None)
    }
}
