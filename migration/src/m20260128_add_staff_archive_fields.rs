use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if !manager.has_table("staff_members").await? {
            eprintln!("Skipping add_staff_archive_fields: staff_members table does not exist");
            return Ok(());
        }

        let db = manager.get_connection();

        // Add archive-related columns (IF NOT EXISTS for idempotency)
        let columns = [
            ("archived", "TINYINT NOT NULL DEFAULT 0"),
            ("archived_at", "DATETIME NULL"),
            ("archived_reason", "VARCHAR(500) NULL"),
            ("transferred_to_id", "INT UNSIGNED NULL"),
            ("transferred_from_id", "INT UNSIGNED NULL"),
            ("admin_editable", "TINYINT NOT NULL DEFAULT 0"),
        ];
        for (col, typedef) in columns {
            db.execute_unprepared(&format!(
                "ALTER TABLE `staff_members` ADD COLUMN IF NOT EXISTS `{}` {}",
                col, typedef
            )).await?;
        }

        // Create indexes (IF NOT EXISTS)
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_staff_members_archived ON staff_members (archived)"
        ).await?;
        db.execute_unprepared(
            "CREATE INDEX IF NOT EXISTS idx_staff_members_radio_station_archived ON staff_members (radio_station_id, archived)"
        ).await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        if !manager.has_table("staff_members").await? {
            return Ok(());
        }

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

        let columns = ["archived", "archived_at", "archived_reason", "transferred_to_id", "transferred_from_id", "admin_editable"];
        for col in columns {
            manager
                .alter_table(
                    Table::alter()
                        .table(StaffMembers::Table)
                        .drop_column(Alias::new(col))
                        .to_owned(),
                )
                .await?;
        }

        Ok(())
    }
}

#[derive(Iden)]
enum StaffMembers {
    Table,
}
