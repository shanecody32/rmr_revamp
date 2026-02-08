use crate::models::users::{Entity as User, Model as UserModel, Column as UserColumn};
use crate::services::types::{PaginatedResponse, PaginationInfo};
use sea_orm::{DatabaseConnection, EntityTrait, ColumnTrait, PaginatorTrait, QueryFilter};

pub struct UserService;

impl UserService {
    pub async fn get_users(
        db: &DatabaseConnection,
        name: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<UserModel>, sea_orm::DbErr> {
        let mut query = User::find();
        if let Some(ref name) = name {
            query = query.filter(UserColumn::Email.contains(name));
        }
        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;
        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_user_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<UserModel>, sea_orm::DbErr> {
        User::find_by_id(id).one(db).await
    }
}
