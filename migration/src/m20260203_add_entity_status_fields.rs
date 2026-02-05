use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Add status fields to bands
        Self::add_status_fields_to_table(manager, Bands::Table).await?;

        // Add status fields to albums
        Self::add_status_fields_to_table(manager, Albums::Table).await?;

        // Add status fields to songs
        Self::add_status_fields_to_table(manager, Songs::Table).await?;

        // Add status fields to radio_stations
        Self::add_status_fields_to_table(manager, RadioStations::Table).await?;

        // Add status fields to staff_members
        Self::add_status_fields_to_table(manager, StaffMembers::Table).await?;

        // Migrate existing data from verified/approved booleans
        // For bands
        let db = manager.get_connection();
        db.execute_unprepared(
            r#"UPDATE bands SET
                data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                data_status_at = COALESCE(modified, created, NOW()),
                chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                chart_status_at = COALESCE(modified, created, NOW())
            WHERE data_status = 'new' AND verified IS NOT NULL"#
        ).await?;

        // For albums
        db.execute_unprepared(
            r#"UPDATE albums SET
                data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                data_status_at = COALESCE(modified, created, NOW()),
                chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                chart_status_at = COALESCE(modified, created, NOW())
            WHERE data_status = 'new' AND verified IS NOT NULL"#
        ).await?;

        // For songs
        db.execute_unprepared(
            r#"UPDATE songs SET
                data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                data_status_at = COALESCE(modified, created, NOW()),
                chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                chart_status_at = COALESCE(modified, created, NOW())
            WHERE data_status = 'new' AND verified IS NOT NULL"#
        ).await?;

        // For radio_stations
        db.execute_unprepared(
            r#"UPDATE radio_stations SET
                data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                data_status_at = COALESCE(modified, created, NOW()),
                chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                chart_status_at = COALESCE(modified, created, NOW())
            WHERE data_status = 'new' AND verified IS NOT NULL"#
        ).await?;

        // For staff_members
        db.execute_unprepared(
            r#"UPDATE staff_members SET
                data_status = CASE WHEN verified = 1 THEN 'validated' ELSE 'new' END,
                data_status_at = COALESCE(modified, created, NOW()),
                chart_status = CASE WHEN approved = 1 THEN 'approved' ELSE 'pending' END,
                chart_status_at = COALESCE(modified, created, NOW())
            WHERE data_status = 'new' AND verified IS NOT NULL"#
        ).await?;

        // Create indexes for status fields
        Self::create_status_indexes(manager, "bands").await?;
        Self::create_status_indexes(manager, "albums").await?;
        Self::create_status_indexes(manager, "songs").await?;
        Self::create_status_indexes(manager, "radio_stations").await?;
        Self::create_status_indexes(manager, "staff_members").await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Drop indexes
        Self::drop_status_indexes(manager, "bands").await?;
        Self::drop_status_indexes(manager, "albums").await?;
        Self::drop_status_indexes(manager, "songs").await?;
        Self::drop_status_indexes(manager, "radio_stations").await?;
        Self::drop_status_indexes(manager, "staff_members").await?;

        // Drop columns from all tables
        Self::drop_status_fields_from_table(manager, Bands::Table).await?;
        Self::drop_status_fields_from_table(manager, Albums::Table).await?;
        Self::drop_status_fields_from_table(manager, Songs::Table).await?;
        Self::drop_status_fields_from_table(manager, RadioStations::Table).await?;
        Self::drop_status_fields_from_table(manager, StaffMembers::Table).await?;

        Ok(())
    }
}

impl Migration {
    async fn add_status_fields_to_table<T: Iden + 'static>(
        manager: &SchemaManager<'_>,
        table: T,
    ) -> Result<(), DbErr> {
        // Data status fields
        manager
            .alter_table(
                Table::alter()
                    .table(table)
                    .add_column(
                        ColumnDef::new(StatusFields::DataStatus)
                            .string_len(30)
                            .not_null()
                            .default("new"),
                    )
                    .to_owned(),
            )
            .await?;

        // Need to get table reference again for each alter
        let table_name = get_table_name::<T>();

        let db = manager.get_connection();

        // Add remaining columns via raw SQL since we can't reuse the table iden
        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN data_status_reason VARCHAR(30) NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN data_status_note TEXT NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN data_status_at DATETIME NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN data_status_by INT UNSIGNED NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN chart_status VARCHAR(20) NOT NULL DEFAULT 'pending'",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN chart_denial_reason VARCHAR(30) NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN chart_status_note TEXT NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN chart_status_at DATETIME NULL",
            table_name
        )).await?;

        db.execute_unprepared(&format!(
            "ALTER TABLE {} ADD COLUMN chart_status_by INT UNSIGNED NULL",
            table_name
        )).await?;

        Ok(())
    }

    async fn drop_status_fields_from_table<T: Iden + 'static>(
        manager: &SchemaManager<'_>,
        _table: T,
    ) -> Result<(), DbErr> {
        let table_name = get_table_name::<T>();
        let db = manager.get_connection();

        let columns = [
            "data_status",
            "data_status_reason",
            "data_status_note",
            "data_status_at",
            "data_status_by",
            "chart_status",
            "chart_denial_reason",
            "chart_status_note",
            "chart_status_at",
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
            "CREATE INDEX idx_{}_data_status ON {} (data_status)",
            table_name, table_name
        )).await?;

        db.execute_unprepared(&format!(
            "CREATE INDEX idx_{}_chart_status ON {} (chart_status)",
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

fn get_table_name<T: Iden + 'static>() -> &'static str {
    use std::any::TypeId;

    if TypeId::of::<T>() == TypeId::of::<Bands>() {
        "bands"
    } else if TypeId::of::<T>() == TypeId::of::<Albums>() {
        "albums"
    } else if TypeId::of::<T>() == TypeId::of::<Songs>() {
        "songs"
    } else if TypeId::of::<T>() == TypeId::of::<RadioStations>() {
        "radio_stations"
    } else if TypeId::of::<T>() == TypeId::of::<StaffMembers>() {
        "staff_members"
    } else {
        panic!("Unknown table type")
    }
}

#[derive(Iden)]
enum StatusFields {
    DataStatus,
}

#[derive(Iden)]
enum Bands {
    Table,
}

#[derive(Iden)]
enum Albums {
    Table,
}

#[derive(Iden)]
enum Songs {
    Table,
}

#[derive(Iden)]
enum RadioStations {
    Table,
}

#[derive(Iden)]
enum StaffMembers {
    Table,
}
