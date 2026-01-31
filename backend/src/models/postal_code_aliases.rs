use sea_orm::entity::prelude::*;
use serde::Serialize;

#[derive(Clone, Debug, PartialEq, Eq, DeriveEntityModel, Serialize)]
#[sea_orm(table_name = "postal_code_aliases")]
pub struct Model {
    #[sea_orm(primary_key)]
    pub id: u32,
    pub postal_code_id: u32,
    pub country_id: Option<u32>,
    pub name: String,
    pub slug: Option<String>,
    pub sanitized_name: Option<String>,
    pub soundex_key: Option<String>,
    pub phonetic_key: Option<String>,
    pub metaphone_key: Option<String>,
    pub dmetaphone_key: Option<String>,
    pub dmetaphone_alt_key: Option<String>,
    pub created: Option<DateTime>,
    pub modified: Option<DateTime>,
}

#[derive(Copy, Clone, Debug, EnumIter, DeriveRelation)]
pub enum Relation {
    #[sea_orm(
        belongs_to = "super::postal_codes::Entity",
        from = "Column::PostalCodeId",
        to = "super::postal_codes::Column::Id"
    )]
    PostalCode,
    #[sea_orm(
        belongs_to = "super::countries::Entity",
        from = "Column::CountryId",
        to = "super::countries::Column::Id"
    )]
    Country,
}

impl Related<super::postal_codes::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::PostalCode.def()
    }
}

impl Related<super::countries::Entity> for Entity {
    fn to() -> RelationDef {
        Relation::Country.def()
    }
}

impl ActiveModelBehavior for ActiveModel {}
