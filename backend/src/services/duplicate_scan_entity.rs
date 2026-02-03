//! Trait abstraction for duplicate scan entity operations.
//! Each entity type implements this trait to eliminate per-entity duplication
//! in the duplicate scan service.

use crate::models::album_duplicate_candidates::{
    ActiveModel as AlbumCandidateActiveModel, Column as AlbumCandidateColumn,
    Entity as AlbumDuplicateCandidate,
};
use crate::models::albums::{Column as AlbumColumn, Entity as Album};
use crate::models::band_duplicate_candidates::{
    ActiveModel as BandCandidateActiveModel, CandidateStatus, Column as BandCandidateColumn,
    Entity as BandDuplicateCandidate,
};
use crate::models::bands::{Column as BandColumn, Entity as Band};
use crate::models::label_duplicate_candidates::{
    ActiveModel as LabelCandidateActiveModel, Column as LabelCandidateColumn,
    Entity as LabelDuplicateCandidate,
};
use crate::models::labels::{Column as LabelColumn, Entity as Label};
use crate::models::radio_station_duplicate_candidates::{
    ActiveModel as RadioStationCandidateActiveModel, Column as RadioStationCandidateColumn,
    Entity as RadioStationDuplicateCandidate,
};
use crate::models::radio_stations::{Column as RadioStationColumn, Entity as RadioStation};
use crate::models::song_duplicate_candidates::{
    ActiveModel as SongCandidateActiveModel, Column as SongCandidateColumn,
    Entity as SongDuplicateCandidate,
};
use crate::models::songs::{Column as SongColumn, Entity as Song};
use crate::models::staff_member_duplicate_candidates::{
    ActiveModel as StaffMemberCandidateActiveModel, Column as StaffMemberCandidateColumn,
    Entity as StaffMemberDuplicateCandidate,
};
use crate::models::staff_members::{Column as StaffMemberColumn, Entity as StaffMember};
use crate::services::album_service::AlbumService;
use crate::services::band_service::BandService;
use crate::services::duplicate_scan_service::{
    CandidateFilterParams, EntitySummary, GenericCandidate,
};
use crate::services::label_service::LabelService;
use crate::services::radio_station_service::RadioStationService;
use crate::services::song_service::SongService;
use crate::services::staff_service::StaffService;
use crate::services::types::SimilarityParams;
use sea_orm::*;
use std::collections::{HashMap, HashSet};
use std::future::Future;

/// Check if a database error is a duplicate key violation (MySQL error 1062)
fn is_duplicate_key_error(err: &DbErr) -> bool {
    match err {
        DbErr::Query(RuntimeErr::SqlxError(sqlx_err)) => {
            let debug_str = format!("{:?}", sqlx_err);
            debug_str.contains("1062") || debug_str.contains("Duplicate entry")
        }
        _ => false,
    }
}

