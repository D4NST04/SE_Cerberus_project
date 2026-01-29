use crate::db::DatabaseRepository;
use crate::logger;
use crate::models::{
    AccessAckRequest, AccessAckResponse, CheckQrRequest, CheckQrResponse, CreateEmployeeRequest,
    CreateErrorLogRequest, EmployeeIdRequest, UpdateEmployeeRequest, VerifyFaceResponse,
};
use actix_multipart::Multipart;
use actix_web::{web, HttpResponse, Responder};
use futures::{StreamExt, TryStreamExt};
use std::fs;
use std::io::Write;
use uuid::Uuid;

use crate::image_processor;

pub struct AppState {
    pub db: Box<dyn DatabaseRepository>,
}

pub async fn health_check() -> impl Responder {
    HttpResponse::Ok().body("Server is running")
}

pub async fn get_access_logs(data: web::Data<AppState>) -> impl Responder {
    match data.db.get_access_logs().await {
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
        if !std::path::Path::new("arcface.onnx").exists() && std::env::var("MOCK_MODEL").is_err() {
            eprintln!("Model arcface.onnx not found.");
            return HttpResponse::InternalServerError().body("Model not found");
        }

        if std::env::var("MOCK_MODEL").is_ok() {
            return match data
                .db
                .update_employee_photo(id_person, vec![], p_path)
                .await
            {
                Ok(_) => HttpResponse::Ok().body("Photo uploaded and processed"),
                Err(e) => {
                    eprintln!("Database error: {}", e);
                    HttpResponse::InternalServerError().body("Database error")
                }
            };
        }

        match image_processor::face_embedding(&p_path, "arcface.onnx") {
            Ok(embedding) => {
                let mut bytes: Vec<u8> = Vec::with_capacity(embedding.len() * 4);
                for float in embedding {
                    bytes.extend_from_slice(&float.to_le_bytes());
                }

                match data
                    .db
                    .update_employee_photo(id_person, bytes, p_path)
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
    match data.db.get_employee_by_id(req.employee_id).await {
        Ok(Some((_, first_name, last_name))) => HttpResponse::Ok().json(CheckQrResponse {
            exists: true,
            employee_id: req.employee_id,
            first_name: Some(first_name),
            last_name: Some(last_name),
        }),
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
            let mut f = match fs::File::create(&filename) {
                Ok(f) => f,
                Err(_) => return HttpResponse::InternalServerError().body("Server error"),
            };
            while let Some(chunk) = field.next().await {
                let _ = f.write_all(&chunk.unwrap_or_default());
            }
            photo_path = Some(filename);
        }
    }

    if employee_id.is_none() || direction.is_none() || photo_path.is_none() {
        return HttpResponse::BadRequest().body("Missing fields");
    }

    let emp_id = employee_id.unwrap();
    let _dir = direction.unwrap();
    let p_path = photo_path.unwrap();

    if !std::path::Path::new("arcface.onnx").exists() || std::env::var("MOCK_MODEL").is_ok() {
        eprintln!("Model arcface.onnx not found or MOCK_MODEL set. Returning MOCK response.");
        let _ = fs::remove_file(p_path);
        return HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: true,
            reason: "mock_mode_no_model".to_string(),
            similarity: None,
        });
    }

    let stored_embedding = match data.db.get_employee_embedding(emp_id).await {
        Ok(Some(emb)) => emb,
        Ok(None) => {
            log_failed_attempt(emp_id, "employee_not_found", &p_path);
            return HttpResponse::Ok().json(VerifyFaceResponse {
                access_granted: false,
                reason: "employee_not_found".to_string(),
                similarity: None,
            });
        }
        Err(_) => {
            let _ = fs::remove_file(p_path);
            return HttpResponse::InternalServerError()
                .json(serde_json::json!({"error": "database_error"}));
        }
    };

    if stored_embedding.is_empty() {
        log_failed_attempt(emp_id, "no_face_data_registered", &p_path);
        return HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: false,
            reason: "no_face_data_registered".to_string(),
            similarity: None,
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

    let stored_floats: Vec<f32> = stored_embedding
        .chunks_exact(4)
        .map(|chunk| {
            let b: [u8; 4] = chunk.try_into().unwrap();
            f32::from_le_bytes(b)
        })
        .collect();

    let similarity = cosine_similarity(&new_embedding, &stored_floats);
    let threshold = 0.95;

    println!("Similarity: {}, Threshold: {}", similarity, threshold);

    if similarity > threshold {
        let _ = fs::remove_file(p_path);
        HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: true,
            reason: "face_matched".to_string(),
            similarity: Some(similarity),
        })
    } else {
        log_failed_attempt(emp_id, "face_mismatched", &p_path);
        HttpResponse::Ok().json(VerifyFaceResponse {
            access_granted: false,
            reason: "face_mismatched".to_string(),
            similarity: Some(similarity),
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
    match data
        .db
        .add_access_log(req.employee_id, req.direction.clone(), req.timestamp)
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
    match data.db.create_employee(req.into_inner()).await {
        Ok(id) => {
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
    match data
        .db
        .update_employee(path.into_inner(), req.into_inner())
        .await
    {
        Ok(_) => HttpResponse::Ok().body("Employee updated"),
        Err(e) => {
            eprintln!("Failed to update employee: {}", e);
            HttpResponse::InternalServerError().body("Failed to update employee")
        }
    }
}

pub async fn delete_employee(data: web::Data<AppState>, path: web::Path<i32>) -> impl Responder {
    match data.db.delete_employee(path.into_inner()).await {
        Ok(count) => {
            if count > 0 {
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
    match data.db.get_employees().await {
        Ok(employees) => HttpResponse::Ok().json(employees),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

pub async fn get_work_hours(data: web::Data<AppState>) -> impl Responder {
    match data.db.get_work_hours().await {
        Ok(hours) => HttpResponse::Ok().json(hours),
        Err(e) => {
            eprintln!("Database error: {}", e);
            HttpResponse::InternalServerError().body("Database error")
        }
    }
}

pub async fn start_shift(
    data: web::Data<AppState>,
    req: web::Json<EmployeeIdRequest>,
) -> impl Responder {
    match data.db.start_shift(req.id_employee).await {
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
    match data.db.end_shift(req.id_employee).await {
        Ok(count) => {
            if count > 0 {
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

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::MockDatabaseRepository;
    use actix_web::{test, App};

    #[actix_web::test]
    async fn test_get_employees() {
        let mut mock_repo = MockDatabaseRepository::new();
        mock_repo.expect_get_employees().returning(|| Ok(vec![])); // Return empty list

        let app_data = web::Data::new(AppState {
            db: Box::new(mock_repo),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_data)
                .route("/employees", web::get().to(get_employees)),
        )
        .await;

        let req = test::TestRequest::get().uri("/employees").to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
    }

    #[actix_web::test]
    async fn test_check_qr_found() {
        let mut mock_repo = MockDatabaseRepository::new();
        mock_repo
            .expect_get_employee_by_id()
            .with(mockall::predicate::eq(123))
            .returning(|_| Ok(Some((123, "John".to_string(), "Doe".to_string()))));

        let app_data = web::Data::new(AppState {
            db: Box::new(mock_repo),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_data)
                .route("/employee/check_qr", web::post().to(check_qr)),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/employee/check_qr")
            .set_json(CheckQrRequest {
                employee_id: 123,
                direction: "IN".to_string(),
            })
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        let body: CheckQrResponse = test::read_body_json(resp).await;
        assert!(body.exists);
        assert_eq!(body.first_name, Some("John".to_string()));
    }

    #[actix_web::test]
    async fn test_check_qr_not_found() {
        let mut mock_repo = MockDatabaseRepository::new();
        mock_repo
            .expect_get_employee_by_id()
            .with(mockall::predicate::eq(999))
            .returning(|_| Ok(None));

        let app_data = web::Data::new(AppState {
            db: Box::new(mock_repo),
        });
        let app = test::init_service(
            App::new()
                .app_data(app_data)
                .route("/employee/check_qr", web::post().to(check_qr)),
        )
        .await;

        let req = test::TestRequest::post()
            .uri("/employee/check_qr")
            .set_json(CheckQrRequest {
                employee_id: 999,
                direction: "IN".to_string(),
            })
            .to_request();
        let resp = test::call_service(&app, req).await;

        assert!(resp.status().is_success());
        let body: CheckQrResponse = test::read_body_json(resp).await;
        assert!(!body.exists);
    }
}
