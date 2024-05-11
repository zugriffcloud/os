use awc::Client;
use dialoguer::{theme::ColorfulTheme, Select};
use flate2::read::GzDecoder;
use once_cell::sync::Lazy;
use std::ops::Deref;
use std::{
  env::consts::EXE_SUFFIX,
  fs::{self, create_dir_all},
  io::{Seek, SeekFrom, Write},
  path::PathBuf,
  process::Stdio,
};
use tar::Archive;
use tempfile::{NamedTempFile, TempDir};
use tokio::{fs::copy, process::Command};
use which::which;
use xz2::read::XzDecoder;
use zip::ZipArchive;

use crate::Args;

use super::cache::cache_dir;
use super::pretty::{self, default_spinner, Status};

#[derive(strum_macros::Display, PartialEq, Eq, Debug)]
pub enum Installer {
  #[strum(serialize = "Homebrew")]
  HOMEBREW,
  #[strum(serialize = "npm")]
  NPM,
  #[strum(serialize = "pnpm")]
  PNPM,
  #[strum(serialize = "yarn")]
  YARN,
  #[strum(serialize = "zugriff")]
  ZUGRIFF,
}

pub static ESBUILD_ZUGRIFF: Lazy<PathBuf> = Lazy::new(|| {
  create_dir_all(cache_dir().join("executables")).unwrap();

  cache_dir()
    .join("executables")
    .join(format!("esbuild{}", EXE_SUFFIX))
});
pub static NODE_ZUGRIFF: Lazy<PathBuf> = Lazy::new(|| {
  create_dir_all(cache_dir().join("executables")).unwrap();

  cache_dir()
    .join("executables")
    .join(format!("node{}", EXE_SUFFIX))
});

