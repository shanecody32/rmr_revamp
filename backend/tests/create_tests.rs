//! Tests for entity create and update operations.
//!
//! Mock patterns:
//! - create_band:  E(insert) + Q(select-back) + Q(alias exists→empty) + E(alias insert) + Q(alias select-back)
//! - create_album: E(insert) + Q(select-back) + Q(alias exists→empty) + E(alias insert) + Q(alias select-back)
//! - create_song:  E(insert) + Q(select-back) + Q(alias exists→empty) + E(alias insert) + Q(alias select-back)
//! - update_band:  Q(find) + E(update) + Q(select-back)

mod common;

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

fn exec(rows_affected: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id: 0,
        rows_affected,
    }
}

fn exec_insert(last_insert_id: u64) -> MockExecResult {
    MockExecResult {
        last_insert_id,
        rows_affected: 1,
    }
}

// ─── Band Create Tests ──────────────────────────────────────────

mod band_tests {
    use super::*;
    use backend::services::band::BandService;

    #[tokio::test]
    async fn create_band_success() {
        let band = common::make_test_band(1, "The Beatles");
        let alias = common::make_test_band_alias(1, 1, "The Beatles");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert band
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back band
            .append_query_results(vec![vec![band.clone()]])
            // Q2: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::band_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q3: select-back alias
            .append_query_results(vec![vec![alias]])
            .into_connection();

        let data = common::make_test_band(0, "The Beatles");
        let result = BandService::create_band(&db, data).await;
        assert!(result.is_ok(), "create_band failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, "The Beatles");
    }

    #[tokio::test]
    async fn create_band_alias_already_exists() {
        let existing_alias = common::make_test_band_alias(1, 1, "The Beatles");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: alias exists check → found
            .append_query_results(vec![vec![existing_alias]])
            .into_connection();

        let result = BandService::create_band_alias(&db, 1, "The Beatles").await;
        assert!(result.is_ok(), "create_band_alias failed: {:?}", result.err());
    }

    #[tokio::test]
    async fn create_band_alias_new() {
        let alias = common::make_test_band_alias(1, 1, "Beatles");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::band_aliases::Model>::new()])
            // E1: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q2: select-back alias
            .append_query_results(vec![vec![alias]])
            .into_connection();

        let result = BandService::create_band_alias(&db, 1, "Beatles").await;
        assert!(result.is_ok(), "create_band_alias failed: {:?}", result.err());
    }
}

// ─── Album Create Tests ─────────────────────────────────────────

mod album_tests {
    use super::*;
    use backend::services::album::AlbumService;

    #[tokio::test]
    async fn create_album_success() {
        let album = common::make_test_album(1, "Abbey Road");
        let alias = common::make_test_album_alias(1, 1, 1, "Abbey Road");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert album
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back album
            .append_query_results(vec![vec![album.clone()]])
            // Q2: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::album_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q3: select-back alias
            .append_query_results(vec![vec![alias]])
            .into_connection();

        let data = common::make_test_album(0, "Abbey Road");
        let result = AlbumService::create_album(&db, data, Some(1)).await;
        assert!(result.is_ok(), "create_album failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, Some("Abbey Road".to_string()));
    }

    #[tokio::test]
    async fn create_album_no_name_skips_alias() {
        let mut album = common::make_test_album(1, "");
        album.name = None;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert album
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back album (no alias creation since name is None)
            .append_query_results(vec![vec![album.clone()]])
            .into_connection();

        let mut data = common::make_test_album(0, "");
        data.name = None;
        let result = AlbumService::create_album(&db, data, Some(1)).await;
        assert!(result.is_ok(), "create_album with no name failed: {:?}", result.err());
    }
}

// ─── Song Create Tests ──────────────────────────────────────────

mod song_tests {
    use super::*;
    use backend::services::song_service::SongService;

