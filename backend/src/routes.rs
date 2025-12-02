use crate::logger;
use crate::models::{CreateErrorLogRequest, Employee};
use actix_web::{web, HttpResponse, Responder};
use sqlx::PgPool;

pub struct AppState {
    pub db: PgPool,
}

pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("Server is running")
}

pub async fn report_error(req: web::Json<CreateErrorLogRequest>) -> impl Responder {
    match logger::log_error(req.into_inner()) {
        Ok(_) => HttpResponse::Ok().body("Error logged"),
        Err(e) => {
            eprintln!("Failed to log error: {}", e);
            HttpResponse::InternalServerError().body("Failed to log error")
        }
    }
}

pub async fn get_employees(data: web::Data<AppState>) -> impl Responder {
    let query = "SELECT id_person, first_name, last_name, role, date_of_termination, photo_path, account_number, login FROM employees";

    match sqlx::query_as::<_, Employee>(query)
        .fetch_all(&data.db)
        .await
    {
        Ok(employees) => HttpResponse::Ok().json(employees),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

#[derive(serde::Deserialize)]
pub struct EmployeeIdRequest {
    pub id_employee: i32,
}

pub async fn start_shift(
    data: web::Data<AppState>,
    req: web::Json<EmployeeIdRequest>,
) -> impl Responder {
    let query = "INSERT INTO hours (id_employee, time_start) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id_record";

    match sqlx::query(query)
        .bind(req.id_employee)
        .fetch_one(&data.db)
        .await
    {
        Ok(_) => HttpResponse::Ok().body("Shift started"),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Failed to start shift")
        }
    }
}

pub async fn end_shift(
    data: web::Data<AppState>,
    req: web::Json<EmployeeIdRequest>,
) -> impl Responder {
    let query = "UPDATE hours SET time_end = CURRENT_TIMESTAMP WHERE id_record = (
        SELECT id_record FROM hours WHERE id_employee = $1 AND time_end IS NULL ORDER BY time_start DESC LIMIT 1
    )";

    match sqlx::query(query)
        .bind(req.id_employee)
        .execute(&data.db)
        .await
    {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::Ok().body("Shift ended")
            } else {
                HttpResponse::BadRequest().body("No active shift found")
            }
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Failed to end shift")
        }
    }
}
