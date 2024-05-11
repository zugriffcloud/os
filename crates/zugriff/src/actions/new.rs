use dialoguer::{theme::ColorfulTheme, Select};
use once_cell::sync::Lazy;
use path_absolutize::*;
use regex::Regex;
use std::{
  env,
  fs::File,
  io::Write,
  path::Path,
  process::ExitCode,
  time::{SystemTime, UNIX_EPOCH},
};
use tar::Builder;
use tempfile::NamedTempFile;
use tokio::{
  fs::{copy, create_dir_all, remove_dir_all, remove_file},
  task::JoinSet,
};

use crate::utils::{cache::cache_dir, pretty};

static INDEX: &[u8] = include_bytes!("../utils/template/index");
static INDEX_TYPES: &[u8] = include_bytes!("../utils/template/index.d.ts");
static PACKAGE_JSON: &[u8] = include_bytes!("../utils/template/package.json");
static GIT_IGNORE: &[u8] = include_bytes!("../utils/template/gitignore");
static TSCONFIG: &[u8] = include_bytes!("../utils/template/tsconfig.json");

static PATH_SAFE: Lazy<Regex> = Lazy::new(|| Regex::new("[^a-zA-Z0-9]").unwrap());

#[derive(strum_macros::Display, PartialEq, Eq, Debug)]
pub enum Procedure {
  #[strum(serialize = "Backup and clean")]
  CLEAN,
  #[strum(serialize = "Overwrite if necessary")]
  OVERWRITE,
}

impl Procedure {
  fn to_vec() -> Vec<Self> {
    vec![
      Self::CLEAN,
      Self::OVERWRITE,
    ]
  }
}

pub async fn new(output: Option<String>, typescript: bool, y: bool) -> ExitCode {
  let init = output.is_none() || output.clone().is_some_and(|o| o == "." || o == "./");
  let output = output.unwrap_or(env::current_dir().unwrap().to_str().unwrap().to_owned());
  let output = Path::new(&output);
  let output = output.absolutize().unwrap();

  let backup = format!(
    "backup_{}_{}.tar",
    SystemTime::now()
      .duration_since(UNIX_EPOCH)
      .unwrap()
      .as_secs(),
    PATH_SAFE.replace_all(output.file_name().unwrap().to_str().unwrap(), "_")
  );
  let backup = cache_dir().join(backup);

  let file = NamedTempFile::new().unwrap();
  let mut archive = Builder::new(file.as_file());

  let is_dir = output.is_dir();
  let is_file = output.is_file();
  let mut out_dir_file_count = 0;

  let out_type = if is_dir {
    out_dir_file_count = output.read_dir().unwrap().count();
    "folder"
  } else {
    "file"
  };

  if (is_dir || is_file) && !(init && out_dir_file_count == 0) {
    let selection = if y {
      Procedure::CLEAN
    } else {
      let mut procedure = Procedure::to_vec();

      let selection = Select::with_theme(&ColorfulTheme::default())
        .with_prompt(format!(
          "A {} with the name of \"{}\" already exists. Please choose how to proceed.",
          out_type,
          output.file_name().unwrap().to_str().unwrap()
        ))
        .default(0)
        .items(&procedure)
        .interact()
        .unwrap();

      procedure.remove(selection)
    };

    match selection {
      Procedure::CLEAN => {
        pretty::log(
          None,
          &format!(
            "The {} with the same name will be backed up to \"{}\" before deletion.",
            out_type,
            backup.to_string_lossy()
          ),
        );

        if is_dir {
          archive
            .append_dir_all(output.file_name().unwrap(), &output)
            .unwrap();

          remove_dir_all(&output).await.unwrap();
        } else {
          archive
            .append_file(
              &output.file_name().unwrap(),
              &mut File::open(&output).unwrap(),
            )
            .unwrap();
          remove_file(&output).await.unwrap();
        }

        copy(file.path(), backup.as_path()).await.unwrap();
      }
      Procedure::OVERWRITE => {
        if is_file {
          remove_file(&output).await.unwrap()
        }
      }
    }
  }

  let _ = create_dir_all(&output).await;

  let mut set = JoinSet::new();

  let _output = output.clone().into_owned();
  set.spawn(async move {
    let mut file = create_file(&_output, "package.json").await;
    file.write_all(PACKAGE_JSON).unwrap();
  });

  let _output = output.clone().into_owned();
  set.spawn(async move {
    let mut file = create_file(&_output, ".gitignore").await;
    file.write_all(GIT_IGNORE).unwrap();
  });

  if typescript {
    let _output = output.clone().into_owned();
    set.spawn(async move {
      let mut file = create_file(&_output, "tsconfig.json").await;
      file.write_all(TSCONFIG).unwrap();
    });

    let _output = output.clone().into_owned();
    set.spawn(async move {
      let mut file = create_file(&_output.join("types"), "index.d.ts").await;
      file.write_all(INDEX_TYPES).unwrap();
    });

    let _output = output.clone().into_owned();
    set.spawn(async move {
      let mut file = create_file(&_output.join("src"), "index.ts").await;
      file.write_all(INDEX).unwrap();
    });
  } else {
    let _output = output.clone().into_owned();
    set.spawn(async move {
      let mut file = create_file(&_output.join("src"), "index.js").await;
      file.write_all(INDEX).unwrap();
    });
  }

  while let Some(Err(err)) = set.join_next().await {
    panic!("{}", err);
  }

  println!(
    "Template created at \"{}\".\nChange directories and or install dependencies with `npm i` to proceed.",
    output.to_string_lossy()
  );

  ExitCode::SUCCESS
}

async fn create_file<'a>(base: &'a Path, name: &'a str) -> File {
  create_dir_all(base).await.unwrap();

  let file = base.join(name);
  if file.is_file() {
    remove_file(&file).await.unwrap();
  }

  File::create(file).unwrap()
}
