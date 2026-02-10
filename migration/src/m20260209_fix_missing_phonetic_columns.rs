use sea_orm_migration::prelude::*;

/// Fixup migration: The `expand_phonetic_keys` migration ran before `update_alias_tables`,
/// so the newly-created alias tables (radio_station_aliases, staff_member_aliases,
/// state_aliases, city_aliases, postal_code_aliases) are missing metaphone_key,
/// dmetaphone_key, and dmetaphone_alt_key columns. This adds them idempotently.
#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let tables = [
            "radio_station_aliases",
            "staff_member_aliases",
            "state_aliases",
            "city_aliases",
            "postal_code_aliases",
        ];

        let db = manager.get_connection();

        for table in tables {
            if !manager.has_table(table).await? {
                continue;
            }

            for (col, size) in [("metaphone_key", 8), ("dmetaphone_key", 8), ("dmetaphone_alt_key", 8)] {
                db.execute_unprepared(&format!(
                    "ALTER TABLE `{}` ADD COLUMN IF NOT EXISTS `{}` VARCHAR({}) NULL",
                    table, col, size
                )).await?;
            }

            for (suffix, col) in [("metaphone", "metaphone_key"), ("dmetaphone", "dmetaphone_key"), ("dmetaphone-alt", "dmetaphone_alt_key")] {
                db.execute_unprepared(&format!(
                    "CREATE INDEX IF NOT EXISTS `idx-{}-{}` ON `{}` (`{}`)",
                    table, suffix, table, col
                )).await.ok();
            }
        }

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // No-op: these columns are expected by the similarity pipeline
        Ok(())
    }
}
