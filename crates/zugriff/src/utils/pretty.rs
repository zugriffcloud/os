use std::time::Duration;

use indicatif::{ProgressBar, ProgressStyle};

#[derive(strum_macros::Display)]
pub enum Status {
  #[strum(serialize = "☁️")]
  INSTALLED,
  #[strum(serialize = "🗑️")]
  REMOVED,
  #[strum(serialize = "⚠️")]
  WARNING,
  #[strum(serialize = "🌍")]
  ENVIRONMENT,
  #[strum(serialize = "🔗")]
  LINK,
}

pub static SPINNER: [&'static str; 4] = [
  "-", "\\", "|", "/",
];

pub fn default_spinner() -> ProgressBar {
  let progress = ProgressBar::new_spinner();
  progress.enable_steady_tick(Duration::from_millis(120));
  progress.set_style(
    ProgressStyle::with_template("{spinner} {msg}")
      .unwrap()
      .tick_strings(&SPINNER),
  );

  progress
}

pub fn log(status: Option<Status>, message: &str) {
  match status {
    Some(Status::WARNING) => eprintln!("{}", format(status, message)),
    _ => println!("{}", format(status, message))
  }
}

pub fn format(status: Option<Status>, message: &str) -> String {
  match status {
    Some(status) => {
      let status = match status {
        Status::ENVIRONMENT | Status::LINK => {
          format!("{} ", status.to_string())
        }
        Status::INSTALLED | Status::REMOVED | Status::WARNING => {
          format!("{}  ", status.to_string())
        }
      };
      format!("{}{}", status, message)
    }
    None => {
      format!("►  {}", message)
    }
  }
}
