use crate::models::countries::{Entity as Country, Model as CountryModel, Column as CountryColumn};
use crate::models::states::{Entity as State, Model as StateModel, Column as StateColumn};
use crate::models::cities::{Entity as City, Model as CityModel, Column as CityColumn};
use crate::models::postal_codes::{Entity as PostalCode, Model as PostalCodeModel};
use sea_orm::*;
use crate::services::types::{PaginatedResponse, PaginationInfo, SimilarityParams, SimilarResult};
use crate::utils::similarity::find_similar_pipeline;
use crate::models::city_aliases::{Entity as CityAlias, Column as CityAliasColumn};
use crate::models::state_aliases::{Entity as StateAlias, Column as StateAliasColumn};
use crate::models::postal_code_aliases::{Entity as PostalCodeAlias, Column as PostalCodeAliasColumn};

pub struct LocationService;

impl LocationService {
    pub async fn get_countries(
        db: &DatabaseConnection,
        name: Option<String>,
        name_filter_type: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<CountryModel>, DbErr> {
        let mut query = Country::find();

        if let Some(name) = name
            && !name.is_empty()
        {
            match name_filter_type.as_deref() {
                Some("starts_with") => query = query.filter(CountryColumn::Name.starts_with(&name)),
                Some("ends_with") => query = query.filter(CountryColumn::Name.ends_with(&name)),
                Some("exact_match") => query = query.filter(CountryColumn::Name.eq(&name)),
                _ => query = query.filter(CountryColumn::Name.contains(&name)),
            }
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_similar_countries(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<CountryModel>>, DbErr> {
        let query = Country::find();

        find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: crate::models::countries::Column::Name,
                slug: crate::models::countries::Column::Name, // Fallback
                sanitized: None,
                soundex: None,
                phonetic: None,
                metaphone: None,
                dmetaphone: None,
                dmetaphone_alt: None,
            },
            params,
            crate::models::countries::Column::Id,
            |m| m.name.clone().unwrap_or_default(),
        )
        .await
    }

    pub async fn get_country_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<CountryModel>, DbErr> {
        Country::find_by_id(id).one(db).await
    }

    pub async fn get_states(
        db: &DatabaseConnection,
        country_id: Option<u32>,
        name: Option<String>,
        name_filter_type: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<StateModel>, DbErr> {
        let mut query = State::find();

        if let Some(cid) = country_id {
            query = query.filter(StateColumn::CountryId.eq(cid));
        }

        if let Some(name) = name
            && !name.is_empty()
        {
            match name_filter_type.as_deref() {
                Some("starts_with") => query = query.filter(StateColumn::Name.starts_with(&name)),
                Some("ends_with") => query = query.filter(StateColumn::Name.ends_with(&name)),
                Some("exact_match") => query = query.filter(StateColumn::Name.eq(&name)),
                _ => query = query.filter(StateColumn::Name.contains(&name)),
            }
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_similar_states(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<StateModel>>, DbErr> {
        let mut query = StateAlias::find();

        if let Some(true) = params.restrict_to_parent
            && let Some(country_id) = params.country_id {
                query = query.filter(StateAliasColumn::CountryId.eq(country_id));
            }

        let results: Vec<SimilarResult<crate::models::state_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: StateAliasColumn::Name,
                slug: StateAliasColumn::Slug,
                sanitized: Some(StateAliasColumn::SanitizedName),
                soundex: Some(StateAliasColumn::SoundexKey),
                phonetic: Some(StateAliasColumn::PhoneticKey),
                metaphone: Some(StateAliasColumn::MetaphoneKey),
                dmetaphone: Some(StateAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(StateAliasColumn::DmetaphoneAltKey),
            },
            params,
            StateAliasColumn::StateId,
            |m| m.name.clone(),
        ).await?;

        let mut state_ids: Vec<u32> = results.iter().map(|r| r.model.state_id).collect();
        state_ids.sort();
        state_ids.dedup();

        if state_ids.is_empty() {
            return Ok(vec![]);
        }

        let states = State::find()
            .filter(crate::models::states::Column::Id.is_in(state_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(state) = states.iter().find(|s| s.id == r.model.state_id) {
                final_results.push(SimilarResult {
                    model: state.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        Ok(final_results)
    }

    pub async fn get_state_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<StateModel>, DbErr> {
        State::find_by_id(id).one(db).await
    }

    pub async fn get_cities(
        db: &DatabaseConnection,
        country_id: Option<u32>,
        state_id: Option<u32>,
        name: Option<String>,
        name_filter_type: Option<String>,
        page: u64,
        page_size: u64,
    ) -> Result<PaginatedResponse<CityModel>, DbErr> {
        let mut query = City::find();

        if let Some(cid) = country_id {
            query = query.filter(CityColumn::CountryId.eq(cid));
        }
        if let Some(sid) = state_id {
            query = query.filter(CityColumn::StateId.eq(sid));
        }

        if let Some(name) = name
            && !name.is_empty()
        {
            match name_filter_type.as_deref() {
                Some("starts_with") => query = query.filter(CityColumn::Name.starts_with(&name)),
                Some("ends_with") => query = query.filter(CityColumn::Name.ends_with(&name)),
                Some("exact_match") => query = query.filter(CityColumn::Name.eq(&name)),
                _ => query = query.filter(CityColumn::Name.contains(&name)),
            }
        }

        let paginator = query.paginate(db, page_size);
        let total_items = paginator.num_items().await?;
        let total_pages = paginator.num_pages().await?;
        let results = paginator.fetch_page(page - 1).await?;

        Ok(PaginatedResponse {
            results,
            pagination: PaginationInfo {
                page,
                page_size,
                total_pages,
                total_items,
            },
        })
    }

    pub async fn get_similar_cities(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<CityModel>>, DbErr> {
        let mut query = CityAlias::find();

        if let Some(true) = params.restrict_to_parent {
            if let Some(country_id) = params.country_id {
                query = query.join(JoinType::InnerJoin, CityAlias::belongs_to(City).from(CityAliasColumn::CityId).to(crate::models::cities::Column::Id).into())
                             .filter(crate::models::cities::Column::CountryId.eq(country_id));
            }
            if let Some(state_id) = params.state_id {
                query = query.filter(CityAliasColumn::StateId.eq(state_id));
            }
        }

        let results: Vec<SimilarResult<crate::models::city_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: CityAliasColumn::Name,
                slug: CityAliasColumn::Slug,
                sanitized: Some(CityAliasColumn::SanitizedName),
                soundex: Some(CityAliasColumn::SoundexKey),
                phonetic: Some(CityAliasColumn::PhoneticKey),
                metaphone: Some(CityAliasColumn::MetaphoneKey),
                dmetaphone: Some(CityAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(CityAliasColumn::DmetaphoneAltKey),
            },
            params,
            CityAliasColumn::CityId,
            |m| m.name.clone(),
        ).await?;

        let mut city_ids: Vec<u32> = results.iter().map(|r| r.model.city_id).collect();
        city_ids.sort();
        city_ids.dedup();

        if city_ids.is_empty() {
            return Ok(vec![]);
        }

        let cities = City::find()
            .filter(crate::models::cities::Column::Id.is_in(city_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(city) = cities.iter().find(|c| c.id == r.model.city_id) {
                final_results.push(SimilarResult {
                    model: city.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        Ok(final_results)
    }

    pub async fn get_city_by_id(db: &DatabaseConnection, id: u32) -> Result<Option<CityModel>, DbErr> {
        City::find_by_id(id).one(db).await
    }

    pub async fn get_similar_postal_codes(
        db: &DatabaseConnection,
        params: SimilarityParams,
    ) -> Result<Vec<SimilarResult<PostalCodeModel>>, DbErr> {
        let mut query = PostalCodeAlias::find();

        if let Some(true) = params.restrict_to_parent
            && let Some(country_id) = params.country_id {
                query = query.filter(PostalCodeAliasColumn::CountryId.eq(country_id));
            }

        let results: Vec<SimilarResult<crate::models::postal_code_aliases::Model>> = find_similar_pipeline(
            db,
            query,
            crate::utils::similarity::pipeline::SimilarityColumns {
                name: PostalCodeAliasColumn::Name,
                slug: PostalCodeAliasColumn::Slug,
                sanitized: Some(PostalCodeAliasColumn::SanitizedName),
                soundex: Some(PostalCodeAliasColumn::SoundexKey),
                phonetic: Some(PostalCodeAliasColumn::PhoneticKey),
                metaphone: Some(PostalCodeAliasColumn::MetaphoneKey),
                dmetaphone: Some(PostalCodeAliasColumn::DmetaphoneKey),
                dmetaphone_alt: Some(PostalCodeAliasColumn::DmetaphoneAltKey),
            },
            params,
            PostalCodeAliasColumn::PostalCodeId,
            |m| m.name.clone(),
        ).await?;

        let mut pc_ids: Vec<u32> = results.iter().map(|r| r.model.postal_code_id).collect();
        pc_ids.sort();
        pc_ids.dedup();

        if pc_ids.is_empty() {
            return Ok(vec![]);
        }

        let pcs = PostalCode::find()
            .filter(crate::models::postal_codes::Column::Id.is_in(pc_ids))
            .all(db)
            .await?;

        let mut final_results = Vec::new();
        for r in results {
            if let Some(pc) = pcs.iter().find(|p| p.id == r.model.postal_code_id) {
                final_results.push(SimilarResult {
                    model: pc.clone(),
                    similarity_score: r.similarity_score,
                });
            }
            if final_results.len() >= 50 { break; }
        }

        Ok(final_results)
    }
}
