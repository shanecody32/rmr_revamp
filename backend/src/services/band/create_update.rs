//! Band create and update operations.

use crate::models::bands::{Entity as Band, Model as BandModel, ActiveModel as BandActiveModel};
use crate::models::band_aliases::{Entity as BandAlias, Column as BandAliasColumn};
use crate::utils::similarity::keys;
use crate::utils::slug::{slug_it, sanitize_name};
use sea_orm::*;

/// Create a new band with automatic alias generation.
pub async fn create_band(db: &DatabaseConnection, data: BandModel) -> Result<BandModel, DbErr> {
    let name = data.name.clone();
    let active_model: BandActiveModel = BandActiveModel {
        name: Set(data.name),
        slug: Set(Some(slug_it(&name))),
        city_id: Set(data.city_id),
        country_id: Set(data.country_id),
        state_id: Set(data.state_id),
        website: Set(data.website),
        email: Set(data.email),
        ..Default::default()
    };
    let band = active_model.insert(db).await?;

    // Create alias entry for similarity search
    create_band_alias(db, band.id, &name).await?;

    Ok(band)
}

/// Create a band alias for similarity search indexing.
pub async fn create_band_alias(
    db: &DatabaseConnection,
    band_id: u32,
    name: &str,
) -> Result<(), DbErr> {
    let slug = slug_it(name);
    let sanitized = sanitize_name(name);
    let soundex_key = keys::soundex(name);
    let metaphone_key = keys::metaphone(name);
    let (dmetaphone_key, dmetaphone_alt_key) = keys::double_metaphone(name);

    // Check if alias already exists for this band with this key
    let existing = BandAlias::find()
        .filter(BandAliasColumn::BandId.eq(band_id))
        .filter(BandAliasColumn::AliasKey.eq(name))
        .filter(BandAliasColumn::RadioStationId.is_null())
        .one(db)
        .await?;

    if existing.is_some() {
        return Ok(());
    }

    let alias = crate::models::band_aliases::ActiveModel {
        band_id: Set(band_id),
        alias_key: Set(name.to_string()),
        slug: Set(Some(slug)),
        sanitized_name: Set(Some(sanitized)),
        soundex_key: Set(Some(soundex_key)),
        phonetic_key: Set(Some(metaphone_key.clone())),
        metaphone_key: Set(Some(metaphone_key)),
        dmetaphone_key: Set(Some(dmetaphone_key)),
        dmetaphone_alt_key: Set(dmetaphone_alt_key),
        ..Default::default()
    };

    alias.insert(db).await?;
    Ok(())
}

/// Update an existing band.
pub async fn update_band(db: &DatabaseConnection, id: u32, data: BandModel) -> Result<BandModel, DbErr> {
    let band = Band::find_by_id(id).one(db).await?;
    if let Some(band) = band {
        let mut active_model: BandActiveModel = band.into();
        active_model.name = Set(data.name);
        active_model.city_id = Set(data.city_id);
        active_model.country_id = Set(data.country_id);
        active_model.state_id = Set(data.state_id);
        active_model.website = Set(data.website);
        active_model.email = Set(data.email);
        // ... update other fields as needed
        active_model.update(db).await
    } else {
        Err(DbErr::RecordNotFound("Band not found".to_string()))
    }
}
