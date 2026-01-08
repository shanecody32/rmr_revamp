use sea_orm::{prelude::*, Set, QueryOrder};
use chrono::{Utc, DateTime, FixedOffset};
use sha2::{Sha256, Digest};
use crate::entities::{now_playing_connections, raw_now_playing_events, payload_mappings};

pub struct FetchResult {
    pub status: i32,
    pub content_type: Option<String>,
    pub raw_payload: serde_json::Value,
    pub reported_artist: Option<String>,
    pub reported_title: Option<String>,
    pub reported_album: Option<String>,
    pub reported_at: Option<DateTime<FixedOffset>>,
}

pub async fn poll_connection(db: &DatabaseConnection, conn: &now_playing_connections::Model) -> Result<(), DbErr> {
    let now = Utc::now().fixed_offset();
    
    let mapping = if let Some(mapping_id) = conn.payload_mapping_id {
        payload_mappings::Entity::find_by_id(mapping_id).one(db).await?
    } else {
        None
    };

    let result = match fetch_and_parse(conn, mapping.as_ref()).await {
        Ok(res) => res,
        Err(e) => {
            let mut active_conn: now_playing_connections::ActiveModel = conn.clone().into();
            active_conn.last_polled_at = Set(Some(now));
            active_conn.last_status = Set(Some("FETCH_ERROR".to_string()));
            active_conn.last_error = Set(Some(e.to_string()));
            active_conn.update(db).await?;
            return Ok(());
        }
    };

    let payload_str = serde_json::to_string(&result.raw_payload).unwrap_or_default();
    let payload_hash = calculate_hash(conn.station_id, conn.id, &payload_str);

    // Check for deduplication
    let last_event = raw_now_playing_events::Entity::find()
        .filter(raw_now_playing_events::Column::ConnectionId.eq(conn.id))
        .order_by_desc(raw_now_playing_events::Column::ObservedAt)
        .one(db)
        .await?;

    let is_payload_duplicate = last_event.as_ref().map(|e| e.payload_hash == payload_hash).unwrap_or(false);
    
    let is_content_duplicate = if let (Some(last), current_artist, current_title) = (&last_event, &result.reported_artist, &result.reported_title) {
        let last_artist = last.reported_artist.as_ref();
        let last_title = last.reported_title.as_ref();
        
        // If both are None/empty, we can't really say it's a duplicate based on content, 
        // but we rely on payload hash then. 
        // If they are identical to last seen, it's a duplicate.
        last_artist == current_artist.as_ref() && last_title == current_title.as_ref()
    } else {
        false
    };

    if !is_payload_duplicate && !is_content_duplicate {
        let event = raw_now_playing_events::ActiveModel {
            id: Set(Uuid::new_v4()),
            station_id: Set(conn.station_id),
            connection_id: Set(conn.id),
            observed_at: Set(now),
            reported_at: Set(result.reported_at),
            reported_artist: Set(result.reported_artist),
            reported_title: Set(result.reported_title),
            reported_album: Set(result.reported_album),
            raw_payload: Set(result.raw_payload),
            payload_hash: Set(payload_hash),
            http_status: Set(Some(result.status)),
            content_type: Set(result.content_type),
            created_at: Set(now),
            ..Default::default()
        };
        event.insert(db).await?;
    }

    let mut active_conn: now_playing_connections::ActiveModel = conn.clone().into();
    active_conn.last_polled_at = Set(Some(now));
    active_conn.last_status = Set(Some("OK".to_string()));
    active_conn.last_error = Set(None);
    active_conn.update(db).await?;

    Ok(())
}

pub async fn fetch_and_parse(
    conn: &now_playing_connections::Model,
    mapping: Option<&payload_mappings::Model>,
) -> Result<FetchResult, Box<dyn std::error::Error + Send + Sync>> {
    let client = reqwest::Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .build()?;
    let mut rb = client.get(&conn.url);

    if let Some(headers) = &conn.headers_json {
        if let Some(headers_obj) = headers.as_object() {
            for (k, v) in headers_obj {
                if let Some(v_str) = v.as_str() {
                    rb = rb.header(k, v_str);
                }
            }
        }
    }

    let resp = rb.send().await?;
    let status = resp.status().as_u16() as i32;
    let content_type = resp
        .headers()
        .get(reqwest::header::CONTENT_TYPE)
        .and_then(|h| h.to_str().ok())
        .map(|s| s.to_string());

    let body_bytes = resp.bytes().await?;
    let raw_payload: serde_json::Value = if let Ok(json) = serde_json::from_slice(&body_bytes) {
        json
    } else {
        // Try XML if it looks like XML or if content-type suggests it
        let body_str = String::from_utf8_lossy(&body_bytes).to_string();
        if body_str.trim_start().starts_with('<') {
            let normalized_xml = body_str.replace('\n', "").replace('\t', "");
            match serde_xml_rs::from_str::<serde_json::Value>(&normalized_xml) {
                Ok(json) => json,
                Err(_) => serde_json::Value::String(normalized_xml),
            }
        } else {
            serde_json::Value::String(body_str.to_string())
        }
    };

    let (artist, title, album, reported_at) = extract_fields(&raw_payload, mapping);

    Ok(FetchResult {
        status,
        content_type,
        raw_payload,
        reported_artist: artist,
        reported_title: title,
        reported_album: album,
        reported_at,
    })
}

