use crate::models::{AccessLog, CreateEmployeeRequest, Employee, UpdateEmployeeRequest, WorkHours};
use async_trait::async_trait;
use mockall::automock;
use sqlx::{PgPool, Row};

// neeed more beer

#[automock]
#[async_trait]
pub trait DatabaseRepository: Send + Sync {
    async fn get_access_logs(&self) -> Result<Vec<AccessLog>, sqlx::Error>;
    async fn update_employee_photo(
        &self,
        id: i32,
        embedding: Vec<u8>,
        photo_path: String,
    ) -> Result<(), sqlx::Error>;
    async fn get_employee_by_id(
        &self,
        id: i32,
    ) -> Result<Option<(i32, String, String)>, sqlx::Error>;
    async fn get_employee_embedding(&self, id: i32) -> Result<Option<Vec<u8>>, sqlx::Error>;
    async fn add_access_log(
        &self,
        id: i32,
        direction: String,
        timestamp: chrono::NaiveDateTime,
    ) -> Result<(), sqlx::Error>;
    async fn create_employee(&self, req: CreateEmployeeRequest) -> Result<i32, sqlx::Error>;
    async fn update_employee(&self, id: i32, req: UpdateEmployeeRequest)
        -> Result<(), sqlx::Error>;
    async fn delete_employee(&self, id: i32) -> Result<u64, sqlx::Error>;
    async fn get_employees(&self) -> Result<Vec<Employee>, sqlx::Error>;
    async fn get_work_hours(&self) -> Result<Vec<WorkHours>, sqlx::Error>;
    async fn start_shift(&self, id: i32) -> Result<(), sqlx::Error>;
    async fn end_shift(&self, id: i32) -> Result<u64, sqlx::Error>;
}

pub struct PostgresRepository {
    pool: PgPool,
}

impl PostgresRepository {
    pub fn new(pool: PgPool) -> Self {
        Self { pool }
    }
}

#[async_trait]
impl DatabaseRepository for PostgresRepository {
    async fn get_access_logs(&self) -> Result<Vec<AccessLog>, sqlx::Error> {
        let query =
            "SELECT id_log, id_employee, direction, timestamp FROM access_logs ORDER BY timestamp DESC";
        sqlx::query_as::<_, AccessLog>(query)
            .fetch_all(&self.pool)
            .await
    }

    async fn update_employee_photo(
        &self,
        id: i32,
        embedding: Vec<u8>,
        photo_path: String,
    ) -> Result<(), sqlx::Error> {
        let query = "UPDATE employees SET face_embedded = $1, photo_path = $2 WHERE id_person = $3";
        sqlx::query(query)
            .bind(embedding)
            .bind(photo_path)
            .bind(id)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    async fn get_employee_by_id(
        &self,
        id: i32,
    ) -> Result<Option<(i32, String, String)>, sqlx::Error> {
        let query = "SELECT id_person, first_name, last_name FROM employees WHERE id_person = $1";
        let row = sqlx::query(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(r) => Ok(Some((
                r.get("id_person"),
                r.get("first_name"),
                r.get("last_name"),
            ))),
            None => Ok(None),
        }
    }

    async fn get_employee_embedding(&self, id: i32) -> Result<Option<Vec<u8>>, sqlx::Error> {
        let query = "SELECT face_embedded FROM employees WHERE id_person = $1";
        let row = sqlx::query(query)
            .bind(id)
            .fetch_optional(&self.pool)
            .await?;

        match row {
            Some(r) => Ok(r.get("face_embedded")),
            None => Ok(None),
        }
    }

    async fn add_access_log(
        &self,
        id: i32,
        direction: String,
        timestamp: chrono::NaiveDateTime,
    ) -> Result<(), sqlx::Error> {
        let query =
            "INSERT INTO access_logs (id_employee, direction, timestamp) VALUES ($1, $2, $3)";
        sqlx::query(query)
            .bind(id)
            .bind(direction)
            .bind(timestamp)
            .execute(&self.pool)
            .await
            .map(|_| ())
    }

    async fn create_employee(&self, req: CreateEmployeeRequest) -> Result<i32, sqlx::Error> {
        let query = "INSERT INTO employees (id_person, first_name, last_name, role, login, date_of_termination) 
                 VALUES ((SELECT COALESCE(MAX(id_person), 0) + 1 FROM employees), $1, $2, $3, $4, $5) 
                 RETURNING id_person";

        let row = sqlx::query(query)
            .bind(&req.first_name)
            .bind(&req.last_name)
            .bind(&req.role)
            .bind(&req.login)
            .bind(req.date_of_termination)
            .fetch_one(&self.pool)
            .await?;

        Ok(row.get("id_person"))
    }

    async fn update_employee(
        &self,
        id: i32,
        req: UpdateEmployeeRequest,
    ) -> Result<(), sqlx::Error> {
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
            // Nothing to update, technically not an error but avoiding query exec
            return Ok(());
        }

        query_builder.push(" WHERE id_person = ");
        query_builder.push_bind(id);

        let query = query_builder.build();
        query.execute(&self.pool).await.map(|_| ())
    }

    async fn delete_employee(&self, id: i32) -> Result<u64, sqlx::Error> {
        let query = "DELETE FROM employees WHERE id_person = $1";
        let result = sqlx::query(query).bind(id).execute(&self.pool).await?;
        Ok(result.rows_affected())
    }

    async fn get_employees(&self) -> Result<Vec<Employee>, sqlx::Error> {
        let query = "SELECT id_person, first_name, last_name, role, date_of_termination, photo_path, account_number, login FROM employees";
        sqlx::query_as::<_, Employee>(query)
            .fetch_all(&self.pool)
            .await
    }

    async fn get_work_hours(&self) -> Result<Vec<WorkHours>, sqlx::Error> {
        let query =
            "SELECT id_record, id_employee, time_start, time_end FROM hours ORDER BY time_start DESC";
        sqlx::query_as::<_, WorkHours>(query)
            .fetch_all(&self.pool)
            .await
    }

    async fn start_shift(&self, id: i32) -> Result<(), sqlx::Error> {
        let query = "INSERT INTO hours (id_employee, time_start) VALUES ($1, CURRENT_TIMESTAMP) RETURNING id_record";
        sqlx::query(query)
            .bind(id)
            .fetch_one(&self.pool)
            .await
            .map(|_| ())
    }

    async fn end_shift(&self, id: i32) -> Result<u64, sqlx::Error> {
        let query = "UPDATE hours SET time_end = CURRENT_TIMESTAMP WHERE id_record = (
            SELECT id_record FROM hours WHERE id_employee = $1 AND time_end IS NULL ORDER BY time_start DESC LIMIT 1
        )";
        let result = sqlx::query(query).bind(id).execute(&self.pool).await?;
        Ok(result.rows_affected())
    }
}
