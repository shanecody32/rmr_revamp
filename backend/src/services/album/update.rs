//! Album update and delete operations.

use crate::models::albums::{Entity as Album, Model as AlbumModel, ActiveModel as AlbumActiveModel};
use super::types::UpdateAlbumRequest;
use chrono::NaiveDate;
use sea_orm::*;

/// Update an album with basic fields.
pub async fn update_album(db: &DatabaseConnection, id: u32, data: AlbumModel) -> Result<AlbumModel, DbErr> {
    let album = Album::find_by_id(id).one(db).await?;
    if let Some(album) = album {
        let mut active_model: AlbumActiveModel = album.into();
        active_model.name = Set(data.name);
        active_model.label_id = Set(data.label_id);
        active_model.release_date = Set(data.release_date);
        active_model.img = Set(data.img);
        // ... update other fields as needed
        active_model.update(db).await
    } else {
        Err(DbErr::RecordNotFound("Album not found".to_string()))
    }
}

/// Update an album with all fields from a request.
pub async fn update_album_full(
    db: &DatabaseConnection,
    id: u32,
    req: UpdateAlbumRequest,
) -> Result<AlbumModel, DbErr> {
    let album = Album::find_by_id(id).one(db).await?
        .ok_or(DbErr::RecordNotFound("Album not found".to_string()))?;

    let mut active_model: AlbumActiveModel = album.into();

    if let Some(name) = req.name { active_model.name = Set(Some(name)); }
    if let Some(label_id) = req.label_id { active_model.label_id = Set(Some(label_id)); }
    if let Some(itunes_url) = req.itunes_url { active_model.itunes_url = Set(Some(itunes_url)); }
    if let Some(cdbaby_url) = req.cdbaby_url { active_model.cdbaby_url = Set(Some(cdbaby_url)); }
    if let Some(amazon_url) = req.amazon_url { active_model.amazon_url = Set(Some(amazon_url)); }
    if let Some(itunes_id) = req.itunes_id { active_model.itunes_id = Set(Some(itunes_id)); }
    if let Some(rovi_id) = req.rovi_id { active_model.rovi_id = Set(Some(rovi_id)); }
    if let Some(about) = req.about { active_model.about = Set(Some(about)); }
    if let Some(thanks) = req.thanks { active_model.thanks = Set(Some(thanks)); }
    if let Some(producer) = req.producer { active_model.producer = Set(Some(producer)); }
    if let Some(engineer) = req.engineer { active_model.engineer = Set(Some(engineer)); }
    if let Some(studio) = req.studio { active_model.studio = Set(Some(studio)); }
    if let Some(master) = req.master { active_model.master = Set(Some(master)); }
    if let Some(verified) = req.verified { active_model.verified = Set(verified); }
    if let Some(approved) = req.approved { active_model.approved = Set(approved); }

    if let Some(release_date_str) = req.release_date
         && let Ok(date) = NaiveDate::parse_from_str(&release_date_str, "%Y-%m-%d") {
             active_model.release_date = Set(Some(date));
         }

    let updated_album = active_model.update(db).await?;

    // Sync songs
    if let Some(songs_input) = req.songs {
        // Remove existing relations
        crate::models::albums_songs::Entity::delete_many()
            .filter(crate::models::albums_songs::Column::AlbumId.eq(id))
            .exec(db)
            .await?;

        // Add new relations
        let mut new_relations = Vec::new();
        for (idx, song_input) in songs_input.into_iter().enumerate() {
            let track_num = song_input.track_number.or(Some((idx + 1) as i32));
            new_relations.push(crate::models::albums_songs::ActiveModel {
                album_id: Set(id),
                song_id: Set(song_input.song_id),
                track_number: Set(track_num),
                track_num: Set(track_num),
                disc_number: Set(song_input.disc_number.or(Some(1))),
                ..Default::default()
            });
        }

        if !new_relations.is_empty() {
            crate::models::albums_songs::Entity::insert_many(new_relations).exec(db).await?;
        }
    }

    Ok(updated_album)
}

/// Delete an album.
pub async fn delete_album(db: &DatabaseConnection, id: u32) -> Result<DeleteResult, DbErr> {
    Album::delete_by_id(id).exec(db).await
}
