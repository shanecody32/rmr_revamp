use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let tables = ["bands", "albums", "songs", "radio_stations", "staff_members"];

        for table_name in tables {
            if !manager.has_table(table_name).await? {
                eprintln!("Skipping add_entity_status_fields for {}: table does not exist", table_name);
                continue;
            }
            Self::add_status_fields_raw(manager, table_name).await?;
            Self::create_status_indexes(manager, table_name).await?;
        }

        // Migrate existing data from verified/approved booleans
        let db = manager.get_connection();
        let migrate_tables = ["bands", "albums", "songs", "radio_stations", "staff_members"];
        for table_name in migrate_tables {
            if !manager.has_table(table_name).await? {
                continue;
            }
            db.execute_unprepared(&format!(
                r#"UPDATE {} SET
                    data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                    data_status_at = COALESCE(modified, created, NOW()),
                    chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                    chart_status_at = COALESCE(modified, created, NOW())
                WHERE data_status = 'new' AND verified IS NOT NULL"#,
                table_name
            )).await.ok(); // ok() to ignore if verified column doesn't exist
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let table_names = ["bands", "albums", "songs", "radio_stations", "staff_members"];
        for table_name in table_names {
            if !manager.has_table(table_name).await? {
                continue;
            }
            Self::drop_status_indexes(manager, table_name).await?;
            Self::drop_status_fields_raw(manager, table_name).await?;
        }

        Ok(())
    }
}

impl Migration {
    async fn add_status_fields_raw(
        manager: &SchemaManager<'_>,
        table_name: &str,
    ) -> Result<(), DbErr> {
        let db = manager.get_connection();

        let columns = [
            ("data_status", "VARCHAR(30) NOT NULL DEFAULT 'new'"),
            ("data_status_reason", "VARCHAR(30) NULL"),
            ("data_status_note", "TEXT NULL"),
            ("data_status_at", "DATETIME NULL"),
            ("data_status_by", "INT UNSIGNED NULL"),
            ("chart_status", "VARCHAR(20) NOT NULL DEFAULT 'pending'"),
            ("chart_denial_reason", "VARCHAR(30) NULL"),
            ("chart_status_note", "TEXT NULL"),
            ("chart_status_at", "DATETIME NULL"),
            ("chart_status_by", "INT UNSIGNED NULL"),
        ];

        for (col_name, col_def) in columns {
            db.execute_unprepared(&format!(
                "ALTER TABLE `{}` ADD COLUMN IF NOT EXISTS `{}` {}",
                table_name, col_name, col_def
            )).await?;
        }

        Ok(())
    }

    async fn drop_status_fields_raw(
        manager: &SchemaManager<'_>,
        table_name: &str,
    ) -> Result<(), DbErr> {
        let db = manager.get_connection();

        let columns = [
            "data_status", "data_status_reason", "data_status_note",
            "data_status_at", "data_status_by", "chart_status",
            "chart_denial_reason", "chart_status_note", "chart_status_at",
            "chart_status_by",
        ];

        for col in columns {
            db.execute_unprepared(&format!(
                "ALTER TABLE {} DROP COLUMN {}",
                table_name, col
            )).await?;
        }

        Ok(())
    }

    async fn create_status_indexes(
        manager: &SchemaManager<'_>,
        table_name: &str,
    ) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(&format!(
            "CREATE INDEX IF NOT EXISTS idx_{}_data_status ON {} (data_status)",
            table_name, table_name
        )).await?;

        db.execute_unprepared(&format!(
            "CREATE INDEX IF NOT EXISTS idx_{}_chart_status ON {} (chart_status)",
            table_name, table_name
        )).await?;

        Ok(())
    }

    async fn drop_status_indexes(
        manager: &SchemaManager<'_>,
        table_name: &str,
    ) -> Result<(), DbErr> {
        let db = manager.get_connection();

        db.execute_unprepared(&format!(
            "DROP INDEX idx_{}_data_status ON {}",
            table_name, table_name
        )).await?;

        db.execute_unprepared(&format!(
            "DROP INDEX idx_{}_chart_status ON {}",
            table_name, table_name
        )).await?;

        Ok(())
    }
}
