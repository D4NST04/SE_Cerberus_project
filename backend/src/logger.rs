use crate::models::CreateErrorLogRequest;
use chrono::Local;
use csv::WriterBuilder;
use std::error::Error;
use std::fs::OpenOptions;

const LOG_FILE_PATH: &str = "error_logs.csv";

pub fn log_error(data: CreateErrorLogRequest) -> Result<(), Box<dyn Error>> {
    let file = OpenOptions::new()
        .create(true)
        .append(true)
        .open(LOG_FILE_PATH)?;

    let mut wtr = WriterBuilder::new()
        .delimiter(b';')
        .has_headers(false)
        .from_writer(file);

    let now = Local::now();
    let date = now.format("%Y-%m-%d").to_string();
    let time = now.format("%H:%M:%S").to_string();

    wtr.write_record(&[
        date,
        time,
        data.employee,
        data.error_description,
        data.image.unwrap_or_default(),
    ])?;

    wtr.flush()?;
    Ok(())
}
