use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Add entity_type column
        manager
            .alter_table(
                Table::alter()
                    .table(DuplicateScanState::Table)
                    .add_column(
                        ColumnDef::new(DuplicateScanState::EntityType)
                            .string_len(50)
                            .not_null()
                            .default("bands"),
                    )
                    .to_owned(),
            )
            .await?;

        // Rename last_processed_band_id -> last_processed_id
        db.execute_unprepared(
            "ALTER TABLE duplicate_scan_state CHANGE last_processed_band_id last_processed_id INT UNSIGNED NOT NULL DEFAULT 0",
        )
        .await?;

        // Rename total_bands_scanned -> total_items_scanned
        db.execute_unprepared(
            "ALTER TABLE duplicate_scan_state CHANGE total_bands_scanned total_items_scanned INT UNSIGNED NOT NULL DEFAULT 0",
        )
        .await?;

        // Add unique constraint on entity_type
        manager
            .create_index(
                Index::create()
                    .name("unique_entity_type")
                    .table(DuplicateScanState::Table)
                    .col(DuplicateScanState::EntityType)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Insert seed rows for additional entity types
        db.execute_unprepared(
            "INSERT IGNORE INTO duplicate_scan_state (entity_type) VALUES ('albums'), ('labels'), ('radio_stations'), ('staff_members')",
        )
        .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        // Remove seed rows (keep only bands)
        db.execute_unprepared(
            "DELETE FROM duplicate_scan_state WHERE entity_type != 'bands'",
        )
        .await?;

        // Drop unique index
        manager
            .drop_index(
                Index::drop()
                    .name("unique_entity_type")
                    .table(DuplicateScanState::Table)
                    .to_owned(),
            )
            .await?;

        // Rename columns back
        db.execute_unprepared(
            "ALTER TABLE duplicate_scan_state CHANGE total_items_scanned total_bands_scanned INT UNSIGNED NOT NULL DEFAULT 0",
        )
        .await?;

        db.execute_unprepared(
            "ALTER TABLE duplicate_scan_state CHANGE last_processed_id last_processed_band_id INT UNSIGNED NOT NULL DEFAULT 0",
        )
        .await?;

        // Drop entity_type column
        manager
            .alter_table(
                Table::alter()
                    .table(DuplicateScanState::Table)
                    .drop_column(DuplicateScanState::EntityType)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }
}

#[derive(Iden)]
enum DuplicateScanState {
    Table,
    EntityType,
}
