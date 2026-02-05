//! Band list and paginated query functions.

use crate::models::bands::{Entity as Band, Column as BandColumn};
use crate::models::band_images::{Entity as BandImage, Column as BandImageColumn};
use crate::models::bands_sub_genres::Column as BandsSubGenresColumn;
use crate::views::band::{BandListView, BandListViewEnriched};
use crate::services::types::{PaginatedResponse, PaginationInfo};
use super::types::{BandResponse, BandFilterParams};
use super::relations::load_band_relations;
use sea_orm::*;
use std::collections::{HashMap, HashSet};

/// Get paginated list of bands with full relations.
pub async fn get_bands(
    db: &DatabaseConnection,
    params: BandFilterParams,
) -> Result<PaginatedResponse<BandResponse>, DbErr> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    let mut query = Band::find();

    if let Some(name) = params.name
        && !name.is_empty() {
            match params.name_filter_type.as_deref() {
                Some("starts_with") => {
                    query = query.filter(crate::models::bands::Column::Name.starts_with(&name));
                }
                Some("ends_with") => {
                    query = query.filter(crate::models::bands::Column::Name.ends_with(&name));
                }
                Some("exact_match") => {
                    query = query.filter(crate::models::bands::Column::Name.eq(&name));
                }
                _ => {
                    query = query.filter(crate::models::bands::Column::Name.contains(&name));
                }
            }
        }

    if let Some(country_id) = params.country_id {
        query = query.filter(crate::models::bands::Column::CountryId.eq(country_id));
    }
    if let Some(state_id) = params.state_id {
        query = query.filter(crate::models::bands::Column::StateId.eq(state_id));
    }
    if let Some(city_id) = params.city_id {
        query = query.filter(crate::models::bands::Column::CityId.eq(city_id));
    }

    if let Some(verified) = params.verified {
        query = query.filter(crate::models::bands::Column::Verified.eq(if verified { 1 } else { 0 }));
    }
    if let Some(approved) = params.approved {
        query = query.filter(crate::models::bands::Column::Approved.eq(if approved { 1 } else { 0 }));
    }

    if let Some(sub_genre_id) = params.sub_genre_id {
        query = query
            .join_rev(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(crate::models::bands::Entity)
                    .from(crate::models::bands_sub_genres::Column::BandId)
                    .to(crate::models::bands::Column::Id)
                    .into(),
            )
            .filter(crate::models::bands_sub_genres::Column::SubGenreId.eq(sub_genre_id));
    } else if let Some(genre_id) = params.genre_id {
        query = query
            .join_rev(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(crate::models::bands::Entity)
                    .from(crate::models::bands_sub_genres::Column::BandId)
                    .to(crate::models::bands::Column::Id)
                    .into(),
            )
            .join(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(crate::models::sub_genres::Entity)
                    .from(crate::models::bands_sub_genres::Column::SubGenreId)
                    .to(crate::models::sub_genres::Column::Id)
                    .into(),
            )
            .filter(crate::models::sub_genres::Column::GenreId.eq(genre_id))
            // Exclude "Unknown Genre" sub-genre (id 35) to prevent false matches
            .filter(crate::models::sub_genres::Column::Id.ne(35));
    }

    if let Some(sort_field) = params.sort_field {
        let order = if params.sort_ascending.unwrap_or(true) {
            Order::Asc
        } else {
            Order::Desc
        };

        match sort_field.as_str() {
            "name" => {
                query = query.order_by(crate::models::bands::Column::Name, order);
            }
            "created" => {
                query = query.order_by(crate::models::bands::Column::Created, order);
            }
            "modified" => {
                query = query.order_by(crate::models::bands::Column::Modified, order);
            }
            _ => {
                query = query.order_by(crate::models::bands::Column::Id, order);
            }
        }
    } else {
        query = query.order_by_desc(crate::models::bands::Column::Id);
    }

    let paginator = query.paginate(db, page_size);
    let total_items = paginator.num_items().await?;
    let total_pages = paginator.num_pages().await?;

    let bands = paginator.fetch_page(page - 1).await?;
    let results = load_band_relations(db, bands).await?;

    Ok(PaginatedResponse {
        results,
        pagination: PaginationInfo {
            page,
            page_size,
            total_pages,
            total_items,
        },
    })
}

