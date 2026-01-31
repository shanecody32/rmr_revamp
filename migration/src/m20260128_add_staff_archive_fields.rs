use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add archive-related columns to staff_members table
        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::Archived)
                            .tiny_integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::ArchivedAt)
                            .date_time()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::ArchivedReason)
                            .string_len(500)
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::TransferredToId)
                            .unsigned()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::TransferredFromId)
                            .unsigned()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .add_column(
                        ColumnDef::new(StaffMembers::AdminEditable)
                            .tiny_integer()
                            .not_null()
                            .default(0),
                    )
                    .to_owned(),
            )
            .await?;

        // Create index for quick archived filtering
        manager
            .create_index(
                Index::create()
                    .name("idx_staff_members_archived")
                    .table(StaffMembers::Table)
                    .col(StaffMembers::Archived)
                    .to_owned(),
            )
            .await?;

        // Create composite index for station + archived filtering
        manager
            .create_index(
                Index::create()
                    .name("idx_staff_members_radio_station_archived")
                    .table(StaffMembers::Table)
                    .col(StaffMembers::RadioStationId)
                    .col(StaffMembers::Archived)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes first
        // Use raw SQL for MariaDB compatibility
        manager
            .get_connection()
            .execute_unprepared("DROP INDEX IF EXISTS idx_staff_members_archived ON staff_members")
            .await?;

        manager
            .get_connection()
            .execute_unprepared(
                "DROP INDEX IF EXISTS idx_staff_members_radio_station_archived ON staff_members",
            )
            .await?;

        // Drop columns
        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::Archived)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::ArchivedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::ArchivedReason)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::TransferredToId)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::TransferredFromId)
                    .to_owned(),
            )
            .await?;

        manager
            .alter_table(
                Table::alter()
                    .table(StaffMembers::Table)
                    .drop_column(StaffMembers::AdminEditable)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum StaffMembers {
    Table,
    RadioStationId,
    Archived,
    ArchivedAt,
    ArchivedReason,
    TransferredToId,
    TransferredFromId,
    AdminEditable,
}
