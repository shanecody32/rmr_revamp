use crate::models::bands::{Entity as Band, Model as BandModel, ActiveModel as BandActiveModel};
use crate::models::genres::Model as GenreModel;
use crate::models::sub_genres::Model as SubGenreModel;
use crate::models::countries::Model as CountryModel;
use crate::models::states::Model as StateModel;
use crate::models::cities::Model as CityModel;
use crate::models::band_images::{Entity as BandImage, Model as BandImageModel, Column as BandImageColumn};
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
use crate::services::album_service::{AlbumService, AlbumResponse};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use utoipa::{IntoParams, ToSchema};
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use std::collections::HashSet;

pub struct BandService;

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct BandResponse {
    #[serde(flatten)]
    pub band: BandModel,
    pub genres: Vec<GenreModel>,
    pub sub_genres: Vec<SubGenreModel>,
    pub country: Option<CountryModel>,
    pub state: Option<StateModel>,
    pub city: Option<CityModel>,
    pub images: Vec<BandImageModel>,
    pub albums: Vec<AlbumResponse>,
}

#[derive(Debug, Deserialize, IntoParams)]
pub struct BandFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub country_id: Option<u32>,
    pub state_id: Option<u32>,
    pub city_id: Option<u32>,
    pub genre_id: Option<u32>,
    pub sub_genre_id: Option<u32>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}


#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeBandsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

/// Statistics about what was moved during a merge
#[derive(Debug, Serialize, ToSchema, Default)]
pub struct MergeStats {
    pub images_moved: u32,
    pub links_moved: u32,
    pub aliases_moved: u32,
    pub songs_moved: u32,
    pub albums_moved: u32,
    pub reviews_moved: u32,
    pub users_moved: u32,
    pub sub_genres_added: u32,
    pub playlists_updated: u32,
    pub playlist_archives_updated: u32,
    pub raw_data_updated: u32,
    pub bands_deleted: u32,
}

/// Duplicate song found during merge (same name in target band)
#[derive(Debug, Serialize, ToSchema)]
pub struct SongDuplicate {
    pub from_song_id: u32,
    pub from_song_name: String,
    pub target_song_id: u32,
    pub target_song_name: String,
}

/// Duplicate album found during merge (same name in target band)
#[derive(Debug, Serialize, ToSchema)]
pub struct AlbumDuplicate {
    pub from_album_id: u32,
    pub from_album_name: String,
    pub target_album_id: u32,
    pub target_album_name: String,
}

/// Result of a merge operation
#[derive(Debug, Serialize, ToSchema)]
pub struct MergeResult {
    pub merged_band: BandModel,
    pub duplicate_songs: Vec<SongDuplicate>,
    pub duplicate_albums: Vec<AlbumDuplicate>,
    pub stats: MergeStats,
}

impl BandService {
    pub async fn get_bands(
        db: &DatabaseConnection,
        params: BandFilterParams,
    ) -> Result<PaginatedResponse<BandResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = Band::find();

