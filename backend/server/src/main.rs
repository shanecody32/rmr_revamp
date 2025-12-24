use axum::{
    routing::get,
    Router,
};
use sea_orm::{Database, DatabaseConnection};
use std::env;
use tower_http::cors::{Any, CorsLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    // Load environment variables from .env file
    dotenvy::dotenv().ok();

    // Initialize tracing
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "backend_server=debug,tower_http=debug".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    // Database connection - optional for demo
    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost/rmr_db".to_string());
    
    tracing::info!("Attempting to connect to database...");
    let db_result: Result<DatabaseConnection, _> = Database::connect(&database_url).await;
    
    match &db_result {
        Ok(_) => tracing::info!("Database connected successfully"),
        Err(e) => {
            tracing::warn!("Database connection failed: {}. Server will run without database.", e);
            tracing::warn!("To connect to a database, set DATABASE_URL in .env file");
        }
    }

    // Configure CORS
    let cors = CorsLayer::new()
        .allow_origin(Any)
        .allow_methods(Any)
        .allow_headers(Any);

    // Build application router
    let app = if let Ok(db) = db_result {
        Router::new()
            .route("/", get(root))
            .route("/health", get(health_check))
            .layer(cors)
            .with_state(db)
    } else {
        // Run without database state
        Router::new()
            .route("/", get(root))
            .route("/health", get(health_check))
            .layer(cors)
    };

    // Get server address from environment or use default
    let host = env::var("HOST").unwrap_or_else(|_| "0.0.0.0".to_string());
    let port = env::var("PORT").unwrap_or_else(|_| "3000".to_string());
    let addr = format!("{}:{}", host, port);

    tracing::info!("Starting server on {}", addr);

    // Start server
    let listener = tokio::net::TcpListener::bind(&addr).await?;
    axum::serve(listener, app).await?;

    Ok(())
}

async fn root() -> &'static str {
    "RMR Revamp API - Backend is running"
}

async fn health_check() -> &'static str {
    "OK"
}
