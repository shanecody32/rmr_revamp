use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let alias_tables = [
            "band_aliases", "album_aliases", "label_aliases", "song_aliases",
            "state_aliases", "city_aliases", "postal_code_aliases",
            "radio_station_aliases", "staff_member_aliases"
        ];

        let db = manager.get_connection();

        for table in alias_tables {
            if !manager.has_table(table).await? {
                eprintln!("Skipping expand_phonetic_keys for {}: table does not exist", table);
                continue;
            }

            // Use IF NOT EXISTS to be idempotent on re-runs
            for (col, size) in [("metaphone_key", 8), ("dmetaphone_key", 8), ("dmetaphone_alt_key", 8)] {
                db.execute_unprepared(&format!(
                    "ALTER TABLE `{}` ADD COLUMN IF NOT EXISTS `{}` VARCHAR({}) NULL",
                    table, col, size
                )).await?;
            }

            // Add indexes (ignore if already exist)
            for (suffix, col) in [("metaphone", "metaphone_key"), ("dmetaphone", "dmetaphone_key"), ("dmetaphone-alt", "dmetaphone_alt_key")] {
                db.execute_unprepared(&format!(
                    "CREATE INDEX IF NOT EXISTS `idx-{}-{}` ON `{}` (`{}`)",
                    table, suffix, table, col
                )).await.ok();
            }
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let alias_tables = [
            "band_aliases", "album_aliases", "label_aliases", "song_aliases",
            "state_aliases", "city_aliases", "postal_code_aliases",
            "radio_station_aliases", "staff_member_aliases"
        ];

        for table in alias_tables {
            if !manager.has_table(table).await? {
                continue;
            }
            manager
                .alter_table(
                    Table::alter()
                        .table(Alias::new(table))
                        .drop_column(Alias::new("metaphone_key"))
                        .drop_column(Alias::new("dmetaphone_key"))
                        .drop_column(Alias::new("dmetaphone_alt_key"))
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }
}
