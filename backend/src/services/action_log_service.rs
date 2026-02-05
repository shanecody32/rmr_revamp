//! Action log service for recording auditable actions.
//!
//! Provides centralized logging for merge, transfer, and other
//! operations that need audit trails.

use crate::models::action_logs::{
    ActiveModel as ActionLogActiveModel,
    Entity as ActionLog,
    Model as ActionLogModel,
    action_types, entity_types,
};
use chrono::Utc;
use sea_orm::*;
use serde::Serialize;

pub struct ActionLogService;

#[allow(clippy::too_many_arguments)]
impl ActionLogService {
    /// Record an action in the action log.
    ///
    /// # Arguments
    /// * `db` - Database connection
    /// * `action_type` - Type of action (use constants from action_logs::action_types)
    /// * `entity_type` - Type of entity (use constants from action_logs::entity_types)
    /// * `entity_id` - ID of the primary entity involved
    /// * `user_id` - Optional ID of the user who performed the action
    /// * `before` - Optional state before the action (will be serialized to JSON)
    /// * `after` - Optional state after the action (will be serialized to JSON)
    /// * `metadata` - Optional additional metadata (will be serialized to JSON)
    /// * `ip_address` - Optional IP address of the request
    pub async fn record(
        db: &DatabaseConnection,
        action_type: &str,
        entity_type: &str,
        entity_id: u32,
        user_id: Option<u32>,
        before: Option<serde_json::Value>,
        after: Option<serde_json::Value>,
        metadata: Option<serde_json::Value>,
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let active_model = ActionLogActiveModel {
            action_type: Set(action_type.to_string()),
            entity_type: Set(entity_type.to_string()),
            entity_id: Set(entity_id),
            user_id: Set(user_id),
            before_snapshot: Set(before),
            after_snapshot: Set(after),
            metadata: Set(metadata),
            ip_address: Set(ip_address),
            created_at: Set(Utc::now().naive_utc()),
            ..Default::default()
        };

        active_model.insert(db).await
    }

    /// Record a staff member merge action.
    pub async fn record_staff_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::STAFF_MERGE,
            entity_types::STAFF_MEMBER,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a band merge action.
    pub async fn record_band_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::BAND_MERGE,
            entity_types::BAND,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record an album merge action.
    pub async fn record_album_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::ALBUM_MERGE,
            entity_types::ALBUM,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a song merge action.
    pub async fn record_song_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::SONG_MERGE,
            entity_types::SONG,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a radio station merge action.
    pub async fn record_radio_station_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::RADIO_STATION_MERGE,
            entity_types::RADIO_STATION,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a label merge action.
    pub async fn record_label_merge<B: Serialize, A: Serialize, S: Serialize>(
        db: &DatabaseConnection,
        target_id: u32,
        user_id: Option<u32>,
        before_state: &B,
        after_state: &A,
        merge_stats: &S,
        source_ids: &[u32],
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "source_ids": source_ids,
            "stats": serde_json::to_value(merge_stats).unwrap_or_default(),
        });

        Self::record(
            db,
            action_types::LABEL_MERGE,
            entity_types::LABEL,
            target_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a staff member transfer action.
    pub async fn record_staff_transfer(
        db: &DatabaseConnection,
        old_profile_id: u32,
        new_profile_id: u32,
        user_id: Option<u32>,
        old_station_id: u32,
        new_station_id: u32,
        transfer_reason: &str,
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "old_profile_id": old_profile_id,
            "new_profile_id": new_profile_id,
            "old_station_id": old_station_id,
            "new_station_id": new_station_id,
            "reason": transfer_reason,
        });

        // Log against the old profile (the one being archived)
        Self::record(
            db,
            action_types::STAFF_TRANSFER,
            entity_types::STAFF_MEMBER,
            old_profile_id,
            user_id,
            None,
            None,
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a staff member archive action.
    pub async fn record_staff_archive<T: Serialize>(
        db: &DatabaseConnection,
        staff_id: u32,
        user_id: Option<u32>,
        before_state: &T,
        reason: &str,
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "reason": reason,
        });

        Self::record(
            db,
            action_types::STAFF_ARCHIVE,
            entity_types::STAFF_MEMBER,
            staff_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            None,
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Record a staff member unarchive action.
    pub async fn record_staff_unarchive<T: Serialize>(
        db: &DatabaseConnection,
        staff_id: u32,
        user_id: Option<u32>,
        before_state: &T,
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        Self::record(
            db,
            action_types::STAFF_UNARCHIVE,
            entity_types::STAFF_MEMBER,
            staff_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            None,
            None,
            ip_address,
        )
        .await
    }

    /// Record an admin edit of an archived staff member.
    pub async fn record_staff_admin_edit<T: Serialize>(
        db: &DatabaseConnection,
        staff_id: u32,
        user_id: Option<u32>,
        before_state: &T,
        after_state: &T,
        edit_reason: &str,
        ip_address: Option<String>,
    ) -> Result<ActionLogModel, DbErr> {
        let metadata = serde_json::json!({
            "reason": edit_reason,
        });

        Self::record(
            db,
            action_types::STAFF_ADMIN_EDIT,
            entity_types::STAFF_MEMBER,
            staff_id,
            user_id,
            serde_json::to_value(before_state).ok(),
            serde_json::to_value(after_state).ok(),
            Some(metadata),
            ip_address,
        )
        .await
    }

    /// Get action logs for a specific entity.
    pub async fn get_logs_for_entity(
        db: &DatabaseConnection,
        entity_type: &str,
        entity_id: u32,
        limit: u64,
    ) -> Result<Vec<ActionLogModel>, DbErr> {
        ActionLog::find()
            .filter(crate::models::action_logs::Column::EntityType.eq(entity_type))
            .filter(crate::models::action_logs::Column::EntityId.eq(entity_id))
            .order_by_desc(crate::models::action_logs::Column::CreatedAt)
            .limit(limit)
            .all(db)
            .await
    }

    /// Get recent action logs.
    pub async fn get_recent_logs(
        db: &DatabaseConnection,
        limit: u64,
    ) -> Result<Vec<ActionLogModel>, DbErr> {
        ActionLog::find()
            .order_by_desc(crate::models::action_logs::Column::CreatedAt)
            .limit(limit)
            .all(db)
            .await
    }
}
