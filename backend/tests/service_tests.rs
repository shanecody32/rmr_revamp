//! Service layer tests using SeaORM MockDatabase.
//!
//! These tests validate service methods by programming mock DB responses.
//! No real database connection is required.

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

// ─── Genre Service ───────────────────────────────────────────────────

mod genre_service {
    use super::*;
    use backend::models::sub_genres::Model as SubGenreModel;
    use backend::services::genre_service::GenreService;

    // Note: get_genres now uses paginate() which requires COUNT queries
    // not easily mockable with MockDatabase. Tested via integration tests instead.
    // See: backend/tests/integration_tests.rs::test_genre_crud_round_trip

    #[tokio::test]
    async fn test_get_sub_genres_by_genre() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![
                SubGenreModel {
                    id: 10,
                    genre_id: Some(1),
                    name: Some("Blues Rock".to_string()),
                    slug: Some("blues-rock".to_string()),
                    chart: 1,
                    default: 0,
                    created: None,
                    modified: None,
                },
                SubGenreModel {
                    id: 11,
                    genre_id: Some(1),
                    name: Some("Classic Rock".to_string()),
                    slug: Some("classic-rock".to_string()),
                    chart: 1,
                    default: 0,
                    created: None,
                    modified: None,
                },
            ]])
            .into_connection();

        let sub_genres = GenreService::get_sub_genres_by_genre(&db, 1).await.unwrap();
        assert_eq!(sub_genres.len(), 2);
        assert_eq!(sub_genres[0].genre_id, Some(1));
        assert_eq!(sub_genres[1].name.as_deref(), Some("Classic Rock"));
    }

    #[tokio::test]
    async fn test_get_sub_genres_by_genre_empty() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<SubGenreModel>::new()])
            .into_connection();

        let sub_genres = GenreService::get_sub_genres_by_genre(&db, 999).await.unwrap();
        assert!(sub_genres.is_empty());
    }
}

// ─── Location Service ────────────────────────────────────────────────

mod location_service {
    use super::*;
    use backend::models::countries::Model as CountryModel;
    use backend::services::location_service::LocationService;

    // Note: get_countries now uses paginate() which requires COUNT queries
    // not easily mockable with MockDatabase. Tested via integration tests instead.

    #[tokio::test]
    async fn test_get_country_by_id() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![CountryModel {
                id: 1,
                name: Some("United States".to_string()),
                slug: Some("united-states".to_string()),
                continent: Some("North America".to_string()),
                region: None,
                iso_three_digit: Some("USA".to_string()),
                iso_two_digit: Some("US".to_string()),
                phone_reg_exp: None,
                phone_format: None,
                phone_code: Some("+1".to_string()),
                address_format: None,
                chart: 1,
            }]])
            .into_connection();

        let country = LocationService::get_country_by_id(&db, 1).await.unwrap();
        assert!(country.is_some());
        assert_eq!(country.unwrap().name.as_deref(), Some("United States"));
    }

    #[tokio::test]
    async fn test_get_country_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<CountryModel>::new()])
            .into_connection();

        let country = LocationService::get_country_by_id(&db, 999).await.unwrap();
        assert!(country.is_none());
    }
}

// ─── Staff Playlist Service ──────────────────────────────────────────

mod staff_playlist_service {
    use super::*;
    use backend::services::staff_playlist_service::StaffPlaylistService;

    #[tokio::test]
    async fn test_delete_entries_empty_ids() {
        // delete_entries with empty ids should return 0 without querying
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .into_connection();

        let result = StaffPlaylistService::delete_entries(&db, vec![]).await.unwrap();
        assert_eq!(result, 0);
    }

    #[tokio::test]
    async fn test_delete_entries() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![MockExecResult {
                last_insert_id: 0,
                rows_affected: 3,
            }])
            .into_connection();

        let result = StaffPlaylistService::delete_entries(&db, vec![1, 2, 3])
            .await
            .unwrap();
        assert_eq!(result, 3);
    }

    #[tokio::test]
    async fn test_delete_all_entries() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![MockExecResult {
                last_insert_id: 0,
                rows_affected: 10,
            }])
            .into_connection();

        let result = StaffPlaylistService::delete_all_entries(&db, 42).await.unwrap();
        assert_eq!(result, 10);
    }
}

