use std::path::PathBuf;

#[derive(Debug, Clone)]
pub enum StaticFileMode {
    Proxy,
    Local,
}

#[derive(Debug, Clone)]
pub struct ThumbnailConfig {
    pub cache_dir: String,
    pub quality: u8,
    pub max_width: u32,
    pub max_height: u32,
}

#[derive(Debug, Clone)]
pub struct StaticFileConfig {
    pub mode: StaticFileMode,
    pub proxy_base_url: Option<String>,
    pub local_path: Option<PathBuf>,
    pub url_prefix: String,
    pub fallback_image_path: Option<PathBuf>,
    pub thumbnail: ThumbnailConfig,
}

impl StaticFileConfig {
    pub fn from_env() -> Self {
        let mode = match std::env::var("STATIC_FILE_MODE")
            .unwrap_or_else(|_| "proxy".to_string())
            .as_str()
        {
            "local" => StaticFileMode::Local,
            _ => StaticFileMode::Proxy,
        };

        Self {
            mode,
            proxy_base_url: std::env::var("STATIC_FILE_PROXY_BASE").ok(),
            local_path: std::env::var("STATIC_FILE_PATH").ok().map(PathBuf::from),
            url_prefix: std::env::var("STATIC_FILE_URL_PREFIX")
                .unwrap_or_else(|_| "/media".to_string()),
            fallback_image_path: std::env::var("FALLBACK_IMAGE_PATH").ok().map(PathBuf::from),
            thumbnail: ThumbnailConfig {
                cache_dir: std::env::var("THUMBNAIL_CACHE_DIR")
                    .unwrap_or_else(|_| "_cache".to_string()),
                quality: std::env::var("THUMBNAIL_QUALITY")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(85),
                max_width: std::env::var("THUMBNAIL_MAX_WIDTH")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(2000),
                max_height: std::env::var("THUMBNAIL_MAX_HEIGHT")
                    .ok()
                    .and_then(|s| s.parse().ok())
                    .unwrap_or(2000),
            },
        }
    }
}
