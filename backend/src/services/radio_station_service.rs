use crate::models::radio_stations::{Entity as RadioStation, Model as RadioStationModel, ActiveModel as RadioStationActiveModel};
use sea_orm::*;
use sea_orm::sea_query::Expr;
use serde::Deserialize;
use utoipa::IntoParams;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::models::radio_station_aliases::{Entity as RadioStationAlias, Column as RadioStationAliasColumn};
use crate::models::radio_addresses::{Entity as RadioAddress, Column as RadioAddressColumn};
use crate::models::radio_affiliates::{Entity as RadioAffiliate, Column as RadioAffiliateColumn};
use crate::models::radio_emails::{Entity as RadioEmail, Column as RadioEmailColumn};
use crate::models::radio_images::{Entity as RadioImage, Column as RadioImageColumn};
use crate::models::radio_links::{Entity as RadioLink, Column as RadioLinkColumn};
use crate::models::radio_phone_numbers::{Entity as RadioPhone, Column as RadioPhoneColumn};
use crate::models::radio_internet_details::{Entity as RadioInternetDetail, Column as RadioInternetDetailColumn};
use crate::models::radio_satellite_details::{Entity as RadioSatelliteDetail, Column as RadioSatelliteDetailColumn};
use crate::models::radio_syndicated_details::{Entity as RadioSyndicatedDetail, Column as RadioSyndicatedDetailColumn};
use crate::models::radio_terrestrial_details::{Entity as RadioTerrestrialDetail, Column as RadioTerrestrialDetailColumn};
use crate::models::staff_members::{Entity as StaffMember, Column as StaffMemberColumn};
use crate::models::radio_stations_sub_genres::{Entity as RadioStationSubGenre, Column as RadioStationSubGenreColumn};
use crate::models::radio_stations_users::{Entity as RadioStationUser, Column as RadioStationUserColumn};
use crate::models::radio_playlists::{Entity as RadioPlaylist, Column as RadioPlaylistColumn};
use crate::models::radio_playlist_archives::{Entity as RadioPlaylistArchive, Column as RadioPlaylistArchiveColumn};
use crate::models::radio_raw_datas::{Entity as RadioRawData, Column as RadioRawDataColumn};
use crate::models::song_aliases::{Entity as SongAlias, Column as SongAliasColumn};
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::models::radio_station_duplicate_candidates::{Entity as RadioStationDuplicateCandidate, Column as RadioStationDuplicateCandidateColumn};
use crate::models::cities::Entity as City;
use crate::models::states::Entity as State;
use crate::services::action_log_service::ActionLogService;
use serde::Serialize;
use utoipa::ToSchema;
use std::collections::{HashMap, HashSet};

// Type aliases for complex HashMap types used in playlist aggregation
type PlaylistKey = (Option<u32>, Option<u32>, Option<u32>);
type PlaylistValue = (u32, i32, i32);
type ArchiveKey = (Option<u32>, Option<u32>, Option<u32>, Option<chrono::NaiveDate>);
type ArchiveValue = (u32, i32, i32);

#[derive(Debug, Serialize, ToSchema)]
pub struct SimilarRadioStationResult {
    #[serde(flatten)]
    pub station: RadioStationModel,
    pub similarity_score: i32,
    pub location: Option<String>,
}

pub struct RadioStationService;

