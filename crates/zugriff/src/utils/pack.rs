use anyhow::{anyhow, Result};
use colored::Colorize as _;
use flate2::read::GzDecoder;
use flate2::{Compression, GzBuilder};
use path_absolutize::Absolutize;
use serde_json::to_vec;
use size::Size;
use std::collections::hash_map::RandomState;
use std::fs::{copy, read_to_string, File};
use std::hash::{BuildHasher, Hasher};
use std::io::{Read, Seek, Write};
use std::str::FromStr;
use std::{
  env,
  fs::{create_dir_all, remove_dir_all},
  path::{Path, PathBuf},
};
use tar::{Archive, Builder};
use tempfile::NamedTempFile;
use tokio::process::Command;
use which::which;

#[cfg(target_family = "unix")]
use std::os::unix::fs::MetadataExt as _;

#[cfg(target_family = "windows")]
use std::os::windows::fs::MetadataExt as _;

use crate::utils::configuration::{ConfigurationFile, DynamicRoute, Meta, Technology};

use super::configuration::Redirect;
use super::dependencies::ESBUILD_ZUGRIFF;
use super::pretty::{self, Status};

pub static NEXT_ENTRYPOINT: &'static str = include_str!("./template/next.js");

pub async fn shadow(
  externals: Vec<String>,
  cwd: Option<String>,
  mut function: Option<String>,
  assets_flag: Vec<String>,
  puppets_flag: Vec<String>,
  redirects_flag: Vec<String>,
  disable_assets_default_index_html_redirect: bool,
) -> anyhow::Result<PathBuf> {
  let current = env::current_dir()?;
  let base = match &cwd {
    Some(cwd) => Path::new(cwd),
    None => Path::new(&current),
  };

  let dot_vercel = base.join(".vercel");
  let dot_zugriff = base.join(".zugriff");

  // Check for .vercel folder
  if dot_vercel.exists() {
    remove_dir_all(&dot_zugriff).ok();
    create_dir_all(&dot_zugriff)?;

    let assets = dot_zugriff.join("assets");
    let functions = dot_zugriff.join("functions");

    create_dir_all(&assets)?;
    create_dir_all(&functions)?;

    let mut config = ConfigurationFile::default();
    config.version = 1;
    config.meta = Some(Meta {
      technology: Some(Technology::NextJs),
    });

    let vercel_assets = dot_vercel.join("output").join("static");

    let cf_functions = dot_vercel
      .join("output")
      .join("static")
      .join("_worker.js")
      .join("__next-on-pages-dist__")
      .join("functions");

    if cf_functions.exists() {
      for (pattern, function) in extract_next_worker(&cf_functions, "/".into())? {
        let mut entrypoint = tempfile::Builder::new().suffix(".mjs").tempfile()?;
        entrypoint
          .write_all(
            NEXT_ENTRYPOINT
              .replace("<HANDLER>", function.to_str().unwrap())
              .as_bytes(),
          )
          .unwrap();

        let mut function_name = function
          .file_name()
          .unwrap()
          .to_str()
          .unwrap()
          .trim_end_matches(".func.js")
          .to_string();

        function_name.push_str(".");
        function_name.push_str(&RandomState::new().build_hasher().finish().to_string());

        function_name.push_str(".mjs");

        bundle_function(
          externals.clone(),
          entrypoint.path().into(),
          functions.clone().join(&function_name),
        )
        .await?;

        config.functions.push(DynamicRoute {
          path: format!("/{}", function_name.clone()),
          pattern,
        });
      }
    }

    for (file, relative) in discover_files(&vercel_assets, "/", false) {
      let relative = relative.trim_start_matches("/");

      if relative.starts_with("_worker.js/")
        || relative == "_headers"
        || relative.starts_with("cdn-cgi")
      {
        continue;
      }

      let destination = assets.clone().join(relative);

      if let Some(parent) = destination.parent() {
        create_dir_all(parent).ok();
      }

      copy(file, assets.join(relative))?;

      config.assets.push(format!("/{}", relative));
    }

    attach_assets(&base.into(), &assets, assets_flag, &mut config).ok();

    attach_middleware(puppets_flag, redirects_flag, true, false, &mut config);

    File::create(dot_zugriff.join("config.json"))?.write_all(&to_vec(&config)?)?;

    return Ok(dot_zugriff);
  }

  // * Custom build

  remove_dir_all(&dot_zugriff).ok();

  create_dir_all(&dot_zugriff).ok();
  create_dir_all(&dot_zugriff.join("functions")).ok();
  create_dir_all(&dot_zugriff.join("assets")).ok();

  let mut config = &mut ConfigurationFile::default();
  config.version = 1;

  if function.is_none() {
    if base.join("index.js").is_file() {
      function = Some("index.js".into());
    } else if base.join("index.ts").is_file() {
      function = Some("index.js".into());
    } else if base.join("src").join("index.js").is_file() {
      function = Some("src/index.js".into());
    } else if base.join("src").join("index.ts").is_file() {
      function = Some("src/index.ts".into());
    }
  }

  if let Some(function) = &function {
    let entrypoint = base.join(function);
    let outfile = dot_zugriff.join("functions").join("index.mjs");

    bundle_function(externals, entrypoint.absolutize().unwrap().into(), outfile).await?;
    config.functions.push(DynamicRoute {
      path: "/index.mjs".into(),
      pattern: "*".into(),
    })
  }

  attach_assets(
    &base.into(),
    &dot_zugriff.join("assets"),
    assets_flag,
    &mut config,
  )?;

  attach_middleware(
    puppets_flag,
    redirects_flag,
    disable_assets_default_index_html_redirect || function.is_some(),
    true,
    &mut config,
  );

  let package_json = base.join("package.json");
  if package_json.is_file() {
    if let Ok(package_json) = read_to_string(package_json) {
      if let Ok(package_json) = serde_json::from_str::<serde_json::Value>(&package_json) {
        if let Some(dependencies) = package_json.get("dependencies") {
          if let Some(dependencies) = dependencies.as_object() {
            if dependencies.contains_key("hono") {
              config.meta = Some(Meta {
                technology: Some(Technology::Hono),
              })
            }
          }
        }
      }
    }
  }

  File::create(dot_zugriff.join("config.json"))?.write_all(&to_vec(&config)?)?;

  Ok(dot_zugriff)
}

