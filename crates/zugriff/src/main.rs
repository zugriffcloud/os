use clap::{Parser, Subcommand};
use dotenvy::dotenv;
use garde::Validate;
use human_panic::{setup_panic, Metadata};
use once_cell::sync::Lazy;
use serde::{self, Deserialize, Serialize};
use serde_envfile::de::from_iter;
use std::{ops::Deref, process::ExitCode};

#[macro_use]
extern crate serde_with;

use crate::actions::environment::ENVFILE;

mod actions;
mod utils;

#[macro_use]
extern crate log;

#[derive(Subcommand, Debug, Clone)]
pub enum Actions {
  Run {
    /// Change current working directory (e.g. "./my-app/")
    #[arg(long)]
    cwd: Option<String>,

    /// Function entry file (e.g. ".src/index.js")
    #[arg(short, long)]
    function: Option<String>,

    /// Location of static asset(-s) to include
    #[arg(short, long)]
    asset: Vec<String>,

    /// Listens to changes within the current directory
    #[arg(long)]
    watch: bool,

    /// Asset Alias Middleware (e.g. "/:/index.html")
    #[arg(long)]
    puppet: Vec<String>,

    /// Redirect Middleware (e.g. "/:308:/index.html" or "/:/index.html")
    #[arg(long)]
    redirect: Vec<String>,

    /// Address to bind (e.g. 127.0.0.1)
    #[arg(long)]
    address: Option<String>,

    /// Pack a Next.js or custom application
    #[arg(long)]
    pack: bool,

    /// Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,
  },
  New {
    /// Project location (e.g. "./my-app/")
    #[arg(value_enum)]
    output: String,

    #[arg(long)]
    typescript: bool,
  },
  Init {
    #[arg(long)]
    typescript: bool,
  },
  Deploy {
    /// Token to deploy and manage applications
    #[clap(long = "deploymentToken", env = "ZUGRIFF_CLI_DEPLOYMENT_TOKEN")]
    deployment_token: String,

    /// Change current working directory (e.g. "./my-app/")
    #[arg(long)]
    cwd: Option<String>,

    /// Function entry file (e.g. "./src/server.js")
    #[arg(short, long)]
    function: Option<String>,

    /// Location of static asset(-s) to include
    #[arg(short, long)]
    asset: Vec<String>,

    /// Domain accociated labels (e.g. "production")
    #[arg(short, long)]
    promotion: Option<Vec<String>>,

    /// Deployment name
    #[arg(short, long)]
    name: Option<String>,

    /// Deployment description
    #[arg(short, long)]
    description: Option<String>,

    /// Deployment is created but not uploaded
    #[arg(long = "dryRun")]
    dry_run: bool,

    /// Packages that should not be bundled with the function (USE WITH CAUTION AND ONLY WHEN YOU KNOW WHAT YOU ARE DOING)
    #[arg(long)]
    external: Vec<String>,

    /// Asset Alias Middleware (e.g. "/:/index.html")
    #[arg(long)]
    puppet: Vec<String>,

    /// Redirect Middleware (e.g. "/:308:/index.html" or "/:/index.html")
    #[arg(long)]
    redirect: Vec<String>,

    /// Re-pack a Next.js or custom application before deploying
    #[arg(long)]
    pack: bool,

    /// Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,
  },
  /// Pack a Next.js or custom application
  Pack {
    /// Change current working directory (e.g. "./my-app/")
    #[arg(long)]
    cwd: Option<String>,

    /// Function entry file (e.g. "./src/server.js")
    #[arg(short, long)]
    function: Option<String>,

    /// Location of static asset(-s) to include
    #[arg(short, long)]
    asset: Vec<String>,

    /// Log a pack report
    #[arg(long)]
    report: bool,

    /// Packages that should not be bundled with the function (USE WITH CAUTION AND ONLY WHEN YOU KNOW WHAT YOU ARE DOING)
    #[arg(long)]
    external: Vec<String>,

    /// Asset Alias Middleware (e.g. "/:/index.html")
    #[arg(long)]
    puppet: Vec<String>,

    /// Redirect Middleware (e.g. "/:308:/index.html" or "/:/index.html")
    #[arg(long)]
    redirect: Vec<String>,

    /// Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,
  },
  Uninstall,
  #[command(subcommand)]
  Environment(EnvironmentAction),
}

#[derive(Subcommand, Debug, Clone)]
pub enum EnvironmentAction {
  Set {
    #[command(subcommand)]
    set: EnvironmentActions,
  },
  Delete {
    #[command(subcommand)]
    delete: EnvironmentActions,
  },
  Reset,
  Info,
}