#[derive(Debug, Deserialize, IntoParams)]
pub struct RadioStationFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub r#type: Option<String>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeRadioStationsRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct RadioStationMergeStats {
    pub addresses_moved: u32,
    pub affiliates_moved: u32,
    pub emails_moved: u32,
    pub emails_deduped: u32,
    pub images_moved: u32,
    pub images_deduped: u32,
    pub links_moved: u32,
    pub links_deduped: u32,
    pub phone_numbers_moved: u32,
    pub phone_numbers_deduped: u32,
    pub internet_details_handled: u32,
    pub satellite_details_handled: u32,
    pub syndicated_details_handled: u32,
    pub terrestrial_details_handled: u32,
    pub staff_members_reassigned: u32,
    pub sub_genres_added: u32,
    pub users_moved: u32,
    pub users_deduped: u32,
    pub radio_playlists_moved: u32,
    pub radio_playlists_aggregated: u32,
    pub radio_playlist_archives_moved: u32,
    pub radio_playlist_archives_aggregated: u32,
    pub raw_data_updated: u32,
    pub song_aliases_reassigned: u32,
    pub album_aliases_reassigned: u32,
    pub station_aliases_moved: u32,
    pub station_aliases_deduped: u32,
    pub duplicate_candidates_updated: u32,
    pub duplicate_candidates_cleaned: u32,
    pub radio_stations_deleted: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RadioStationMergeResult {
    pub merged_station: RadioStationModel,
    pub stats: RadioStationMergeStats,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct RadioStationRelatedCounts {
    pub addresses: u64,
    pub affiliates: u64,
    pub emails: u64,
    pub images: u64,
    pub links: u64,
    pub phone_numbers: u64,
    pub internet_details: u64,
    pub satellite_details: u64,
    pub syndicated_details: u64,
    pub terrestrial_details: u64,
    pub staff_members: u64,
    pub sub_genres: u64,
    pub users: u64,
    pub playlists: u64,
    pub playlist_archives: u64,
    pub raw_data: u64,
    pub song_aliases: u64,
    pub album_aliases: u64,
    pub station_aliases: u64,
    pub duplicate_candidates: u64,
}

impl RadioStationRelatedCounts {
    fn add(&mut self, other: &RadioStationRelatedCounts) {
        self.addresses += other.addresses;
        self.affiliates += other.affiliates;
        self.emails += other.emails;
        self.images += other.images;
        self.links += other.links;
        self.phone_numbers += other.phone_numbers;
        self.internet_details += other.internet_details;
        self.satellite_details += other.satellite_details;
        self.syndicated_details += other.syndicated_details;
        self.terrestrial_details += other.terrestrial_details;
        self.staff_members += other.staff_members;
        self.sub_genres += other.sub_genres;
        self.users += other.users;
        self.playlists += other.playlists;
        self.playlist_archives += other.playlist_archives;
        self.raw_data += other.raw_data;
        self.song_aliases += other.song_aliases;
        self.album_aliases += other.album_aliases;
        self.station_aliases += other.station_aliases;
        self.duplicate_candidates += other.duplicate_candidates;
    }
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RadioStationMergePreview {
    pub station_id: u32,
    pub station_name: String,
    pub counts: RadioStationRelatedCounts,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct RadioStationMergePreviewResponse {
    pub stations: Vec<RadioStationMergePreview>,
    pub totals: RadioStationRelatedCounts,
}

impl RadioStationService {
    pub async fn get_radio_stations(
        db: &DatabaseConnection,
        params: RadioStationFilterParams,
    ) -> Result<PaginatedResponse<RadioStationModel>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = RadioStation::find();

        if let Some(name) = params.name
            && !name.is_empty() {
                match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        query = query.filter(crate::models::radio_stations::Column::Name.starts_with(&name));
                    }
                    Some("ends_with") => {
                        query = query.filter(crate::models::radio_stations::Column::Name.ends_with(&name));
                    }
                    Some("exact_match") => {
                        query = query.filter(crate::models::radio_stations::Column::Name.eq(&name));
                    }
                    _ => {
                        query = query.filter(crate::models::radio_stations::Column::Name.contains(&name));
                    }
                }
            }

        if let Some(r_type) = params.r#type
            && !r_type.is_empty() {
                query = query.filter(crate::models::radio_stations::Column::Type.eq(r_type));
            }

        if let Some(verified) = params.verified {
            query = query.filter(crate::models::radio_stations::Column::Verified.eq(if verified { 1 } else { 0 }));
        }
        if let Some(approved) = params.approved {
            query = query.filter(crate::models::radio_stations::Column::Approved.eq(if approved { 1 } else { 0 }));
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let results = paginator.fetch_page(page - 1).await?;

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

    pub async fn get_radio_station_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<RadioStationModel>, DbErr> {
        RadioStation::find_by_id(id).one(db).await
    }

    pub async fn create_radio_station(db: &DatabaseConnection, data: RadioStationModel) -> Result<RadioStationModel, DbErr> {
        let active_model: RadioStationActiveModel = RadioStationActiveModel {
            name: Set(data.name),
            r#type: Set(data.r#type),
            ..Default::default()
        };
        active_model.insert(db).await
    }

    pub async fn update_radio_station(db: &DatabaseConnection, id: u32, data: RadioStationModel) -> Result<RadioStationModel, DbErr> {
        let station = RadioStation::find_by_id(id).one(db).await?;
        if let Some(station) = station {
            let mut active_model: RadioStationActiveModel = station.into();
            active_model.name = Set(data.name);
            active_model.r#type = Set(data.r#type);
            // ... update other fields as needed
            active_model.update(db).await
        } else {
            Err(DbErr::RecordNotFound("Radio station not found".to_string()))
        }
    }

    pub async fn delete_radio_station(db: &DatabaseConnection, id: u32) -> Result<DeleteResult, DbErr> {
        RadioStation::delete_by_id(id).exec(db).await
    }

    pub async fn get_similar_radio_stations(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarRadioStationResult>, DbErr> {
        let mut query = RadioStationAlias::find();

        if let Some(true) = params.restrict_to_parent
            && (params.country_id.is_some() || params.state_id.is_some() || params.city_id.is_some()) {
                query = query.join(JoinType::InnerJoin, RadioStationAlias::belongs_to(RadioStation).from(RadioStationAliasColumn::RadioStationId).to(crate::models::radio_stations::Column::Id).into())
                             .join(JoinType::InnerJoin, crate::models::radio_stations::Relation::RadioAddresses.def());
                if let Some(country_id) = params.country_id {
                    query = query.filter(crate::models::radio_addresses::Column::CountryId.eq(country_id));
                }
                if let Some(state_id) = params.state_id {
                    query = query.filter(crate::models::radio_addresses::Column::StateId.eq(state_id));
                }
                if let Some(city_id) = params.city_id {
                    query = query.filter(crate::models::radio_addresses::Column::CityId.eq(city_id));
                }
            }

        let results: Vec<SimilarResult<crate::models::radio_station_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: RadioStationAliasColumn::Name,
                slug: RadioStationAliasColumn::Slug,
                sanitized: Some(RadioStationAliasColumn::SanitizedName),
                soundex: Some(RadioStationAliasColumn::SoundexKey),
                phonetic: Some(RadioStationAliasColumn::PhoneticKey),
                metaphone: Some(RadioStationAliasColumn::MetaphoneKey),
                dmetaphone: Some(RadioStationAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(RadioStationAliasColumn::DmetaphoneAltKey),
            },
            params,
            RadioStationAliasColumn::RadioStationId,
            |m| m.name.clone(),
        ).await?;

        let mut rs_ids: Vec<u32> = results.iter().map(|r| r.model.radio_station_id).collect();
        rs_ids.sort();
        rs_ids.dedup();

        if rs_ids.is_empty() {
            return Ok(vec![]);
        }

        let stations = RadioStation::find()
            .filter(crate::models::radio_stations::Column::Id.is_in(rs_ids.clone()))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(station) = stations.iter().find(|s| s.id == r.model.radio_station_id) {
                final_results.push(SimilarResult {
                    model: station.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        let mut seen = HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        // Enrich with location data
        let location_map = Self::build_station_location_map(db, &rs_ids).await?;

        let enriched = final_results
            .into_iter()
            .map(|r| {
                let location = location_map.get(&r.model.id).cloned();
                SimilarRadioStationResult {
                    station: r.model,
                    similarity_score: r.similarity_score,
                    location,
                }
            })
            .collect();

        Ok(enriched)
    }

    /// Batch-load location strings ("City, ST") for a set of station IDs.
    async fn build_station_location_map(
        db: &DatabaseConnection,
        station_ids: &[u32],
    ) -> Result<HashMap<u32, String>, DbErr> {
        if station_ids.is_empty() {
            return Ok(HashMap::new());
        }

        // Load first address per station
        let addresses = RadioAddress::find()
            .filter(RadioAddressColumn::RadioStationId.is_in(station_ids.to_vec()))
            .all(db)
            .await?;

        // Keep only first address per station
        let mut first_addr: HashMap<u32, (Option<u32>, Option<u32>)> = HashMap::new();
        for addr in &addresses {
            if let Some(station_id) = addr.radio_station_id {
                first_addr.entry(station_id).or_insert((addr.city_id, addr.state_id));
            }
        }

        // Collect unique city and state IDs
        let city_ids: Vec<u32> = first_addr.values().filter_map(|(c, _)| *c).collect();
        let state_ids: Vec<u32> = first_addr.values().filter_map(|(_, s)| *s).collect();

        let city_names: HashMap<u32, String> = if !city_ids.is_empty() {
            City::find()
                .filter(crate::models::cities::Column::Id.is_in(city_ids))
                .all(db)
                .await?
                .into_iter()
                .filter_map(|c| c.name.map(|n| (c.id, n)))
                .collect()
        } else {
            HashMap::new()
        };

        let state_abbrvs: HashMap<u32, String> = if !state_ids.is_empty() {
            State::find()
                .filter(crate::models::states::Column::Id.is_in(state_ids))
                .all(db)
                .await?
                .into_iter()
                .filter_map(|s| s.abbrv.map(|a| (s.id, a)))
                .collect()
        } else {
            HashMap::new()
        };

        // Build "City, ST" strings
        let mut location_map: HashMap<u32, String> = HashMap::new();
        for (station_id, (city_id, state_id)) in &first_addr {
            let city = city_id.and_then(|id| city_names.get(&id));
            let state = state_id.and_then(|id| state_abbrvs.get(&id));
            let location = match (city, state) {
                (Some(c), Some(s)) => format!("{}, {}", c, s),
                (Some(c), None) => c.clone(),
                (None, Some(s)) => s.clone(),
                (None, None) => continue,
            };
            location_map.insert(*station_id, location);
        }

        Ok(location_map)
    }

    pub async fn merge_radio_stations(
        db: &DatabaseConnection,
        req: MergeRadioStationsRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<RadioStationMergeResult, DbErr> {
        // Validate target station exists
        let into_station = RadioStation::find_by_id(req.into_id).one(db).await?;
        if into_station.is_none() {
            return Err(DbErr::RecordNotFound("Target radio station not found".to_string()));
        }

        // Capture before-state for audit logging
        let before_state = serde_json::json!({
            "target_id": req.into_id,
            "source_ids": &req.from_ids,
        });
        let from_ids_for_log = req.from_ids.clone();
        let target_id_for_log = req.into_id;

        // Perform merge in a transaction
        let result = db.transaction::<_, RadioStationMergeResult, DbErr>(|txn| {
            Box::pin(async move {
                let mut stats = RadioStationMergeStats::default();

                let target_id = req.into_id;
                let from_ids = req.from_ids.clone();

                // 1. Update target station with merged data fields
                if let Some(obj) = req.merged_data.as_object() {
                    let station = RadioStation::find_by_id(target_id).one(txn).await?
                        .ok_or(DbErr::RecordNotFound("Target radio station not found".to_string()))?;

                    let mut active_model: RadioStationActiveModel = station.into();

                    if let Some(name) = obj.get("name").and_then(|v| v.as_str()) {
                        active_model.name = Set(Some(name.to_string()));
                    }
                    if let Some(slug) = obj.get("slug").and_then(|v| v.as_str()) {
                        active_model.slug = Set(Some(slug.to_string()));
                    }
                    if let Some(r_type) = obj.get("type").and_then(|v| v.as_str()) {
                        active_model.r#type = Set(Some(r_type.to_string()));
                    }
                    if let Some(info) = obj.get("info").and_then(|v| v.as_str()) {
                        active_model.info = Set(Some(info.to_string()));
                    }
                    if let Some(approved) = obj.get("approved").and_then(|v| v.as_i64()) {
                        active_model.approved = Set(approved as i8);
                    }
                    if let Some(verified) = obj.get("verified").and_then(|v| v.as_i64()) {
                        active_model.verified = Set(verified as i8);
                    }
                    if let Some(automatic) = obj.get("automatic").and_then(|v| v.as_i64()) {
                        active_model.automatic = Set(automatic as i8);
                    }
                    if let Some(active) = obj.get("active").and_then(|v| v.as_i64()) {
                        active_model.active = Set(active as i8);
                    }
                    if let Some(influence) = obj.get("influence").and_then(|v| v.as_f64()) {
                        active_model.influence = Set(influence as f32);
                    }
                    if let Some(no_show) = obj.get("no_show").and_then(|v| v.as_i64()) {
                        active_model.no_show = Set(no_show as i8);
                    }

                    active_model.update(txn).await?;
                }

                // 2. Move radio_addresses (move all)
                {
                    let addresses = RadioAddress::find()
                        .filter(RadioAddressColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for addr in addresses {
                        let mut active: crate::models::radio_addresses::ActiveModel = addr.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.addresses_moved += 1;
                    }
                }

                // 3. Move radio_affiliates (move all)
                {
                    let affiliates = RadioAffiliate::find()
                        .filter(RadioAffiliateColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for aff in affiliates {
                        let mut active: crate::models::radio_affiliates::ActiveModel = aff.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.affiliates_moved += 1;
                    }
                }

                // 4. Move radio_emails (dedupe by email)
                {
                    let existing_emails: HashSet<String> = RadioEmail::find()
                        .filter(RadioEmailColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|e| e.email)
                        .collect();

                    let source_emails = RadioEmail::find()
                        .filter(RadioEmailColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for email_record in source_emails {
                        if let Some(ref email_val) = email_record.email
                            && existing_emails.contains(email_val) {
                                let active: crate::models::radio_emails::ActiveModel = email_record.into();
                                active.delete(txn).await?;
                                stats.emails_deduped += 1;
                                continue;
                            }
                        let mut active: crate::models::radio_emails::ActiveModel = email_record.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.emails_moved += 1;
                    }
                }

                // 5. Move radio_images (dedupe by path)
                {
                    let existing_paths: HashSet<String> = RadioImage::find()
                        .filter(RadioImageColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|img| img.path)
                        .collect();

                    let source_images = RadioImage::find()
                        .filter(RadioImageColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for img in source_images {
                        if let Some(ref path) = img.path
                            && existing_paths.contains(path) {
                                let active: crate::models::radio_images::ActiveModel = img.into();
                                active.delete(txn).await?;
                                stats.images_deduped += 1;
                                continue;
                            }
                        let mut active: crate::models::radio_images::ActiveModel = img.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.images_moved += 1;
                    }
                }

                // 6. Move radio_links (dedupe by link URL)
                {
                    let existing_links: HashSet<String> = RadioLink::find()
                        .filter(RadioLinkColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|lnk| lnk.link)
                        .collect();

                    let source_links = RadioLink::find()
                        .filter(RadioLinkColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for lnk in source_links {
                        if let Some(ref url) = lnk.link
                            && existing_links.contains(url) {
                                let active: crate::models::radio_links::ActiveModel = lnk.into();
                                active.delete(txn).await?;
                                stats.links_deduped += 1;
                                continue;
                            }
                        let mut active: crate::models::radio_links::ActiveModel = lnk.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.links_moved += 1;
                    }
                }

                // 7. Move radio_phone_numbers (dedupe by phone)
                {
                    let existing_phones: HashSet<String> = RadioPhone::find()
                        .filter(RadioPhoneColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|p| p.phone)
                        .collect();

                    let source_phones = RadioPhone::find()
                        .filter(RadioPhoneColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for phone in source_phones {
                        if let Some(ref number) = phone.phone
                            && existing_phones.contains(number) {
                                let active: crate::models::radio_phone_numbers::ActiveModel = phone.into();
                                active.delete(txn).await?;
                                stats.phone_numbers_deduped += 1;
                                continue;
                            }
                        let mut active: crate::models::radio_phone_numbers::ActiveModel = phone.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.phone_numbers_moved += 1;
                    }
                }

                // 8. radio_internet_details (has_one) — keep target's if exists, else move first source's
                {
                    let target_detail = RadioInternetDetail::find()
                        .filter(RadioInternetDetailColumn::RadioStationId.eq(target_id))
                        .one(txn)
                        .await?;

                    let mut adopted = target_detail.is_some();

                    let source_details = RadioInternetDetail::find()
                        .filter(RadioInternetDetailColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for detail in source_details {
                        if !adopted {
                            let mut active: crate::models::radio_internet_details::ActiveModel = detail.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            adopted = true;
                            stats.internet_details_handled += 1;
                        } else {
                            let active: crate::models::radio_internet_details::ActiveModel = detail.into();
                            active.delete(txn).await?;
                            stats.internet_details_handled += 1;
                        }
                    }
                }

                // 9. radio_satellite_details (has_one) — same pattern
                {
                    let target_detail = RadioSatelliteDetail::find()
                        .filter(RadioSatelliteDetailColumn::RadioStationId.eq(target_id))
                        .one(txn)
                        .await?;

                    let mut adopted = target_detail.is_some();

                    let source_details = RadioSatelliteDetail::find()
                        .filter(RadioSatelliteDetailColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for detail in source_details {
                        if !adopted {
                            let mut active: crate::models::radio_satellite_details::ActiveModel = detail.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            adopted = true;
                            stats.satellite_details_handled += 1;
                        } else {
                            let active: crate::models::radio_satellite_details::ActiveModel = detail.into();
                            active.delete(txn).await?;
                            stats.satellite_details_handled += 1;
                        }
                    }
                }

                // 10. radio_syndicated_details (has_one) — same pattern
                {
                    let target_detail = RadioSyndicatedDetail::find()
                        .filter(RadioSyndicatedDetailColumn::RadioStationId.eq(target_id))
                        .one(txn)
                        .await?;

                    let mut adopted = target_detail.is_some();

                    let source_details = RadioSyndicatedDetail::find()
                        .filter(RadioSyndicatedDetailColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for detail in source_details {
                        if !adopted {
                            let mut active: crate::models::radio_syndicated_details::ActiveModel = detail.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            adopted = true;
                            stats.syndicated_details_handled += 1;
                        } else {
                            let active: crate::models::radio_syndicated_details::ActiveModel = detail.into();
                            active.delete(txn).await?;
                            stats.syndicated_details_handled += 1;
                        }
                    }
                }

                // 11. radio_terrestrial_details (has_one) — same pattern
                {
                    let target_detail = RadioTerrestrialDetail::find()
                        .filter(RadioTerrestrialDetailColumn::RadioStationId.eq(target_id))
                        .one(txn)
                        .await?;

                    let mut adopted = target_detail.is_some();

                    let source_details = RadioTerrestrialDetail::find()
                        .filter(RadioTerrestrialDetailColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for detail in source_details {
                        if !adopted {
                            let mut active: crate::models::radio_terrestrial_details::ActiveModel = detail.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            adopted = true;
                            stats.terrestrial_details_handled += 1;
                        } else {
                            let active: crate::models::radio_terrestrial_details::ActiveModel = detail.into();
                            active.delete(txn).await?;
                            stats.terrestrial_details_handled += 1;
                        }
                    }
                }

                // 12. staff_members — reassign radio_station_id
                {
                    let staff = StaffMember::find()
                        .filter(StaffMemberColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for member in staff {
                        let mut active: crate::models::staff_members::ActiveModel = member.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.staff_members_reassigned += 1;
                    }
                }

                // 13. radio_stations_sub_genres (dedupe by sub_genre_id)
                {
                    let existing_sub_genres: HashSet<u32> = RadioStationSubGenre::find()
                        .filter(RadioStationSubGenreColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|sg| sg.sub_genre_id)
                        .collect();

                    let source_sub_genres = RadioStationSubGenre::find()
                        .filter(RadioStationSubGenreColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for sg in source_sub_genres {
                        if let Some(sg_id) = sg.sub_genre_id
                            && existing_sub_genres.contains(&sg_id) {
                                let active: crate::models::radio_stations_sub_genres::ActiveModel = sg.into();
                                active.delete(txn).await?;
                                continue;
                            }
                        let mut active: crate::models::radio_stations_sub_genres::ActiveModel = sg.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.sub_genres_added += 1;
                    }
                }

                // 14. radio_stations_users (dedupe by user_id)
                {
                    let existing_users: HashSet<u32> = RadioStationUser::find()
                        .filter(RadioStationUserColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|u| u.user_id)
                        .collect();

                    let source_users = RadioStationUser::find()
                        .filter(RadioStationUserColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for usr in source_users {
                        if let Some(uid) = usr.user_id
                            && existing_users.contains(&uid) {
                                let active: crate::models::radio_stations_users::ActiveModel = usr.into();
                                active.delete(txn).await?;
                                stats.users_deduped += 1;
                                continue;
                            }
                        let mut active: crate::models::radio_stations_users::ActiveModel = usr.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.users_moved += 1;
                    }
                }

                // 15. radio_playlists — aggregate spins on composite key (band_id, album_id, song_id)
                {
                    let target_playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?;

                    // Build map: (band_id, album_id, song_id) -> (id, spins, subtract_spins)
                    let mut target_map: HashMap<PlaylistKey, PlaylistValue> = HashMap::new();
                    for pl in &target_playlists {
                        target_map.insert(
                            (pl.band_id, pl.album_id, pl.song_id),
                            (pl.id, pl.spins, pl.subtract_spins),
                        );
                    }

                    let source_playlists = RadioPlaylist::find()
                        .filter(RadioPlaylistColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for pl in source_playlists {
                        let key = (pl.band_id, pl.album_id, pl.song_id);
                        if let Some(&(target_pl_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                            // Aggregate: sum spins into target, delete source
                            RadioPlaylist::update_many()
                                .filter(RadioPlaylistColumn::Id.eq(target_pl_id))
                                .col_expr(RadioPlaylistColumn::Spins, Expr::value(target_spins + pl.spins))
                                .col_expr(RadioPlaylistColumn::SubtractSpins, Expr::value(target_sub_spins + pl.subtract_spins))
                                .exec(txn).await?;

                            let source_active: crate::models::radio_playlists::ActiveModel = pl.into();
                            source_active.delete(txn).await?;
                            stats.radio_playlists_aggregated += 1;
                        } else {
                            // No match — move to target station
                            let mut active: crate::models::radio_playlists::ActiveModel = pl.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.radio_playlists_moved += 1;
                        }
                    }
                }

                // 16. radio_playlist_archives — aggregate spins on composite key (band_id, album_id, song_id, week_ending)
                {
                    let target_archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?;

                    let mut target_map: HashMap<ArchiveKey, ArchiveValue> = HashMap::new();
                    for arch in &target_archives {
                        target_map.insert(
                            (arch.band_id, arch.album_id, arch.song_id, arch.week_ending),
                            (arch.id, arch.spins, arch.subtract_spins),
                        );
                    }

                    let source_archives = RadioPlaylistArchive::find()
                        .filter(RadioPlaylistArchiveColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for arch in source_archives {
                        let key = (arch.band_id, arch.album_id, arch.song_id, arch.week_ending);
                        if let Some(&(target_arch_id, target_spins, target_sub_spins)) = target_map.get(&key) {
                            RadioPlaylistArchive::update_many()
                                .filter(RadioPlaylistArchiveColumn::Id.eq(target_arch_id))
                                .col_expr(RadioPlaylistArchiveColumn::Spins, Expr::value(target_spins + arch.spins))
                                .col_expr(RadioPlaylistArchiveColumn::SubtractSpins, Expr::value(target_sub_spins + arch.subtract_spins))
                                .exec(txn).await?;

                            let source_active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                            source_active.delete(txn).await?;
                            stats.radio_playlist_archives_aggregated += 1;
                        } else {
                            let mut active: crate::models::radio_playlist_archives::ActiveModel = arch.into();
                            active.radio_station_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.radio_playlist_archives_moved += 1;
                        }
                    }
                }

                // 17. radio_raw_datas — move all
                {
                    let raw_datas = RadioRawData::find()
                        .filter(RadioRawDataColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for rd in raw_datas {
                        let mut active: crate::models::radio_raw_datas::ActiveModel = rd.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.raw_data_updated += 1;
                    }
                }

                // 18. song_aliases — reassign radio_station_id
                {
                    let aliases = SongAlias::find()
                        .filter(SongAliasColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for alias in aliases {
                        let mut active: crate::models::song_aliases::ActiveModel = alias.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.song_aliases_reassigned += 1;
                    }
                }

                // 19. album_aliases — reassign radio_station_id
                {
                    let aliases = AlbumAlias::find()
                        .filter(AlbumAliasColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for alias in aliases {
                        let mut active: crate::models::album_aliases::ActiveModel = alias.into();
                        active.radio_station_id = Set(Some(target_id));
                        active.update(txn).await?;
                        stats.album_aliases_reassigned += 1;
                    }
                }

                // 20. radio_station_aliases — dedupe by name
                {
                    let mut existing_names: HashSet<String> = RadioStationAlias::find()
                        .filter(RadioStationAliasColumn::RadioStationId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .map(|a| a.name)
                        .collect();

                    let source_aliases = RadioStationAlias::find()
                        .filter(RadioStationAliasColumn::RadioStationId.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for alias in source_aliases {
                        if existing_names.contains(&alias.name) {
                            let active: crate::models::radio_station_aliases::ActiveModel = alias.into();
                            active.delete(txn).await?;
                            stats.station_aliases_deduped += 1;
                            continue;
                        }
                        let alias_name = alias.name.clone();
                        let mut active: crate::models::radio_station_aliases::ActiveModel = alias.into();
                        active.radio_station_id = Set(target_id);
                        active.update(txn).await?;
                        existing_names.insert(alias_name);
                        stats.station_aliases_moved += 1;
                    }
                }

                // 21-23. radio_station_duplicate_candidates — reassign, self-ref, pair dedup
                {
                    // Reassign radio_station_id_1 references
                    let candidates_1 = RadioStationDuplicateCandidate::find()
                        .filter(RadioStationDuplicateCandidateColumn::RadioStationId1.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for cand in candidates_1 {
                        let mut active: crate::models::radio_station_duplicate_candidates::ActiveModel = cand.into();
                        active.radio_station_id_1 = Set(target_id);
                        active.update(txn).await?;
                        stats.duplicate_candidates_updated += 1;
                    }

                    // Reassign radio_station_id_2 references
                    let candidates_2 = RadioStationDuplicateCandidate::find()
                        .filter(RadioStationDuplicateCandidateColumn::RadioStationId2.is_in(from_ids.clone()))
                        .all(txn)
                        .await?;

                    for cand in candidates_2 {
                        let mut active: crate::models::radio_station_duplicate_candidates::ActiveModel = cand.into();
                        active.radio_station_id_2 = Set(target_id);
                        active.update(txn).await?;
                        stats.duplicate_candidates_updated += 1;
                    }

                    // Remove self-referencing rows (radio_station_id_1 == radio_station_id_2 == target_id)
                    let self_refs = RadioStationDuplicateCandidate::find()
                        .filter(RadioStationDuplicateCandidateColumn::RadioStationId1.eq(target_id))
                        .filter(RadioStationDuplicateCandidateColumn::RadioStationId2.eq(target_id))
                        .all(txn)
                        .await?;

                    for cand in self_refs {
                        let active: crate::models::radio_station_duplicate_candidates::ActiveModel = cand.into();
                        active.delete(txn).await?;
                        stats.duplicate_candidates_cleaned += 1;
                    }

                    // Deduplicate pairs: load all candidates involving target, remove duplicate pairs
                    let all_target_candidates = RadioStationDuplicateCandidate::find()
                        .filter(
                            Condition::any()
                                .add(RadioStationDuplicateCandidateColumn::RadioStationId1.eq(target_id))
                                .add(RadioStationDuplicateCandidateColumn::RadioStationId2.eq(target_id))
                        )
                        .all(txn)
                        .await?;

                    let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                    for cand in all_target_candidates {
                        let pair = (
                            std::cmp::min(cand.radio_station_id_1, cand.radio_station_id_2),
                            std::cmp::max(cand.radio_station_id_1, cand.radio_station_id_2),
                        );
                        if !seen_pairs.insert(pair) {
                            // Duplicate pair — delete
                            let active: crate::models::radio_station_duplicate_candidates::ActiveModel = cand.into();
                            active.delete(txn).await?;
                            stats.duplicate_candidates_cleaned += 1;
                        }
                    }
                }

                // 24. Delete source radio stations
                for from_id in &from_ids {
                    RadioStation::delete_by_id(*from_id).exec(txn).await?;
                    stats.radio_stations_deleted += 1;
                }

                // Get and return the updated target station
                let merged_station = RadioStation::find_by_id(target_id).one(txn).await?
                    .ok_or(DbErr::RecordNotFound("Merged radio station not found".to_string()))?;

                Ok(RadioStationMergeResult {
                    merged_station,
                    stats,
                })
            })
        }).await.map_err(|e| match e {
            TransactionError::Connection(db_err) => db_err,
            TransactionError::Transaction(db_err) => db_err,
        })?;

        // Audit log (fire-and-forget — don't fail the merge if logging fails)
        let _ = ActionLogService::record_radio_station_merge(
            db,
            target_id_for_log,
            user_id,
            &before_state,
            &result.merged_station,
            &result.stats,
            &from_ids_for_log,
            ip_address,
        ).await;

        Ok(result)
    }

    pub async fn get_radio_station_merge_preview(
        db: &DatabaseConnection,
        station_ids: Vec<u32>,
    ) -> Result<RadioStationMergePreviewResponse, DbErr> {
        let stations = RadioStation::find()
            .filter(crate::models::radio_stations::Column::Id.is_in(station_ids.clone()))
            .all(db)
            .await?;

        let station_map: HashMap<u32, RadioStationModel> = stations.into_iter().map(|s| (s.id, s)).collect();

        let mut previews = Vec::new();
        let mut totals = RadioStationRelatedCounts::default();

        for &id in &station_ids {
            let station_name = station_map
                .get(&id)
                .and_then(|s| s.name.clone())
                .unwrap_or_else(|| format!("Station {}", id));

            let counts = RadioStationRelatedCounts {
                addresses: RadioAddress::find()
                    .filter(RadioAddressColumn::RadioStationId.eq(id))
                    .count(db).await?,
                affiliates: RadioAffiliate::find()
                    .filter(RadioAffiliateColumn::RadioStationId.eq(id))
                    .count(db).await?,
                emails: RadioEmail::find()
                    .filter(RadioEmailColumn::RadioStationId.eq(id))
                    .count(db).await?,
                images: RadioImage::find()
                    .filter(RadioImageColumn::RadioStationId.eq(id))
                    .count(db).await?,
                links: RadioLink::find()
                    .filter(RadioLinkColumn::RadioStationId.eq(id))
                    .count(db).await?,
                phone_numbers: RadioPhone::find()
                    .filter(RadioPhoneColumn::RadioStationId.eq(id))
                    .count(db).await?,
                internet_details: RadioInternetDetail::find()
                    .filter(RadioInternetDetailColumn::RadioStationId.eq(id))
                    .count(db).await?,
                satellite_details: RadioSatelliteDetail::find()
                    .filter(RadioSatelliteDetailColumn::RadioStationId.eq(id))
                    .count(db).await?,
                syndicated_details: RadioSyndicatedDetail::find()
                    .filter(RadioSyndicatedDetailColumn::RadioStationId.eq(id))
                    .count(db).await?,
                terrestrial_details: RadioTerrestrialDetail::find()
                    .filter(RadioTerrestrialDetailColumn::RadioStationId.eq(id))
                    .count(db).await?,
                staff_members: StaffMember::find()
                    .filter(StaffMemberColumn::RadioStationId.eq(id))
                    .count(db).await?,
                sub_genres: RadioStationSubGenre::find()
                    .filter(RadioStationSubGenreColumn::RadioStationId.eq(id))
                    .count(db).await?,
                users: RadioStationUser::find()
                    .filter(RadioStationUserColumn::RadioStationId.eq(id))
                    .count(db).await?,
                playlists: RadioPlaylist::find()
                    .filter(RadioPlaylistColumn::RadioStationId.eq(id))
                    .count(db).await?,
                playlist_archives: RadioPlaylistArchive::find()
                    .filter(RadioPlaylistArchiveColumn::RadioStationId.eq(id))
                    .count(db).await?,
                raw_data: RadioRawData::find()
                    .filter(RadioRawDataColumn::RadioStationId.eq(id))
                    .count(db).await?,
                song_aliases: SongAlias::find()
                    .filter(SongAliasColumn::RadioStationId.eq(id))
                    .count(db).await?,
                album_aliases: AlbumAlias::find()
                    .filter(AlbumAliasColumn::RadioStationId.eq(id))
                    .count(db).await?,
                station_aliases: RadioStationAlias::find()
                    .filter(RadioStationAliasColumn::RadioStationId.eq(id))
                    .count(db).await?,
                duplicate_candidates: RadioStationDuplicateCandidate::find()
                    .filter(
                        Condition::any()
                            .add(RadioStationDuplicateCandidateColumn::RadioStationId1.eq(id))
                            .add(RadioStationDuplicateCandidateColumn::RadioStationId2.eq(id))
                    )
                    .count(db).await?,
            };

            totals.add(&counts);
            previews.push(RadioStationMergePreview {
                station_id: id,
                station_name,
                counts,
            });
        }

        Ok(RadioStationMergePreviewResponse {
            stations: previews,
            totals,
        })
    }
}
