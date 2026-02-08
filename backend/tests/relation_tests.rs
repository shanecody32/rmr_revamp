//! Tests for relation loading functions.
//!
//! Mock patterns:
//! - load_band_relations: 7 queries (bands_sub_genres, sub_genres, genres, countries, states, cities, band_images)
//! - load_album_relations: 6 queries (album_images, albums_songs, songs (opt), albums_bands, bands (opt), albums_sub_genres, sub_genres (opt), genres (opt))
//! - get_band_discography: Q(albums_bands) + Q(albums) + load_album_relations(~6Q)
//! - get_album_songs: Q(find album) + Q(find_related songs)

mod common;

use sea_orm::{DatabaseBackend, MockDatabase};

// ─── Band Relation Tests ────────────────────────────────────────

mod band_relation_tests {
    use super::*;
    use backend::services::band::BandService;

    #[tokio::test]
    async fn load_band_relations_empty_input() {
        // No mocks needed — short-circuits on empty input
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let result = BandService::load_band_relations(&db, vec![]).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn load_band_relations_minimal() {
        let band = common::make_test_band(1, "Test Band");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: bands_sub_genres → empty
            .append_query_results(vec![Vec::<backend::models::bands_sub_genres::Model>::new()])
            // Q2: sub_genres (skipped since no sub_genre_ids, but still queries)
            .append_query_results(vec![Vec::<backend::models::sub_genres::Model>::new()])
            // Q3: genres
            .append_query_results(vec![Vec::<backend::models::genres::Model>::new()])
            // Q4: countries
            .append_query_results(vec![Vec::<backend::models::countries::Model>::new()])
            // Q5: states
            .append_query_results(vec![Vec::<backend::models::states::Model>::new()])
            // Q6: cities
            .append_query_results(vec![Vec::<backend::models::cities::Model>::new()])
            // Q7: band_images → empty
            .append_query_results(vec![Vec::<backend::models::band_images::Model>::new()])
            .into_connection();

        let result = BandService::load_band_relations(&db, vec![band]).await;
        assert!(result.is_ok(), "load_band_relations failed: {:?}", result.err());
        let responses = result.unwrap();
        assert_eq!(responses.len(), 1);
        assert!(responses[0].genres.is_empty());
        assert!(responses[0].sub_genres.is_empty());
        assert!(responses[0].country.is_none());
        assert!(responses[0].images.is_empty());
    }

    #[tokio::test]
    async fn load_band_relations_with_country() {
        let mut band = common::make_test_band(1, "Test Band");
        band.country_id = Some(1);
        let country = common::make_test_country(1, "United States");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: bands_sub_genres → empty
            .append_query_results(vec![Vec::<backend::models::bands_sub_genres::Model>::new()])
            // Q2: sub_genres
            .append_query_results(vec![Vec::<backend::models::sub_genres::Model>::new()])
            // Q3: genres
            .append_query_results(vec![Vec::<backend::models::genres::Model>::new()])
            // Q4: countries → 1 country
            .append_query_results(vec![vec![country.clone()]])
            // Q5: states
            .append_query_results(vec![Vec::<backend::models::states::Model>::new()])
            // Q6: cities
            .append_query_results(vec![Vec::<backend::models::cities::Model>::new()])
            // Q7: band_images → empty
            .append_query_results(vec![Vec::<backend::models::band_images::Model>::new()])
            .into_connection();

        let result = BandService::load_band_relations(&db, vec![band]).await;
        assert!(result.is_ok(), "load_band_relations failed: {:?}", result.err());
        let responses = result.unwrap();
        assert_eq!(responses.len(), 1);
        assert!(responses[0].country.is_some());
        assert_eq!(responses[0].country.as_ref().unwrap().name, Some("United States".to_string()));
    }

    #[tokio::test]
    async fn get_band_images_success() {
        let img1 = common::make_test_band_image(1, 1);
        let img2 = common::make_test_band_image(2, 1);

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find band_images by band_id
            .append_query_results(vec![vec![img1.clone(), img2.clone()]])
            .into_connection();

        let result = BandService::get_band_images(&db, 1).await;
        assert!(result.is_ok(), "get_band_images failed: {:?}", result.err());
        assert_eq!(result.unwrap().len(), 2);
    }
}

// ─── Band Discography Tests ─────────────────────────────────────

mod band_discography_tests {
    use super::*;
    use backend::services::band::BandService;

