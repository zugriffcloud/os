use clap::{Parser, Subcommand};
use dotenvy::dotenv;
use garde::Validate;
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
  Preview {
    /// Change current working directory (e.g. "./my-app/")
    #[arg(long)]
    cwd: Option<String>,

    /// Function entry file (e.g. "./src/index.js")
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

    /// Intercept status codes (e.g. "404:/404.html" or "404:POST:/404.html")
    #[arg(short, long)]
    intercept: Vec<String>,

    /// [DEPRECATED: use --disableStaticRouter] Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,

    /// Disables the auto-router for static-only deployments
    #[arg(long = "disableStaticRouter")]
    disable_static_router: bool,

    /// Enables the auto-router for deployments with functions
    #[arg(long = "enableStaticRouter")]
    enable_static_router: bool,

    /// Prefer file based HTML routing (e.g. "/index.html" -> "/:index.html", "/about.html" -> "/about:about.html")
    #[arg(long = "preferFileRouter")]
    prefer_file_router: bool,

    /// If no functions are found, instead of redirect rules for "index.x?html?" files, puppets are created (e.g. "/" -> "/index.html")
    #[arg(long = "preferPuppets")]
    prefer_puppets: bool,

    /// Disable function discovery
    #[arg(long = "disableFunctionDiscovery")]
    disable_function_discovery: bool,

    /// Protect paths with basic access authentication (e.g. "user:pass" or "user:pass:/secrets.txt")
    #[arg(short, long)]
    guard: Vec<String>,

    /// Apply custom Cache-Control headers to assets ("no-cache", "no-store" and "max-age=n" are supported, e.g. "no-cache:/main-menu.pdf")
    #[arg(long = "assetCacheControl")]
    asset_cache_control: Vec<String>,
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
    deployment_token: Option<String>,

    /// Change current working directory (e.g. "./my-app/")
    #[arg(long)]
    cwd: Option<String>,

    /// Function entry file (e.g. "./src/server.js")
    #[arg(short, long)]
    function: Option<String>,

    /// Location of static asset(-s) to include
    #[arg(short, long)]
    asset: Vec<String>,

    /// [DEPRECATED: use --promote] Domain accociated labels (e.g. "production")
    #[arg(long)]
    promotion: Vec<String>,

    /// Domain accociated labels (e.g. "production")
    #[arg(short, long)]
    promote: Vec<String>,

    /// Intercept status codes (e.g. "404:/404.html" or "404:POST:/404.html")
    #[arg(short, long)]
    intercept: Vec<String>,

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

    /// [DEPRECATED: use --disableStaticRouter] Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,

    /// Disables the auto-router for static-only deployments
    #[arg(long = "disableStaticRouter")]
    disable_static_router: bool,

    /// Enables the auto-router for deployments with functions
    #[arg(long = "enableStaticRouter")]
    enable_static_router: bool,

    /// Prefer file based HTML routing (e.g. "/index.html" -> "/:index.html", "/about.html" -> "/about:about.html")
    #[arg(long = "preferFileRouter")]
    prefer_file_router: bool,

    /// If no functions are found, instead of redirect rules for "index.x?html?" files, puppets are created (e.g. "/" -> "/index.html")
    #[arg(long = "preferPuppets")]
    prefer_puppets: bool,

    /// Disable function discovery
    #[arg(long = "disableFunctionDiscovery")]
    disable_function_discovery: bool,

    /// Protect paths with basic access authentication (e.g. "user:pass" or "user:pass:/secrets.txt")
    #[arg(short, long)]
    guard: Vec<String>,

    /// Apply custom Cache-Control headers to assets ("no-cache", "no-store" and "max-age=n" are supported, e.g. "no-cache:/main-menu.pdf")
    #[arg(long = "assetCacheControl")]
    asset_cache_control: Vec<String>,
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

    /// Intercept status codes (e.g. "404:/404.html" or "404:POST:/404.html")
    #[arg(short, long)]
    intercept: Vec<String>,

    /// [DEPRECATED: use --disableStaticRouter] Default: If no function is found, redirect rules for "index.x?html?" files are created (e.g. "/" -308-> "/index.html")
    #[arg(long = "disableDefaultIndexHTMLRedirect")]
    disable_assets_default_index_html_redirect: bool,

    /// Disables the auto-router for static-only deployments
    #[arg(long = "disableStaticRouter")]
    disable_static_router: bool,

    /// Enables the auto-router for deployments with functions
    #[arg(long = "enableStaticRouter")]
    enable_static_router: bool,

    /// Prefer file based HTML routing (e.g. "/index.html" -> "/:index.html", "/about.html" -> "/about:about.html")
    #[arg(long = "preferFileRouter")]
    prefer_file_router: bool,

    /// If no functions are found, instead of redirect rules for "index.x?html?" files, puppets are created (e.g. "/" -> "/index.html")
    #[arg(long = "preferPuppets")]
    prefer_puppets: bool,

    /// Disable function discovery
    #[arg(long = "disableFunctionDiscovery")]
    disable_function_discovery: bool,

    /// Protect paths with basic access authentication (e.g. "user:pass" or "user:pass:/secrets.txt")
    #[arg(short, long)]
    guard: Vec<String>,

    /// Apply custom Cache-Control headers to assets ("no-cache", "no-store" and "max-age=n" are supported, e.g. "no-cache:/main-menu.pdf")
    #[arg(long = "assetCacheControl")]
    asset_cache_control: Vec<String>,
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
  #[clap(short, long = "yes")]
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

  let args = Args::parse();

  debug!("{:?}", args);
  debug!("{:?}", ENVFILE.clone());
  debug!("{:?}", ENVIRONMENT.inner);

  utils::dependencies::install(&args).await;

  match args.action {
    Actions::New { output, typescript } => actions::new(Some(output), typescript, args.y).await,
    Actions::Init { typescript } => actions::new(None, typescript, args.y).await,
    Actions::Preview {
      cwd,
      function,
      asset,
      watch,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
      enable_static_router,
      disable_static_router,
      pack,
      address,
      intercept,
      prefer_file_router,
      prefer_puppets,
      disable_function_discovery,
      guard,
      asset_cache_control
    } => {
      if disable_assets_default_index_html_redirect {
        println!(
          "`--disableDefaultIndexHTMLRedirect` is deprecated - please use `--disableStaticRouter`"
        );
      }

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
        intercept,
        prefer_file_router,
        prefer_puppets,
        enable_static_router,
        disable_static_router,
        disable_function_discovery,
        guard,
        asset_cache_control
      )
      .await
    }
    Actions::Deploy {
      cwd,
      function,
      asset,
      promotion,
      promote,
      name,
      description,
      deployment_token,
      dry_run,
      external,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
      enable_static_router,
      disable_static_router,
      pack,
      intercept,
      prefer_file_router,
      prefer_puppets,
      disable_function_discovery,
      guard,
      asset_cache_control,
    } => {
      if promotion.len() > 1 {
        println!("`--promotion` is deprecated - please use `--promote`");
      }

      if disable_assets_default_index_html_redirect {
        println!(
          "`--disableDefaultIndexHTMLRedirect` is deprecated - please use `--disableStaticRouter`"
        );
      }

      actions::deploy(
        cwd,
        deployment_token,
        function,
        asset,
        [
          promote, promotion,
        ]
        .concat(),
        name,
        description,
        dry_run,
        external,
        puppet,
        redirect,
        disable_assets_default_index_html_redirect,
        pack,
        intercept,
        prefer_file_router,
        prefer_puppets,
        enable_static_router,
        disable_static_router,
        disable_function_discovery,
        guard,
        asset_cache_control,
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
      enable_static_router,
      disable_static_router,
      intercept,
      prefer_file_router,
      prefer_puppets,
      disable_function_discovery,
      guard,
      asset_cache_control
    } => {
      if disable_assets_default_index_html_redirect {
        println!(
          "`--disableDefaultIndexHTMLRedirect` is deprecated - please use `--disableStaticRouter`"
        );
      }

      actions::pack(
        cwd,
        function,
        asset,
        report,
        external,
        puppet,
        redirect,
        disable_assets_default_index_html_redirect,
        intercept,
        prefer_file_router,
        prefer_puppets,
        enable_static_router,
        disable_static_router,
        disable_function_discovery,
        guard,
        asset_cache_control
      )
      .await
    }
    Actions::Uninstall => actions::uninstall().await,
  }
}
