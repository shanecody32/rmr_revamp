pub mod api;
pub mod config;
pub mod models;
pub mod services;
pub mod job_state;
pub mod utils;
pub mod views;

use std::env;
use std::time::Duration;
use sea_orm::{ConnectOptions, Database, DatabaseConnection};

pub async fn setup_db() -> DatabaseConnection {
    let db_url = env::var("DATABASE_URL").expect("DATABASE_URL must be set");
    
    let mut opt = ConnectOptions::new(db_url);
    
    let max_connections = env::var("MAX_CONNECTIONS")
        .unwrap_or_else(|_| "20".to_string())
        .parse()
        .unwrap_or(20);
    let min_connections = env::var("MIN_CONNECTIONS")
        .unwrap_or_else(|_| "5".to_string())
        .parse()
        .unwrap_or(5);
    let connect_timeout = env::var("CONNECT_TIMEOUT")
        .unwrap_or_else(|_| "8".to_string())
        .parse()
        .unwrap_or(8);
    let idle_timeout = env::var("IDLE_TIMEOUT")
        .unwrap_or_else(|_| "8".to_string())
        .parse()
        .unwrap_or(8);
    let max_lifetime = env::var("MAX_LIFETIME")
        .unwrap_or_else(|_| "1800".to_string()) // 30 minutes
        .parse()
        .unwrap_or(1800);

    opt.max_connections(max_connections)
        .min_connections(min_connections)
        .connect_timeout(Duration::from_secs(connect_timeout))
        .idle_timeout(Duration::from_secs(idle_timeout))
        .max_lifetime(Duration::from_secs(max_lifetime))
        .sqlx_logging(true);

    Database::connect(opt)
        .await
        .expect("Failed to connect to database")
}