pub fn compress(dot_zugriff: PathBuf) -> Result<NamedTempFile> {
  let config = dot_zugriff.join("config.json");

  if !dot_zugriff.is_dir() || !config.is_file() {
    println!("Unable to locate `.zugriff` or `.zugriff/config.json`.");
    return Err(anyhow!("Missing configuration file"));
  }

  let file = NamedTempFile::new()?;
  let mut tarball = Builder::new(file.as_file());

  tarball.append_file("config.json", &mut File::open(&config)?)?;

  if dot_zugriff.join("functions").is_dir() {
    tarball.append_dir_all("functions", dot_zugriff.join("functions"))?;
  }

  if dot_zugriff.join("assets").is_dir() {
    tarball.append_dir_all("assets", dot_zugriff.join("assets"))?;
  }

  tarball.finish()?;
  tarball.get_mut().rewind()?;

  let mut compressed = tempfile::Builder::new().suffix(".tar.gz").tempfile()?;
  let mut compressor = GzBuilder::new().write(&compressed, Compression::best());

  std::io::copy(tarball.get_mut(), &mut compressor)?;
  compressor.flush()?;
  compressor.finish()?;

  tarball.get_mut().rewind()?;

  compressed.flush()?;
  compressed.rewind()?;

  Ok(compressed)
}

