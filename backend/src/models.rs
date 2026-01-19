use chrono::{NaiveDate, NaiveDateTime};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct Employee {
    pub id_person: i32,
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub date_of_termination: Option<NaiveDate>,
    pub photo_path: Option<String>,
    pub account_number: Option<String>,
    pub login: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, FromRow)]
pub struct WorkHours {
    pub id_record: i32,
    pub id_employee: i32,
    pub time_start: NaiveDateTime,
    pub time_end: Option<NaiveDateTime>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ErrorLogEntry {
    pub date: String,
    pub time: String,
    pub employee: String,
    pub error_description: String,
    pub image_path: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateErrorLogRequest {
    pub employee: String,
    pub error_description: String,
    pub image: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CreateEmployeeRequest {
    pub first_name: String,
    pub last_name: String,
    pub role: String,
    pub login: Option<String>,
    pub date_of_termination: Option<NaiveDate>,
}

#[derive(Debug, Deserialize)]
pub struct UpdateEmployeeRequest {
    pub first_name: Option<String>,
    pub last_name: Option<String>,
    pub role: Option<String>,
    pub login: Option<String>,
    pub date_of_termination: Option<NaiveDate>,
    pub password: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct CheckQrRequest {
    pub employee_id: i32,
    pub direction: String,
}

#[derive(Debug, Serialize)]
pub struct CheckQrResponse {
    pub exists: bool,
    pub employee_id: i32,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub first_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_name: Option<String>,
}

#[derive(Debug, Serialize)]
pub struct VerifyFaceResponse {
    pub access_granted: bool,
    pub reason: String,
}

#[derive(Debug, Deserialize)]
pub struct AccessAckRequest {
    pub employee_id: i32,
    pub direction: String,
    pub timestamp: NaiveDateTime,
}

#[derive(Debug, Serialize)]
pub struct AccessAckResponse {
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}
