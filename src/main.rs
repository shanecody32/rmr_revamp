use async_graphql::{
    dynamic::Schema,
    http::GraphiQLSource,
};
use async_graphql_axum::{GraphQLRequest, GraphQLResponse};
use axum::{
    extract::State,
    response::{self, IntoResponse},
    routing::get,
    Router,
};
use dotenv::dotenv;
use sea_orm::Database;
use seaography::{async_graphql, lazy_static::lazy_static};
use std::env;
use tokio::net::TcpListener;

lazy_static! {
    static ref URL: String = env::var("URL").unwrap_or("localhost:8000".into());
    static ref ENDPOINT: String = env::var("ENDPOINT").unwrap_or("/".into());
    static ref DATABASE_URL: String =
        env::var("DATABASE_URL").expect("DATABASE_URL environment variable not set");
    static ref DEPTH_LIMIT: Option<usize> = env::var("DEPTH_LIMIT").map_or(None, |data| Some(
        data.parse().expect("DEPTH_LIMIT is not a number")
    ));
    static ref COMPLEXITY_LIMIT: Option<usize> = env::var("COMPLEXITY_LIMIT")
        .map_or(None, |data| {
            Some(data.parse().expect("COMPLEXITY_LIMIT is not a number"))
        });
}

async fn graphql_graphiql() -> impl IntoResponse {
    response::Html(GraphiQLSource::build().endpoint(&*ENDPOINT).finish())
}

async fn graphql_handler(State(schema): State<Schema>, req: GraphQLRequest) -> GraphQLResponse {
    let req = req.into_inner();
    schema.execute(req).await.into()
}

#[tokio::main]
async fn main() {
    dotenv().ok();
    tracing_subscriber::fmt()
        .with_max_level(tracing::Level::INFO)
        .with_test_writer()
        .init();
    let db = Database::connect(&*DATABASE_URL)
        .await
        .expect("Fail to initialize database connection");
    let build =  db.get_schema_registry("rmr_graphql::entities::*").sync(&db).await;
    println!("{:#?}", build);

    let schema = rmr_graphql::query_root::schema(db, *DEPTH_LIMIT, *COMPLEXITY_LIMIT).unwrap();
    let app = Router::new()
        .route(&*ENDPOINT, get(graphql_graphiql).post(graphql_handler))
        .with_state(schema);
    println!("Visit GraphiQL at http://{}", *URL);
    axum::serve(TcpListener::bind(&*URL).await.unwrap(), app)
        .await
        .unwrap();
}
