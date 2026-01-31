use crate::models::users::{Entity as User, Model as UserModel};
use sea_orm::*;
use serde::{Deserialize, Serialize};
use utoipa::ToSchema;

pub struct AuthService;

#[derive(Debug, Deserialize, ToSchema)]
pub struct LoginRequest {
    pub email: String,
    pub password: Option<String>,
}

#[derive(Debug, Serialize, ToSchema)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserModel,
}

impl AuthService {
    pub async fn login(db: &DatabaseConnection, req: LoginRequest) -> Result<LoginResponse, DbErr> {
        let user = User::find()
            .filter(crate::models::users::Column::Email.eq(req.email))
            .one(db)
            .await?;

        if let Some(user) = user {
            // In a real implementation, you would verify the password and generate a JWT.
            Ok(LoginResponse {
                token: "mock-jwt-token".to_string(),
                user,
            })
        } else {
            Err(DbErr::RecordNotFound("User not found".to_string()))
        }
    }

    pub async fn get_current_user(db: &DatabaseConnection) -> Result<Option<UserModel>, DbErr> {
        // Mock implementation: return the first user
        User::find().one(db).await
    }
}