/// Optimized list endpoint using partial model selection.
///
/// Fetches only essential columns (~10 instead of 40+) for list/table displays,
/// significantly reducing response size and improving query performance.
pub async fn get_bands_list(
    db: &DatabaseConnection,
    params: BandFilterParams,
) -> Result<PaginatedResponse<BandListViewEnriched>, DbErr> {
    let page = params.page.unwrap_or(1);
    let page_size = params.page_size.unwrap_or(10);

    // Build base query with select_only for partial model
    let mut query = Band::find()
        .select_only()
        .column(BandColumn::Id)
        .column(BandColumn::Name)
        .column(BandColumn::Slug)
        .column(BandColumn::Verified)
        .column(BandColumn::Approved)
        .column(BandColumn::CountryId)
        .column(BandColumn::StateId)
        .column(BandColumn::CityId)
        .column(BandColumn::Created)
        .column(BandColumn::Modified);

    // Apply filters
    if let Some(name) = params.name
        && !name.is_empty() {
            match params.name_filter_type.as_deref() {
                Some("starts_with") => {
                    query = query.filter(BandColumn::Name.starts_with(&name));
                }
                Some("ends_with") => {
                    query = query.filter(BandColumn::Name.ends_with(&name));
                }
                Some("exact_match") => {
                    query = query.filter(BandColumn::Name.eq(&name));
                }
                _ => {
                    query = query.filter(BandColumn::Name.contains(&name));
                }
            }
        }

    if let Some(country_id) = params.country_id {
        query = query.filter(BandColumn::CountryId.eq(country_id));
    }
    if let Some(state_id) = params.state_id {
        query = query.filter(BandColumn::StateId.eq(state_id));
    }
    if let Some(city_id) = params.city_id {
        query = query.filter(BandColumn::CityId.eq(city_id));
    }
    if let Some(verified) = params.verified {
        query = query.filter(BandColumn::Verified.eq(if verified { 1 } else { 0 }));
    }
    if let Some(approved) = params.approved {
        query = query.filter(BandColumn::Approved.eq(if approved { 1 } else { 0 }));
    }

    // Handle genre/sub-genre filtering (requires join)
    if let Some(sub_genre_id) = params.sub_genre_id {
        query = query
            .join_rev(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(Band)
                    .from(BandsSubGenresColumn::BandId)
                    .to(BandColumn::Id)
                    .into(),
            )
            .filter(BandsSubGenresColumn::SubGenreId.eq(sub_genre_id));
    } else if let Some(genre_id) = params.genre_id {
        query = query
            .join_rev(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(Band)
                    .from(BandsSubGenresColumn::BandId)
                    .to(BandColumn::Id)
                    .into(),
            )
            .join(
                JoinType::InnerJoin,
                crate::models::bands_sub_genres::Entity::belongs_to(crate::models::sub_genres::Entity)
                    .from(BandsSubGenresColumn::SubGenreId)
                    .to(crate::models::sub_genres::Column::Id)
                    .into(),
            )
            .filter(crate::models::sub_genres::Column::GenreId.eq(genre_id))
            // Exclude "Unknown Genre" sub-genre (id 35) to prevent false matches
            .filter(crate::models::sub_genres::Column::Id.ne(35));
    }

    // Apply sorting
    if let Some(sort_field) = params.sort_field {
        let order = if params.sort_ascending.unwrap_or(true) {
            Order::Asc
        } else {
            Order::Desc
        };
        match sort_field.as_str() {
            "name" => query = query.order_by(BandColumn::Name, order),
            "created" => query = query.order_by(BandColumn::Created, order),
            "modified" => query = query.order_by(BandColumn::Modified, order),
            _ => query = query.order_by(BandColumn::Id, order),
        }
    } else {
        query = query.order_by_desc(BandColumn::Id);
    }

    // Get paginated results using partial model
    let paginator = query.clone().into_model::<BandListView>().paginate(db, page_size);
    let total_items = paginator.num_items().await?;
    let total_pages = paginator.num_pages().await?;
    let bands = paginator.fetch_page(page - 1).await?;

    // Enrich with location names and genres
    let enriched = enrich_band_list_views(db, bands).await?;

    Ok(PaginatedResponse {
        results: enriched,
        pagination: PaginationInfo {
            page,
            page_size,
            total_pages,
            total_items,
        },
    })
}

