use std::{
  env,
  fs::{File, OpenOptions},
  io::{Read, Seek as _, Write as _},
  path::Path,
  process::ExitCode,
};

use once_cell::sync::Lazy;
use serde_envfile::{from_str, to_string, Value};

use crate::{EnvironmentAction, EnvironmentActions};

use crate::utils::{
  cache::cache_dir,
  pretty::{self, Status},
  redact,
};

pub static PREFIX: &'static str = "zugriff_cli_";
pub static ENVFILE: Lazy<Box<Path>> = Lazy::new(|| cache_dir().join(".env").into_boxed_path());

pub async fn handle(value: EnvironmentAction) -> ExitCode {
  if !ENVFILE.is_file() {
    File::create(ENVFILE.clone()).ok();
  }

  match value {
    EnvironmentAction::Set { set } => update_value(set, false),
    EnvironmentAction::Delete { delete } => update_value(delete, true),
    EnvironmentAction::Reset => {
      let file = OpenOptions::new()
        .write(true)
        .open(ENVFILE.to_owned())
        .unwrap();

      file.set_len(0).unwrap();

      pretty::log(
        Some(Status::ENVIRONMENT),
        &format!(
          "Evironment at \"{}\" reset",
          ENVFILE.clone().to_str().unwrap()
        ),
      );
    }
    EnvironmentAction::Info => info(),
  };

  ExitCode::SUCCESS
}

fn update_value(key: EnvironmentActions, delete: bool) {
  let (key, value) = match key {
    EnvironmentActions::DeploymentToken(value) => {
      (format!("{}deployment_token", PREFIX), value.value)
    }
    EnvironmentActions::AccountToken(value) => (format!("{}account_token", PREFIX), value.value),
    EnvironmentActions::DeploymentApi(value) => (format!("{}deployment_api", PREFIX), value.value),
    EnvironmentActions::GeneralPurposeApi(value) => {
      (format!("{}general_purpose_api", PREFIX), value.value)
    }
    EnvironmentActions::WsGeneralPurposeApi(value) => {
      (format!("{}ws_general_purpose_api", PREFIX), value.value)
    }
  };
  let value = value.unwrap_or("".to_owned());

  let mut file = OpenOptions::new()
    .read(true)
    .write(true)
    .open(ENVFILE.to_owned())
    .unwrap();

  let mut contents = String::new();
  file.read_to_string(&mut contents).unwrap();

  let mut env = from_str::<Value>(&contents).unwrap();

  let message;

  if delete {
    if !env.contains_key(&key) {
      return pretty::log(
        Some(Status::ENVIRONMENT),
        &format!(
          "Environment variable \"{}\" not present in file \"{}\".",
          key.to_ascii_uppercase(),
          ENVFILE.clone().to_str().unwrap()
        ),
      );
    }

    env.remove(&key);
    message = format!(
      "Environment variable \"{}\" removed from \"{}\".",
      key.to_ascii_uppercase(),
      ENVFILE.clone().to_str().unwrap()
    );
  } else {
    env.insert(key.clone(), value.clone());
    let value = if key.contains("token") {
      redact(value)
    } else {
      value
    };

    message = format!(
      "Environment variable \"{}\" with value \"{}\" set in file \"{}\".",
      key.to_ascii_uppercase(),
      value,
      ENVFILE.clone().to_str().unwrap()
    );
  }

  file.set_len(0).unwrap();
  file.rewind().unwrap();

  file.write_all(to_string(&env).unwrap().as_bytes()).unwrap();

  pretty::log(Some(Status::ENVIRONMENT), &message)
}

pub fn info() {
  pretty::log(None, &format!("Cache: {:?}", cache_dir()));
  if let Ok(cwd) = env::current_dir() {
    pretty::log(None, &format!("CWD: {:?}", cwd));
  }
  if let Ok(exe) = env::current_exe() {
    pretty::log(None, &format!("Executable: {:?}", exe));
  }
}
