use sea_orm_migration::prelude::*;

#[derive(DeriveMigrationName)]
pub struct Migration;

#[async_trait::async_trait]
impl MigrationTrait for Migration {
    async fn up(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .create_table(
                Table::create()
                    .table(StaffMemberDuplicateCandidates::Table)
                    .if_not_exists()
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::Id)
                            .unsigned()
                            .not_null()
                            .auto_increment()
                            .primary_key(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::StaffMemberId1)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::StaffMemberId2)
                            .unsigned()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::SimilarityScore)
                            .integer()
                            .not_null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::MatchReasons)
                            .json()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::Status)
                            .string_len(20)
                            .not_null()
                            .default("pending"),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::ReviewedBy)
                            .unsigned()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::ReviewedAt)
                            .date_time()
                            .null(),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::DetectedAt)
                            .date_time()
                            .not_null()
                            .default(Expr::current_timestamp()),
                    )
                    .col(
                        ColumnDef::new(StaffMemberDuplicateCandidates::ScanSettings)
                            .json()
                            .null(),
                    )
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_staff_dup_staff_1")
                    .table(StaffMemberDuplicateCandidates::Table)
                    .col(StaffMemberDuplicateCandidates::StaffMemberId1)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_staff_dup_staff_2")
                    .table(StaffMemberDuplicateCandidates::Table)
                    .col(StaffMemberDuplicateCandidates::StaffMemberId2)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_staff_dup_status")
                    .table(StaffMemberDuplicateCandidates::Table)
                    .col(StaffMemberDuplicateCandidates::Status)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("idx_staff_dup_detected")
                    .table(StaffMemberDuplicateCandidates::Table)
                    .col(StaffMemberDuplicateCandidates::DetectedAt)
                    .to_owned(),
            )
            .await?;

        manager
            .create_index(
                Index::create()
                    .name("unique_staff_member_pair")
                    .table(StaffMemberDuplicateCandidates::Table)
                    .col(StaffMemberDuplicateCandidates::StaffMemberId1)
                    .col(StaffMemberDuplicateCandidates::StaffMemberId2)
                    .unique()
                    .to_owned(),
            )
            .await?;

        Ok(())
    }

    async fn down(&self, manager: &SchemaManager) -> Result<(), DbErr> {
        manager
            .drop_table(
                Table::drop()
                    .table(StaffMemberDuplicateCandidates::Table)
                    .to_owned(),
            )
            .await
    }
}

#[derive(Iden)]
enum StaffMemberDuplicateCandidates {
    Table,
    Id,
    StaffMemberId1,
    StaffMemberId2,
    SimilarityScore,
    MatchReasons,
    Status,
    ReviewedBy,
    ReviewedAt,
    DetectedAt,
    ScanSettings,
}
