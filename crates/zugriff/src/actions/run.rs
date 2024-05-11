use async_signal::{Signal, Signals};
use futures::StreamExt;
use hotwatch::Hotwatch;
use signal_hook::low_level;
use std::{
  env,
  fs::{copy, remove_dir_all, File},
  io::Write,
  path::{Path, PathBuf},
  process::ExitCode,
};
use symlink::{symlink_dir, symlink_file};
use tempfile::TempDir;
use tokio::{fs::read_to_string, process::Command, sync::mpsc, task::JoinSet};

use path_absolutize::Absolutize;

use crate::utils::{dependencies::NODE_ZUGRIFF, pack::shadow, pretty, task::Pure};

static SERVER: &'static str = include_str!("../utils/template/server.js");

pub async fn run(
  cwd: Option<String>,
  function: Option<String>,
  assets: Vec<String>,
  puppets: Vec<String>,
  redirects: Vec<String>,
  watch: bool,
  disable_assets_default_index_html_redirect: bool,
  pack: bool,
  address: Option<String>,
) -> ExitCode {
  let base = match cwd.clone() {
    Some(cwd) => Path::new(&cwd).into(),
    None => env::current_dir().unwrap(),
  };

  let found_dot_zugriff = base.join(".zugriff").is_dir();
  let pack = pack || !found_dot_zugriff;

  let mut signals = Signals::new(&[
    Signal::Term,
    Signal::Abort,
    Signal::Quit,
    Signal::Int,
  ])
  .unwrap();

  let _base = base.clone();
  tokio::spawn(async move {
    while let Some(signal) = signals.next().await {
      if !found_dot_zugriff {
        remove_dir_all(_base.clone().join(".zugriff")).ok();
      }
      low_level::emulate_default_handler(signal.unwrap() as i32).unwrap();
    }
  });

  if watch {
    let mut set = JoinSet::new();
    let (s, mut r) = mpsc::unbounded_channel();

    let _base = base.clone();
    set.spawn(async move {
      let mut handle = Pure::new(tokio::spawn(setup(
        _base.clone(),
        cwd.clone(),
        function.clone(),
        assets.clone(),
        puppets.clone(),
        redirects.clone(),
        disable_assets_default_index_html_redirect,
        pack,
        address.clone(),
      )));

      while let Some(_) = r.recv().await {
        handle.abort();
        handle = Pure::new(tokio::spawn(setup(
          _base.clone(),
          cwd.clone(),
          function.clone(),
          assets.clone(),
          puppets.clone(),
          redirects.clone(),
          disable_assets_default_index_html_redirect,
          pack,
          address.clone(),
        )));
      }
    });

    let _base = base.clone();
    let mut hotwatch = Hotwatch::new().unwrap();
    hotwatch
      .watch(env::current_dir().unwrap(), move |event| {
        for path in event.paths {
          if let Ok(path) = path.strip_prefix(Path::new(&_base)) {
            // Ignore changes within special `.zugriff` directory
            if !path.starts_with(".zugriff") && !path.starts_with("node_modules") {
              s.send(true).unwrap();
              break;
            }
          }
        }
      })
      .unwrap();

    while let Some(_) = set.join_next().await {}
  } else {
    setup(
      base.clone(),
      cwd.clone(),
      function,
      assets,
      puppets,
      redirects,
      disable_assets_default_index_html_redirect,
      pack,
      address.clone(),
    )
    .await;
  }

  ExitCode::SUCCESS
}

async fn setup(
  base: PathBuf,
  cwd: Option<String>,
  function: Option<String>,
  assets: Vec<String>,
  puppets: Vec<String>,
  redirects: Vec<String>,
  disable_assets_default_index_html_redirect: bool,
  pack: bool,
  address: Option<String>,
) {
  let tempdir = TempDir::new().unwrap();

  // * Link node_modules
  let node_modules = base.join("node_modules");
  if node_modules.is_dir() {
    symlink_dir(node_modules, tempdir.path().join("node_modules")).unwrap();
  }

  // * Copy .env files
  if let Ok(reader) = base.read_dir() {
    for entry in reader {
      if let Ok(entry) = entry {
        if let Ok(file_name) = entry.file_name().into_string() {
          if file_name.starts_with(".env") {
            copy(entry.path(), tempdir.path().join(file_name)).ok();
          }
        }
      }
    }
  }

  // * Copy package.json
  let mut externals = Vec::new();
  let package_json = base.join("package.json");
  if package_json.is_file() && pack {
    symlink_file(&package_json, tempdir.path().join("package.json")).unwrap();
    if let Ok(package_json) = read_to_string(package_json).await {
      if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&package_json) {
        if let Some(dependencies) = package_json.get("dependencies") {
          if let Some(dependencies) = dependencies.as_object() {
            externals = dependencies
              .keys()
              .map(|k| k.to_string())
              .collect::<Vec<String>>();
          }
        }
      }
    }
  }

  // * Pack
  let dot_zugriff = if pack {
    match shadow(
      externals,
      cwd,
      function,
      assets,
      puppets,
      redirects,
      disable_assets_default_index_html_redirect,
    )
    .await
    {
      Ok(dot_zugriff) => dot_zugriff,
      Err(err) => {
        pretty::log(None, &err.to_string());
        return;
      }
    }
  } else {
    base.join(".zugriff")
  };

  let server = tempdir.path().join("server.mjs");

  File::create(&server)
    .unwrap()
    .write_all(
      SERVER
        .replace("<DEBUG>", &env::var("DEBUG").is_ok().to_string())
        .replace("<BASEDIR>", base.to_str().unwrap())
        .replace("<DOT_ZUGRIFF>", dot_zugriff.to_str().unwrap())
        .replace("<ADDRESS>", &address.unwrap_or("127.0.0.1".into()))
        .as_bytes(),
    )
    .unwrap();

  let mut node = if NODE_ZUGRIFF.is_file() {
    Command::new(NODE_ZUGRIFF.as_os_str())
  } else {
    Command::new("node")
  };
  node.kill_on_drop(true);
  node.arg(server.absolutize().unwrap().as_os_str().to_str().unwrap());

  node.spawn().unwrap().wait().await.unwrap();
}
