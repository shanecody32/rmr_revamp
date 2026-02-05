use axum::{
    Router,
    extract::{Path, Query, State},
    http::{StatusCode, header, HeaderValue},
    response::{IntoResponse, Response},
    routing::get,
};
use serde::Deserialize;

use crate::config::static_files::StaticFileMode;
use crate::job_state::AppState;

/// Parameters for thumbnail generation (future feature).
#[derive(Debug, Deserialize)]
#[allow(dead_code)] // Fields reserved for future thumbnail resizing feature
pub struct ThumbnailParams {
    pub w: Option<u32>,
    pub h: Option<u32>,
}

type MediaResult = Result<Response, (StatusCode, String)>;

pub fn router() -> Router<AppState> {
    Router::new().route("/{*path}", get(serve_media))
}

// TODO: Implement on-demand thumbnail resizing using the `image` crate.
// When ?w= and/or ?h= query params are provided, check the _cache/ directory
// for an existing thumbnail, generate one if missing, and serve the resized version.
async fn serve_media(
    State(state): State<AppState>,
    Path(path): Path<String>,
    Query(_params): Query<ThumbnailParams>,
) -> MediaResult {
    let result = match &state.static_config.mode {
        StaticFileMode::Proxy => proxy_to_remote(&state, &path).await,
        StaticFileMode::Local => serve_local(&state, &path).await,
    };

    // On any error (404, network failure, etc.), serve the fallback image
    match result {
        Ok(response) => Ok(response),
        Err((status, msg)) => {
            tracing::debug!("Media request failed for '{}': {} - {}, serving fallback", path, status, msg);
            serve_fallback(&state).await
        }
    }
}

/// Fetch the fallback "no image" placeholder.
/// In proxy mode, fetches from the remote fallback URL.
/// In local mode, reads from the local fallback path.
async fn serve_fallback(state: &AppState) -> MediaResult {
    if let Some(ref fallback_path) = state.static_config.fallback_image_path {
        // Local fallback file
        let bytes = tokio::fs::read(fallback_path)
            .await
            .map_err(|_| (StatusCode::NOT_FOUND, "Fallback image not found".to_string()))?;
        let content_type = mime_guess::from_path(fallback_path)
            .first_or_octet_stream()
            .to_string();
        return Ok(build_response(bytes, &content_type));
    }

    // In proxy mode, fetch the remote fallback
    if let Some(ref base_url) = state.static_config.proxy_base_url {
        let url = format!("{}/no_image.jpg", base_url);
        if let Ok(response) = state.http_client.get(&url).send().await
            && response.status().is_success() {
                let content_type = response
                    .headers()
                    .get(header::CONTENT_TYPE)
                    .and_then(|v| v.to_str().ok())
                    .unwrap_or("image/jpeg")
                    .to_string();
                if let Ok(bytes) = response.bytes().await {
                    return Ok(build_response(bytes.to_vec(), &content_type));
                }
            }
    }

    // Last resort: return a transparent 1x1 pixel GIF
    Ok(build_response(
        TRANSPARENT_1X1_GIF.to_vec(),
        "image/gif",
    ))
}

/// Minimal transparent 1x1 GIF as a last-resort fallback
const TRANSPARENT_1X1_GIF: &[u8] = &[
    0x47, 0x49, 0x46, 0x38, 0x39, 0x61, 0x01, 0x00,
    0x01, 0x00, 0x80, 0x00, 0x00, 0xff, 0xff, 0xff,
    0x00, 0x00, 0x00, 0x21, 0xf9, 0x04, 0x01, 0x00,
    0x00, 0x00, 0x00, 0x2c, 0x00, 0x00, 0x00, 0x00,
    0x01, 0x00, 0x01, 0x00, 0x00, 0x02, 0x02, 0x44,
    0x01, 0x00, 0x3b,
];

async fn proxy_to_remote(state: &AppState, path: &str) -> MediaResult {
    let base_url = state
        .static_config
        .proxy_base_url
        .as_ref()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "STATIC_FILE_PROXY_BASE not configured".to_string(),
            )
        })?;

    let url = format!("{}/{}", base_url, path);

    let response = state
        .http_client
        .get(&url)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Proxy error: {}", e)))?;

    if !response.status().is_success() {
        let status = response.status().as_u16();
        return Err((
            StatusCode::from_u16(status).unwrap_or(StatusCode::BAD_GATEWAY),
            format!("Upstream returned {}", status),
        ));
    }

    let content_type = response
        .headers()
        .get(header::CONTENT_TYPE)
        .and_then(|v| v.to_str().ok())
        .unwrap_or("application/octet-stream")
        .to_string();

    let bytes = response
        .bytes()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, format!("Failed to read body: {}", e)))?;

    Ok(build_response(bytes.to_vec(), &content_type))
}

async fn serve_local(state: &AppState, path: &str) -> MediaResult {
    let base_path = state
        .static_config
        .local_path
        .as_ref()
        .ok_or_else(|| {
            (
                StatusCode::INTERNAL_SERVER_ERROR,
                "STATIC_FILE_PATH not configured".to_string(),
            )
        })?;

    let file_path = base_path.join(path);

    // Prevent path traversal
    let canonical = file_path.canonicalize().map_err(|_| {
        (StatusCode::NOT_FOUND, "File not found".to_string())
    })?;
    let canonical_base = base_path.canonicalize().map_err(|_| {
        (
            StatusCode::INTERNAL_SERVER_ERROR,
            "Storage path not found".to_string(),
        )
    })?;
    if !canonical.starts_with(&canonical_base) {
        return Err((StatusCode::FORBIDDEN, "Access denied".to_string()));
    }

    let bytes = tokio::fs::read(&canonical)
        .await
        .map_err(|_| (StatusCode::NOT_FOUND, "File not found".to_string()))?;

    let content_type = mime_guess::from_path(&canonical)
        .first_or_octet_stream()
        .to_string();

    Ok(build_response(bytes, &content_type))
}

fn build_response(body: Vec<u8>, content_type: &str) -> Response {
    let mut response = body.into_response();
    let headers = response.headers_mut();
    if let Ok(val) = HeaderValue::from_str(content_type) {
        headers.insert(header::CONTENT_TYPE, val);
    }
    headers.insert(
        header::CACHE_CONTROL,
        HeaderValue::from_static("public, max-age=86400"),
    );
    response
}