/// Enrich band list views with resolved location names and genres.
pub(super) async fn enrich_band_list_views(
    db: &DatabaseConnection,
    bands: Vec<BandListView>,
) -> Result<Vec<BandListViewEnriched>, DbErr> {
    if bands.is_empty() {
        return Ok(vec![]);
    }

    let band_ids: Vec<u32> = bands.iter().map(|b| b.id).collect();

    // Collect unique location IDs
    let country_ids: Vec<u32> = bands.iter().filter_map(|b| b.country_id).collect();
    let state_ids: Vec<u32> = bands.iter().filter_map(|b| b.state_id).collect();
    let city_ids: Vec<u32> = bands.iter().filter_map(|b| b.city_id).collect();

    // Load locations in parallel using HashMap lookups
    let countries: HashMap<u32, String> = if !country_ids.is_empty() {
        crate::models::countries::Entity::find()
            .filter(crate::models::countries::Column::Id.is_in(country_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|c| c.name.map(|n| (c.id, n)))
            .collect()
    } else {
        HashMap::new()
    };

    let states: HashMap<u32, String> = if !state_ids.is_empty() {
        crate::models::states::Entity::find()
            .filter(crate::models::states::Column::Id.is_in(state_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|s| s.name.map(|n| (s.id, n)))
            .collect()
    } else {
        HashMap::new()
    };

    let cities: HashMap<u32, String> = if !city_ids.is_empty() {
        crate::models::cities::Entity::find()
            .filter(crate::models::cities::Column::Id.is_in(city_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|c| c.name.map(|n| (c.id, n)))
            .collect()
    } else {
        HashMap::new()
    };

    // Load sub-genres for all bands
    let bands_sub_genres = crate::models::bands_sub_genres::Entity::find()
        .filter(BandsSubGenresColumn::BandId.is_in(band_ids.clone()))
        .all(db)
        .await?;

    let sub_genre_ids: Vec<u32> = bands_sub_genres.iter().filter_map(|bsg| bsg.sub_genre_id).collect();

    let sub_genres: HashMap<u32, (String, Option<u32>)> = if !sub_genre_ids.is_empty() {
        crate::models::sub_genres::Entity::find()
            .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|sg| sg.name.clone().map(|n| (sg.id, (n, sg.genre_id))))
            .collect()
    } else {
        HashMap::new()
    };

    // Load genres
    let genre_ids: Vec<u32> = sub_genres.values().filter_map(|(_, gid)| *gid).collect();
    let genres: HashMap<u32, String> = if !genre_ids.is_empty() {
        crate::models::genres::Entity::find()
            .filter(crate::models::genres::Column::Id.is_in(genre_ids))
            .all(db)
            .await?
            .into_iter()
            .filter_map(|g| g.name.map(|n| (g.id, n)))
            .collect()
    } else {
        HashMap::new()
    };

    // Group sub-genres by band
    let mut sub_genres_by_band: HashMap<u32, Vec<u32>> = HashMap::new();
    for bsg in &bands_sub_genres {
        if let (Some(band_id), Some(sg_id)) = (bsg.band_id, bsg.sub_genre_id) {
            sub_genres_by_band.entry(band_id).or_default().push(sg_id);
        }
    }

    // Load first image for each band
    // TODO: Implement thumbnail generation on upload so we don't need to
    // prefer thumbname over filename here - just serve a single canonical URL.
    let images = BandImage::find()
        .filter(BandImageColumn::BandId.is_in(band_ids.clone()))
        .order_by_asc(BandImageColumn::Order)
        .all(db)
        .await?;

    let mut first_image_by_band: HashMap<u32, String> = HashMap::new();
    for img in images {
        if let Some(band_id) = img.band_id {
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
                first_image_by_band.entry(band_id).or_insert(url);
            }
        }
    }

    // Build enriched results
    let results: Vec<BandListViewEnriched> = bands
        .into_iter()
        .map(|band| {
            let country_name = band.country_id.and_then(|id| countries.get(&id).cloned());
            let state_name = band.state_id.and_then(|id| states.get(&id).cloned());
            let city_name = band.city_id.and_then(|id| cities.get(&id).cloned());

            let band_sg_ids = sub_genres_by_band.get(&band.id).cloned().unwrap_or_default();
            let mut genre_names: Vec<String> = Vec::new();
            let mut sub_genre_names: Vec<String> = Vec::new();
            let mut seen_genres: HashSet<u32> = HashSet::new();

            for sg_id in &band_sg_ids {
                if let Some((sg_name, maybe_genre_id)) = sub_genres.get(sg_id) {
                    sub_genre_names.push(sg_name.clone());
                    if let Some(genre_id) = maybe_genre_id
                        && seen_genres.insert(*genre_id)
                            && let Some(g_name) = genres.get(genre_id) {
                                genre_names.push(g_name.clone());
                            }
                }
            }

            let image_url = first_image_by_band.get(&band.id).cloned();

            BandListViewEnriched::new(
                band,
                country_name,
                state_name,
                city_name,
                genre_names,
                sub_genre_names,
                image_url,
            )
        })
        .collect();

    Ok(results)
}
