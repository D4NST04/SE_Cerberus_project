CREATE TABLE IF NOT EXISTS employees (
  id_person INT PRIMARY KEY,

  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,

  role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'employee')),

  date_of_termination DATE,

  face_embedded BYTEA,

  photo_path VARCHAR(255),

  account_number VARCHAR(50), -- Daniel, mam to robić czy nie?

  login VARCHAR(50) UNIQUE,
  password_hash VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS hours (
  id_record SERIAL PRIMARY KEY,

  id_employee INT NOT NULL REFERENCES employees(id_person) ON DELETE CASCADE,

  time_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  time_end TIMESTAMP
);

-- idk, ppl recommend to do this
-- CREATE INDEX index_hours_employee ON hours(id_employee)
-- CREATE INDEX index_emploee_login ON employee(login)
