mod image_processor;
mod logger;
mod models;
mod routes;

use actix_cors::Cors;
use actix_web::{web, App, HttpServer};
use dotenvy::dotenv;
use sqlx::postgres::PgPoolOptions;
use std::env;

#[tokio::main]
async fn main() -> std::io::Result<()> {
    dotenv().ok();
    env_logger::init();

    let database_url = env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:root@db:5432/postgres".to_string());

    println!("Connecting to database: {}", database_url);

    let pool = PgPoolOptions::new()
        .max_connections(5)
        .connect(&database_url)
        .await
        .expect("Failed to create pool.");

    println!("Server starting at http://0.0.0.0:8080");

    HttpServer::new(move || {
        let cors = Cors::permissive();

        App::new()
            .wrap(cors)
            .app_data(web::Data::new(routes::AppState { db: pool.clone() }))
            .route("/health", web::get().to(routes::health_check))
            .service(
                web::scope("/api")
                    .route("/log_error", web::post().to(routes::report_error))
                    .route("/employees", web::get().to(routes::get_employees))
                    .route("/employees", web::post().to(routes::create_employee))
                    .route("/employees/{id}", web::patch().to(routes::update_employee))
                    .route("/employees/{id}", web::delete().to(routes::delete_employee))
                    .route("/employees/{id}/photo", web::post().to(routes::upload_employee_photo))
                    .route("/hours", web::get().to(routes::get_work_hours))
                    .route("/hours/start", web::post().to(routes::start_shift))
                    .route("/hours/end", web::post().to(routes::end_shift))
                    .route("/employee/check_qr", web::post().to(routes::check_qr))
                    .route("/face/verify", web::post().to(routes::verify_face))
                    .route("/access/ack", web::post().to(routes::access_ack))
                    .route("/access_logs", web::get().to(routes::get_access_logs)),
            )
    })
    .bind(("0.0.0.0", 8080))?
    .run()
    .await
}

