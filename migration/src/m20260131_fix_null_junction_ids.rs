use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

/// Fix junction tables that have NULL primary key `id` values.
/// These are legacy data issues where rows were inserted without auto-increment IDs.
/// This migration:
/// 1. Deletes rows with NULL id (they lack a valid PK)
/// 2. Ensures the id column is NOT NULL AUTO_INCREMENT PRIMARY KEY
///
/// Affected tables (junction tables with id + two FK columns):
/// - albums_sub_genres
/// - albums_bands
/// - albums_songs
/// - bands_sub_genres
/// - bands_users
#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        let db = manager.get_connection();

        let junction_tables = [
            "albums_sub_genres",
            "albums_bands",
            "albums_songs",
            "bands_sub_genres",
            "bands_users",
        ];

        for table in &junction_tables {
            if !manager.has_table(*table).await? {
                eprintln!("Skipping fix_null_junction_ids for {}: table does not exist", table);
                continue;
            }

            // Delete rows with NULL id
            let delete_sql = format!("DELETE FROM `{}` WHERE `id` IS NULL", table);
            let result = db.execute_unprepared(&delete_sql).await;
            match result {
                Ok(res) => {
                    let affected = res.rows_affected();
                    if affected > 0 {
                        eprintln!("Deleted {} rows with NULL id from {}", affected, table);
                    }
                }
                Err(e) => {
                    eprintln!("Warning: could not clean NULL ids from {}: {}", table, e);
                }
            }

            // Ensure id column is NOT NULL AUTO_INCREMENT PRIMARY KEY
            let alter_sql = format!(
                "ALTER TABLE `{}` MODIFY `id` INT UNSIGNED NOT NULL AUTO_INCREMENT, ADD PRIMARY KEY (`id`)",
                table
            );
            let result = db.execute_unprepared(&alter_sql).await;
            match result {
                Ok(_) => {
                    eprintln!("Fixed id column on {} to NOT NULL AUTO_INCREMENT PRIMARY KEY", table);
                }
                Err(e) => {
                    // May already have correct schema
                    eprintln!("Note: {} id column may already be correct: {}", table, e);
                }
            }
        }

        Ok(())
    }

    async fn down(&self, _manager: &SchemaManager) -> Result<(), DbErr> {
        // No rollback - deleted NULL rows can't be restored and the column change is safe
        Ok(())
    }
}
