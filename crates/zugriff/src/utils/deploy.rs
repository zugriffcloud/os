use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize, Eq, PartialEq)]
pub struct Result {
  pub deployment: i64,
}

#[derive(Debug, Clone, Copy, Deserialize, Serialize, strum_macros::Display, PartialEq)]
pub enum State {
  SIZE,
  SECURITY,
  STRUCTURE,
  UPLOAD,
  DNS,
  ERROR,
}

#[derive(Debug, Clone, Deserialize, Serialize, PartialEq)]
pub enum Message {
  STATE(State),
  DOMAINS(Vec<String>),
  ERROR(String),
  SUCCESS,
}