#[derive(Subcommand, Debug, Clone)]
pub enum EnvironmentActions {
  #[command(name = "deploymentToken")]
  DeploymentToken(EnvironmentActionsValue),
  #[command(name = "accountToken")]
  AccountToken(EnvironmentActionsValue),
  #[command(name = "deploymentApi")]
  DeploymentApi(EnvironmentActionsValue),
  #[command(name = "generalPurposeApi")]
  GeneralPurposeApi(EnvironmentActionsValue),
  #[command(name = "wsGeneralPurposeApi")]
  WsGeneralPurposeApi(EnvironmentActionsValue),
}

#[derive(Debug, Clone, clap::Args)]
pub struct EnvironmentActionsValue {
  pub value: Option<String>,
}

pub static AUTHORS: &'static str = "Luca Goslar <luca.goslar@zugriff.eu>";

#[derive(Parser, Debug)]
#[command(name = "zugriff")]
#[command(bin_name = "zugriff")]
#[command(author = AUTHORS)]
#[command(version = env!("CARGO_PKG_VERSION"))]
#[command(about = "CLI to interact with the zugriff API.", long_about = None)]
pub struct Args {
  /// Token to manage account
  #[clap(short, long = "accountToken", env = "ZUGRIFF_CLI_ACCOUNT_TOKEN")]
  pub account_token: Option<String>,
  #[command(subcommand)]
  pub action: Actions,
  #[clap(short, long)]
  /// Accept defaults
  pub y: bool,
}

#[derive(Validate, Serialize, Deserialize, Debug, Clone)]
pub struct EnvironmentInner {
  #[serde(default = "Environment::deployment_api")]
  #[garde(url)]
  deployment_api: String,
  #[serde(default = "Environment::general_purpose_api")]
  #[garde(url)]
  general_purpose_api: String,
  #[serde(default = "Environment::ws_general_purpose_api")]
  #[garde(url)]
  ws_general_purpose_api: String,
}

#[derive(Validate, Serialize, Deserialize, Debug, Clone)]
pub struct Environment {
  #[serde(flatten, with = "prefix")]
  #[garde(dive)]
  inner: EnvironmentInner,
}

impl Environment {
  pub fn deployment_api() -> String {
    "https://deploy.zugriff.eu".to_owned()
  }

  pub fn general_purpose_api() -> String {
    "https://api.zugriff.eu".to_owned()
  }

  pub fn ws_general_purpose_api() -> String {
    "wss://api.zugriff.eu".to_owned()
  }
}

impl Deref for Environment {
  type Target = EnvironmentInner;

  fn deref(&self) -> &Self::Target {
    &self.inner
  }
}

with_prefix!(prefix "zugriff_cli_");

pub static ENVIRONMENT: Lazy<Environment> = Lazy::new(|| {
  match from_iter(
    std::env::vars()
      .collect::<Vec<(String, String)>>()
      .into_iter(),
  ) {
    Ok(config) => config,
    Err(error) => panic!("{:#?}", error),
  }
});

#[actix_web::main]
async fn main() -> ExitCode {
  env_logger::init();
  dotenv().ok();
  dotenvy::from_filename(ENVFILE.clone()).ok();

  setup_panic!(
    Metadata::new(env!("CARGO_PKG_NAME"), env!("CARGO_PKG_VERSION"))
      .authors(AUTHORS)
      .homepage("https://zugriff.eu")
      .support("Send your inquiry to `help@zugriff.eu`.")
  );

  let args = Args::parse();

  debug!("{:?}", args);
  debug!("{:?}", ENVFILE.clone());
  debug!("{:?}", ENVIRONMENT.inner);

  utils::dependencies::install(&args).await;

  match args.action {
    Actions::New { output, typescript } => actions::new(Some(output), typescript, args.y).await,
    Actions::Init { typescript } => actions::new(None, typescript, args.y).await,
    Actions::Run {
      cwd,
      function,
      asset,
      watch,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
      pack,
      address,
    } => {
      actions::run(
        cwd,
        function,
        asset,
        puppet,
        redirect,
        watch,
        disable_assets_default_index_html_redirect,
        pack,
        address,
      )
      .await
    }
    Actions::Deploy {
      cwd,
      function,
      asset,
      promotion,
      name,
      description,
      deployment_token,
      dry_run,
      external,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
      pack,
    } => {
      actions::deploy(
        cwd,
        deployment_token,
        function,
        asset,
        promotion,
        name,
        description,
        dry_run,
        external,
        puppet,
        redirect,
        disable_assets_default_index_html_redirect,
        pack,
      )
      .await
    }
    Actions::Environment(value) => actions::environment::handle(value).await,
    Actions::Pack {
      cwd,
      function,
      asset,
      report,
      external,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
    } => {
      actions::pack(
        cwd,
        function,
        asset,
        report,
        external,
        puppet,
        redirect,
        disable_assets_default_index_html_redirect,
      )
      .await
    }
    Actions::Uninstall => actions::uninstall().await,
  }
}
