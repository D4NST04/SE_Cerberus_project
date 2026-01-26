use crate::logger;
use crate::models::{
    AccessAckRequest, AccessAckResponse, AccessLog, CheckQrRequest, CheckQrResponse,
    CreateEmployeeRequest, CreateErrorLogRequest, Employee, UpdateEmployeeRequest,
    VerifyFaceResponse, WorkHours,
};
use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Responder};
use futures::{StreamExt, TryStreamExt};
use sqlx::{PgPool, Row};
use std::fs;
use std::io::Write;
use uuid::Uuid;

use crate::image_processor;

pub struct AppState {
    pub db: PgPool,
}

pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("Server is running")
}

pub async fn get_access_logs(data: web::Data<AppState>) -> impl Responder {
    let query =
        "SELECT id_log, id_employee, direction, timestamp FROM access_logs ORDER BY timestamp DESC";

    match sqlx::query_as::<_, AccessLog>(query)
        .fetch_all(&data.db)
        .await
    {
        Ok(logs) => HttpResponse::Ok().json(logs),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

pub async fn upload_employee_photo(
    data: web::Data<AppState>,
    path: web::Path<i32>,
    mut payload: Multipart,
) -> impl Responder {
    let id_person = path.into_inner();
    let mut photo_path: Option<String> = None;

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or("");

        if field_name == "photo" {
            let filename = format!("uploads/employees/{}.jpg", id_person);
            // Ensure directory exists
            if let Err(e) = fs::create_dir_all("uploads/employees") {
                eprintln!("Failed to create directory: {}", e);
                return HttpResponse::InternalServerError().body("Server error");
            }

            let mut f = match fs::File::create(&filename) {
                Ok(file) => file,
                Err(e) => {
                    eprintln!("Failed to create file: {}", e);
                    return HttpResponse::InternalServerError().body("Server error");
                }
            };

            while let Some(chunk) = field.next().await {
                if let Err(e) = f.write_all(&chunk.unwrap_or_default()) {
                    eprintln!("Failed to write file: {}", e);
                    return HttpResponse::InternalServerError().body("Server error");
                }
            }
            photo_path = Some(filename);
        }
    }

    if let Some(p_path) = photo_path {
        if !std::path::Path::new("arcface.onnx").exists() {
            eprintln!("Model arcface.onnx not found.");
            return HttpResponse::InternalServerError().body("Model not found");
        }

        match image_processor::face_embedding(&p_path, "arcface.onnx") {
            Ok(embedding) => {
                let mut bytes: Vec<u8> = Vec::with_capacity(embedding.len() * 4);
                for float in embedding {
                    bytes.extend_from_slice(&float.to_le_bytes());
                }

                let query =
                    "UPDATE employees SET face_embedded = $1, photo_path = $2 WHERE id_person = $3";
                match sqlx::query(query)
                    .bind(bytes)
                    .bind(&p_path)
                    .bind(id_person)
                    .execute(&data.db)
                    .await
                {
                    Ok(_) => HttpResponse::Ok().body("Photo uploaded and processed"),
                    Err(e) => {
                        eprintln!("Database error: {}", e);
                        HttpResponse::InternalServerError().body("Database error")
                    }
                }
            }
            Err(e) => {
                eprintln!("Face embedding failed: {}", e);
                HttpResponse::InternalServerError().body("Face processing error")
            }
        }
    } else {
        HttpResponse::BadRequest().body("Missing photo field")
    }
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

pub async fn check_qr(data: web::Data<AppState>, req: web::Json<CheckQrRequest>) -> impl Responder {
    let query = "SELECT id_person, first_name, last_name FROM employees WHERE id_person = $1";

    match sqlx::query(query)
        .bind(req.employee_id)
        .fetch_optional(&data.db)
        .await
    {
        Ok(Some(row)) => {
            let first_name: String = row.get("first_name");
            let last_name: String = row.get("last_name");
            HttpResponse::Ok().json(CheckQrResponse {
                exists: true,
                employee_id: req.employee_id,
                first_name: Some(first_name),
                last_name: Some(last_name),
            })
        }
        Ok(None) => HttpResponse::Ok().json(CheckQrResponse {
            exists: false,
            employee_id: req.employee_id,
            first_name: None,
            last_name: None,
        }),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().json(serde_json::json!({"error": "database_error"}))
        }
    }
}

pub async fn verify_face(data: web::Data<AppState>, mut payload: Multipart) -> impl Responder {
    let mut employee_id: Option<i32> = None;
    let mut direction: Option<String> = None;
    let mut photo_path: Option<String> = None;

    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        let field_name = content_disposition.get_name().unwrap_or("");

        if field_name == "employee_id" {
            let mut value_bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                value_bytes.extend_from_slice(&chunk.unwrap_or_default());
            }
            let value_str = String::from_utf8_lossy(&value_bytes);
            if let Ok(id) = value_str.trim().parse::<i32>() {
                employee_id = Some(id);
            }
        } else if field_name == "direction" {
            let mut value_bytes = Vec::new();
            while let Some(chunk) = field.next().await {
                value_bytes.extend_from_slice(&chunk.unwrap_or_default());
            }
            direction = Some(String::from_utf8_lossy(&value_bytes).trim().to_string());
        } else if field_name == "photo" {
            let filename = format!("/tmp/{}.jpg", Uuid::new_v4());
            let mut f = fs::File::create(&filename).unwrap(); // Handle error properly in prod
            while let Some(chunk) = field.next().await {
                f.write_all(&chunk.unwrap_or_default()).unwrap();
            }
            photo_path = Some(filename);
        }
    }

    if employee_id.is_none() || direction.is_none() || photo_path.is_none() {
        return HttpResponse::BadRequest().body("Missing fields");
    }

    let emp_id = employee_id.unwrap();
    let _dir = direction.unwrap(); // unused for now in verification logic but needed for logic checks if needed
    let p_path = photo_path.unwrap();

    if !std::path::Path::new("arcface.onnx").exists() {
        eprintln!("Model arcface.onnx not found. Returning MOCK response.");
        let _ = fs::remove_file(p_path); // Cleanup
        return HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: true,
            reason: "mock_mode_no_model".to_string(),
        });
    }

    let query = "SELECT face_embedded FROM employees WHERE id_person = $1";
    let stored_embedding: Option<Vec<u8>> = match sqlx::query(query)
        .bind(emp_id)
        .fetch_optional(&data.db)
        .await
    {
        Ok(Some(row)) => row.get("face_embedded"),
        Ok(None) => {
            log_failed_attempt(emp_id, "employee_not_found", &p_path);
            return HttpResponse::Ok().json(VerifyFaceResponse {
                access_granted: false,
                reason: "employee_not_found".to_string(),
            });
        }
        Err(_) => {
            let _ = fs::remove_file(p_path);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "database_error"}));
        }
    };

    if stored_embedding.is_none() {
        log_failed_attempt(emp_id, "no_face_data_registered", &p_path);
        return HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: false,
            reason: "no_face_data_registered".to_string(),
        });
    }

    let new_embedding = match image_processor::face_embedding(&p_path, "arcface.onnx") {
        Ok(emb) => emb,
        Err(e) => {
            eprintln!("Face embedding failed: {}", e);
            let _ = fs::remove_file(p_path);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "face_processing_error"}));
        }
    };

    let stored_bytes = stored_embedding.unwrap();
    let stored_floats: Vec<f32> = stored_bytes
        .chunks_exact(4)
        .map(|chunk| {
            let b: [u8; 4] = chunk.try_into().unwrap();
            f32::from_le_bytes(b) // Assuming Little Endian
        })
        .collect();

    let similarity = cosine_similarity(&new_embedding, &stored_floats);
    let threshold = 0.5; // Tunable

    if similarity > threshold {
        let _ = fs::remove_file(p_path);
        HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: true,
            reason: "face_matched".to_string(),
        })
    } else {
        log_failed_attempt(emp_id, "face_mismatched", &p_path);
        HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: false,
            reason: "face_mismatched".to_string(),
        })
    }
}