/// Trait abstracting entity-specific operations for duplicate scanning.
/// All methods are static (no &self) — implementations are marker structs.
pub trait DuplicateScanEntity: Send + Sync + 'static {
    /// Fetch a batch of entities with ID > after_id, returning (id, search_name) pairs.
    /// Entities with empty/missing names are filtered out.
    fn fetch_batch(
        db: &DatabaseConnection,
        after_id: u32,
        limit: u64,
    ) -> impl Future<Output = Result<Vec<(u32, String)>, DbErr>> + Send;

    /// Find similar entities, returning (entity_id, similarity_score) pairs.
    fn find_similar(
        db: &DatabaseConnection,
        entity_id: u32,
        name: &str,
        jw_weight: f64,
        dice_weight: f64,
        min_similarity: i32,
    ) -> impl Future<Output = Result<Vec<(u32, i32)>, DbErr>> + Send;

    /// Get existing candidate pairs involving any of the given IDs.
    fn get_existing_pairs(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> impl Future<Output = Result<HashSet<(u32, u32)>, DbErr>> + Send;

    /// Insert a duplicate candidate. Returns true if inserted, false if duplicate key.
    fn insert_candidate(
        db: &DatabaseConnection,
        id1: u32,
        id2: u32,
        score: i32,
        min_similarity: i32,
        jw_weight: f64,
        dice_weight: f64,
    ) -> impl Future<Output = Result<bool, DbErr>> + Send;

    /// Fetch all candidates with filters applied, as GenericCandidate.
    fn fetch_candidates_filtered(
        db: &DatabaseConnection,
        params: &CandidateFilterParams,
    ) -> impl Future<Output = Result<Vec<GenericCandidate>, DbErr>> + Send;

    /// Load lightweight entity summaries for a set of IDs.
    fn load_summaries(
        db: &DatabaseConnection,
        ids: &[u32],
    ) -> impl Future<Output = Result<HashMap<u32, EntitySummary>, DbErr>> + Send;

    /// Update a candidate's status.
    fn update_status(
        db: &DatabaseConnection,
        candidate_id: u32,
        status: CandidateStatus,
        user_id: Option<u32>,
    ) -> impl Future<Output = Result<(), DbErr>> + Send;

    /// Restore a candidate to pending status.
    fn restore(
        db: &DatabaseConnection,
        candidate_id: u32,
    ) -> impl Future<Output = Result<(), DbErr>> + Send;

    /// Clear candidates (all or pending only). Returns count deleted.
    fn clear(
        db: &DatabaseConnection,
        pending_only: bool,
    ) -> impl Future<Output = Result<u64, DbErr>> + Send;

    /// Get all matches for a specific entity.
    fn get_matches(
        db: &DatabaseConnection,
        entity_id: u32,
    ) -> impl Future<Output = Result<Vec<GenericCandidate>, DbErr>> + Send;

    /// Count all entities of this type.
    fn count_all(
        db: &DatabaseConnection,
    ) -> impl Future<Output = Result<u64, DbErr>> + Send;

    /// Candidate table name (e.g. "band_duplicate_candidates").
    fn candidate_table() -> &'static str;

    /// Column name for entity ID 1 in the candidate table (e.g. "band_id1").
    fn id1_column() -> &'static str;

    /// Column name for entity ID 2 in the candidate table (e.g. "band_id2").
    fn id2_column() -> &'static str;

    /// DB-level GROUP BY pagination for candidates.
    /// Returns (total_groups, candidates_for_page).
    fn fetch_grouped_page(
        db: &DatabaseConnection,
        params: &CandidateFilterParams,
        page: u64,
        page_size: u64,
    ) -> impl Future<Output = Result<(u64, Vec<GenericCandidate>), DbErr>> + Send {
        async move {
            use sea_orm::sea_query::{Alias, Expr, Func, Order, Query};

            let table = Alias::new(Self::candidate_table());
            let id1 = Alias::new(Self::id1_column());
            let id2 = Alias::new(Self::id2_column());
            let score_col = Alias::new("similarity_score");
            let status_col = Alias::new("status");

            // Helper to apply common filter conditions to a query
            let apply_filters = |query: &mut sea_orm::sea_query::SelectStatement| {
                if let Some(ref status) = params.status {
                    query.and_where(Expr::col(status_col.clone()).eq(status.as_str()));
                }
                if let Some(min) = params.min_score {
                    query.and_where(Expr::col(score_col.clone()).gte(min));
                }
                if let Some(max) = params.max_score {
                    query.and_where(Expr::col(score_col.clone()).lte(max));
                }
                if let Some(eid) = params.entity_id {
                    query.and_where(
                        Expr::col(id1.clone()).eq(eid).or(Expr::col(id2.clone()).eq(eid)),
                    );
                }
            };

            // 1. Count total distinct entity groups
            let mut count_query = Query::select();
            count_query
                .expr(Expr::col(id1.clone()).count_distinct())
                .from(table.clone());
            apply_filters(&mut count_query);

            let total: u64 = db
                .query_one(&count_query)
                .await?
                .and_then(|r| r.try_get_by_index::<i64>(0).ok())
                .unwrap_or(0) as u64;

            if total == 0 {
                return Ok((0, vec![]));
            }

            // 2. Get page of entity_id_1 values sorted by max score
            let offset = (page - 1) * page_size;
            let max_score_alias = Alias::new("max_score");
            let mut ids_query = Query::select();
            ids_query
                .column(id1.clone())
                .expr_as(Func::max(Expr::col(score_col.clone())), max_score_alias.clone())
                .from(table.clone())
                .group_by_col(id1.clone())
                .order_by(max_score_alias, Order::Desc)
                .limit(page_size)
                .offset(offset);
            apply_filters(&mut ids_query);

            let id_rows = db.query_all(&ids_query).await?;
            let entity_ids: Vec<u32> = id_rows
                .iter()
                .filter_map(|r| r.try_get_by_index::<u32>(0).ok())
                .collect();

            if entity_ids.is_empty() {
                return Ok((total, vec![]));
            }

            // 3. Fetch full candidates for those entity_id_1 values
            let mut fetch_query = Query::select();
            fetch_query
                .column(sea_orm::sea_query::Asterisk)
                .from(table)
                .and_where(Expr::col(id1.clone()).is_in(entity_ids.iter().copied()))
                .order_by(score_col.clone(), Order::Desc);
            apply_filters(&mut fetch_query);

            let rows = db.query_all(&fetch_query).await?;
            let id1_str = Self::id1_column();
            let id2_str = Self::id2_column();

            let candidates: Vec<GenericCandidate> = rows
                .iter()
                .filter_map(|row| {
                    Some(GenericCandidate {
                        id: row.try_get_by::<u32, &str>("id").ok()?,
                        entity_id_1: row.try_get_by::<u32, &str>(id1_str).ok()?,
                        entity_id_2: row.try_get_by::<u32, &str>(id2_str).ok()?,
                        similarity_score: row.try_get_by::<i32, &str>("similarity_score").ok()?,
                        match_reasons: row.try_get_by::<serde_json::Value, &str>("match_reasons").ok(),
                        status: row.try_get_by::<String, &str>("status").ok()?,
                        reviewed_by: row.try_get_by::<u32, &str>("reviewed_by").ok(),
                        reviewed_at: row.try_get_by::<chrono::NaiveDateTime, &str>("reviewed_at").ok(),
                        detected_at: row.try_get_by::<chrono::NaiveDateTime, &str>("detected_at").ok()?,
                    })
                })
                .collect();

            Ok((total, candidates))
        }
    }
}

