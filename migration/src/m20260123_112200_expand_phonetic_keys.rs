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

        for table in alias_tables {
            manager
                .alter_table(
                    Table::alter()
                        .table(Alias::new(table))
                        .add_column(ColumnDef::new(Alias::new("metaphone_key")).string_len(8).null())
                        .add_column(ColumnDef::new(Alias::new("dmetaphone_key")).string_len(8).null())
                        .add_column(ColumnDef::new(Alias::new("dmetaphone_alt_key")).string_len(8).null())
                        .to_owned(),
                )
                .await?;
            
            // Add indexes
            manager.create_index(Index::create().name(format!("idx-{}-metaphone", table)).table(Alias::new(table)).col(Alias::new("metaphone_key")).to_owned()).await?;
            manager.create_index(Index::create().name(format!("idx-{}-dmetaphone", table)).table(Alias::new(table)).col(Alias::new("dmetaphone_key")).to_owned()).await?;
            manager.create_index(Index::create().name(format!("idx-{}-dmetaphone-alt", table)).table(Alias::new(table)).col(Alias::new("dmetaphone_alt_key")).to_owned()).await?;
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