fn extract_fields(
    payload: &serde_json::Value,
    mapping: Option<&payload_mappings::Model>,
) -> (
    Option<String>,
    Option<String>,
    Option<String>,
    Option<DateTime<FixedOffset>>,
) {
    if let Some(m) = mapping {
        let mapping_obj = m.mapping_json.as_object();

        let mut candidates: Vec<&serde_json::Value> = vec![payload];
        if let Some(obj) = payload.as_object() {
            if obj.len() == 1 {
                if let Some((_, value)) = obj.iter().next() {
                    candidates.push(value);
                }
            }
        }

        for base in candidates {
            let mut target_payload = base;

            if let Some(list_path) = mapping_obj
                .and_then(|o| o.get("list_path"))
                .and_then(|v| v.as_str())
            {
                if let Some(list) = get_path(base, list_path) {
                    if let Some(arr) = list.as_array() {
                        if let Some(first) = arr.first() {
                            target_payload = first;
                        }
                    }
                }
            }

            let artist = mapping_obj
                .and_then(|o| o.get("artist_path"))
                .and_then(|v| v.as_str())
                .and_then(|p| get_path(target_payload, p))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let title = mapping_obj
                .and_then(|o| o.get("title_path"))
                .and_then(|v| v.as_str())
                .and_then(|p| get_path(target_payload, p))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let album = mapping_obj
                .and_then(|o| o.get("album_path"))
                .and_then(|v| v.as_str())
                .and_then(|p| get_path(target_payload, p))
                .and_then(|v| v.as_str())
                .map(|s| s.to_string());

            let reported_at = mapping_obj
                .and_then(|o| o.get("reported_at_path"))
                .and_then(|v| v.as_str())
                .and_then(|p| get_path(target_payload, p))
                .and_then(|v| v.as_str())
                .and_then(parse_reported_at);

            if artist.is_some() || title.is_some() || album.is_some() || reported_at.is_some() {
                return (artist, title, album, reported_at);
            }
        }

        return (None, None, None, None);
    }

    // Best-effort extraction (legacy)
    let mut artist = None;
    let mut title = None;
    let mut album = None;

    if let Some(obj) = payload.as_object() {
        artist = obj.get("artist").or_else(|| obj.get("artistName")).and_then(|v| v.as_str()).map(|s| s.to_string());
        title = obj.get("title").or_else(|| obj.get("song")).or_else(|| obj.get("trackName")).and_then(|v| v.as_str()).map(|s| s.to_string());
        album = obj.get("album").or_else(|| obj.get("collectionName")).and_then(|v| v.as_str()).map(|s| s.to_string());
    } else if let Some(arr) = payload.as_array() {
        if let Some(first) = arr.first() {
            return extract_fields(first, None);
        }
    }

    (artist, title, album, None)
}

fn parse_reported_at(value: &str) -> Option<DateTime<FixedOffset>> {
    DateTime::parse_from_rfc3339(value)
        .ok()
        .or_else(|| DateTime::parse_from_str(value, "%d %b %Y %H:%M:%S").ok())
}

fn get_path<'a>(val: &'a serde_json::Value, path: &str) -> Option<&'a serde_json::Value> {
    let mut curr = val;
    for part in path.split('.') {
        if part.is_empty() {
            continue;
        }
        if let Some(obj) = curr.as_object() {
            if let Some(next) = obj.get(part) {
                curr = next;
            } else {
                return None;
            }
        } else {
            return None;
        }
    }
    Some(curr)
}

fn calculate_hash(station_id: Uuid, conn_id: Uuid, payload: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(station_id.as_bytes());
    hasher.update(conn_id.as_bytes());
    hasher.update(payload.as_bytes());
    hex::encode(hasher.finalize())
}
