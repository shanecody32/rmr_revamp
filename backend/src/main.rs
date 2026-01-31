use backend::{api, config::StaticFileConfig, setup_db, job_state::{AppState, BackfillJobState, TaskJobState}};
use dotenvy::dotenv;
use std::env;
use std::net::SocketAddr;
use tower_http::cors::{Any, CorsLayer};
use tower_http::trace::{DefaultMakeSpan, DefaultOnRequest, DefaultOnResponse, TraceLayer};
use tracing::Level;
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() {
    dotenv().ok();

    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend=info,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let db = setup_db().await;
    let static_config = StaticFileConfig::from_env();
    tracing::info!("Static file mode: {:?}", static_config.mode);

    let http_client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .expect("Failed to create HTTP client");

    let state = AppState {
        db,
        backfill_job_state: std::sync::Arc::new(tokio::sync::RwLock::new(BackfillJobState::default())),
        album_genre_update_job_state: std::sync::Arc::new(tokio::sync::RwLock::new(TaskJobState::default())),
        static_config,
        http_client,
    };

    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Configure request/response tracing at DEBUG level
    let trace_layer = TraceLayer::new_for_http()
        .make_span_with(DefaultMakeSpan::new().level(Level::DEBUG))
        .on_request(DefaultOnRequest::new().level(Level::DEBUG))
        .on_response(DefaultOnResponse::new().level(Level::DEBUG));

    let app = api::create_router(state)
        .layer(cors)
        .layer(trace_layer);

    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr: SocketAddr = format!("{}:{}", host, port).parse().expect("Invalid address");

    tracing::info!("listening on {}", addr);
    let listener = tokio::net::TcpListener::bind(&addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}
