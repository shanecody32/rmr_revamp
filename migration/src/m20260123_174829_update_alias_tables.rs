use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let alias_tables = ["band_aliases", "album_aliases", "label_aliases", "song_aliases"];

        let db = manager.get_connection();

        for table in alias_tables {
            if !manager.has_table(table).await? {
                eprintln!("Skipping update_alias_tables for {}: table does not exist", table);
                continue;
            }

            // Use IF NOT EXISTS to be idempotent
            for (col, typedef) in [
                ("slug", "VARCHAR(255) NULL"),
                ("sanitized_name", "VARCHAR(255) NULL"),
                ("soundex_key", "VARCHAR(4) NULL"),
                ("phonetic_key", "VARCHAR(255) NULL"),
            ] {
                db.execute_unprepared(&format!(
                    "ALTER TABLE `{}` ADD COLUMN IF NOT EXISTS `{}` {}",
                    table, col, typedef
                )).await?;
            }

            // Add indexes (ignore if already exist)
            for (suffix, col) in [("slug", "slug"), ("sanitized", "sanitized_name"), ("soundex", "soundex_key"), ("phonetic", "phonetic_key")] {
                db.execute_unprepared(&format!(
                    "CREATE INDEX IF NOT EXISTS `idx-{}-{}` ON `{}` (`{}`)",
                    table, suffix, table, col
                )).await.ok();
            }
        }

        // Create new alias tables
        let new_alias_tables = [
            ("state_aliases", "state_id", "country_id"),
            ("city_aliases", "city_id", "state_id"),
            ("postal_code_aliases", "postal_code_id", "country_id"),
            ("radio_station_aliases", "radio_station_id", "parent_id"), // radio_station doesn't have a clear single parent, using global
            ("staff_member_aliases", "staff_member_id", "radio_station_id"),
        ];

        for (table, entity_id_col, parent_id_col) in new_alias_tables {
            manager
                .create_table(
                    Table::create()
                        .table(Alias::new(table))
                        .if_not_exists()
                        .col(ColumnDef::new(Alias::new("id")).unsigned().not_null().auto_increment().primary_key())
                        .col(ColumnDef::new(Alias::new(entity_id_col)).unsigned().not_null())
                        .col(ColumnDef::new(Alias::new(parent_id_col)).unsigned().null())
                        .col(ColumnDef::new(Alias::new("name")).string().not_null())
                        .col(ColumnDef::new(Alias::new("slug")).string().null())
                        .col(ColumnDef::new(Alias::new("sanitized_name")).string().null())
                        .col(ColumnDef::new(Alias::new("soundex_key")).string_len(4).null())
                        .col(ColumnDef::new(Alias::new("phonetic_key")).string().null())
                        .col(ColumnDef::new(Alias::new("metaphone_key")).string_len(8).null())
                        .col(ColumnDef::new(Alias::new("dmetaphone_key")).string_len(8).null())
                        .col(ColumnDef::new(Alias::new("dmetaphone_alt_key")).string_len(8).null())
                        .col(ColumnDef::new(Alias::new("created")).date_time().null())
                        .col(ColumnDef::new(Alias::new("modified")).date_time().null())
                        .to_owned(),
                )
                .await?;

            // Only create indexes if they don't already exist (table may have been created by expand_phonetic_keys skip)
            manager.create_index(Index::create().if_not_exists().name(format!("idx-{}-slug", table)).table(Alias::new(table)).col(Alias::new("slug")).to_owned()).await?;
            manager.create_index(Index::create().if_not_exists().name(format!("idx-{}-sanitized", table)).table(Alias::new(table)).col(Alias::new("sanitized_name")).to_owned()).await?;
        }

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let new_alias_tables = ["state_aliases", "city_aliases", "postal_code_aliases", "radio_station_aliases", "staff_member_aliases"];
        for table in new_alias_tables {
            if manager.has_table(table).await? {
                manager.drop_table(Table::drop().table(Alias::new(table)).to_owned()).await?;
            }
        }

        let alias_tables = ["band_aliases", "album_aliases", "label_aliases", "song_aliases"];
        for table in alias_tables {
            if !manager.has_table(table).await? {
                continue;
            }
            manager
                .alter_table(
                    Table::alter()
                        .table(Alias::new(table))
                        .drop_column(Alias::new("slug"))
                        .drop_column(Alias::new("sanitized_name"))
                        .drop_column(Alias::new("soundex_key"))
                        .drop_column(Alias::new("phonetic_key"))
                        .to_owned(),
                )
                .await?;
        }
        Ok(())
    }
}
