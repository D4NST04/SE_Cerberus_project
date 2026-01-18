use crate::logger;
use crate::models::{
    CreateEmployeeRequest, CreateErrorLogRequest, Employee, UpdateEmployeeRequest,
};
use actix_web::{web, HttpResponse, Responder};
use sqlx::{PgPool, Row};

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

pub async fn create_employee(
    data: web::Data<AppState>,
    req: web::Json<CreateEmployeeRequest>,
) -> impl Responder {
    let query = "INSERT INTO employees (id_person, first_name, last_name, role, login, date_of_termination) 
                 VALUES ((SELECT COALESCE(MAX(id_person), 0) + 1 FROM employees), $1, $2, $3, $4, $5) 
                 RETURNING id_person";

    match sqlx::query(query)
        .bind(&req.first_name)
        .bind(&req.last_name)
        .bind(&req.role)
        .bind(&req.login)
        .bind(req.date_of_termination)
        .fetch_one(&data.db)
        .await
    {
        Ok(row) => {
            let id: i32 = row.get("id_person");
            HttpResponse::Ok().json(serde_json::json!({"status": "success", "id_person": id}))
        }
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Failed to create employee")
        }
    }
}

pub async fn update_employee(
    data: web::Data<AppState>,
    path: web::Path<i32>,
    req: web::Json<UpdateEmployeeRequest>,
) -> impl Responder {
    let id_person = path.into_inner();
    let mut query_builder = sqlx::QueryBuilder::new("UPDATE employees SET ");
    let mut separated = query_builder.separated(", ");
    let mut has_updates = false;

    if let Some(first_name) = &req.first_name {
        separated.push("first_name = ");
        separated.push_bind_unseparated(first_name);
        has_updates = true;
    }
    if let Some(last_name) = &req.last_name {
        separated.push("last_name = ");
        separated.push_bind_unseparated(last_name);
        has_updates = true;
    }
    if let Some(role) = &req.role {
        separated.push("role = ");
        separated.push_bind_unseparated(role);
        has_updates = true;
    }
    if let Some(login) = &req.login {
        separated.push("login = ");
        separated.push_bind_unseparated(login);
        has_updates = true;
    }
    if let Some(date_of_termination) = req.date_of_termination {
        separated.push("date_of_termination = ");
        separated.push_bind_unseparated(date_of_termination);
        has_updates = true;
    }
    if let Some(password) = &req.password {
        separated.push("password_hash = ");
        separated.push_bind_unseparated(password);
        has_updates = true;
    }

    if !has_updates {
        return HttpResponse::BadRequest().body("No fields to update");
    }

    query_builder.push(" WHERE id_person = ");
    query_builder.push_bind(id_person);

    let query = query_builder.build();

    match query.execute(&data.db).await {
        Ok(_) => HttpResponse::Ok().body("Employee updated"),
        Err(e) => {
            eprintln!("Failed to update employee: {}", e);
            HttpResponse::InternalServerError().body("Failed to update employee")
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
