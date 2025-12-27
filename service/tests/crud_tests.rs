use rmr_api_service::{Mutation, Query};
use entity::band;
use sea_orm::{ConnectionTrait, Database, Schema};

#[tokio::test]
async fn main() {
    let db = &Database::connect("sqlite::memory:").await.unwrap();

    db.execute(&Schema::new(db.get_database_backend()).create_table_from_entity(band::Entity))
        .await
        .unwrap();

    {
        let band = Mutation::create_band(
            db,
            band::Model {
                id: 0,
                name: "Band A".to_owned(),
                bio: "Bio A".to_owned(),
            },
        )
            .await
            .unwrap();

        assert_eq!(
            band,
            band::ActiveModel {
                id: sea_orm::ActiveValue::Unchanged(1),
                name: sea_orm::ActiveValue::Unchanged("Name A".to_owned()),
                bio: sea_orm::ActiveValue::Unchanged("Bio A".to_owned())
            }
        );
    }

    {
        let band = Mutation::create_band(
            db,
            band::Model {
                id: 0,
                title: "Title B".to_owned(),
                text: "Text B".to_owned(),
            },
        )
            .await
            .unwrap();

        assert_eq!(
            band,
            band::ActiveModel {
                id: sea_orm::ActiveValue::Unchanged(2),
                title: sea_orm::ActiveValue::Unchanged("Title B".to_owned()),
                text: sea_orm::ActiveValue::Unchanged("Text B".to_owned())
            }
        );
    }

    {
        let band = Query::find_band_by_id(db, 1).await.unwrap().unwrap();

        assert_eq!(band.id, 1);
        assert_eq!(band.title, "Title A");
    }

    {
        let band = Mutation::update_band_by_id(
            db,
            1,
            band::Model {
                id: 1,
                title: "New Title A".to_owned(),
                text: "New Text A".to_owned(),
            },
        )
            .await
            .unwrap();

        assert_eq!(
            post,
            band::Model {
                id: 1,
                title: "New Title A".to_owned(),
                text: "New Text A".to_owned(),
            }
        );
    }

    {
        let result = Mutation::delete_band(db, 2).await.unwrap();

        assert_eq!(result.rows_affected, 1);
    }

    {
        let band = Query::find_band_by_id(db, 2).await.unwrap();
        assert!(band.is_none());
    }

    {
        let result = Mutation::delete_all_bands(db).await.unwrap();

        assert_eq!(result.rows_affected, 1);
    }
}