use garde::Validate;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Deserialize, Serialize, Validate, Debug, Clone)]
pub struct DynamicRoute {
  #[garde(skip)]
  pub path: String,
  #[garde(skip)]
  pub pattern: String,
}

#[derive(Deserialize, Serialize, Validate, Debug, Default, Clone)]
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
}
