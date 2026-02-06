use colored::Colorize as _;
use std::process::ExitCode;

use crate::utils::pack::{compress, report as pack_report, shadow};

pub async fn pack(
  cwd: Option<String>,
  function: Option<String>,
  assets: Vec<String>,
  report: bool,
  external: Vec<String>,
  puppets: Vec<String>,
  redirects: Vec<String>,
  interceptors: Vec<String>,
  prefer_file_router: bool,
  prefer_puppets: bool,
  enable_static_router: bool,
  disable_static_router: bool,
  disable_function_discovery: bool,
  asset_cache_control: Vec<String>,
) -> ExitCode {
  let dot_zugriff = shadow(
    external,
    cwd,
    function,
    assets,
    puppets,
    redirects,
    interceptors,
    prefer_file_router,
    prefer_puppets,
    enable_static_router,
    disable_static_router,
    disable_function_discovery,
    asset_cache_control,
  )
  .await
  .unwrap();

  println!("Packed!");
  if report {
    println!("{}", String::from("Report").bold().dimmed());
    let mut packed = compress(dot_zugriff).unwrap();
    pack_report(packed.as_file_mut());
  }

  ExitCode::SUCCESS
}