    #[tokio::test]
    async fn create_song_success() {
        let song = common::make_test_song(1, 1, "Come Together");
        let alias = common::make_test_song_alias(1, 1, 1, "Come Together");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert song
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back song
            .append_query_results(vec![vec![song.clone()]])
            // Q2: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::song_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q3: select-back alias
            .append_query_results(vec![vec![alias]])
            .into_connection();

        let data = common::make_test_song(0, 1, "Come Together");
        let result = SongService::create_song(&db, data).await;
        assert!(result.is_ok(), "create_song failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, Some("Come Together".to_string()));
    }

    #[tokio::test]
    async fn create_song_no_name_skips_alias() {
        let mut song = common::make_test_song(1, 1, "");
        song.name = None;

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert song
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back song
            .append_query_results(vec![vec![song.clone()]])
            .into_connection();

        let mut data = common::make_test_song(0, 1, "");
        data.name = None;
        let result = SongService::create_song(&db, data).await;
        assert!(result.is_ok(), "create_song with no name failed: {:?}", result.err());
    }
}

// ─── Label Create Tests ─────────────────────────────────────────

mod label_tests {
    use super::*;
    use backend::services::label_service::{CreateLabelRequest, LabelService};

    #[tokio::test]
    async fn create_label_success() {
        let label = common::make_test_label(1, "Apple Records");
        let alias = common::make_test_label_alias(1, 1, "Apple Records");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert label
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back label
            .append_query_results(vec![vec![label.clone()]])
            // Q2: alias exists check → empty
            .append_query_results(vec![Vec::<backend::models::label_aliases::Model>::new()])
            // E2: insert alias
            .append_exec_results(vec![exec_insert(1)])
            // Q3: select-back alias
            .append_query_results(vec![vec![alias]])
            // Q4: albums enrichment (to_label_responses) → empty
            .append_query_results(vec![Vec::<backend::models::albums::Model>::new()])
            .into_connection();

        let req = CreateLabelRequest {
            name: "Apple Records".to_string(),
        };
        let result = LabelService::create_label(&db, req).await;
        assert!(result.is_ok(), "create_label failed: {:?}", result.err());
        let resp = result.unwrap();
        assert_eq!(resp.name, "Apple Records");
        assert_eq!(resp.album_count, 0);
    }
}

// ─── Simple Create Tests (no alias) ────────────────────────────

mod simple_create_tests {
    use super::*;
    use backend::services::radio_station_service::RadioStationService;
    use backend::services::staff_service::StaffService;

    #[tokio::test]
    async fn create_radio_station_success() {
        let station = common::make_test_radio_station(1, "KEXP");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back
            .append_query_results(vec![vec![station.clone()]])
            .into_connection();

        let data = common::make_test_radio_station(0, "KEXP");
        let result = RadioStationService::create_radio_station(&db, data).await;
        assert!(result.is_ok(), "create_radio_station failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.name, Some("KEXP".to_string()));
    }

    #[tokio::test]
    async fn create_staff_member_success() {
        let staff = common::make_test_staff_member(1, Some(100), "John", "Doe");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // E1: insert
            .append_exec_results(vec![exec_insert(1)])
            // Q1: select-back
            .append_query_results(vec![vec![staff.clone()]])
            .into_connection();

        let data = common::make_test_staff_member(0, Some(100), "John", "Doe");
        let result = StaffService::create_staff_member(&db, data).await;
        assert!(result.is_ok(), "create_staff_member failed: {:?}", result.err());
        let created = result.unwrap();
        assert_eq!(created.first_name, Some("John".to_string()));
    }
}

// ─── Update Band Tests ──────────────────────────────────────────

mod update_band_tests {
    use super::*;
    use backend::services::band::BandService;

    #[tokio::test]
    async fn update_band_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → empty
            .append_query_results(vec![Vec::<backend::models::bands::Model>::new()])
            .into_connection();

        let data = common::make_test_band(1, "Updated Name");
        let result = BandService::update_band(&db, 999, data).await;
        assert!(result.is_err());
        let err = result.unwrap_err();
        assert!(
            matches!(err, sea_orm::DbErr::RecordNotFound(_)),
            "Expected RecordNotFound, got: {err:?}"
        );
    }

    #[tokio::test]
    async fn update_band_success() {
        let existing = common::make_test_band(1, "Old Name");
        let mut updated = existing.clone();
        updated.name = "New Name".to_string();

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find_by_id → existing
            .append_query_results(vec![vec![existing]])
            // E1: update exec
            .append_exec_results(vec![exec(1)])
            // Q2: update select-back
            .append_query_results(vec![vec![updated.clone()]])
            .into_connection();

        let data = common::make_test_band(1, "New Name");
        let result = BandService::update_band(&db, 1, data).await;
        assert!(result.is_ok(), "update_band failed: {:?}", result.err());
        let band = result.unwrap();
        assert_eq!(band.name, "New Name");
    }
}
