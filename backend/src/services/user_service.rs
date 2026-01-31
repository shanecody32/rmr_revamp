use crate::models::users::{Entity as User, Model as UserModel};
use sea_orm::{DatabaseConnection, EntityTrait};

pub struct UserService;

impl UserService {
    pub async fn get_all_users(db: &DatabaseConnection) -> Result<Vec<UserModel>, sea_orm::DbErr> {
        User::find().all(db).await
    }

    pub async fn get_user_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<UserModel>, sea_orm::DbErr> {
        User::find_by_id(id).one(db).await
    }
}