// ─── User Service ───────────────────────────────────────────────────

mod user_service {
    use super::*;
    use backend::models::users::Model as UserModel;
    use backend::services::user_service::UserService;

    fn make_user(id: u32, email: &str) -> UserModel {
        UserModel {
            id,
            role_id: 1,
            username: Some(email.to_string()),
            email: Some(email.to_string()),
            password: "hashed".to_string(),
            first_name: Some("Test".to_string()),
            last_name: Some("User".to_string()),
            referred_by: None,
            promocode: None,
            signup_ip: None,
            last_login_ip: None,
            geo_ip_country_code: None,
            primary_phone: None,
            agreed_to_terms: 1,
            agreed_to_pricing: 1,
            activated: 1,
            sub_uuid: None,
            term: 0,
            pay_by_check: 0,
            exp: None,
            radio_control: None,
            created: None,
            modified: None,
        }
    }

    // Note: test_get_all_users_* tests removed — UserService::get_users now uses
    // SeaORM paginate() which cannot be tested with MockDatabase.
    // Coverage is maintained via integration_tests::test_user_crud_round_trip.

    #[tokio::test]
    async fn test_get_user_by_id_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![make_user(1, "alice@example.com")]])
            .into_connection();

        let user = UserService::get_user_by_id(&db, 1).await.unwrap();
        assert!(user.is_some());
        assert_eq!(user.unwrap().id, 1);
    }

    #[tokio::test]
    async fn test_get_user_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<UserModel>::new()])
            .into_connection();

        let user = UserService::get_user_by_id(&db, 999).await.unwrap();
        assert!(user.is_none());
    }
}

// ─── Auth Service ───────────────────────────────────────────────────

mod auth_service {
    use super::*;
    use backend::models::users::Model as UserModel;
    use backend::services::auth_service::{AuthService, LoginRequest};

    fn make_user(id: u32, email: &str) -> UserModel {
        UserModel {
            id,
            role_id: 1,
            username: Some(email.to_string()),
            email: Some(email.to_string()),
            password: "hashed".to_string(),
            first_name: Some("Test".to_string()),
            last_name: Some("User".to_string()),
            referred_by: None,
            promocode: None,
            signup_ip: None,
            last_login_ip: None,
            geo_ip_country_code: None,
            primary_phone: None,
            agreed_to_terms: 1,
            agreed_to_pricing: 1,
            activated: 1,
            sub_uuid: None,
            term: 0,
            pay_by_check: 0,
            exp: None,
            radio_control: None,
            created: None,
            modified: None,
        }
    }

    #[tokio::test]
    async fn test_login_success() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![make_user(1, "alice@example.com")]])
            .into_connection();

        let req = LoginRequest {
            email: "alice@example.com".to_string(),
            password: None,
        };
        let result = AuthService::login(&db, req).await.unwrap();
        assert_eq!(result.user.email.as_deref(), Some("alice@example.com"));
        assert!(!result.token.is_empty());
    }

    #[tokio::test]
    async fn test_login_user_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<UserModel>::new()])
            .into_connection();

        let req = LoginRequest {
            email: "nobody@example.com".to_string(),
            password: None,
        };
        let result = AuthService::login(&db, req).await;
        assert!(result.is_err());
    }

    #[tokio::test]
    async fn test_get_current_user() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![make_user(1, "alice@example.com")]])
            .into_connection();

        let user = AuthService::get_current_user(&db).await.unwrap();
        assert!(user.is_some());
        assert_eq!(user.unwrap().id, 1);
    }
}

// ─── Location Service Extended ──────────────────────────────────────

mod location_service_extended {
    use super::*;
    use backend::models::states::Model as StateModel;
    use backend::models::cities::Model as CityModel;
    use backend::services::location_service::LocationService;

