use garde::Validate;
use serde::{Deserialize, Serialize};
use std::{collections::HashMap, str::FromStr};
use strum_macros::{Display, EnumIter};

#[derive(Deserialize, Serialize, Validate, Debug, Clone)]
pub struct DynamicRoute {
  #[garde(skip)]
  pub path: String,
  #[garde(skip)]
  pub pattern: String,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone, PartialEq, Eq)]
pub struct Redirect {
  #[garde(range(min = 300, max = 399))]
  pub status: u16,
  #[garde(skip)]
  pub path: String,
  #[garde(skip)]
  pub location: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub enum Technology {
  Astro,
  SvelteKit,
  SolidStart,
  Nuxt,
  Nitro,
  #[serde(rename = "Next.js")]
  NextJs,
  #[serde(rename = "hono")]
  Hono,
  Remix,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct Meta {
  #[garde(skip)]
  pub technology: Option<Technology>,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct ConfigurationFile {
  #[garde(dive)]
  pub meta: Option<Meta>,
  #[garde(skip)]
  pub version: u64,
  #[garde(skip)]
  pub functions: Vec<DynamicRoute>,
  #[garde(skip)]
  pub puppets: HashMap<String, String>,
  #[garde(dive)]
  pub redirects: Vec<Redirect>,
  #[garde(skip)]
  pub assets: Vec<String>,
  #[garde(skip)]
  pub interceptors: Option<Vec<Interceptor>>,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct Interceptor {
  #[garde(skip)]
  pub method: Method,
  #[garde(skip)]
  pub status: u16,
  #[garde(skip)]
  pub path: String,
}

#[derive(Deserialize, Serialize, Debug, Clone, Copy, PartialEq, Eq, Hash, EnumIter, Display)]
pub enum Method {
  GET,
  POST,
  PUT,
  DELETE,
  HEAD,
  OPTIONS,
  CONNECT,
  PATCH,
  TRACE,
}

#[derive(Debug)]
pub enum MethodParseError {
  UNKNOWN,
}

impl Default for Method {
  fn default() -> Self {
    Self::GET
  }
}

impl FromStr for Method {
  type Err = MethodParseError;

  fn from_str(s: &str) -> Result<Self, Self::Err> {
    Ok(match s {
      "GET" => Self::GET,
      "POST" => Self::POST,
      "PUT" => Self::PUT,
      "DELETE" => Self::DELETE,
      "HEAD" => Self::HEAD,
      "OPTIONS" => Self::OPTIONS,
      "CONNECT" => Self::CONNECT,
      "PATCH" => Self::PATCH,
      "TRACE" => Self::TRACE,
      _ => return Err(MethodParseError::UNKNOWN),
    })
  }
}
