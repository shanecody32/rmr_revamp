use utoipa::OpenApi;
use crate::api::{users, bands, albums, songs, genres, sub_genres, countries, states, cities, radio_stations, labels, staff_members, postal_codes, locations, band_images, auth, system};
use crate::models::users::Model as User;
use crate::models::bands::Model as Band;
use crate::models::albums::Model as Album;
use crate::models::songs::Model as Song;
use crate::models::genres::Model as Genre;
use crate::models::sub_genres::Model as SubGenre;
use crate::models::countries::Model as Country;
use crate::models::states::Model as State;
use crate::models::cities::Model as City;
use crate::models::radio_stations::Model as RadioStation;
use crate::models::labels::Model as Label;
use crate::models::staff_members::Model as StaffMember;
use crate::models::postal_codes::Model as PostalCode;
use crate::models::band_images::Model as BandImage;
use crate::api::locations::LocationResponse;
use crate::services::auth_service::{LoginRequest, LoginResponse};
use crate::services::band_service::{MergeBandsRequest};
use crate::api::bands::{BandDiscographyResponse};
use crate::api::band_images::{ReorderRequest, BandImageUpdate, ReorderUpdate};
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarResult};
use crate::job_state::{BackfillJobState, EntityJobState, TaskJobState};

#[derive(OpenApi)]
#[openapi(
    paths(
        users::get_users,
        users::get_user,
        bands::get_bands,
        bands::get_band,
        bands::create_band,
        bands::update_band,
        bands::get_similar_bands,
        bands::merge_bands,
        bands::get_band_discography,
        albums::get_albums,
        albums::get_album,
        albums::create_album,
        albums::update_album,
        albums::delete_album,
        albums::get_album_songs,
        albums::get_similar_albums,
        songs::get_songs,
        songs::get_song,
        songs::create_song,
        songs::update_song,
        songs::delete_song,
        songs::get_similar_songs,
        genres::get_genres,
        sub_genres::get_sub_genres,
        countries::get_countries,
        countries::get_country,
        countries::get_similar_countries,
        states::get_states,
        states::get_state,
        states::get_similar_states,
        cities::get_cities,
        cities::get_city,
        cities::get_similar_cities,
        radio_stations::get_radio_stations,
        radio_stations::get_radio_station,
        radio_stations::create_radio_station,
        radio_stations::update_radio_station,
        radio_stations::delete_radio_station,
        radio_stations::get_similar_radio_stations,
        labels::get_similar_labels,
        staff_members::get_similar_staff_members,
        postal_codes::get_similar_postal_codes,
        locations::search_locations,
        band_images::upload_band_image,
        band_images::get_band_image,
        band_images::list_band_images,
        band_images::update_band_image,
        band_images::delete_band_image,
        band_images::reorder_band_images,
        auth::login,
        auth::get_current_user,
        system::trigger_backfill,
        system::get_backfill_progress,
        system::trigger_album_genre_update,
        system::get_album_genre_update_progress,
    ),
    components(
        schemas(User, Band, Album, Song, Genre, SubGenre, Country, State, City, RadioStation, Label, StaffMember, PostalCode, BandImage, LocationResponse, LoginRequest, LoginResponse, MergeBandsRequest, ReorderRequest, BandImageUpdate, ReorderUpdate, BandDiscographyResponse, PaginatedResponse<Band>, PaginatedResponse<Album>, PaginatedResponse<Song>, PaginatedResponse<Genre>, PaginatedResponse<SubGenre>, PaginatedResponse<Country>, PaginatedResponse<State>, PaginatedResponse<City>, PaginatedResponse<RadioStation>, PaginationInfo, SimilarResult<Band>, SimilarResult<Album>, SimilarResult<Song>, SimilarResult<Genre>, SimilarResult<SubGenre>, SimilarResult<Country>, SimilarResult<State>, SimilarResult<City>, SimilarResult<RadioStation>, SimilarResult<Label>, SimilarResult<StaffMember>, SimilarResult<PostalCode>, BackfillJobState, EntityJobState, TaskJobState)
    ),
    tags(
        (name = "RMR API", description = "Roots Music Report API")
    )
)]
pub struct ApiDoc;