fn cosine_similarity(a: &[f32], b: &[f32]) -> f32 {
    let dot_product: f32 = a.iter().zip(b).map(|(x, y)| x * y).sum();
    let magnitude_a: f32 = a.iter().map(|x| x * x).sum::<f32>().sqrt();
    let magnitude_b: f32 = b.iter().map(|x| x * x).sum::<f32>().sqrt();
    if magnitude_a == 0.0 || magnitude_b == 0.0 {
        return 0.0;
    }
    dot_product / (magnitude_a * magnitude_b)
}

pub async fn access_ack(
    data: web::Data<AppState>,
    req: web::Json<AccessAckRequest>,
) -> impl Responder {
    let query = "INSERT INTO access_logs (id_employee, direction, timestamp) VALUES ($1, $2, $3)";

    match sqlx::query(query)
        .bind(req.employee_id)
        .bind(&req.direction)
        .bind(req.timestamp)
        .execute(&data.db)
        .await
    {
        Ok(_) => HttpResponse::Ok().json(AccessAckResponse {
            status: "acknowledged".to_string(),
            reason: None,
        }),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "access_log_unavailable"}))
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

pub async fn delete_employee(data: web::Data<AppState>, path: web::Path<i32>) -> impl Responder {
    let id_person = path.into_inner();
    let query = "DELETE FROM employees WHERE id_person = $1";

    match sqlx::query(query).bind(id_person).execute(&data.db).await {
        Ok(result) => {
            if result.rows_affected() > 0 {
                HttpResponse::Ok().body("Employee deleted")
            } else {
                HttpResponse::NotFound().body("Employee not found")
            }
        }
        Err(e) => {
            eprintln!("Failed to delete employee: {}", e);
            HttpResponse::InternalServerError().body("Failed to delete employee")
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

pub async fn get_work_hours(data: web::Data<AppState>) -> impl Responder {
    let query =
        "SELECT id_record, id_employee, time_start, time_end FROM hours ORDER BY time_start DESC";

    match sqlx::query_as::<_, WorkHours>(query)
        .fetch_all(&data.db)
        .await
    {
        Ok(hours) => HttpResponse::Ok().json(hours),
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

fn log_failed_attempt(employee_id: i32, reason: &str, temp_photo_path: &str) {
    if let Err(e) = fs::create_dir_all("uploads/failed_attempts") {
         eprintln!("Failed to create directory: {}", e);
         return;
    }

    let filename = std::path::Path::new(temp_photo_path)
        .file_name()
        .unwrap_or_default()
        .to_str()
        .unwrap_or_default();
    let new_path = format!("uploads/failed_attempts/{}", filename);

    if let Err(e) = fs::rename(temp_photo_path, &new_path) {
        // Fallback copy
        if let Err(e) = fs::copy(temp_photo_path, &new_path) {
             eprintln!("Failed to copy failed attempt photo: {}", e);
             return;
        }
        let _ = fs::remove_file(temp_photo_path);
    }

    let req = CreateErrorLogRequest {
        employee: employee_id.to_string(),
        error_description: reason.to_string(),
        image: Some(new_path),
    };

    if let Err(e) = logger::log_error(req) {
        eprintln!("Failed to log error: {}", e);
    }
}