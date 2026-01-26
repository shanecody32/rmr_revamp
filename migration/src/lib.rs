pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20260123_112200_expand_phonetic_keys;
mod m20260123_174829_update_alias_tables;
mod m20260126_add_performance_indexes;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20260123_112200_expand_phonetic_keys::Migration),
            Box::new(m20260123_174829_update_alias_tables::Migration),
            Box::new(m20260126_add_performance_indexes::Migration),
        ]
    }
}