pub async fn install(arg: &Args) {
  // * esbuild

  if which("esbuild").is_err() && !ESBUILD_ZUGRIFF.exists() {
    let mut installers = Vec::new();

    installers.push((Installer::ZUGRIFF, PathBuf::new()));

    if let Ok(binary) = which("brew") {
      installers.push((Installer::HOMEBREW, binary))
    }
    if let Ok(binary) = which("npm") {
      installers.push((Installer::NPM, binary))
    }
    if let Ok(binary) = which("pnpm") {
      installers.push((Installer::PNPM, binary))
    }
    if let Ok(binary) = which("yarn") {
      installers.push((Installer::YARN, binary))
    }

    let selection = if arg.y {
      0
    } else {
      Select::with_theme(&ColorfulTheme::default())
        .with_prompt(
          "We depend on esbuild. Please choose your preferred method to install esbuild.",
        )
        .default(0)
        .items(
          installers
            .iter()
            .map(|item| item.0.to_string())
            .collect::<Vec<String>>()
            .as_ref(),
        )
        .interact()
        .unwrap()
    };

    let installer = installers.get(selection).unwrap();

    let pb = default_spinner();
    pb.set_message("Installing esbuild");

    if installer.0 != Installer::ZUGRIFF {
      let mut command = Command::new(&installer.1);
      let command = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);
      let command = match installer.0 {
        Installer::HOMEBREW => command.arg("install").arg("esbuild"),
        Installer::NPM => command.arg("install").arg("-g").arg("esbuild"),
        Installer::PNPM => command.arg("install").arg("-g").arg("esbuild"),
        Installer::YARN => command.arg("global").arg("add").arg("esbuild"),
        Installer::ZUGRIFF => todo!(),
      };

      command.spawn().unwrap();
      if let Err(err) = command.output().await {
        panic!("esbuild install error: {:?}", err);
      }

      if which("esbuild").is_err() {
        panic!("unable to locate esbuild after installed -> manual install");
      }
    } else {
      let package = match (std::env::consts::OS, std::env::consts::ARCH) {
        ("macos", "x86_64") => "darwin-x64",
        ("macos", "aarch64") => "darwin-arm64",
        ("linux", "x86_64") => "linux-x64",
        ("linux", "arm") => "linux-arm",
        ("linux", "aarch64") => "linux-arm64",
        ("windows", "x86_64") => "win32-x64",
        ("windows", "aarch64") => "win32-arm64",
        _ => panic!(
          "esbuild might not be supported on this machine - please choose a different installer"
        ),
      };

      let npm_url = format!(
        "https://registry.npmjs.org/@esbuild/{}/-/{}-0.21.1.tgz",
        package, package
      );

      let client = Client::default();
      let mut res = client
        .get(npm_url)
        .insert_header(("User-Agent", "zugriff-cli"))
        .send()
        .await
        .unwrap();

      let body = res.body().limit(10_000_000).await.unwrap(); // 10mb

      let mut file = NamedTempFile::new().unwrap();
      file.write_all(body.as_ref()).unwrap();
      drop(body);

      file.flush().unwrap();
      file.as_file().seek(SeekFrom::Start(0)).unwrap();

      let deflater = GzDecoder::new(file);
      let mut archive = Archive::new(deflater);

      let folder = TempDir::new().unwrap();
      archive.unpack(folder.path()).unwrap();

      let esbuild = format!("esbuild{}", EXE_SUFFIX);

      let tmp_path = folder.path().join("package").join("bin").join(&esbuild);

      copy(tmp_path, ESBUILD_ZUGRIFF.as_path()).await.unwrap();

      fix_permissions(ESBUILD_ZUGRIFF.deref());
    }

    pb.finish_and_clear();
    pretty::log(Some(Status::INSTALLED), "Installed esbuild");
  }

  // * NodeJS

  if which("node").is_err() && !NODE_ZUGRIFF.is_file() {
    let mut installers = Vec::new();

    installers.push((Installer::ZUGRIFF, PathBuf::new()));

    if let Ok(binary) = which("brew") {
      installers.push((Installer::HOMEBREW, binary))
    }

    let selection = if arg.y {
      0
    } else {
      Select::with_theme(&ColorfulTheme::default())
        .with_prompt(
          "We depend on Node.js (Node). Please choose your preferred method to install Node.",
        )
        .default(0)
        .items(
          installers
            .iter()
            .map(|item| item.0.to_string())
            .collect::<Vec<String>>()
            .as_ref(),
        )
        .interact()
        .unwrap()
    };

    let installer = installers.get(selection).unwrap();

    let pb = default_spinner();
    pb.set_message("Installing Node.js");

    if installer.0 != Installer::ZUGRIFF {
      let mut command = Command::new(&installer.1);
      let command = command
        .stdin(Stdio::null())
        .stdout(Stdio::null())
        .stderr(Stdio::null())
        .kill_on_drop(true);

      match installer.0 {
        Installer::HOMEBREW => command.arg("install").arg("node"),
        _ => panic!("Installer not supported"),
      };

      command.spawn().unwrap();
      if let Err(err) = command.output().await {
        panic!("Node.js install error: {:?}", err);
      }
    } else {
      let (package, extension) = {
        match (std::env::consts::OS, std::env::consts::ARCH) {
          ("macos", "x86_64") => ("darwin-x64", "tar.gz"),
          ("macos", "aarch64") => ("darwin-arm64", "tar.gz"),
          ("linux", "x86_64") => ("linux-x64", "tar.xz"),
          ("linux", "arm") => ("linux-arm64", "tar.xz"),
          ("linux", "aarch64") => ("linux-arm64", "tar.xz"),
          ("windows", "x86_64") => ("win-x64", "zip"),
          _ => panic!(
            "Node might not be supported on this machine - please choose a different installer"
          ),
        }
      };

      let package = format!("node-v20.13.1-{}", package);

      let node_url = format!("https://nodejs.org/dist/v20.13.1/{}.{}", package, extension);

      let client = Client::default();
      let mut res = client
        .get(node_url)
        .insert_header(("User-Agent", "zugriff-cli"))
        .send()
        .await
        .unwrap();

      let body = res.body().limit(50_000_000).await.unwrap(); // 10mb

      let folder = TempDir::new().unwrap();

      let mut file = NamedTempFile::new().unwrap();
      file.write_all(body.as_ref()).unwrap();
      drop(body);

      file.flush().unwrap();
      file.as_file().seek(SeekFrom::Start(0)).unwrap();

      match extension {
        "zip" => {
          let mut zip = ZipArchive::new(&file).unwrap();
          zip.extract(folder.path()).unwrap();
        }
        "tar.gz" => {
          let deflater = GzDecoder::new(&file);
          let mut archive = Archive::new(deflater);
          archive.unpack(folder.path()).unwrap();
        }
        "tar.xz" => {
          let decoder = XzDecoder::new(&file);
          let mut archive = Archive::new(decoder);
          archive.unpack(folder.path()).unwrap();
        }
        _ => panic!("Unexpected file extension"),
      }

      drop(file);

      let package = folder.path().join(package);
      let package = {
        let filename = NODE_ZUGRIFF.file_name().unwrap();
        let win = package.join(filename);
        let unix = package.join("bin").join(filename);
        if win.is_file() {
          win
        } else if unix.is_file() {
          unix
        } else {
          pretty::log(None, "Unable to locate Node.js executable. Please try again or choose a different installer.");
          return;
        }
      };

      copy(package, NODE_ZUGRIFF.as_path()).await.unwrap();
      fix_permissions(&NODE_ZUGRIFF);
    }

    pb.finish_and_clear();
    pretty::log(Some(Status::INSTALLED), "Installed Node.js");
  }
}

fn fix_permissions(path: &PathBuf) {
  #[cfg(target_family = "unix")]
  {
    use std::os::unix::fs::PermissionsExt;

    let metadata = path.metadata().unwrap();
    let mut permissions = metadata.permissions();
    permissions.set_mode(0o755);
    fs::set_permissions(path, permissions).unwrap();
  }
}
