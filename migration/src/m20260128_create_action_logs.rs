use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create action_logs table for auditing merge/transfer operations
        manager
            .create_table(
                Table::create()
                    .table(ActionLogs::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(ActionLogs::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::ActionType)
                            .string_len(100)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::EntityType)
                            .string_len(50)
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::EntityId)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::UserId)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::BeforeSnapshot)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::AfterSnapshot)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::Metadata)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::IpAddress)
                            .string_len(45)
                            .null(),
                    )
                    .col(
                        ColumnDef::new(ActionLogs::CreatedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .to_owned(),
            )
            .await?;

        // Create indexes for efficient querying
        manager
            .create_index(
                Index::create()
                    .name("idx_action_logs_entity")
                    .table(ActionLogs::Table)
                    .col(ActionLogs::EntityType)
                    .col(ActionLogs::EntityId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_action_logs_user")
                    .table(ActionLogs::Table)
                    .col(ActionLogs::UserId)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_action_logs_type")
                    .table(ActionLogs::Table)
                    .col(ActionLogs::ActionType)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_action_logs_created")
                    .table(ActionLogs::Table)
                    .col(ActionLogs::CreatedAt)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(ActionLogs::Table).to_owned())
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum ActionLogs {
    Table,
    Id,
    ActionType,
    EntityType,
    EntityId,
    UserId,
    BeforeSnapshot,
    AfterSnapshot,
    Metadata,
    IpAddress,
    CreatedAt,
}