    fn make_state(id: u32, country_id: u32, name: &str) -> StateModel {
        StateModel {
            id,
            country_id: Some(country_id),
            name: Some(name.to_string()),
            slug: Some(name.to_lowercase().replace(' ', "-")),
            abbrv: None,
            chart: 1,
            new: 0,
            correct: 0,
            created: None,
            modified: None,
        }
    }

    // Note: get_states now uses paginate() which requires COUNT queries
    // not easily mockable with MockDatabase. Tested via integration tests instead.

    #[tokio::test]
    async fn test_get_state_by_id_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![make_state(1, 1, "Texas")]])
            .into_connection();

        let state = LocationService::get_state_by_id(&db, 1).await.unwrap();
        assert!(state.is_some());
        assert_eq!(state.unwrap().name.as_deref(), Some("Texas"));
    }

    // Note: get_cities now uses paginate() which requires COUNT queries
    // not easily mockable with MockDatabase. Tested via integration tests instead.

    #[tokio::test]
    async fn test_get_city_by_id_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<CityModel>::new()])
            .into_connection();

        let city = LocationService::get_city_by_id(&db, 999).await.unwrap();
        assert!(city.is_none());
    }
}

// ─── Action Log Service ─────────────────────────────────────────────

mod action_log_service {
    use super::*;
    use backend::models::action_logs::Model as ActionLogModel;
    use backend::services::action_log_service::ActionLogService;
    use backend::models::action_logs::{action_types, entity_types};

    fn make_log(id: u32, action_type: &str, entity_type: &str, entity_id: u32) -> ActionLogModel {
        ActionLogModel {
            id,
            action_type: action_type.to_string(),
            entity_type: entity_type.to_string(),
            entity_id,
            user_id: None,
            before_snapshot: None,
            after_snapshot: None,
            metadata: None,
            ip_address: None,
            created_at: chrono::NaiveDateTime::default(),
        }
    }

    #[tokio::test]
    async fn test_record_creates_action_log() {
        // insert does: exec (INSERT) then query (SELECT to return the model)
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_exec_results(vec![MockExecResult {
                last_insert_id: 1,
                rows_affected: 1,
            }])
            .append_query_results(vec![vec![
                make_log(1, action_types::BAND_MERGE, entity_types::BAND, 42),
            ]])
            .into_connection();

        let log = ActionLogService::record(
            &db,
            action_types::BAND_MERGE,
            entity_types::BAND,
            42,
            Some(1),
            None,
            None,
            None,
            None,
        )
        .await
        .unwrap();
        assert_eq!(log.entity_id, 42);
        assert_eq!(log.action_type, action_types::BAND_MERGE);
    }

    #[tokio::test]
    async fn test_get_logs_for_entity_returns_list() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![
                make_log(1, action_types::BAND_MERGE, entity_types::BAND, 42),
                make_log(2, action_types::DATA_STATUS_CHANGE, entity_types::BAND, 42),
            ]])
            .into_connection();

        let logs = ActionLogService::get_logs_for_entity(&db, entity_types::BAND, 42, 10)
            .await
            .unwrap();
        assert_eq!(logs.len(), 2);
    }

    #[tokio::test]
    async fn test_get_logs_for_entity_empty() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<ActionLogModel>::new()])
            .into_connection();

        let logs = ActionLogService::get_logs_for_entity(&db, entity_types::BAND, 999, 10)
            .await
            .unwrap();
        assert!(logs.is_empty());
    }

    #[tokio::test]
    async fn test_get_recent_logs_returns_list() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![
                make_log(1, action_types::STAFF_MERGE, entity_types::STAFF_MEMBER, 1),
            ]])
            .into_connection();

        let logs = ActionLogService::get_recent_logs(&db, 5).await.unwrap();
        assert_eq!(logs.len(), 1);
        assert_eq!(logs[0].action_type, action_types::STAFF_MERGE);
    }
}
