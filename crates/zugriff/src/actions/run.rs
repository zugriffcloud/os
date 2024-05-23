use async_signal::{Signal, Signals};
use futures::StreamExt;
use hotwatch::EventKind;
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
use tokio::{process::Command, sync::mpsc, task::JoinSet};

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

  #[cfg(unix)]
  let mut signals = Signals::new(&[
    Signal::Term,
    Signal::Abort,
    Signal::Quit,
    Signal::Int,
  ])
  .unwrap();

  #[cfg(windows)]
  let mut signals = Signals::new(&[Signal::Int]).unwrap();

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
    let _assets = assets.clone();
    let _function = function.clone();
    set.spawn(async move {
      let mut handle = Pure::new(tokio::spawn(setup(
        _base.clone(),
        cwd.clone(),
        _function.clone(),
        _assets.clone(),
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
          _function.clone(),
          _assets.clone(),
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

    macro_rules! watch_handler {
      ($s:expr) => {
        move |event| {
          match event.kind {
            EventKind::Create(_) | EventKind::Modify(_) | EventKind::Remove(_) => (),
            _ => return,
          };

          for path in event.paths {
            if !path
              .components()
              .any(|c| c.as_os_str() == ".zugriff" || c.as_os_str() == "node_modules")
            {
              $s.send(true).unwrap();
              break;
            }
          }
        }
      };
    }

    {
      let s = s.clone();
      if let Err(err) = hotwatch.watch(&base, watch_handler!(s)) {
        println!(
          "Unable to watch \"{:?}\".",
          base.clone().absolutize().unwrap_or(base.into())
        );
        error!("{:?}", err);
        return ExitCode::FAILURE;
      }
    }

    for asset in assets {
      if let Ok(canonical) = base.join(&asset).canonicalize() {
        if !canonical.starts_with(&base) {
          let s = s.clone();
          if let Err(err) = hotwatch.watch(&canonical, watch_handler!(s)) {
            println!("Unable to watch \"{:?}\".", canonical);
            error!("{:?}", err);
            return ExitCode::FAILURE;
          }
        }
      }
    }

    if let Some(function) = function {
      if let Ok(canonical) = base.join(&function).canonicalize() {
        if !canonical.starts_with(&base) {
          let s = s.clone();
          if let Err(err) = hotwatch.watch(&canonical, watch_handler!(s)) {
            println!("Unable to watch \"{:?}\".", canonical);
            error!("{:?}", err);
            return ExitCode::FAILURE;
          }
        }
      }
    }

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
    let dest_node_modules = tempdir.path().join("node_modules");

    #[cfg(unix)]
    symlink_dir(node_modules, dest_node_modules).unwrap();

    // symlinking on windows requires permissions we do not have
    #[cfg(windows)]
    {
      fs_extra::dir::create_all(&dest_node_modules, false).unwrap();
      fs_extra::dir::copy(
        node_modules,
        &dest_node_modules,
        &fs_extra::dir::CopyOptions::new(),
      )
      .unwrap();
    }
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
  let package_json = base.join("package.json");
  if package_json.is_file() && pack {
    #[cfg(unix)]
    symlink_file(&package_json, tempdir.path().join("package.json")).unwrap();

    #[cfg(windows)]
    copy(&package_json, tempdir.path().join("package.json")).unwrap();
  }

  // * Pack
  let dot_zugriff = if pack {
    match shadow(
      Vec::new(),
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
        .replace("<BASEDIR>", &base.to_str().unwrap().replace('\\', "\\\\"))
        .replace(
          "<DOT_ZUGRIFF>",
          &dot_zugriff.to_str().unwrap().replace('\\', "\\\\"),
        )
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
