//! Service layer tests using SeaORM MockDatabase.
//!
//! These tests validate service methods by programming mock DB responses.
//! No real database connection is required.

use sea_orm::{DatabaseBackend, MockDatabase, MockExecResult};

// ─── Genre Service ───────────────────────────────────────────────────

mod genre_service {
    use super::*;
    use backend::models::genres::Model as GenreModel;
    use backend::models::sub_genres::Model as SubGenreModel;
    use backend::services::genre_service::GenreService;

    #[tokio::test]
    async fn test_get_genres_returns_all() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![
                GenreModel {
                    id: 1,
                    name: Some("Rock".to_string()),
                    slug: Some("rock".to_string()),
                    chart: 1,
                },
                GenreModel {
                    id: 2,
                    name: Some("Country".to_string()),
                    slug: Some("country".to_string()),
                    chart: 1,
                },
            ]])
            .into_connection();

        let genres = GenreService::get_genres(&db).await.unwrap();
        assert_eq!(genres.len(), 2);
        assert_eq!(genres[0].name.as_deref(), Some("Rock"));
        assert_eq!(genres[1].name.as_deref(), Some("Country"));
    }

    #[tokio::test]
    async fn test_get_genres_empty() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![Vec::<GenreModel>::new()])
            .into_connection();

        let genres = GenreService::get_genres(&db).await.unwrap();
        assert!(genres.is_empty());
    }

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

    #[tokio::test]
    async fn test_get_countries() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            .append_query_results(vec![vec![
                CountryModel {
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
                },
                CountryModel {
                    id: 2,
                    name: Some("Canada".to_string()),
                    slug: Some("canada".to_string()),
                    continent: Some("North America".to_string()),
                    region: None,
                    iso_three_digit: Some("CAN".to_string()),
                    iso_two_digit: Some("CA".to_string()),
                    phone_reg_exp: None,
                    phone_format: None,
                    phone_code: Some("+1".to_string()),
                    address_format: None,
                    chart: 1,
                },
            ]])
            .into_connection();

        let countries = LocationService::get_countries(&db).await.unwrap();
        assert_eq!(countries.len(), 2);
        assert_eq!(countries[0].name.as_deref(), Some("United States"));
        assert_eq!(countries[1].iso_two_digit.as_deref(), Some("CA"));
    }

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