        if let Some(name) = params.name {
            if !name.is_empty() {
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
                .filter(crate::models::sub_genres::Column::GenreId.eq(genre_id));
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
        let results = Self::load_band_relations(db, bands).await?;

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

    pub async fn get_band_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<BandResponse>, DbErr> {
        let band = Band::find_by_id(id).one(db).await?;
        if let Some(band) = band {
            let mut results = Self::load_band_relations(db, vec![band]).await?;
            // Load discography for single band detail view
            if let Some(ref mut band_response) = results.first_mut() {
                band_response.albums = Self::get_band_discography(db, id).await?;
            }
            Ok(results.into_iter().next())
        } else {
            Ok(None)
        }
    }

    pub async fn load_band_relations(
        db: &DatabaseConnection,
        bands: Vec<BandModel>,
    ) -> Result<Vec<BandResponse>, DbErr> {
        use std::collections::{HashMap, HashSet};

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
            .filter_map(|sg| sg.genre_id.map(|id| id as u32))
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
                .filter_map(|sg| sg.genre_id.map(|id| id as u32))
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

    pub async fn create_band(db: &DatabaseConnection, data: BandModel) -> Result<BandModel, DbErr> {
        let active_model: BandActiveModel = BandActiveModel {
            name: Set(data.name),
            city_id: Set(data.city_id),
            country_id: Set(data.country_id),
            state_id: Set(data.state_id),
            website: Set(data.website),
            email: Set(data.email),
            ..Default::default()
        };
        active_model.insert(db).await
    }

    pub async fn update_band(db: &DatabaseConnection, id: u32, data: BandModel) -> Result<BandModel, DbErr> {
        let band = Band::find_by_id(id).one(db).await?;
        if let Some(band) = band {
            let mut active_model: BandActiveModel = band.into();
            active_model.name = Set(data.name);
            active_model.city_id = Set(data.city_id);
            active_model.country_id = Set(data.country_id);
            active_model.state_id = Set(data.state_id);
            active_model.website = Set(data.website);
            active_model.email = Set(data.email);
            // ... update other fields as needed
            active_model.update(db).await
        } else {
            Err(DbErr::RecordNotFound("Band not found".to_string()))
        }
    }

    pub async fn get_similar_bands(db: &DatabaseConnection, params: SimilarityParams) -> Result<Vec<SimilarResult<BandResponse>>, DbErr> {
        tracing::debug!("get_similar_bands called with search_term: {}", params.search_term);

        let search_term = &params.search_term;
        let sanitized = crate::utils::slug::sanitize_name(search_term);

        // PHASE 1: Search band_aliases table (for indexed phonetic matches)
        let mut alias_results: Vec<SimilarResult<crate::models::band_aliases::Model>> = Vec::new();

        let mut alias_query = BandAlias::find();
        if let Some(true) = params.restrict_to_parent {
            if let Some(country_id) = params.country_id {
                alias_query = alias_query.join(JoinType::InnerJoin, BandAlias::belongs_to(Band).from(BandAliasColumn::BandId).to(crate::models::bands::Column::Id).into())
                             .filter(crate::models::bands::Column::CountryId.eq(country_id));
            }
        }

        match find_similar_pipeline(
            db,
            alias_query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: BandAliasColumn::AliasKey,
                slug: BandAliasColumn::Slug,
                sanitized: Some(BandAliasColumn::SanitizedName),
                soundex: Some(BandAliasColumn::SoundexKey),
                phonetic: Some(BandAliasColumn::PhoneticKey),
                metaphone: Some(BandAliasColumn::MetaphoneKey),
                dmetaphone: Some(BandAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(BandAliasColumn::DmetaphoneAltKey),
            },
            params.clone(),
            BandAliasColumn::BandId,
            |m| m.alias_key.clone(),
        ).await {
            Ok(r) => {
                tracing::debug!("Alias search returned {} results", r.len());
                alias_results = r;
            },
            Err(e) => {
                tracing::warn!("Alias search error (continuing with direct search): {:?}", e);
            }
        };

        // PHASE 2: Also search bands table directly (catches bands without aliases)
        // This is important because the backfill may not have run yet
        let direct_bands = Band::find()
            .filter(
                Condition::any()
                    .add(crate::models::bands::Column::Name.contains(search_term))
                    .add(crate::models::bands::Column::Name.contains(&sanitized))
                    .add(crate::models::bands::Column::Slug.eq(crate::utils::slug::slug_it(search_term)))
            )
            .limit(500)
            .all(db)
            .await?;

        tracing::debug!("Direct band search returned {} results", direct_bands.len());

        // Score the direct results using fuzzy matching
        let min_score = params.min_similarity.unwrap_or(40);
        let jw_weight = params.jw_weight.unwrap_or(0.5);
        let dice_weight = params.dice_weight.unwrap_or(0.5);

        let mut direct_results: Vec<SimilarResult<BandModel>> = Vec::new();
        for band in direct_bands {
            let band_name_sanitized = crate::utils::slug::sanitize_name(&band.name);
            if let Some(score) = crate::utils::similarity::pipeline::calculate_similarity_score(
                &sanitized,
                &band_name_sanitized,
                jw_weight,
                dice_weight,
                min_score,
            ) {
                direct_results.push(SimilarResult {
                    model: band,
                    similarity_score: score,
                });
            }
        }

        // Combine alias results with direct results
        // First, get band IDs from alias results
        let alias_band_ids: Vec<u32> = alias_results.iter().map(|r| r.model.band_id).collect();

        // Load bands for alias results
        let alias_bands = if !alias_band_ids.is_empty() {
            Band::find()
                .filter(crate::models::bands::Column::Id.is_in(alias_band_ids.clone()))
                .all(db)
                .await?
        } else {
            Vec::new()
        };

        // Convert alias results to band results
        let mut final_results: Vec<SimilarResult<BandModel>> = Vec::new();
        for r in alias_results {
            if let Some(band) = alias_bands.iter().find(|b| b.id == r.model.band_id) {
                final_results.push(SimilarResult {
                    model: band.clone(),
                    similarity_score: r.similarity_score,
                });
            }
        }

        // Add direct results that aren't already in final_results
        let existing_ids: std::collections::HashSet<u32> = final_results.iter().map(|r| r.model.id).collect();
        for r in direct_results {
            if !existing_ids.contains(&r.model.id) {
                final_results.push(r);
            }
        }

        // Filter out the existing_id if provided
        if let Some(exclude_id) = params.existing_id {
            final_results.retain(|r| r.model.id != exclude_id);
        }

        // Sort by similarity score descending
        final_results.sort_by(|a, b| b.similarity_score.cmp(&a.similarity_score));

        // De-duplicate final results by band ID
        let mut seen = std::collections::HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        // Limit results (default 20)
        let limit = params.limit.unwrap_or(20);
        final_results.truncate(limit);

        // Load full band relations for the limited results
        let band_models: Vec<BandModel> = final_results.iter().map(|r| r.model.clone()).collect();
        let bands_with_relations = Self::load_band_relations(db, band_models).await?;

        // Map back with scores, maintaining the original order
        let mut results_with_relations: Vec<SimilarResult<BandResponse>> = Vec::new();
        for result in &final_results {
            if let Some(full) = bands_with_relations.iter().find(|b| b.band.id == result.model.id) {
                results_with_relations.push(SimilarResult {
                    model: full.clone(),
                    similarity_score: result.similarity_score,
                });
            }
        }

        Ok(results_with_relations)
    }

    pub async fn merge_bands(db: &DatabaseConnection, req: MergeBandsRequest) -> Result<MergeResult, DbErr> {
        // Validate target band exists
        let into_band = Band::find_by_id(req.into_id).one(db).await?;
        if into_band.is_none() {
            return Err(DbErr::RecordNotFound("Target band not found".to_string()));
        }

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

                    // Update fields from merged_data
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
                        // Skip if path already exists in target
                        if let Some(ref path) = img.path {
                            if existing_paths.contains(path) {
                                continue;
                            }
                        }
                        // Move image to target band
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
                        if let Some(ref url) = lnk.link {
                            if existing_links.contains(url) {
                                continue;
                            }
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
                            // No target contact, move this one
                            let mut active: crate::models::band_contact::ActiveModel = contact.into();
                            active.band_id = Set(Some(target_id));
                            active.update(txn).await?;
                        } else {
                            // Delete source contact
                            let active: crate::models::band_contact::ActiveModel = contact.into();
                            active.delete(txn).await?;
                        }
                    }
                }

                // 5. Move aliases (dedupe by alias_key)
                let existing_aliases: HashSet<String> = BandAlias::find()
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
                            // Delete duplicate alias
                            let active: crate::models::band_aliases::ActiveModel = alias.into();
                            active.delete(txn).await?;
                            continue;
                        }
                        let mut active: crate::models::band_aliases::ActiveModel = alias.into();
                        active.band_id = Set(target_id);
                        active.update(txn).await?;
                        stats.aliases_moved += 1;
                    }
                }

                // 6. Move songs (flag duplicates by name for review)
                let existing_songs: std::collections::HashMap<String, u32> = Song::find()
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
                        if let Some(ref name) = song.name {
                            if let Some(&target_song_id) = existing_songs.get(&name.to_lowercase()) {
                                // Found duplicate - flag for review
                                duplicate_songs.push(SongDuplicate {
                                    from_song_id: song.id,
                                    from_song_name: name.clone(),
                                    target_song_id,
                                    target_song_name: name.clone(),
                                });
                                continue;
                            }
                        }
                        let mut active: crate::models::songs::ActiveModel = song.into();
                        active.band_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.songs_moved += 1;
                    }
                }

                // 7. Move album associations (flag duplicates)
                let existing_albums: std::collections::HashMap<u32, String> = AlbumsBands::find()
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
                        if let Some(album_id) = ab.album_id {
                            if existing_albums.contains_key(&album_id) {
                                // Album already associated with target, delete duplicate association
                                let active: crate::models::albums_bands::ActiveModel = ab.into();
                                active.delete(txn).await?;
                                continue;
                            }
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
                        if let Some(user_id) = bu.user_id {
                            if existing_users.contains(&user_id) {
                                // User already associated, delete duplicate
                                let active: crate::models::bands_users::ActiveModel = bu.into();
                                active.delete(txn).await?;
                                continue;
                            }
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
                        if let Some(sg_id) = bsg.sub_genre_id {
                            if existing_sub_genres.contains(&sg_id) {
                                // Sub-genre already associated, delete duplicate
                                let active: crate::models::bands_sub_genres::ActiveModel = bsg.into();
                                active.delete(txn).await?;
                                continue;
                            }
                        }
                        let mut active: crate::models::bands_sub_genres::ActiveModel = bsg.into();
                        active.band_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.sub_genres_added += 1;
                    }
                }

                // 11. Update playlist data (move all)
                for from_id in &from_ids {
                    let playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for pl in playlists {
                        let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                        active.band_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.playlists_updated += 1;
                    }
                }

                // 12. Update playlist archives (move all)
                for from_id in &from_ids {
                    let archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::BandId.eq(*from_id))
                        .all(txn)
                        .await?;

                    for arch in archives {
                        let mut active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                        active.band_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.playlist_archives_updated += 1;
                    }
                }

                // 13. Update raw data (move all)
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

                // 14. Delete source bands
                for from_id in &from_ids {
                    Band::delete_by_id(*from_id).exec(txn).await?;
                    stats.bands_deleted += 1;
                }

                // 15. Get and return the updated target band
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

        Ok(result)
    }

    pub async fn get_band_discography(db: &DatabaseConnection, id: u32) -> Result<Vec<AlbumResponse>, DbErr> {
        let band = Band::find_by_id(id).one(db).await?;
        if let Some(band) = band {
            let albums = band.find_related(crate::models::albums::Entity).all(db).await?;
            AlbumService::load_album_relations(db, albums).await
        } else {
            Ok(vec![])
        }
    }

    pub async fn get_band_images(db: &DatabaseConnection, band_id: u32) -> Result<Vec<crate::models::band_images::Model>, DbErr> {
        crate::models::band_images::Entity::find()
            .filter(crate::models::band_images::Column::BandId.eq(band_id))
            .all(db)
            .await
    }
}
