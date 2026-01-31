pub use sea_orm_migration::prelude::*;

mod m20220101_000001_create_table;
mod m20260123_112200_expand_phonetic_keys;
mod m20260123_174829_update_alias_tables;
mod m20260126_add_performance_indexes;
mod m20260126_create_duplicate_detection_tables;
mod m20260128_add_staff_archive_fields;
mod m20260128_create_action_logs;
mod m20260201_create_album_duplicate_candidates;
mod m20260201_create_song_duplicate_candidates;
mod m20260201_create_radio_station_duplicate_candidates;
mod m20260201_create_staff_member_duplicate_candidates;
mod m20260201_create_label_duplicate_candidates;
mod m20260131_fix_null_junction_ids;

pub struct Migrator;

#[async_trait::async_trait]
impl MigratorTrait for Migrator {
    fn migrations() -> Vec<Box<dyn MigrationTrait>> {
        vec![
            Box::new(m20220101_000001_create_table::Migration),
            Box::new(m20260123_112200_expand_phonetic_keys::Migration),
            Box::new(m20260123_174829_update_alias_tables::Migration),
            Box::new(m20260126_add_performance_indexes::Migration),
            Box::new(m20260126_create_duplicate_detection_tables::Migration),
            Box::new(m20260128_add_staff_archive_fields::Migration),
            Box::new(m20260128_create_action_logs::Migration),
            Box::new(m20260201_create_album_duplicate_candidates::Migration),
            Box::new(m20260201_create_song_duplicate_candidates::Migration),
            Box::new(m20260201_create_radio_station_duplicate_candidates::Migration),
            Box::new(m20260201_create_staff_member_duplicate_candidates::Migration),
            Box::new(m20260201_create_label_duplicate_candidates::Migration),
            Box::new(m20260131_fix_null_junction_ids::Migration),
        ]
    }
}