pub fn report(compressed: &mut File) {
  compressed.rewind().unwrap();

  #[cfg(target_family = "unix")]
  let compressed_size = compressed.metadata().unwrap().size();

  #[cfg(target_family = "windows")]
  let compressed_size = compressed.metadata().unwrap().file_size();

  let mut decompressor = GzDecoder::new(compressed);
  let mut archive = Archive::new(&mut decompressor);

  let mut manifest = None;
  let mut files = Vec::new();

  let mut uncompressed_size = 0;

  for entry in archive.entries().unwrap() {
    match entry {
      Ok(mut entry) => {
        uncompressed_size += entry.size();

        let size = Size::from_bytes(entry.size());
        files.push(format!(
          "{} ({})",
          entry.path().unwrap().to_str().unwrap().italic(),
          size,
        ));

        if manifest.is_some() {
          while let Some(file) = files.pop() {
            println!("{file}");
          }
        } else {
          if let Ok(path) = entry.path() {
            if let Some(file_name) = path.file_name() {
              if file_name.to_string_lossy() == "config.json" {
                let mut buf = Vec::new();
                entry.read_to_end(&mut buf).unwrap();
                manifest = Some(buf);

                println!("{}", String::from("Contents").bold());
                // Give chance to print error message
              }
            }
          }
        }
      }
      Err(err) => panic!("{} {} {:?}", file!(), line!(), err),
    }
  }

  let manifest = match manifest {
    Some(manifest) => match serde_json::from_slice(&manifest) {
      Ok::<ConfigurationFile, _>(manifest) => manifest,
      Err(_) => return pretty::log(Some(Status::WARNING), "Found invalid configuration file"),
    },
    None => return pretty::log(Some(Status::WARNING), "Unable to locate configuration file"),
  };

  while let Some(file) = files.pop() {
    println!("{file}");
  }

  println!("\n{}", String::from("Middleware").bold());
  let mut has_middleware = false;
  for (mut from, to) in manifest.puppets {
    has_middleware = true;
    if from == "" {
      from.push_str("/");
    }

    println!("{} → {} (Puppet)", from, to);
  }
  for mut redirect in manifest.redirects {
    has_middleware = true;
    if redirect.path == "" {
      redirect.path.push_str("/");
    }

    println!(
      "{} → {} → {} (Redirect)",
      redirect.path, redirect.status, redirect.location
    );
  }

  if !has_middleware {
    println!("-");
  }

  println!("\nUncompressed: {}", Size::from_bytes(uncompressed_size));
  println!("Compressed:   {}", Size::from_bytes(compressed_size));
}

fn attach_assets(
  base: &PathBuf,
  destination: &PathBuf,
  assets_flag: Vec<String>,
  config: &mut ConfigurationFile,
) -> Result<()> {
  for asset in assets_flag {
    for (file, relative) in discover_files(&base.join(asset).canonicalize().unwrap(), "/", false) {
      let destination = destination.clone().join(&relative.trim_start_matches('/'));

      if let Some(parent) = destination.parent() {
        create_dir_all(parent).ok();
      }

      copy(file, destination)?;
      config.assets.push(relative);
    }
  }

  Ok(())
}

fn discover_files(base: &PathBuf, prefix: &str, nested: bool) -> Vec<(PathBuf, String)> {
  let mut files = Vec::new();

  if base.is_dir() {
    let mut reader = base.read_dir().unwrap();

    while let Some(Ok(entry)) = reader.next() {
      let prefix = match nested {
        false => prefix.into(),
        true => format!("{}{}/", prefix, base.file_name().unwrap().to_str().unwrap()),
      };

      files.append(&mut discover_files(&entry.path(), &prefix, true))
    }
  } else if base.is_file() {
    return vec![(
      base.to_owned(),
      format!("{}{}", prefix, base.file_name().unwrap().to_str().unwrap()),
    )];
  } else {
    pretty::log(
      Some(Status::WARNING),
      &format!("Unable to locate \"{}\"", base.to_string_lossy()),
    )
  }

  files
}

fn extract_next_worker(base: &PathBuf, pattern: String) -> Result<Vec<(String, PathBuf)>> {
  let mut functions = Vec::new();
  let mut reader = base.read_dir()?;

  while let Some(Ok(entry)) = reader.next() {
    let filename = entry.file_name().into_string().unwrap();

    match entry.metadata()?.is_dir() {
      true => {
        let pattern = if filename.starts_with('[') && filename.ends_with(']') {
          format!("{}*/", pattern)
        } else {
          format!("{}{}/", pattern, filename)
        };

        let mut nested = extract_next_worker(&entry.path(), pattern)?;
        functions.append(&mut nested);
      }
      false => {
        if !filename.ends_with(".func.js") {
          continue;
        }

        if pattern == "/" && filename == "_not-found.func.js" {
          functions.push(("*".into(), entry.path()));
          continue;
        }

        if pattern == "/" && filename == "index.func.js" {
          functions.push(("/".into(), entry.path()));
          continue;
        }

        let filename = filename.trim_end_matches(".func.js");

        if filename.starts_with('[') && filename.ends_with(']') {
          functions.push((format!("{}*/", pattern), entry.path()));
        } else {
          functions.push((format!("{}{}/", pattern, filename), entry.path()));
        }
      }
    }
  }

  Ok(functions)
}

