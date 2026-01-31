use sea_orm_migration::prelude::*;

/// Initial schema migration - tables already exist from legacy system.
/// This is a no-op migration to satisfy the migration framework.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Tables already exist from legacy system, nothing to do
        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // Cannot drop legacy tables
        Ok(())
    }
}
