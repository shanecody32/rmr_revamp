use sea_orm::prelude::*;
use std::time::Duration;
use tokio::task::JoinHandle;
use crate::entities::now_playing_connections;

pub mod utils;

pub fn start_poller(db: DatabaseConnection) -> JoinHandle<()> {
    tokio::spawn(async move {
        tracing::info!("Starting poller scheduler loop");
        loop {
            if let Err(e) = poll_all_enabled(&db).await {
                tracing::error!("Error in poller loop: {:?}", e);
            }
            tokio::time::sleep(Duration::from_secs(10)).await;
        }
    })
}

async fn poll_all_enabled(db: &DatabaseConnection) -> Result<(), DbErr> {
    let connections = now_playing_connections::Entity::find()
        .filter(now_playing_connections::Column::Enabled.eq(true))
        .all(db)
        .await?;

    for conn in connections {
        let db = db.clone();
        tokio::spawn(async move {
            if should_poll(&conn) {
                let db_inner = db.clone();
                let conn_inner = conn.clone();
                tokio::spawn(async move {
                    if let Err(e) = utils::poll_connection(&db_inner, &conn_inner).await {
                        tracing::error!("Error polling connection {}: {:?}", conn_inner.id, e);
                    }
                });
            }
        });
    }

    Ok(())
}

fn should_poll(conn: &now_playing_connections::Model) -> bool {
    match conn.last_polled_at {
        None => true,
        Some(last) => {
            let now = chrono::Utc::now().fixed_offset();
            let diff = now.signed_duration_since(last);
            diff.num_seconds() >= conn.poll_interval_seconds as i64
        }
    }
}