async fn bundle_function(
  externals: Vec<String>,
  entrypoint: PathBuf,
  outfile: PathBuf,
) -> Result<()> {
  let mut esbuild = if ESBUILD_ZUGRIFF.is_file() {
    Command::new(ESBUILD_ZUGRIFF.as_os_str())
  } else {
    Command::new(which("esbuild").unwrap())
  };

  esbuild.kill_on_drop(true);
  esbuild.arg(entrypoint);
  esbuild.arg("--bundle");
  esbuild.arg("--external:postgres");
  esbuild.arg("--external:ioredis");
  esbuild.arg("--external:nodemailer");
  esbuild.arg("--external:dotenv");
  esbuild.arg("--external:node:async_hooks");
  esbuild.arg("--external:node:buffer");
  esbuild.arg("--external:node:assert");
  esbuild.arg("--external:node:events");
  esbuild.arg("--external:node:path");
  esbuild.arg("--external:node:process");
  esbuild.arg("--external:node:util");
  // esbuild.arg("--external:node:string_decoder");

  for external in externals {
    esbuild.arg(format!("--external:{}", external));
  }
  esbuild.arg("--minify");
  esbuild.arg("--keep-names");
  esbuild.arg("--target=esnext");
  esbuild.arg("--platform=neutral");
  esbuild.arg("--format=esm");
  esbuild.arg(format!("--outfile={}", outfile.to_str().unwrap()));

  let output = esbuild.output().await.unwrap();

  if !output.status.success() {
    return Err(anyhow!(
      String::from_utf8_lossy(output.stderr.as_ref()).to_string()
    ));
  }

  Ok(())
}

pub fn attach_middleware(
  puppet: Vec<String>,
  redirect: Vec<String>,
  disable_assets_default_index_html_redirect: bool,
  disable_puppet_generation: bool,
  config: &mut ConfigurationFile,
) {
  let mut index_index = Vec::new();

  for asset in &config.assets {
    if asset.ends_with("/index.html")
      || asset.ends_with("/index.htm")
      || asset.ends_with("/index.xhtml")
    {
      let mut from = asset
        .trim_end_matches("/index.html")
        .trim_end_matches("/index.htm")
        .trim_end_matches("/index.xhtml")
        .to_owned();

      if from == "" {
        from.push('/');
      }

      index_index.push((from, asset));
    }
  }

  if !disable_puppet_generation {
    for (from, to) in &index_index {
      config.puppets.insert(from.to_string(), to.to_string());
    }
  }

  if !disable_assets_default_index_html_redirect {
    for (from, to) in index_index {
      config.redirects.push(Redirect {
        status: 308,
        path: from.into(),
        location: to.into(),
      });
    }
  }

  for puppet in puppet {
    match split_args(&puppet) {
      Some((from, to)) => {
        config.puppets.insert(from.to_owned(), to.to_owned());
      }
      None => pretty::log(
        Some(pretty::Status::WARNING),
        &format!("Unable to process puppet \"{}\"", puppet),
      ),
    }
  }

  for redirect in redirect {
    match split_args(&redirect) {
      Some((from, to)) => match split_args(&to) {
        Some((status, to)) => config.redirects.push(Redirect {
          status: u16::from_str(&status[1..]).unwrap_or_default(),
          path: from,
          location: to,
        }),
        None => config.redirects.push(Redirect {
          status: 308,
          path: from,
          location: to,
        }),
      },
      None => pretty::log(
        Some(pretty::Status::WARNING),
        &format!("Unable to process redirect \"{}\"", redirect),
      ),
    }
  }
}

fn split_args(input: &str) -> Option<(String, String)> {
  match input.find(":") {
    Some(i) => {
      let from = &input[..i];
      let to = &input[i + 1..];
      let from = if !from.starts_with("/") {
        format!("/{}", from)
      } else {
        from.to_owned()
      };

      let from = if from.ends_with("/") && from.len() > 1 {
        from[..from.len() - 1].to_owned()
      } else {
        from.to_owned()
      };

      Some((from.to_owned(), to.to_owned()))
    }
    None => None,
  }
}
