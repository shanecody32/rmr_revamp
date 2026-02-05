//! Album similarity search functions.

use crate::models::albums::{Entity as Album, Model as AlbumModel};
use crate::models::album_aliases::{Entity as AlbumAlias, Column as AlbumAliasColumn};
use crate::services::types::{SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use sea_orm::*;

/// Find similar albums using phonetic matching and fuzzy search.
pub async fn get_similar_albums(
    db: &DatabaseConnection,
    params: SimilarityParams,
) -> Result<Vec<SimilarResult<AlbumModel>>, DbErr> {
    let mut query = AlbumAlias::find();

    if let Some(true) = params.restrict_to_parent
        && let Some(band_id) = params.band_id {
            query = query.filter(AlbumAliasColumn::BandId.eq(band_id));
        }

    let results: Vec<SimilarResult<crate::models::album_aliases::Model>> = find_similar_pipeline(
        db,
        query,
        crate::utils::similarity::pipeline::SimilarityColumns {
            name: AlbumAliasColumn::AliasKey,
            slug: AlbumAliasColumn::Slug,
            sanitized: Some(AlbumAliasColumn::SanitizedName),
            soundex: Some(AlbumAliasColumn::SoundexKey),
            phonetic: Some(AlbumAliasColumn::PhoneticKey),
            metaphone: Some(AlbumAliasColumn::MetaphoneKey),
            dmetaphone: Some(AlbumAliasColumn::DmetaphoneKey),
            dmetaphone_alt: Some(AlbumAliasColumn::DmetaphoneAltKey),
        },
        params,
        AlbumAliasColumn::AlbumId,
        |m| m.alias_key.clone(),
    ).await?;

    let mut album_ids: Vec<u32> = results.iter().map(|r| r.model.album_id).collect();
    album_ids.sort();
    album_ids.dedup();

    if album_ids.is_empty() {
        return Ok(vec![]);
    }

    let albums = Album::find()
        .filter(crate::models::albums::Column::Id.is_in(album_ids))
        .all(db)
        .await?;

    let mut final_results = Vec::new();
    for r in results {
        if let Some(album) = albums.iter().find(|a| a.id == r.model.album_id) {
            final_results.push(SimilarResult {
                model: album.clone(),
                similarity_score: r.similarity_score,
            });
        }
        if final_results.len() >= 50 { break; }
    }

    let mut seen = std::collections::HashSet::new();
    final_results.retain(|r| seen.insert(r.model.id));

    Ok(final_results)
}
