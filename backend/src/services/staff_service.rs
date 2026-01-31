//! Staff member service for CRUD operations, similarity search, merge, and transfer.

use crate::models::staff_members::{
    ActiveModel as StaffActiveModel, Column as StaffColumn, Entity as StaffMember,
    Model as StaffMemberModel,
};
use crate::models::staff_member_aliases::{
    Column as StaffMemberAliasColumn, Entity as StaffMemberAlias,
};
use crate::models::staff_images::{Column as StaffImageColumn, Entity as StaffImage};
use crate::models::staff_links::{Column as StaffLinkColumn, Entity as StaffLink};
use crate::models::staff_phone_numbers::{
    Column as StaffPhoneColumn, Entity as StaffPhone,
};
use crate::models::staff_addresses::{Column as StaffAddressColumn, Entity as StaffAddress};
use crate::models::staff_playlists::{Column as StaffPlaylistColumn, Entity as StaffPlaylist};
use crate::models::staff_playlist_archives::{
    Column as StaffPlaylistArchiveColumn, Entity as StaffPlaylistArchive,
};
use crate::models::staff_members_sub_genres::{
    ActiveModel as StaffSubGenreActiveModel, Column as StaffSubGenreColumn,
    Entity as StaffSubGenres,
};
use crate::models::radio_stations::Entity as RadioStation;
use crate::models::staff_member_duplicate_candidates::{Entity as StaffDuplicateCandidate, Column as StaffDuplicateCandidateColumn};
use crate::models::songs::{Column as SongColumn, Entity as Song};
use crate::services::action_log_service::ActionLogService;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarResult, SimilarityParams};
use crate::utils::similarity::find_similar_pipeline;
use crate::views::staff::{StaffDetailView, StaffListView, StaffListViewEnriched, StaffTransferLink};
use chrono::Utc;
use sea_orm::*;
use serde::{Deserialize, Serialize};
use std::collections::{HashMap, HashSet};
use utoipa::{IntoParams, ToSchema};

pub struct StaffService;

// ============================================================================
// Filter & Request/Response Types
// ============================================================================

#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct StaffFilterParams {
    pub page: Option<u64>,
    pub page_size: Option<u64>,
    pub name: Option<String>,
    pub name_filter_type: Option<String>,
    pub radio_station_id: Option<u32>,
    pub verified: Option<bool>,
    pub approved: Option<bool>,
    pub archived: Option<bool>,
    pub has_playlist: Option<bool>,
    pub sort_field: Option<String>,
    pub sort_ascending: Option<bool>,
}

#[derive(Debug, Deserialize, IntoParams, Default)]
pub struct StaffDetailParams {
    pub include_images: Option<bool>,
    pub include_addresses: Option<bool>,
    pub include_links: Option<bool>,
    pub include_phones: Option<bool>,
    pub include_sub_genres: Option<bool>,
}

