use axum::{routing::get, Router};
use crate::job_state::AppState;
use utoipa::OpenApi;
use utoipa_rapidoc::RapiDoc;

mod users;
mod bands;
mod albums;
mod songs;
mod genres;
mod sub_genres;
mod countries;
mod states;
mod cities;
mod radio_stations;
mod labels;
mod staff_members;
mod postal_codes;
mod locations;
mod band_images;
mod auth;
mod system;
mod duplicate_scan;
mod media;
mod transfers;
mod status;
mod staff_playlists;
mod openapi;

pub fn create_router(state: AppState) -> Router {
    Router::new()
        .merge(RapiDoc::with_openapi("/api-docs/openapi.json", openapi::ApiDoc::openapi()).path("/rapidoc"))
        .route("/health", get(health_check))
        .nest("/users", users::router())
        .nest("/bands", bands::router())
        .nest("/albums", albums::router())
        .nest("/songs", songs::router())
        .nest("/genres", genres::router())
        .nest("/sub_genres", sub_genres::router())
        .nest("/countries", countries::router())
        .nest("/states", states::router())
        .nest("/cities", cities::router())
        .nest("/radio_stations", radio_stations::router())
        .nest("/labels", labels::router())
        .nest("/staff_members", staff_members::router())
        .nest("/postal_codes", postal_codes::router())
        .nest("/locations", locations::router())
        .nest("/band_images", band_images::router())
        .nest("/auth", auth::router())
        .nest("/system", system::router())
        .nest("/duplicate-scan", duplicate_scan::router())
        .nest("/media", media::router())
        .nest("/transfers", transfers::router())
        .nest("/status", status::router())
        .nest("/staff_playlists", staff_playlists::router())
        .with_state(state)
}

async fn health_check() -> &'static str {
    "OK"
}
