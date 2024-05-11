use std::{fs::create_dir_all, path::PathBuf};

use directories::ProjectDirs;

pub fn project_dir() -> ProjectDirs {
  ProjectDirs::from("eu", "zugriff", "cli").unwrap()
}

pub fn cache_dir() -> PathBuf {
  let project_dirs = project_dir();
  let cache_dir = project_dirs.cache_dir();
  create_dir_all(&cache_dir).unwrap();

  cache_dir.to_owned()
}