#[derive(Debug, Serialize, ToSchema, Clone)]
pub struct StaffResponse {
    #[serde(flatten)]
    pub staff: StaffMemberModel,
    pub station_name: Option<String>,
    pub sub_genres: Vec<crate::models::sub_genres::Model>,
    pub images: Vec<crate::models::staff_images::Model>,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct MergeStaffRequest {
    pub from_ids: Vec<u32>,
    pub into_id: u32,
    pub merged_data: serde_json::Value,
}

#[derive(Debug, Serialize, ToSchema, Default)]
pub struct StaffMergeStats {
    pub images_moved: u32,
    pub images_deduped: u32,
    pub links_moved: u32,
    pub links_deduped: u32,
    pub phones_moved: u32,
    pub phones_deduped: u32,
    pub addresses_moved: u32,
    pub aliases_moved: u32,
    pub aliases_deduped: u32,
    pub playlists_moved: u32,
    pub playlists_aggregated: u32,
    pub playlist_archives_moved: u32,
    pub playlist_archives_aggregated: u32,
    pub sub_genres_calculated: u32,
    pub duplicate_candidates_updated: u32,
    pub duplicate_candidates_cleaned: u32,
    pub staff_deleted: u32,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StaffMergeResult {
    pub merged_staff: StaffMemberModel,
    pub stats: StaffMergeStats,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct StaffTransferRequest {
    pub staff_member_id: u32,
    pub new_station_id: u32,
    pub transfer_reason: String,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct StaffTransferResult {
    pub old_profile: StaffMemberModel,
    pub new_profile: StaffMemberModel,
}

#[derive(Debug, Deserialize, ToSchema)]
pub struct ArchiveStaffRequest {
    pub reason: String,
}

// ============================================================================
// Staff Service Implementation
// ============================================================================

impl StaffService {
    // ------------------------------------------------------------------------
    // CRUD Operations
    // ------------------------------------------------------------------------

    /// Get staff members with full response (backward compatible).
    pub async fn get_staff_members(
        db: &DatabaseConnection,
        params: StaffFilterParams,
    ) -> Result<PaginatedResponse<StaffResponse>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        let mut query = StaffMember::find();

        // Apply filters
        if let Some(ref name) = params.name {
            if !name.is_empty() {
                let name_condition = match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.starts_with(name))
                            .add(StaffColumn::LastName.starts_with(name))
                            .add(StaffColumn::OnAirName.starts_with(name))
                    }
                    Some("ends_with") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.ends_with(name))
                            .add(StaffColumn::LastName.ends_with(name))
                            .add(StaffColumn::OnAirName.ends_with(name))
                    }
                    Some("exact_match") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.eq(name))
                            .add(StaffColumn::LastName.eq(name))
                            .add(StaffColumn::OnAirName.eq(name))
                    }
                    _ => {
                        Condition::any()
                            .add(StaffColumn::FirstName.contains(name))
                            .add(StaffColumn::LastName.contains(name))
                            .add(StaffColumn::OnAirName.contains(name))
                    }
                };
                query = query.filter(name_condition);
            }
        }

        if let Some(station_id) = params.radio_station_id {
            query = query.filter(StaffColumn::RadioStationId.eq(station_id));
        }
        if let Some(verified) = params.verified {
            query = query.filter(StaffColumn::Verified.eq(if verified { 1 } else { 0 }));
        }
        if let Some(approved) = params.approved {
            query = query.filter(StaffColumn::Approved.eq(if approved { 1 } else { 0 }));
        }
        // Default to hiding archived unless explicitly requested
        let show_archived = params.archived.unwrap_or(false);
        if !show_archived {
            query = query.filter(StaffColumn::Archived.eq(0));
        }
        if let Some(has_playlist) = params.has_playlist {
            query = query.filter(StaffColumn::HasPlaylist.eq(if has_playlist { 1 } else { 0 }));
        }

        // Apply sorting
        if let Some(ref sort_field) = params.sort_field {
            let order = if params.sort_ascending.unwrap_or(true) {
                Order::Asc
            } else {
                Order::Desc
            };
            match sort_field.as_str() {
                "first_name" => query = query.order_by(StaffColumn::FirstName, order),
                "last_name" => query = query.order_by(StaffColumn::LastName, order),
                "on_air_name" => query = query.order_by(StaffColumn::OnAirName, order),
                "created" => query = query.order_by(StaffColumn::Created, order),
                "modified" => query = query.order_by(StaffColumn::Modified, order),
                _ => query = query.order_by(StaffColumn::Id, order),
            }
        } else {
            query = query.order_by_desc(StaffColumn::Id);
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;

        let staff_members = paginator.fetch_page(page - 1).await?;
        let results = Self::load_staff_relations(db, staff_members).await?;

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

    /// Get staff members with optimized lightweight response.
    pub async fn get_staff_members_list(
        db: &DatabaseConnection,
        params: StaffFilterParams,
    ) -> Result<PaginatedResponse<StaffListViewEnriched>, DbErr> {
        let page = params.page.unwrap_or(1);
        let page_size = params.page_size.unwrap_or(10);

        // Build base query with select_only for partial model
        let mut query = StaffMember::find()
            .select_only()
            .column(StaffColumn::Id)
            .column(StaffColumn::FirstName)
            .column(StaffColumn::LastName)
            .column(StaffColumn::OnAirName)
            .column(StaffColumn::RadioStationId)
            .column(StaffColumn::Email)
            .column(StaffColumn::Position)
            .column(StaffColumn::Verified)
            .column(StaffColumn::Approved)
            .column(StaffColumn::Archived)
            .column(StaffColumn::HasPlaylist)
            .column(StaffColumn::Created)
            .column(StaffColumn::Modified);

        // Apply filters (same as above)
        if let Some(ref name) = params.name {
            if !name.is_empty() {
                let name_condition = match params.name_filter_type.as_deref() {
                    Some("starts_with") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.starts_with(name))
                            .add(StaffColumn::LastName.starts_with(name))
                            .add(StaffColumn::OnAirName.starts_with(name))
                    }
                    Some("ends_with") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.ends_with(name))
                            .add(StaffColumn::LastName.ends_with(name))
                            .add(StaffColumn::OnAirName.ends_with(name))
                    }
                    Some("exact_match") => {
                        Condition::any()
                            .add(StaffColumn::FirstName.eq(name))
                            .add(StaffColumn::LastName.eq(name))
                            .add(StaffColumn::OnAirName.eq(name))
                    }
                    _ => {
                        Condition::any()
                            .add(StaffColumn::FirstName.contains(name))
                            .add(StaffColumn::LastName.contains(name))
                            .add(StaffColumn::OnAirName.contains(name))
                    }
                };
                query = query.filter(name_condition);
            }
        }

        if let Some(station_id) = params.radio_station_id {
            query = query.filter(StaffColumn::RadioStationId.eq(station_id));
        }
        if let Some(verified) = params.verified {
            query = query.filter(StaffColumn::Verified.eq(if verified { 1 } else { 0 }));
        }
        if let Some(approved) = params.approved {
            query = query.filter(StaffColumn::Approved.eq(if approved { 1 } else { 0 }));
        }
        let show_archived = params.archived.unwrap_or(false);
        if !show_archived {
            query = query.filter(StaffColumn::Archived.eq(0));
        }
        if let Some(has_playlist) = params.has_playlist {
            query = query.filter(StaffColumn::HasPlaylist.eq(if has_playlist { 1 } else { 0 }));
        }

        // Apply sorting
        if let Some(ref sort_field) = params.sort_field {
            let order = if params.sort_ascending.unwrap_or(true) {
                Order::Asc
            } else {
                Order::Desc
            };
            match sort_field.as_str() {
                "first_name" => query = query.order_by(StaffColumn::FirstName, order),
                "last_name" => query = query.order_by(StaffColumn::LastName, order),
                "on_air_name" => query = query.order_by(StaffColumn::OnAirName, order),
                "created" => query = query.order_by(StaffColumn::Created, order),
                "modified" => query = query.order_by(StaffColumn::Modified, order),
                _ => query = query.order_by(StaffColumn::Id, order),
            }
        } else {
            query = query.order_by_desc(StaffColumn::Id);
        }

        // Get paginated results
        let paginator = query
            .clone()
            .into_model::<StaffListView>()
            .paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let staff = paginator.fetch_page(page - 1).await?;

        // Enrich with station names and sub-genres
        let enriched = Self::enrich_staff_list_views(db, staff).await?;

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

    /// Get staff member by ID with optional relations.
    pub async fn get_staff_member_by_id(
        db: &DatabaseConnection,
        id: u32,
        params: StaffDetailParams,
    ) -> Result<Option<StaffDetailView>, DbErr> {
        let staff = StaffMember::find_by_id(id).one(db).await?;

        if let Some(staff) = staff {
            let mut view = StaffDetailView::new(staff);

            // Load station if we have a radio_station_id
            if let Some(station_id) = view.staff.radio_station_id {
                if let Some(station) = RadioStation::find_by_id(station_id).one(db).await? {
                    view = view.with_station(station);
                }
            }

            // Load optional relations based on params
            if params.include_images.unwrap_or(true) {
                let images = StaffImage::find()
                    .filter(StaffImageColumn::StaffMemberId.eq(id))
                    .all(db)
                    .await?;
                view = view.with_images(images);
            }

            if params.include_links.unwrap_or(true) {
                let links = StaffLink::find()
                    .filter(StaffLinkColumn::StaffMemberId.eq(id))
                    .all(db)
                    .await?;
                view = view.with_links(links);
            }

            if params.include_addresses.unwrap_or(true) {
                let addresses = StaffAddress::find()
                    .filter(StaffAddressColumn::StaffMemberId.eq(id))
                    .all(db)
                    .await?;
                view = view.with_addresses(addresses);
            }

            if params.include_phones.unwrap_or(true) {
                let phones = StaffPhone::find()
                    .filter(StaffPhoneColumn::StaffMemberId.eq(id))
                    .all(db)
                    .await?;
                view = view.with_phone_numbers(phones);
            }

            if params.include_sub_genres.unwrap_or(true) {
                let staff_sub_genres = StaffSubGenres::find()
                    .filter(StaffSubGenreColumn::StaffMemberId.eq(id))
                    .all(db)
                    .await?;

                let sub_genre_ids: Vec<u32> = staff_sub_genres
                    .iter()
                    .filter_map(|ssg| ssg.sub_genre_id)
                    .collect();

                if !sub_genre_ids.is_empty() {
                    let sub_genres = crate::models::sub_genres::Entity::find()
                        .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
                        .all(db)
                        .await?;
                    view = view.with_sub_genres(sub_genres);
                }
            }

            // Load transfer links if applicable
            if let Some(to_id) = view.staff.transferred_to_id {
                if let Some(to_staff) = StaffMember::find_by_id(to_id).one(db).await? {
                    let station_name = if let Some(sid) = to_staff.radio_station_id {
                        RadioStation::find_by_id(sid)
                            .one(db)
                            .await?
                            .and_then(|s| s.name)
                    } else {
                        None
                    };
                    view = view.with_transferred_to(StaffTransferLink {
                        id: to_staff.id,
                        first_name: to_staff.first_name,
                        last_name: to_staff.last_name,
                        on_air_name: to_staff.on_air_name,
                        radio_station_id: to_staff.radio_station_id,
                        station_name,
                    });
                }
            }

            if let Some(from_id) = view.staff.transferred_from_id {
                if let Some(from_staff) = StaffMember::find_by_id(from_id).one(db).await? {
                    let station_name = if let Some(sid) = from_staff.radio_station_id {
                        RadioStation::find_by_id(sid)
                            .one(db)
                            .await?
                            .and_then(|s| s.name)
                    } else {
                        None
                    };
                    view = view.with_transferred_from(StaffTransferLink {
                        id: from_staff.id,
                        first_name: from_staff.first_name,
                        last_name: from_staff.last_name,
                        on_air_name: from_staff.on_air_name,
                        radio_station_id: from_staff.radio_station_id,
                        station_name,
                    });
                }
            }

            Ok(Some(view))
        } else {
            Ok(None)
        }
    }

    /// Create a new staff member.
    pub async fn create_staff_member(
        db: &DatabaseConnection,
        data: StaffMemberModel,
    ) -> Result<StaffMemberModel, DbErr> {
        let active_model = StaffActiveModel {
            radio_station_id: Set(data.radio_station_id),
            user_id: Set(data.user_id),
            first_name: Set(data.first_name),
            last_name: Set(data.last_name),
            on_air_name: Set(data.on_air_name),
            position: Set(data.position),
            email: Set(data.email),
            show_name: Set(data.show_name),
            start_time: Set(data.start_time),
            end_time: Set(data.end_time),
            days_on: Set(data.days_on),
            bio: Set(data.bio),
            show_description: Set(data.show_description),
            created: Set(Some(Utc::now().naive_utc())),
            modified: Set(Some(Utc::now().naive_utc())),
            ..Default::default()
        };
        active_model.insert(db).await
    }

    /// Update an existing staff member.
    pub async fn update_staff_member(
        db: &DatabaseConnection,
        id: u32,
        data: StaffMemberModel,
    ) -> Result<StaffMemberModel, DbErr> {
        let staff = StaffMember::find_by_id(id).one(db).await?;
        if let Some(staff) = staff {
            let mut active_model: StaffActiveModel = staff.into();
            active_model.radio_station_id = Set(data.radio_station_id);
            active_model.first_name = Set(data.first_name);
            active_model.last_name = Set(data.last_name);
            active_model.on_air_name = Set(data.on_air_name);
            active_model.position = Set(data.position);
            active_model.email = Set(data.email);
            active_model.show_name = Set(data.show_name);
            active_model.start_time = Set(data.start_time);
            active_model.end_time = Set(data.end_time);
            active_model.days_on = Set(data.days_on);
            active_model.bio = Set(data.bio);
            active_model.show_description = Set(data.show_description);
            active_model.modified = Set(Some(Utc::now().naive_utc()));
            active_model.update(db).await
        } else {
            Err(DbErr::RecordNotFound("Staff member not found".to_string()))
        }
    }

    /// Delete a staff member.
    pub async fn delete_staff_member(db: &DatabaseConnection, id: u32) -> Result<(), DbErr> {
        StaffMember::delete_by_id(id).exec(db).await?;
        Ok(())
    }

    // ------------------------------------------------------------------------
    // Similarity Search (Station-Scoped)
    // ------------------------------------------------------------------------

    /// Find similar staff members (station-scoped).
    pub async fn get_similar_staff_members(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<StaffMemberModel>>, DbErr> {
        let mut query = StaffMemberAlias::find();

        // Station scoping - always restrict to station if provided
        if let Some(true) = params.restrict_to_parent {
            if let Some(radio_station_id) = params.radio_station_id {
                query =
                    query.filter(StaffMemberAliasColumn::RadioStationId.eq(radio_station_id));
            }
        }

        let results: Vec<SimilarResult<crate::models::staff_member_aliases::Model>> =
            find_similar_pipeline(
                db,
                query,
                crate::utils::similarity::pipeline::SimilarityColumns {
                    name: StaffMemberAliasColumn::Name,
                    slug: StaffMemberAliasColumn::Slug,
                    sanitized: Some(StaffMemberAliasColumn::SanitizedName),
                    soundex: Some(StaffMemberAliasColumn::SoundexKey),
                    phonetic: Some(StaffMemberAliasColumn::PhoneticKey),
                    metaphone: Some(StaffMemberAliasColumn::MetaphoneKey),
                    dmetaphone: Some(StaffMemberAliasColumn::DmetaphoneKey),
                    dmetaphone_alt: Some(StaffMemberAliasColumn::DmetaphoneAltKey),
                },
                params.clone(),
                StaffMemberAliasColumn::StaffMemberId,
                |m| m.name.clone(),
            )
            .await?;

        let mut sm_ids: Vec<u32> = results.iter().map(|r| r.model.staff_member_id).collect();
        sm_ids.sort();
        sm_ids.dedup();

        if sm_ids.is_empty() {
            return Ok(vec![]);
        }

        // Load full staff members
        let members = StaffMember::find()
            .filter(StaffColumn::Id.is_in(sm_ids))
            .all(db)
            .await?;

        // Exclude the existing_id if provided
        let exclude_id = params.existing_id;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(exclude) = exclude_id {
                if r.model.staff_member_id == exclude {
                    continue;
                }
            }
            if let Some(member) = members.iter().find(|m| m.id == r.model.staff_member_id) {
                final_results.push(SimilarResult {
                    model: member.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 {
                break;
            }
        }

        // Deduplicate by staff member ID
        let mut seen = HashSet::new();
        final_results.retain(|r| seen.insert(r.model.id));

        Ok(final_results)
    }

    // ------------------------------------------------------------------------
    // Merge (Station-Scoped)
    // ------------------------------------------------------------------------

    /// Merge multiple staff members into one (station-scoped).
    pub async fn merge_staff_members(
        db: &DatabaseConnection,
        req: MergeStaffRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StaffMergeResult, DbErr> {
        // Validate target exists
        let into_staff = StaffMember::find_by_id(req.into_id).one(db).await?;
        if into_staff.is_none() {
            return Err(DbErr::RecordNotFound(
                "Target staff member not found".to_string(),
            ));
        }
        let into_staff = into_staff.unwrap();

        // Validate all from_ids exist and belong to the same station
        let from_staff = StaffMember::find()
            .filter(StaffColumn::Id.is_in(req.from_ids.clone()))
            .all(db)
            .await?;

        if from_staff.len() != req.from_ids.len() {
            return Err(DbErr::RecordNotFound(
                "One or more source staff members not found".to_string(),
            ));
        }

        // Verify all staff belong to the same radio_station_id
        let target_station = into_staff.radio_station_id;
        for staff in &from_staff {
            if staff.radio_station_id != target_station {
                return Err(DbErr::Custom(
                    "Cannot merge staff members from different radio stations".to_string(),
                ));
            }
        }

        // Capture before state for logging
        let before_state = serde_json::to_value(&into_staff).ok();

        // Save these values before moving req into transaction
        let target_id = req.into_id;
        let from_ids_for_log = req.from_ids.clone();

        // Perform merge in transaction
        let result = db
            .transaction::<_, StaffMergeResult, DbErr>(|txn| {
                Box::pin(async move {
                    let mut stats = StaffMergeStats::default();
                    let target_id = req.into_id;
                    let from_ids = req.from_ids.clone();

                    // 1. Update target with merged data fields
                    if let Some(obj) = req.merged_data.as_object() {
                        let staff = StaffMember::find_by_id(target_id).one(txn).await?.ok_or(
                            DbErr::RecordNotFound("Target staff member not found".to_string()),
                        )?;

                        let mut active_model: StaffActiveModel = staff.into();

                        if let Some(first_name) = obj.get("first_name").and_then(|v| v.as_str()) {
                            active_model.first_name = Set(Some(first_name.to_string()));
                        }
                        if let Some(last_name) = obj.get("last_name").and_then(|v| v.as_str()) {
                            active_model.last_name = Set(Some(last_name.to_string()));
                        }
                        if let Some(on_air_name) = obj.get("on_air_name").and_then(|v| v.as_str()) {
                            active_model.on_air_name = Set(Some(on_air_name.to_string()));
                        }
                        if let Some(position) = obj.get("position").and_then(|v| v.as_str()) {
                            active_model.position = Set(Some(position.to_string()));
                        }
                        if let Some(email) = obj.get("email").and_then(|v| v.as_str()) {
                            active_model.email = Set(Some(email.to_string()));
                        }
                        if let Some(bio) = obj.get("bio").and_then(|v| v.as_str()) {
                            active_model.bio = Set(Some(bio.to_string()));
                        }
                        if let Some(show_name) = obj.get("show_name").and_then(|v| v.as_str()) {
                            active_model.show_name = Set(Some(show_name.to_string()));
                        }
                        if let Some(show_desc) =
                            obj.get("show_description").and_then(|v| v.as_str())
                        {
                            active_model.show_description = Set(Some(show_desc.to_string()));
                        }

                        active_model.modified = Set(Some(Utc::now().naive_utc()));
                        active_model.update(txn).await?;
                    }

                    // 2. Move images (dedupe by path)
                    let existing_paths: HashSet<String> = StaffImage::find()
                        .filter(StaffImageColumn::StaffMemberId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|img| img.path)
                        .collect();

                    for from_id in &from_ids {
                        let images = StaffImage::find()
                            .filter(StaffImageColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for img in images {
                            if let Some(ref path) = img.path {
                                if existing_paths.contains(path) {
                                    // Delete duplicate
                                    let active: crate::models::staff_images::ActiveModel =
                                        img.into();
                                    active.delete(txn).await?;
                                    stats.images_deduped += 1;
                                    continue;
                                }
                            }
                            let mut active: crate::models::staff_images::ActiveModel = img.into();
                            active.staff_member_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.images_moved += 1;
                        }
                    }

                    // 3. Move links (dedupe by link URL)
                    let existing_links: HashSet<String> = StaffLink::find()
                        .filter(StaffLinkColumn::StaffMemberId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|lnk| lnk.link)
                        .collect();

                    for from_id in &from_ids {
                        let links = StaffLink::find()
                            .filter(StaffLinkColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for lnk in links {
                            if let Some(ref url) = lnk.link {
                                if existing_links.contains(url) {
                                    let active: crate::models::staff_links::ActiveModel =
                                        lnk.into();
                                    active.delete(txn).await?;
                                    stats.links_deduped += 1;
                                    continue;
                                }
                            }
                            let mut active: crate::models::staff_links::ActiveModel = lnk.into();
                            active.staff_member_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.links_moved += 1;
                        }
                    }

                    // 4. Move phone numbers (dedupe by phone+ext)
                    let existing_phones: HashSet<(String, Option<i32>)> = StaffPhone::find()
                        .filter(StaffPhoneColumn::StaffMemberId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .filter_map(|ph| ph.phone.map(|p| (p, ph.ext)))
                        .collect();

                    for from_id in &from_ids {
                        let phones = StaffPhone::find()
                            .filter(StaffPhoneColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for ph in phones {
                            if let Some(ref phone) = ph.phone {
                                if existing_phones.contains(&(phone.clone(), ph.ext)) {
                                    let active: crate::models::staff_phone_numbers::ActiveModel =
                                        ph.into();
                                    active.delete(txn).await?;
                                    stats.phones_deduped += 1;
                                    continue;
                                }
                            }
                            let mut active: crate::models::staff_phone_numbers::ActiveModel =
                                ph.into();
                            active.staff_member_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.phones_moved += 1;
                        }
                    }

                    // 5. Move addresses (keep all - no dedup)
                    for from_id in &from_ids {
                        let addresses = StaffAddress::find()
                            .filter(StaffAddressColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for addr in addresses {
                            let mut active: crate::models::staff_addresses::ActiveModel =
                                addr.into();
                            active.staff_member_id = Set(Some(target_id));
                            active.update(txn).await?;
                            stats.addresses_moved += 1;
                        }
                    }

                    // 6. Move aliases (dedupe by name)
                    let mut existing_aliases: HashSet<String> = StaffMemberAlias::find()
                        .filter(StaffMemberAliasColumn::StaffMemberId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .map(|a| a.name.to_lowercase())
                        .collect();

                    for from_id in &from_ids {
                        let aliases = StaffMemberAlias::find()
                            .filter(StaffMemberAliasColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for alias in aliases {
                            let alias_name_lower = alias.name.to_lowercase();
                            if existing_aliases.contains(&alias_name_lower) {
                                let active: crate::models::staff_member_aliases::ActiveModel =
                                    alias.into();
                                active.delete(txn).await?;
                                stats.aliases_deduped += 1;
                                continue;
                            }
                            let mut active: crate::models::staff_member_aliases::ActiveModel =
                                alias.into();
                            active.staff_member_id = Set(target_id);
                            active.update(txn).await?;
                            existing_aliases.insert(alias_name_lower);
                            stats.aliases_moved += 1;
                        }
                    }

                    // 7. Move playlists with aggregation
                    // Match on: band_id + album_id + song_id (current week)
                    let existing_playlists: HashMap<(Option<u32>, Option<u32>, Option<u32>), u32> =
                        StaffPlaylist::find()
                            .filter(StaffPlaylistColumn::StaffMemberId.eq(target_id))
                            .all(txn)
                            .await?
                            .into_iter()
                            .map(|pl| ((pl.band_id, pl.album_id, pl.song_id), pl.id))
                            .collect();

                    for from_id in &from_ids {
                        let playlists = StaffPlaylist::find()
                            .filter(StaffPlaylistColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for pl in playlists {
                            let key = (pl.band_id, pl.album_id, pl.song_id);
                            if let Some(&existing_id) = existing_playlists.get(&key) {
                                // Aggregate spins
                                if let Some(from_spins) = pl.spins {
                                    let existing = StaffPlaylist::find_by_id(existing_id)
                                        .one(txn)
                                        .await?;
                                    if let Some(existing) = existing {
                                        let current = existing.spins.unwrap_or(0);
                                        let mut active: crate::models::staff_playlists::ActiveModel =
                                            existing.into();
                                        active.spins = Set(Some(current + from_spins));
                                        active.update(txn).await?;
                                    }
                                }
                                // Delete source
                                let active: crate::models::staff_playlists::ActiveModel = pl.into();
                                active.delete(txn).await?;
                                stats.playlists_aggregated += 1;
                            } else {
                                let mut active: crate::models::staff_playlists::ActiveModel =
                                    pl.into();
                                active.staff_member_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.playlists_moved += 1;
                            }
                        }
                    }

                    // 8. Move playlist archives with aggregation
                    // Match on: week_ending + band_id + album_id + song_id
                    let existing_archives: HashMap<
                        (
                            Option<chrono::NaiveDate>,
                            Option<u32>,
                            Option<u32>,
                            Option<u32>,
                        ),
                        u32,
                    > = StaffPlaylistArchive::find()
                        .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(target_id))
                        .all(txn)
                        .await?
                        .into_iter()
                        .map(|a| ((a.week_ending, a.band_id, a.album_id, a.song_id), a.id))
                        .collect();

                    for from_id in &from_ids {
                        let archives = StaffPlaylistArchive::find()
                            .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(*from_id))
                            .all(txn)
                            .await?;

                        for arch in archives {
                            let key = (arch.week_ending, arch.band_id, arch.album_id, arch.song_id);
                            if let Some(&existing_id) = existing_archives.get(&key) {
                                // Aggregate spins
                                if let Some(from_spins) = arch.spins {
                                    let existing = StaffPlaylistArchive::find_by_id(existing_id)
                                        .one(txn)
                                        .await?;
                                    if let Some(existing) = existing {
                                        let current = existing.spins.unwrap_or(0);
                                        let mut active: crate::models::staff_playlist_archives::ActiveModel = existing.into();
                                        active.spins = Set(Some(current + from_spins));
                                        active.update(txn).await?;
                                    }
                                }
                                // Delete source
                                let active: crate::models::staff_playlist_archives::ActiveModel =
                                    arch.into();
                                active.delete(txn).await?;
                                stats.playlist_archives_aggregated += 1;
                            } else {
                                let mut active: crate::models::staff_playlist_archives::ActiveModel =
                                    arch.into();
                                active.staff_member_id = Set(Some(target_id));
                                active.update(txn).await?;
                                stats.playlist_archives_moved += 1;
                            }
                        }
                    }

                    // 9. Recalculate sub-genres from combined archives
                    let calculated_genres =
                        Self::recalculate_sub_genres_internal(txn, target_id).await?;
                    stats.sub_genres_calculated = calculated_genres.len() as u32;

                    // 10. Staff member duplicate candidates — reassign, remove self-refs, deduplicate pairs
                    {
                        for from_id in &from_ids {
                            let candidates_1 = StaffDuplicateCandidate::find()
                                .filter(StaffDuplicateCandidateColumn::StaffMemberId1.eq(*from_id))
                                .all(txn)
                                .await?;

                            for cand in candidates_1 {
                                let mut active: crate::models::staff_member_duplicate_candidates::ActiveModel = cand.into();
                                active.staff_member_id_1 = Set(target_id);
                                active.update(txn).await?;
                                stats.duplicate_candidates_updated += 1;
                            }

                            let candidates_2 = StaffDuplicateCandidate::find()
                                .filter(StaffDuplicateCandidateColumn::StaffMemberId2.eq(*from_id))
                                .all(txn)
                                .await?;

                            for cand in candidates_2 {
                                let mut active: crate::models::staff_member_duplicate_candidates::ActiveModel = cand.into();
                                active.staff_member_id_2 = Set(target_id);
                                active.update(txn).await?;
                                stats.duplicate_candidates_updated += 1;
                            }
                        }

                        // Remove self-refs
                        let self_refs = StaffDuplicateCandidate::find()
                            .filter(StaffDuplicateCandidateColumn::StaffMemberId1.eq(target_id))
                            .filter(StaffDuplicateCandidateColumn::StaffMemberId2.eq(target_id))
                            .all(txn)
                            .await?;

                        for cand in self_refs {
                            let active: crate::models::staff_member_duplicate_candidates::ActiveModel = cand.into();
                            active.delete(txn).await?;
                            stats.duplicate_candidates_cleaned += 1;
                        }

                        // Deduplicate pairs
                        let all_target_candidates = StaffDuplicateCandidate::find()
                            .filter(
                                Condition::any()
                                    .add(StaffDuplicateCandidateColumn::StaffMemberId1.eq(target_id))
                                    .add(StaffDuplicateCandidateColumn::StaffMemberId2.eq(target_id))
                            )
                            .all(txn)
                            .await?;

                        let mut seen_pairs: HashSet<(u32, u32)> = HashSet::new();
                        for cand in all_target_candidates {
                            let pair = (
                                std::cmp::min(cand.staff_member_id_1, cand.staff_member_id_2),
                                std::cmp::max(cand.staff_member_id_1, cand.staff_member_id_2),
                            );
                            if !seen_pairs.insert(pair) {
                                let active: crate::models::staff_member_duplicate_candidates::ActiveModel = cand.into();
                                active.delete(txn).await?;
                                stats.duplicate_candidates_cleaned += 1;
                            }
                        }
                    }

                    // 11. Delete source staff members
                    for from_id in &from_ids {
                        StaffMember::delete_by_id(*from_id).exec(txn).await?;
                        stats.staff_deleted += 1;
                    }

                    // 12. Get and return the updated target staff
                    let merged_staff = StaffMember::find_by_id(target_id)
                        .one(txn)
                        .await?
                        .ok_or(DbErr::RecordNotFound(
                            "Merged staff member not found".to_string(),
                        ))?;

                    Ok(StaffMergeResult {
                        merged_staff,
                        stats,
                    })
                })
            })
            .await
            .map_err(|e| match e {
                TransactionError::Connection(db_err) => db_err,
                TransactionError::Transaction(db_err) => db_err,
            })?;

        // Log the merge action
        let _ = ActionLogService::record_staff_merge(
            db,
            target_id,
            user_id,
            &before_state,
            &result.merged_staff,
            &result.stats,
            &from_ids_for_log,
            ip_address,
        )
        .await;

        Ok(result)
    }

    // ------------------------------------------------------------------------
    // Station Transfer
    // ------------------------------------------------------------------------

    /// Transfer a staff member to a new station (duplicate + archive pattern).
    pub async fn transfer_to_station(
        db: &DatabaseConnection,
        req: StaffTransferRequest,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StaffTransferResult, DbErr> {
        // Validate source staff exists
        let source = StaffMember::find_by_id(req.staff_member_id).one(db).await?;
        if source.is_none() {
            return Err(DbErr::RecordNotFound(
                "Source staff member not found".to_string(),
            ));
        }
        let source = source.unwrap();

        // Validate target station exists
        let target_station = RadioStation::find_by_id(req.new_station_id).one(db).await?;
        if target_station.is_none() {
            return Err(DbErr::RecordNotFound(
                "Target radio station not found".to_string(),
            ));
        }

        let old_station_id = source.radio_station_id.unwrap_or(0);

        // Perform transfer in transaction
        let result = db
            .transaction::<_, StaffTransferResult, DbErr>(|txn| {
                let transfer_reason = req.transfer_reason.clone();
                let new_station_id = req.new_station_id;

                Box::pin(async move {
                    // 1. Create new staff member at target station
                    let new_staff = StaffActiveModel {
                        radio_station_id: Set(Some(new_station_id)),
                        user_id: Set(source.user_id),
                        first_name: Set(source.first_name.clone()),
                        last_name: Set(source.last_name.clone()),
                        on_air_name: Set(source.on_air_name.clone()),
                        position: Set(source.position.clone()),
                        email: Set(source.email.clone()),
                        show_name: Set(source.show_name.clone()),
                        start_time: Set(source.start_time),
                        end_time: Set(source.end_time),
                        days_on: Set(source.days_on.clone()),
                        bio: Set(source.bio.clone()),
                        show_description: Set(source.show_description.clone()),
                        transferred_from_id: Set(Some(source.id)),
                        created: Set(Some(Utc::now().naive_utc())),
                        modified: Set(Some(Utc::now().naive_utc())),
                        ..Default::default()
                    };

                    let new_profile = new_staff.insert(txn).await?;
                    let new_id = new_profile.id;

                    // 2. Copy images to new profile
                    let images = StaffImage::find()
                        .filter(StaffImageColumn::StaffMemberId.eq(source.id))
                        .all(txn)
                        .await?;

                    for img in images {
                        let new_img = crate::models::staff_images::ActiveModel {
                            staff_member_id: Set(Some(new_id)),
                            path: Set(img.path),
                            filename: Set(img.filename),
                            thumbname: Set(img.thumbname),
                            r#type: Set(img.r#type),
                            created: Set(Some(Utc::now().naive_utc())),
                            modified: Set(Some(Utc::now().naive_utc())),
                            ..Default::default()
                        };
                        new_img.insert(txn).await?;
                    }

                    // 3. Copy links to new profile
                    let links = StaffLink::find()
                        .filter(StaffLinkColumn::StaffMemberId.eq(source.id))
                        .all(txn)
                        .await?;

                    for lnk in links {
                        let new_lnk = crate::models::staff_links::ActiveModel {
                            staff_member_id: Set(Some(new_id)),
                            link: Set(lnk.link),
                            r#type: Set(lnk.r#type),
                            created: Set(Some(Utc::now().naive_utc())),
                            modified: Set(Some(Utc::now().naive_utc())),
                            ..Default::default()
                        };
                        new_lnk.insert(txn).await?;
                    }

                    // 4. Copy phone numbers to new profile
                    let phones = StaffPhone::find()
                        .filter(StaffPhoneColumn::StaffMemberId.eq(source.id))
                        .all(txn)
                        .await?;

                    for ph in phones {
                        let new_ph = crate::models::staff_phone_numbers::ActiveModel {
                            staff_member_id: Set(Some(new_id)),
                            phone: Set(ph.phone),
                            ext: Set(ph.ext),
                            r#type: Set(ph.r#type),
                            created: Set(Some(Utc::now().naive_utc())),
                            modified: Set(Some(Utc::now().naive_utc())),
                            ..Default::default()
                        };
                        new_ph.insert(txn).await?;
                    }

                    // Note: Addresses are NOT copied (station-specific)
                    // Note: Sub-genres are NOT copied (will build from new playlists)
                    // Note: Playlists/archives stay with old profile

                    // 5. Archive old profile
                    let mut old_active: StaffActiveModel = source.clone().into();
                    old_active.archived = Set(1);
                    old_active.archived_at = Set(Some(Utc::now().naive_utc()));
                    old_active.archived_reason = Set(Some(transfer_reason));
                    old_active.transferred_to_id = Set(Some(new_id));
                    old_active.modified = Set(Some(Utc::now().naive_utc()));
                    let old_profile = old_active.update(txn).await?;

                    // 6. Recalculate sub-genres for old profile (from its archives)
                    Self::recalculate_sub_genres_internal(txn, source.id).await?;

                    Ok(StaffTransferResult {
                        old_profile,
                        new_profile,
                    })
                })
            })
            .await
            .map_err(|e| match e {
                TransactionError::Connection(db_err) => db_err,
                TransactionError::Transaction(db_err) => db_err,
            })?;

        // Log the transfer action
        let _ = ActionLogService::record_staff_transfer(
            db,
            result.old_profile.id,
            result.new_profile.id,
            user_id,
            old_station_id,
            req.new_station_id,
            &req.transfer_reason,
            ip_address,
        )
        .await;

        Ok(result)
    }

    /// Archive a staff member.
    pub async fn archive_staff_member(
        db: &DatabaseConnection,
        id: u32,
        reason: &str,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StaffMemberModel, DbErr> {
        let staff = StaffMember::find_by_id(id).one(db).await?;
        if staff.is_none() {
            return Err(DbErr::RecordNotFound(
                "Staff member not found".to_string(),
            ));
        }
        let staff = staff.unwrap();

        // Log before archiving
        let _ =
            ActionLogService::record_staff_archive(db, id, user_id, &staff, reason, ip_address)
                .await;

        let mut active_model: StaffActiveModel = staff.into();
        active_model.archived = Set(1);
        active_model.archived_at = Set(Some(Utc::now().naive_utc()));
        active_model.archived_reason = Set(Some(reason.to_string()));
        active_model.modified = Set(Some(Utc::now().naive_utc()));
        active_model.update(db).await
    }

    /// Unarchive a staff member.
    pub async fn unarchive_staff_member(
        db: &DatabaseConnection,
        id: u32,
        user_id: Option<u32>,
        ip_address: Option<String>,
    ) -> Result<StaffMemberModel, DbErr> {
        let staff = StaffMember::find_by_id(id).one(db).await?;
        if staff.is_none() {
            return Err(DbErr::RecordNotFound(
                "Staff member not found".to_string(),
            ));
        }
        let staff = staff.unwrap();

        // Log before unarchiving
        let _ =
            ActionLogService::record_staff_unarchive(db, id, user_id, &staff, ip_address).await;

        let mut active_model: StaffActiveModel = staff.into();
        active_model.archived = Set(0);
        active_model.archived_at = Set(None);
        active_model.archived_reason = Set(None);
        active_model.modified = Set(Some(Utc::now().naive_utc()));
        active_model.update(db).await
    }

    // ------------------------------------------------------------------------
    // Sub-Genre Recalculation
    // ------------------------------------------------------------------------

    /// Recalculate sub-genres for a staff member based on playlist archives.
    ///
    /// Algorithm: 5+ unique songs from 5+ unique bands threshold per sub-genre.
    pub async fn recalculate_sub_genres(
        db: &DatabaseConnection,
        staff_member_id: u32,
    ) -> Result<Vec<u32>, DbErr> {
        Self::recalculate_sub_genres_internal(db, staff_member_id).await
    }

    async fn recalculate_sub_genres_internal<C: ConnectionTrait>(
        db: &C,
        staff_member_id: u32,
    ) -> Result<Vec<u32>, DbErr> {
        const MIN_UNIQUE_SONGS: usize = 5;
        const MIN_UNIQUE_BANDS: usize = 5;

        // Load all playlist archives for this staff member with song data
        let archives = StaffPlaylistArchive::find()
            .filter(StaffPlaylistArchiveColumn::StaffMemberId.eq(staff_member_id))
            .all(db)
            .await?;

        // Collect unique song_ids that have both song_id and band_id
        let song_ids: Vec<u32> = archives
            .iter()
            .filter_map(|a| a.song_id)
            .collect::<std::collections::HashSet<_>>()
            .into_iter()
            .collect();

        if song_ids.is_empty() {
            // No songs in archives, clear sub-genres and return
            StaffSubGenres::delete_many()
                .filter(StaffSubGenreColumn::StaffMemberId.eq(staff_member_id))
                .exec(db)
                .await?;
            return Ok(vec![]);
        }

        // Load songs to get sub_genre_id mapping
        let songs = Song::find()
            .filter(SongColumn::Id.is_in(song_ids))
            .filter(SongColumn::SubGenreId.is_not_null())
            .all(db)
            .await?;

        // Create song_id -> sub_genre_id mapping
        let song_to_genre: HashMap<u32, u32> = songs
            .into_iter()
            .filter_map(|s| s.sub_genre_id.map(|sg| (s.id, sg)))
            .collect();

        // Group archives by sub_genre_id, tracking unique songs and bands
        let mut sub_genre_stats: HashMap<u32, (HashSet<u32>, HashSet<u32>)> = HashMap::new();
        for archive in &archives {
            if let (Some(song_id), Some(band_id)) = (archive.song_id, archive.band_id) {
                if let Some(&sub_genre_id) = song_to_genre.get(&song_id) {
                    let entry = sub_genre_stats
                        .entry(sub_genre_id)
                        .or_insert_with(|| (HashSet::new(), HashSet::new()));
                    entry.0.insert(song_id);  // unique songs
                    entry.1.insert(band_id);  // unique bands
                }
            }
        }

        // Filter to qualifying sub-genres (5+ songs from 5+ bands)
        let qualifying_sub_genres: Vec<u32> = sub_genre_stats
            .into_iter()
            .filter(|(_, (songs, bands))| {
                songs.len() >= MIN_UNIQUE_SONGS && bands.len() >= MIN_UNIQUE_BANDS
            })
            .map(|(sg_id, _)| sg_id)
            .collect();

        // Delete existing associations
        StaffSubGenres::delete_many()
            .filter(StaffSubGenreColumn::StaffMemberId.eq(staff_member_id))
            .exec(db)
            .await?;

        // Insert qualifying sub-genres
        for sg_id in &qualifying_sub_genres {
            let new_assoc = StaffSubGenreActiveModel {
                staff_member_id: Set(Some(staff_member_id)),
                sub_genre_id: Set(Some(*sg_id)),
                ..Default::default()
            };
            new_assoc.insert(db).await?;
        }

        Ok(qualifying_sub_genres)
    }

    // ------------------------------------------------------------------------
    // Helper Methods
    // ------------------------------------------------------------------------

    async fn load_staff_relations(
        db: &DatabaseConnection,
        staff: Vec<StaffMemberModel>,
    ) -> Result<Vec<StaffResponse>, DbErr> {
        if staff.is_empty() {
            return Ok(vec![]);
        }

        let staff_ids: Vec<u32> = staff.iter().map(|s| s.id).collect();
        let station_ids: Vec<u32> = staff.iter().filter_map(|s| s.radio_station_id).collect();

        // Load stations
        let stations: HashMap<u32, String> = if !station_ids.is_empty() {
            RadioStation::find()
                .filter(crate::models::radio_stations::Column::Id.is_in(station_ids))
                .all(db)
                .await?
                .into_iter()
                .filter_map(|s| s.name.map(|n| (s.id, n)))
                .collect()
        } else {
            HashMap::new()
        };

        // Load sub-genres
        let staff_sub_genres = StaffSubGenres::find()
            .filter(StaffSubGenreColumn::StaffMemberId.is_in(staff_ids.clone()))
            .all(db)
            .await?;

        let sub_genre_ids: Vec<u32> = staff_sub_genres
            .iter()
            .filter_map(|ssg| ssg.sub_genre_id)
            .collect();

        let sub_genres: HashMap<u32, crate::models::sub_genres::Model> = if !sub_genre_ids.is_empty()
        {
            crate::models::sub_genres::Entity::find()
                .filter(crate::models::sub_genres::Column::Id.is_in(sub_genre_ids))
                .all(db)
                .await?
                .into_iter()
                .map(|sg| (sg.id, sg))
                .collect()
        } else {
            HashMap::new()
        };

        // Group sub-genres by staff
        let mut sub_genres_by_staff: HashMap<u32, Vec<u32>> = HashMap::new();
        for ssg in &staff_sub_genres {
            if let (Some(staff_id), Some(sg_id)) = (ssg.staff_member_id, ssg.sub_genre_id) {
                sub_genres_by_staff.entry(staff_id).or_default().push(sg_id);
            }
        }

        // Load images
        let images = StaffImage::find()
            .filter(StaffImageColumn::StaffMemberId.is_in(staff_ids.clone()))
            .all(db)
            .await?;

        let mut images_by_staff: HashMap<u32, Vec<crate::models::staff_images::Model>> =
            HashMap::new();
        for img in images {
            if let Some(staff_id) = img.staff_member_id {
                images_by_staff.entry(staff_id).or_default().push(img);
            }
        }

        // Build results
        let results: Vec<StaffResponse> = staff
            .into_iter()
            .map(|s| {
                let station_name = s.radio_station_id.and_then(|id| stations.get(&id).cloned());

                let staff_sg_ids = sub_genres_by_staff.get(&s.id).cloned().unwrap_or_default();
                let staff_sub_genres: Vec<crate::models::sub_genres::Model> = staff_sg_ids
                    .iter()
                    .filter_map(|id| sub_genres.get(id).cloned())
                    .collect();

                let staff_images = images_by_staff.get(&s.id).cloned().unwrap_or_default();

                StaffResponse {
                    staff: s,
                    station_name,
                    sub_genres: staff_sub_genres,
                    images: staff_images,
                }
            })
            .collect();

        Ok(results)
    }

    async fn enrich_staff_list_views(
        db: &DatabaseConnection,
        staff: Vec<StaffListView>,
    ) -> Result<Vec<StaffListViewEnriched>, DbErr> {
        if staff.is_empty() {
            return Ok(vec![]);
        }

        let staff_ids: Vec<u32> = staff.iter().map(|s| s.id).collect();
        let station_ids: Vec<u32> = staff.iter().filter_map(|s| s.radio_station_id).collect();

        // Load stations
        let stations: HashMap<u32, String> = if !station_ids.is_empty() {
            RadioStation::find()
                .filter(crate::models::radio_stations::Column::Id.is_in(station_ids))
                .all(db)
                .await?
                .into_iter()
                .filter_map(|s| s.name.map(|n| (s.id, n)))
                .collect()
        } else {
            HashMap::new()
        };

        // Load sub-genres
        let staff_sub_genres = StaffSubGenres::find()
            .filter(StaffSubGenreColumn::StaffMemberId.is_in(staff_ids.clone()))
            .all(db)
            .await?;

        let sub_genre_ids: Vec<u32> = staff_sub_genres
            .iter()
            .filter_map(|ssg| ssg.sub_genre_id)
            .collect();

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

        let mut sub_genres_by_staff: HashMap<u32, Vec<u32>> = HashMap::new();
        for ssg in &staff_sub_genres {
            if let (Some(staff_id), Some(sg_id)) = (ssg.staff_member_id, ssg.sub_genre_id) {
                sub_genres_by_staff.entry(staff_id).or_default().push(sg_id);
            }
        }

        // Load first image for each staff
        // TODO: Implement thumbnail generation on upload so we don't need to
        // prefer thumbname over filename here - just serve a single canonical URL.
        let images = StaffImage::find()
            .filter(StaffImageColumn::StaffMemberId.is_in(staff_ids.clone()))
            .all(db)
            .await?;

        let mut first_image_by_staff: HashMap<u32, String> = HashMap::new();
        for img in images {
            if let Some(staff_id) = img.staff_member_id {
                // Build image URL from path and filename/thumbname
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
                    first_image_by_staff.entry(staff_id).or_insert(url);
                }
            }
        }

        // Check transfer status (need to query full models for this)
        let full_staff = StaffMember::find()
            .filter(StaffColumn::Id.is_in(staff_ids.clone()))
            .all(db)
            .await?;

        let transfer_status: HashMap<u32, (bool, bool)> = full_staff
            .into_iter()
            .map(|s| {
                (
                    s.id,
                    (
                        s.transferred_from_id.is_some(),
                        s.transferred_to_id.is_some(),
                    ),
                )
            })
            .collect();

        // Build enriched results
        let results: Vec<StaffListViewEnriched> = staff
            .into_iter()
            .map(|s| {
                let station_name = s.radio_station_id.and_then(|id| stations.get(&id).cloned());

                let staff_sg_ids = sub_genres_by_staff.get(&s.id).cloned().unwrap_or_default();
                let sub_genre_names: Vec<String> = staff_sg_ids
                    .iter()
                    .filter_map(|id| sub_genres.get(id).cloned())
                    .collect();

                let image_url = first_image_by_staff.get(&s.id).cloned();

                let (is_transfer_target, is_transfer_source) =
                    transfer_status.get(&s.id).cloned().unwrap_or((false, false));

                StaffListViewEnriched::new(
                    s,
                    station_name,
                    sub_genre_names,
                    image_url,
                    is_transfer_target,
                    is_transfer_source,
                )
            })
            .collect();

        Ok(results)
    }
}