// ──────────────────────────── Bands ────────────────────────────

pub struct BandScanEntity;

impl DuplicateScanEntity for BandScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = Band::find()
            .filter(BandColumn::Id.gt(after_id))
            .order_by_asc(BandColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().map(|e| (e.id, e.name)).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        let params = SimilarityParams {
            search_term: name.to_string(),
            existing_id: Some(entity_id),
            jw_weight: Some(jw_weight),
            dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity),
            limit: Some(50),
            ..Default::default()
        };
        let results = BandService::get_similar_bands(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.band.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = BandDuplicateCandidate::find()
            .filter(Condition::any()
                .add(BandCandidateColumn::BandId1.is_in(ids.to_vec()))
                .add(BandCandidateColumn::BandId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.band_id_1, c.band_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = BandCandidateActiveModel {
            band_id_1: Set(id1), band_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = BandDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(BandCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(BandCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(BandCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(BandCandidateColumn::BandId1.eq(eid)).add(BandCandidateColumn::BandId2.eq(eid)));
        }
        query = query.order_by_desc(BandCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = Band::find().filter(BandColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| (e.id, EntitySummary {
            id: e.id, name: e.name, slug: e.slug.unwrap_or_default(), verified: e.verified, approved: e.approved,
        })).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        BandCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        BandCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = BandDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(BandCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = BandDuplicateCandidate::find()
            .filter(Condition::any().add(BandCandidateColumn::BandId1.eq(entity_id)).add(BandCandidateColumn::BandId2.eq(entity_id)))
            .order_by_desc(BandCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        Band::find().count(db).await
    }

    fn candidate_table() -> &'static str { "band_duplicate_candidates" }
    fn id1_column() -> &'static str { "band_id1" }
    fn id2_column() -> &'static str { "band_id2" }
}

// ──────────────────────────── Albums ────────────────────────────

pub struct AlbumScanEntity;

impl DuplicateScanEntity for AlbumScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = Album::find()
            .filter(AlbumColumn::Id.gt(after_id))
            .order_by_asc(AlbumColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().filter_map(|e| {
            let name = e.name.as_deref().filter(|n| !n.is_empty())?.to_string();
            Some((e.id, name))
        }).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        let params = SimilarityParams {
            search_term: name.to_string(), existing_id: Some(entity_id),
            jw_weight: Some(jw_weight), dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity), limit: Some(50), ..Default::default()
        };
        let results = AlbumService::get_similar_albums(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = AlbumDuplicateCandidate::find()
            .filter(Condition::any().add(AlbumCandidateColumn::AlbumId1.is_in(ids.to_vec())).add(AlbumCandidateColumn::AlbumId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.album_id_1, c.album_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = AlbumCandidateActiveModel {
            album_id_1: Set(id1), album_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = AlbumDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(AlbumCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(AlbumCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(AlbumCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(AlbumCandidateColumn::AlbumId1.eq(eid)).add(AlbumCandidateColumn::AlbumId2.eq(eid)));
        }
        query = query.order_by_desc(AlbumCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = Album::find().filter(AlbumColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| (e.id, EntitySummary {
            id: e.id, name: e.name.unwrap_or_default(), slug: e.slug.unwrap_or_default(), verified: e.verified, approved: e.approved,
        })).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        AlbumCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        AlbumCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = AlbumDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(AlbumCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = AlbumDuplicateCandidate::find()
            .filter(Condition::any().add(AlbumCandidateColumn::AlbumId1.eq(entity_id)).add(AlbumCandidateColumn::AlbumId2.eq(entity_id)))
            .order_by_desc(AlbumCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        Album::find().count(db).await
    }

    fn candidate_table() -> &'static str { "album_duplicate_candidates" }
    fn id1_column() -> &'static str { "album_id1" }
    fn id2_column() -> &'static str { "album_id2" }
}

// ──────────────────────────── Labels ────────────────────────────

pub struct LabelScanEntity;

impl DuplicateScanEntity for LabelScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = Label::find()
            .filter(LabelColumn::Id.gt(after_id))
            .order_by_asc(LabelColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().filter_map(|e| {
            let name = e.name.as_deref().filter(|n| !n.is_empty())?.to_string();
            Some((e.id, name))
        }).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        let params = SimilarityParams {
            search_term: name.to_string(), existing_id: Some(entity_id),
            jw_weight: Some(jw_weight), dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity), limit: Some(50), ..Default::default()
        };
        let results = LabelService::get_similar_labels(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = LabelDuplicateCandidate::find()
            .filter(Condition::any().add(LabelCandidateColumn::LabelId1.is_in(ids.to_vec())).add(LabelCandidateColumn::LabelId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.label_id_1, c.label_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = LabelCandidateActiveModel {
            label_id_1: Set(id1), label_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = LabelDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(LabelCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(LabelCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(LabelCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(LabelCandidateColumn::LabelId1.eq(eid)).add(LabelCandidateColumn::LabelId2.eq(eid)));
        }
        query = query.order_by_desc(LabelCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = Label::find().filter(LabelColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| (e.id, EntitySummary {
            id: e.id, name: e.name.unwrap_or_default(), slug: e.slug.unwrap_or_default(), verified: 0, approved: 0,
        })).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        LabelCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        LabelCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = LabelDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(LabelCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = LabelDuplicateCandidate::find()
            .filter(Condition::any().add(LabelCandidateColumn::LabelId1.eq(entity_id)).add(LabelCandidateColumn::LabelId2.eq(entity_id)))
            .order_by_desc(LabelCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        Label::find().count(db).await
    }

    fn candidate_table() -> &'static str { "label_duplicate_candidates" }
    fn id1_column() -> &'static str { "label_id1" }
    fn id2_column() -> &'static str { "label_id2" }
}

// ──────────────────────────── Radio Stations ────────────────────────────

pub struct RadioStationScanEntity;

impl DuplicateScanEntity for RadioStationScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = RadioStation::find()
            .filter(RadioStationColumn::Id.gt(after_id))
            .order_by_asc(RadioStationColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().filter_map(|e| {
            let name = e.name.as_deref().filter(|n| !n.is_empty())?.to_string();
            Some((e.id, name))
        }).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        let params = SimilarityParams {
            search_term: name.to_string(), existing_id: Some(entity_id),
            jw_weight: Some(jw_weight), dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity), limit: Some(50), ..Default::default()
        };
        let results = RadioStationService::get_similar_radio_stations(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = RadioStationDuplicateCandidate::find()
            .filter(Condition::any().add(RadioStationCandidateColumn::RadioStationId1.is_in(ids.to_vec())).add(RadioStationCandidateColumn::RadioStationId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.radio_station_id_1, c.radio_station_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = RadioStationCandidateActiveModel {
            radio_station_id_1: Set(id1), radio_station_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = RadioStationDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(RadioStationCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(RadioStationCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(RadioStationCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(RadioStationCandidateColumn::RadioStationId1.eq(eid)).add(RadioStationCandidateColumn::RadioStationId2.eq(eid)));
        }
        query = query.order_by_desc(RadioStationCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = RadioStation::find().filter(RadioStationColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| (e.id, EntitySummary {
            id: e.id, name: e.name.unwrap_or_default(), slug: e.slug.unwrap_or_default(), verified: e.verified, approved: e.approved,
        })).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        RadioStationCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        RadioStationCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = RadioStationDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(RadioStationCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = RadioStationDuplicateCandidate::find()
            .filter(Condition::any().add(RadioStationCandidateColumn::RadioStationId1.eq(entity_id)).add(RadioStationCandidateColumn::RadioStationId2.eq(entity_id)))
            .order_by_desc(RadioStationCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        RadioStation::find().count(db).await
    }

    fn candidate_table() -> &'static str { "radio_station_duplicate_candidates" }
    fn id1_column() -> &'static str { "radio_station_id1" }
    fn id2_column() -> &'static str { "radio_station_id2" }
}

// ──────────────────────────── Staff Members ────────────────────────────

pub struct StaffMemberScanEntity;

impl DuplicateScanEntity for StaffMemberScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = StaffMember::find()
            .filter(StaffMemberColumn::Id.gt(after_id))
            .order_by_asc(StaffMemberColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().filter_map(|e| {
            let name = format!("{} {}", e.first_name.as_deref().unwrap_or(""), e.last_name.as_deref().unwrap_or("")).trim().to_string();
            if name.is_empty() { None } else { Some((e.id, name)) }
        }).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        let params = SimilarityParams {
            search_term: name.to_string(), existing_id: Some(entity_id),
            jw_weight: Some(jw_weight), dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity), limit: Some(50), ..Default::default()
        };
        let results = StaffService::get_similar_staff_members(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = StaffMemberDuplicateCandidate::find()
            .filter(Condition::any().add(StaffMemberCandidateColumn::StaffMemberId1.is_in(ids.to_vec())).add(StaffMemberCandidateColumn::StaffMemberId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.staff_member_id_1, c.staff_member_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = StaffMemberCandidateActiveModel {
            staff_member_id_1: Set(id1), staff_member_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = StaffMemberDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(StaffMemberCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(StaffMemberCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(StaffMemberCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(StaffMemberCandidateColumn::StaffMemberId1.eq(eid)).add(StaffMemberCandidateColumn::StaffMemberId2.eq(eid)));
        }
        query = query.order_by_desc(StaffMemberCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = StaffMember::find().filter(StaffMemberColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| {
            let name = format!("{} {}", e.first_name.as_deref().unwrap_or(""), e.last_name.as_deref().unwrap_or("")).trim().to_string();
            (e.id, EntitySummary { id: e.id, name, slug: e.slug.unwrap_or_default(), verified: e.verified, approved: e.approved })
        }).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        StaffMemberCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        StaffMemberCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = StaffMemberDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(StaffMemberCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = StaffMemberDuplicateCandidate::find()
            .filter(Condition::any().add(StaffMemberCandidateColumn::StaffMemberId1.eq(entity_id)).add(StaffMemberCandidateColumn::StaffMemberId2.eq(entity_id)))
            .order_by_desc(StaffMemberCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        StaffMember::find().count(db).await
    }

    fn candidate_table() -> &'static str { "staff_member_duplicate_candidates" }
    fn id1_column() -> &'static str { "staff_member_id1" }
    fn id2_column() -> &'static str { "staff_member_id2" }
}

// ──────────────────────────── Songs ────────────────────────────

pub struct SongScanEntity;

impl DuplicateScanEntity for SongScanEntity {
    async fn fetch_batch(db: &DatabaseConnection, after_id: u32, limit: u64) -> Result<Vec<(u32, String)>, DbErr> {
        let entities = Song::find()
            .filter(SongColumn::Id.gt(after_id))
            .order_by_asc(SongColumn::Id)
            .limit(limit)
            .all(db)
            .await?;
        Ok(entities.into_iter().filter_map(|e| {
            let name = e.name.as_deref().filter(|n| !n.is_empty())?.to_string();
            Some((e.id, name))
        }).collect())
    }

    async fn find_similar(db: &DatabaseConnection, entity_id: u32, name: &str, jw_weight: f64, dice_weight: f64, min_similarity: i32) -> Result<Vec<(u32, i32)>, DbErr> {
        // Look up the song's band_id so we only compare within the same band
        let band_id = Song::find_by_id(entity_id)
            .one(db)
            .await?
            .and_then(|s| s.band_id);

        let params = SimilarityParams {
            search_term: name.to_string(), existing_id: Some(entity_id),
            jw_weight: Some(jw_weight), dice_weight: Some(dice_weight),
            min_similarity: Some(min_similarity), limit: Some(50),
            band_id,
            restrict_to_parent: Some(true),
            ..Default::default()
        };
        let results = SongService::get_similar_songs(db, params).await?;
        Ok(results.into_iter().map(|r| (r.model.id, r.similarity_score)).collect())
    }

    async fn get_existing_pairs(db: &DatabaseConnection, ids: &[u32]) -> Result<HashSet<(u32, u32)>, DbErr> {
        let candidates = SongDuplicateCandidate::find()
            .filter(Condition::any().add(SongCandidateColumn::SongId1.is_in(ids.to_vec())).add(SongCandidateColumn::SongId2.is_in(ids.to_vec())))
            .all(db).await?;
        Ok(candidates.into_iter().map(|c| (c.song_id_1, c.song_id_2)).collect())
    }

    async fn insert_candidate(db: &DatabaseConnection, id1: u32, id2: u32, score: i32, min_similarity: i32, jw_weight: f64, dice_weight: f64) -> Result<bool, DbErr> {
        let now = chrono::Utc::now().naive_utc();
        let candidate = SongCandidateActiveModel {
            song_id_1: Set(id1), song_id_2: Set(id2),
            similarity_score: Set(score),
            match_reasons: Set(Some(serde_json::json!({"score": score, "method": "similarity_pipeline"}))),
            status: Set(CandidateStatus::Pending.to_string()),
            detected_at: Set(now),
            scan_settings: Set(Some(serde_json::json!({"min_similarity": min_similarity, "jw_weight": jw_weight, "dice_weight": dice_weight}))),
            ..Default::default()
        };
        match candidate.insert(db).await {
            Ok(_) => Ok(true),
            Err(ref e) if is_duplicate_key_error(e) => Ok(false),
            Err(e) => Err(e),
        }
    }

    async fn fetch_candidates_filtered(db: &DatabaseConnection, params: &CandidateFilterParams) -> Result<Vec<GenericCandidate>, DbErr> {
        let mut query = SongDuplicateCandidate::find();
        if let Some(ref status) = params.status { query = query.filter(SongCandidateColumn::Status.eq(status)); }
        if let Some(min) = params.min_score { query = query.filter(SongCandidateColumn::SimilarityScore.gte(min)); }
        if let Some(max) = params.max_score { query = query.filter(SongCandidateColumn::SimilarityScore.lte(max)); }
        if let Some(eid) = params.entity_id {
            query = query.filter(Condition::any().add(SongCandidateColumn::SongId1.eq(eid)).add(SongCandidateColumn::SongId2.eq(eid)));
        }
        query = query.order_by_desc(SongCandidateColumn::SimilarityScore);
        Ok(query.all(db).await?.into_iter().map(GenericCandidate::from).collect())
    }

    async fn load_summaries(db: &DatabaseConnection, ids: &[u32]) -> Result<HashMap<u32, EntitySummary>, DbErr> {
        let entities = Song::find().filter(SongColumn::Id.is_in(ids.to_vec())).all(db).await?;
        Ok(entities.into_iter().map(|e| (e.id, EntitySummary {
            id: e.id, name: e.name.unwrap_or_default(), slug: e.slug.unwrap_or_default(), verified: e.verified, approved: e.approved,
        })).collect())
    }

    async fn update_status(db: &DatabaseConnection, candidate_id: u32, status: CandidateStatus, user_id: Option<u32>) -> Result<(), DbErr> {
        let now = chrono::Utc::now().naive_utc();
        SongCandidateActiveModel {
            id: Set(candidate_id), status: Set(status.to_string()), reviewed_by: Set(user_id), reviewed_at: Set(Some(now)), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn restore(db: &DatabaseConnection, candidate_id: u32) -> Result<(), DbErr> {
        SongCandidateActiveModel {
            id: Set(candidate_id), status: Set(CandidateStatus::Pending.to_string()), reviewed_by: Set(None), reviewed_at: Set(None), ..Default::default()
        }.update(db).await?;
        Ok(())
    }

    async fn clear(db: &DatabaseConnection, pending_only: bool) -> Result<u64, DbErr> {
        let mut del = SongDuplicateCandidate::delete_many();
        if pending_only { del = del.filter(SongCandidateColumn::Status.eq("pending")); }
        Ok(del.exec(db).await?.rows_affected)
    }

    async fn get_matches(db: &DatabaseConnection, entity_id: u32) -> Result<Vec<GenericCandidate>, DbErr> {
        let candidates = SongDuplicateCandidate::find()
            .filter(Condition::any().add(SongCandidateColumn::SongId1.eq(entity_id)).add(SongCandidateColumn::SongId2.eq(entity_id)))
            .order_by_desc(SongCandidateColumn::SimilarityScore)
            .all(db).await?;
        Ok(candidates.into_iter().map(GenericCandidate::from).collect())
    }

    async fn count_all(db: &DatabaseConnection) -> Result<u64, DbErr> {
        Song::find().count(db).await
    }

    fn candidate_table() -> &'static str { "song_duplicate_candidates" }
    fn id1_column() -> &'static str { "song_id1" }
    fn id2_column() -> &'static str { "song_id2" }
}
