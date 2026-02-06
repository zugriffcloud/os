use dialoguer::{Select, theme::ColorfulTheme};
use path_absolutize::*;
use std::{env, fs::File, io::Write, path::Path, process::ExitCode};
use tokio::{
  fs::{create_dir_all, remove_file},
  task::JoinSet,
};

static INDEX: &[u8] = include_bytes!("../utils/template/index");
static INDEX_TYPES: &[u8] = include_bytes!("../utils/template/index.d.ts");
static PACKAGE_JSON: &[u8] = include_bytes!("../utils/template/package.json");
static GIT_IGNORE: &[u8] = include_bytes!("../utils/template/gitignore");
static TSCONFIG: &[u8] = include_bytes!("../utils/template/tsconfig.json");

#[derive(strum_macros::Display, PartialEq, Eq, Debug)]
pub enum Procedure {
  #[strum(serialize = "Overwrite if necessary")]
  OVERWRITE,
}

impl Procedure {
  fn to_vec() -> Vec<Self> {
    vec![Self::OVERWRITE]
  }
}

pub async fn new(output: Option<String>, typescript: bool, y: bool) -> ExitCode {
  let init = output.is_none() || output.clone().is_some_and(|o| o == "." || o == "./");
  let output = output.unwrap_or(env::current_dir().unwrap().to_str().unwrap().to_owned());
  let output = Path::new(&output);
  let output = output.absolutize().unwrap();

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
      // Procedure::CLEAN
      Procedure::OVERWRITE
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
      Procedure::OVERWRITE => {
        if is_file {
          eprintln!("{:?} is a file. Aborting.", &output);
          return ExitCode::FAILURE;
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
