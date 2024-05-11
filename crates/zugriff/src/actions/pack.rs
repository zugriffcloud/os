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
  disable_assets_default_index_html_redirect: bool,
) -> ExitCode {
  let dot_zugriff = shadow(
    external,
    cwd,
    function,
    assets,
    puppets,
    redirects,
    disable_assets_default_index_html_redirect,
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