    #[tokio::test]
    async fn get_band_discography_no_albums() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums_bands → empty
            .append_query_results(vec![Vec::<backend::models::albums_bands::Model>::new()])
            .into_connection();

        let result = BandService::get_band_discography(&db, 1).await;
        assert!(result.is_ok(), "get_band_discography failed: {:?}", result.err());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn get_band_discography_with_albums() {
        let ab = common::make_test_albums_bands(1, 10, 1);
        let album = common::make_test_album(10, "Test Album");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: albums_bands → 1 entry
            .append_query_results(vec![vec![ab]])
            // Q2: albums → 1 album
            .append_query_results(vec![vec![album.clone()]])
            // load_album_relations for 1 album:
            // Q3: album_images → empty
            .append_query_results(vec![Vec::<backend::models::album_images::Model>::new()])
            // Q4: albums_songs → empty
            .append_query_results(vec![Vec::<backend::models::albums_songs::Model>::new()])
            // Q5: albums_bands → empty
            .append_query_results(vec![Vec::<backend::models::albums_bands::Model>::new()])
            // Q6: albums_sub_genres → empty
            .append_query_results(vec![Vec::<backend::models::albums_sub_genres::Model>::new()])
            .into_connection();

        let result = BandService::get_band_discography(&db, 1).await;
        assert!(result.is_ok(), "get_band_discography failed: {:?}", result.err());
        let albums = result.unwrap();
        assert_eq!(albums.len(), 1);
        assert_eq!(albums[0].album.name, Some("Test Album".to_string()));
    }
}

// ─── Album Relation Tests ───────────────────────────────────────

mod album_relation_tests {
    use super::*;
    use backend::services::album::AlbumService;

    #[tokio::test]
    async fn load_album_relations_empty_input() {
        let db = MockDatabase::new(DatabaseBackend::MySql).into_connection();
        let result = AlbumService::load_album_relations(&db, vec![]).await;
        assert!(result.is_ok());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn load_album_relations_minimal() {
        let album = common::make_test_album(1, "Test Album");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: album_images → empty
            .append_query_results(vec![Vec::<backend::models::album_images::Model>::new()])
            // Q2: albums_songs → empty
            .append_query_results(vec![Vec::<backend::models::albums_songs::Model>::new()])
            // Q3: albums_bands → empty
            .append_query_results(vec![Vec::<backend::models::albums_bands::Model>::new()])
            // Q4: albums_sub_genres → empty
            .append_query_results(vec![Vec::<backend::models::albums_sub_genres::Model>::new()])
            .into_connection();

        let result = AlbumService::load_album_relations(&db, vec![album]).await;
        assert!(result.is_ok(), "load_album_relations failed: {:?}", result.err());
        let responses = result.unwrap();
        assert_eq!(responses.len(), 1);
        assert!(responses[0].songs.is_empty());
        assert!(responses[0].genres.is_empty());
        assert!(responses[0].images.is_empty());
        assert!(responses[0].bands.is_empty());
    }
}

// ─── Album Song Tests ───────────────────────────────────────────

mod album_song_tests {
    use super::*;
    use backend::services::album::AlbumService;

    #[tokio::test]
    async fn get_album_songs_album_not_found() {
        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find album → None
            .append_query_results(vec![Vec::<backend::models::albums::Model>::new()])
            .into_connection();

        let result = AlbumService::get_album_songs(&db, 999).await;
        assert!(result.is_ok(), "get_album_songs failed: {:?}", result.err());
        assert!(result.unwrap().is_empty());
    }

    #[tokio::test]
    async fn get_album_songs_found() {
        let album = common::make_test_album(1, "Test Album");
        let song1 = common::make_test_song(10, 1, "Song A");
        let song2 = common::make_test_song(11, 1, "Song B");

        let db = MockDatabase::new(DatabaseBackend::MySql)
            // Q1: find album → Some
            .append_query_results(vec![vec![album]])
            // Q2: find_related songs → 2 songs
            .append_query_results(vec![vec![song1.clone(), song2.clone()]])
            .into_connection();

        let result = AlbumService::get_album_songs(&db, 1).await;
        assert!(result.is_ok(), "get_album_songs failed: {:?}", result.err());
        let songs = result.unwrap();
        assert_eq!(songs.len(), 2);
        assert_eq!(songs[0].name, Some("Song A".to_string()));
        assert_eq!(songs[1].name, Some("Song B".to_string()));
    }
}
