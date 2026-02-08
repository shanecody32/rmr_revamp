//! Tests for simple CRUD operations on Song, Label, RadioStation, and Staff services.
//!
//! Covers get_by_id, delete, and update operations with MockDatabase.
//! Functions using `.paginate()` or `.count()` are not testable with MockDatabase.
//!
//! Mock result rules:
//! - `Entity::find_by_id().one()` → 1 query
//! - `Entity::delete_by_id().exec()` → 1 exec (no select-back)
//! - `active_model.update(db)` → 1 exec + 1 query (select-back)

mod common;

use sea_orm::{DatabaseBackend, DbErr, MockDatabase, MockExecResult};

use backend::models::songs::Model as SongModel;
use backend::models::labels::Model as LabelModel;
use backend::models::albums::Model as AlbumModel;
use backend::models::radio_stations::Model as RadioStationModel;
use backend::models::staff_members::Model as StaffMemberModel;

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

// ─── Song Service Tests ───────────────────────────────────────────

mod song_tests {
    use super::*;
    use backend::services::song_service::SongService;

    #[tokio::test]
    async fn get_song_by_id_found() {
        let song = common::make_test_song(1, 10, "Test Song");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![song]])
            .into_connection();

        let result = SongService::get_song_by_id(&db, 1).await;
        assert!(result.is_ok());
        let song = result.unwrap();
        assert!(song.is_some());
        assert_eq!(song.unwrap().id, 1);
    }

    #[tokio::test]
    async fn get_song_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SongModel>::new()])
            .into_connection();

        let result = SongService::get_song_by_id(&db, 999).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn delete_song_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(1)])
            .into_connection();

        let result = SongService::delete_song(&db, 1).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().rows_affected, 1);
    }

    #[tokio::test]
    async fn update_song_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SongModel>::new()])
            .into_connection();

        let data = common::make_test_song(1, 10, "Updated Song");
        let result = SongService::update_song(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Song not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_song_success() {
        let existing = common::make_test_song(1, 10, "Old Name");
        let mut updated = existing.clone();
        updated.name = Some("New Name".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let data = common::make_test_song(1, 10, "New Name");
        let result = SongService::update_song(&db, 1, data).await;
        assert!(result.is_ok(), "update_song failed: {:?}", result.err());
        let song = result.unwrap();
        assert_eq!(song.name, Some("New Name".to_string()));
    }
}

// ─── Label Service Tests ──────────────────────────────────────────

mod label_tests {
    use super::*;
    use backend::services::label_service::LabelService;

    #[tokio::test]
    async fn get_label_by_id_found() {
        let label = common::make_test_label(1, "Test Label");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → label
            .append_query_results(vec![vec![label]])
            // Q2: to_label_responses → albums query (for album_count enrichment)
            .append_query_results(vec![Vec::<AlbumModel>::new()])
            .into_connection();

        let result = LabelService::get_label_by_id(&db, 1).await;
        assert!(result.is_ok(), "get_label_by_id failed: {:?}", result.err());
        let response = result.unwrap();
        assert!(response.is_some());
        let label_resp = response.unwrap();
        assert_eq!(label_resp.id, 1);
        assert_eq!(label_resp.name, "Test Label");
        assert_eq!(label_resp.album_count, 0);
    }

    #[tokio::test]
    async fn get_label_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<LabelModel>::new()])
            .into_connection();

        let result = LabelService::get_label_by_id(&db, 999).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn get_label_by_id_with_albums() {
        let label = common::make_test_label(1, "Indie Records");
        // Two albums belonging to this label
        let mut album1 = common::make_test_album(10, "Album A");
        album1.label_id = Some(1);
        let mut album2 = common::make_test_album(11, "Album B");
        album2.label_id = Some(1);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → label
            .append_query_results(vec![vec![label]])
            // Q2: albums for enrichment → 2 albums
            .append_query_results(vec![vec![album1, album2]])
            .into_connection();

        let result = LabelService::get_label_by_id(&db, 1).await;
        assert!(result.is_ok(), "get_label_by_id failed: {:?}", result.err());
        let response = result.unwrap().unwrap();
        assert_eq!(response.album_count, 2);
    }

    #[tokio::test]
    async fn update_label_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<LabelModel>::new()])
            .into_connection();

        let data = backend::services::label_service::UpdateLabelRequest {
            name: Some("New Name".to_string()),
        };
        let result = LabelService::update_label(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Label not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }
}

// ─── Radio Station Service Tests ──────────────────────────────────

mod radio_station_tests {
    use super::*;
    use backend::services::radio_station_service::RadioStationService;

    #[tokio::test]
    async fn get_radio_station_by_id_found() {
        let station = common::make_test_radio_station(1, "KEXP");
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![station]])
            .into_connection();

        let result = RadioStationService::get_radio_station_by_id(&db, 1).await;
        assert!(result.is_ok());
        let station = result.unwrap();
        assert!(station.is_some());
        assert_eq!(station.unwrap().name, Some("KEXP".to_string()));
    }

    #[tokio::test]
    async fn get_radio_station_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<RadioStationModel>::new()])
            .into_connection();

        let result = RadioStationService::get_radio_station_by_id(&db, 999).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_none());
    }

    #[tokio::test]
    async fn delete_radio_station_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(1)])
            .into_connection();

        let result = RadioStationService::delete_radio_station(&db, 1).await;
        assert!(result.is_ok());
        assert_eq!(result.unwrap().rows_affected, 1);
    }

    #[tokio::test]
    async fn update_radio_station_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<RadioStationModel>::new()])
            .into_connection();

        let data = common::make_test_radio_station(1, "Updated Station");
        let result = RadioStationService::update_radio_station(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Radio station not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_radio_station_success() {
        let existing = common::make_test_radio_station(1, "Old Station");
        let mut updated = existing.clone();
        updated.name = Some("New Station".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let data = common::make_test_radio_station(1, "New Station");
        let result = RadioStationService::update_radio_station(&db, 1, data).await;
        assert!(result.is_ok(), "update_radio_station failed: {:?}", result.err());
        let station = result.unwrap();
        assert_eq!(station.name, Some("New Station".to_string()));
    }
}

// ─── Staff Service CRUD Tests ─────────────────────────────────────

mod staff_crud_tests {
    use super::*;
    use backend::services::staff_service::StaffService;

    #[tokio::test]
    async fn delete_staff_member_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![exec(1)])
            .into_connection();

        let result = StaffService::delete_staff_member(&db, 1).await;
        assert!(result.is_ok());
    }

    #[tokio::test]
    async fn update_staff_member_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<StaffMemberModel>::new()])
            .into_connection();

        let data = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let result = StaffService::update_staff_member(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, DbErr::RecordNotFound(ref msg) if msg.contains("Staff member not found")),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_staff_member_success() {
        let existing = common::make_test_staff_member(1, Some(100), "John", "Doe");
        let mut updated = existing.clone();
        updated.first_name = Some("Jane".to_string());

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let data = common::make_test_staff_member(1, Some(100), "Jane", "Doe");
        let result = StaffService::update_staff_member(&db, 1, data).await;
        assert!(result.is_ok(), "update_staff_member failed: {:?}", result.err());
        let staff = result.unwrap();
        assert_eq!(staff.first_name, Some("Jane".to_string()));
    }
}
