use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        // Create band_relationships table for linking collaboration bands to member bands
        manager
            .create_table(
                Table::create()
                    .table(BandRelationships::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(BandRelationships::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(BandRelationships::ParentBandId)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BandRelationships::MemberBandId)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(BandRelationships::RelationshipType)
                            .string_len(50)
                            .not_null()
                            .default("member"),
                    )
                    .col(
                        ColumnDef::new(BandRelationships::Created)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(BandRelationships::Modified)
                            .date_time()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        // Create unique index on parent_band_id + member_band_id
        manager
            .create_index(
                Index::create()
                    .name("unique_band_relationship")
                    .table(BandRelationships::Table)
                    .col(BandRelationships::ParentBandId)
                    .col(BandRelationships::MemberBandId)
                    .unique()
                    .to_owned(),
            )
            .await?;

        // Index on parent_band_id for lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_band_rel_parent")
                    .table(BandRelationships::Table)
                    .col(BandRelationships::ParentBandId)
                    .to_owned(),
            )
            .await?;

        // Index on member_band_id for reverse lookups
        manager
            .create_index(
                Index::create()
                    .name("idx_band_rel_member")
                    .table(BandRelationships::Table)
                    .col(BandRelationships::MemberBandId)
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(Table::drop().table(BandRelationships::Table).to_owned())
            .await
    }
}

#[derive(Iden)]
enum BandRelationships {
    Table,
    Id,
    ParentBandId,
    MemberBandId,
    RelationshipType,
    Created,
    Modified,
}
