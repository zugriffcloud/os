use garde::Validate;
use serde::{Deserialize, Serialize};
use std::hash::{Hash, Hasher};
use std::{collections::HashMap, str::FromStr};
use strum_macros::{Display, EnumIter};

#[derive(Deserialize, Serialize, Validate, Debug, Clone)]
pub struct DynamicRoute {
  #[garde(custom(validate_asset_path), length(max = 75))]
  pub path: String,
  #[garde(length(max = 150))]
  pub pattern: String,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone, PartialEq, Eq)]
pub struct Redirect {
  #[garde(range(min = 300, max = 399))]
  pub status: u16,
  #[garde(custom(validate_redirect_path), length(max = 350))]
  pub path: String,
  #[garde(length(max = 512))]
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

#[derive(Deserialize, Serialize, Validate, Debug, Clone, Eq, PartialEq)]
#[serde(untagged)]
pub enum Asset {
  Simple(#[garde(custom(validate_asset_path))] String),
  Advanced {
    #[garde(custom(validate_asset_path))]
    path: String,
    #[serde(rename = "cacheControl")]
    #[garde(custom(validate_cache_control))]
    cache_control: String,
  },
}

impl Hash for Asset {
  fn hash<H: Hasher>(&self, state: &mut H) {
    match self {
      Asset::Simple(str) => str.hash(state),
      Asset::Advanced { path, .. } => path.hash(state),
    }
  }
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct ConfigurationFile {
  #[garde(dive)]
  pub meta: Option<Meta>,
  #[garde(skip)]
  pub version: u64,
  #[garde(dive, length(max = 100))]
  pub functions: Vec<DynamicRoute>,
  #[garde(dive, length(max = 15000))]
  pub assets: Vec<Asset>,
  #[garde(dive)]
  pub preprocessors: Preprocessors,
  #[garde(dive)]
  pub postprocessors: Postprocessors,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone, Eq, PartialEq, Hash)]
pub struct Interceptor {
  #[garde(skip)]
  pub method: Method,
  #[garde(skip)]
  pub status: u16,
  #[garde(custom(validate_asset_path))]
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

#[derive(Deserialize, Serialize, Debug, Clone)]
#[serde(rename_all = "camelCase")]
pub enum AuthScheme {
  Basic,
}

impl Default for AuthScheme {
  fn default() -> Self {
    Self::Basic
  }
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct AuthCredentials {
  #[garde(length(min = 64, max = 64))]
  pub username: String,
  #[garde(length(min = 64, max = 64))]
  pub password: Option<String>,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct Guard {
  #[garde(dive)]
  pub credentials: AuthCredentials,
  #[garde(skip)]
  pub scheme: AuthScheme,
  #[garde(length(max = 10), inner(length(max = 350)))]
  pub patterns: Vec<String>,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct Preprocessors {
  #[garde(custom(validate_puppets), length(max = 150))]
  pub puppets: HashMap<String, String>,
  #[garde(dive, length(max = 150))]
  pub redirects: Vec<Redirect>,
  #[garde(dive, length(max = 10))]
  pub guards: Vec<Guard>,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
pub struct Postprocessors {
  #[garde(dive, length(max = 50))]
  pub interceptors: Vec<Interceptor>,
}

// Validation

fn validate_redirect_path(value: &String, _ctx: &()) -> garde::Result {
  if !value.starts_with("/") {
    return Err(garde::Error::new("Expected an absolute path"));
  }

  Ok(())
}

fn validate_puppets(value: &HashMap<String, String>, ctx: &()) -> garde::Result {
  for (from, to) in value {
    validate_puppet(from, ctx)?;
    validate_asset_path(to, ctx)?;
  }

  Ok(())
}

fn validate_puppet(value: &String, ctx: &()) -> garde::Result {
  if value == "/" {
    return Ok(());
  }

  validate_asset_path(value, ctx)
}

fn validate_asset_path(value: &String, _ctx: &()) -> garde::Result {
  if value.len() > 350 {
    return Err(garde::Error::new(
      "The length of a file path must be below 350 characters",
    ));
  }

  if !value.starts_with("/") {
    return Err(garde::Error::new("Expected an absolute path"));
  }

  if value.ends_with("/") {
    return Err(garde::Error::new("Expected a file but found a folder"));
  }

  if let Some(_) = value.find("../") {
    return Err(garde::Error::new("Found invalid path"));
  }

  Ok(())
}

fn validate_cache_control(value: &String, _ctx: &()) -> garde::Result {
  if value == "no-cache" || value == "no-store" {
    return Ok(());
  }

  if value.starts_with("max-age=") {
    if value.find(' ').is_none() {
      let value = value.trim_start_matches("max-age=");
      match value.parse::<u64>() {
        Ok(_) => Ok(()),
        Err(_) => Err(garde::Error::new(&format!(
          "Expected to find number after \"max-age=\" for value \"{}\"",
          value
        ))),
      }
    } else {
      Err(garde::Error::new(&format!(
        "Expected trimmed \"cacheControl\" value for value \"{}\"",
        value
      )))
    }
  } else {
    Err(garde::Error::new(&format!(
      "Expected \"cacheControl\" value \"{}\" to be equal to \"no-cache\", \"no-store\" or start with \"max-age=\"",
      value
    )))
  }
}

// Legacy Configuration Files
#[derive(Deserialize, Clone)]
pub struct Legacy1ConfigurationFile {
  pub meta: Option<Meta>,
  pub version: u64,
  pub functions: Vec<DynamicRoute>,
  pub assets: Vec<Asset>,
  pub puppets: HashMap<String, String>,
  pub redirects: Vec<Redirect>,
  pub interceptors: Option<Vec<Interceptor>>,
}

impl From<Legacy1ConfigurationFile> for ConfigurationFile {
  fn from(legacy_configuration_file: Legacy1ConfigurationFile) -> Self {
    Self {
      meta: legacy_configuration_file.meta,
      version: legacy_configuration_file.version,
      functions: legacy_configuration_file.functions,
      assets: legacy_configuration_file.assets,
      preprocessors: Preprocessors {
        puppets: legacy_configuration_file.puppets,
        redirects: legacy_configuration_file.redirects,
        guards: Vec::new(),
      },
      postprocessors: Postprocessors {
        interceptors: legacy_configuration_file.interceptors.unwrap_or(Vec::new()),
      },
    }
  }
}
