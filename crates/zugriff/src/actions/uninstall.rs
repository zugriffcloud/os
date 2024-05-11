use std::{env, process::ExitCode, time::Duration};

use indicatif::MultiProgress;
use tokio::{fs, task::JoinSet};

use crate::utils::{
  cache::cache_dir,
  pretty::{self, default_spinner, Status},
};

enum Step {
  CACHE,
  EXE,
}

pub async fn uninstall() -> ExitCode {
  let mut set = JoinSet::new();

  let multi_pg = MultiProgress::new();
  multi_pg.set_move_cursor(true);

  let pb = default_spinner();
  let pb = multi_pg.add(pb);
  pb.set_message("Emptying cache");
  set.spawn(async move {
    tokio::time::sleep(Duration::from_secs(5)).await;
    let cache_dir = cache_dir();
    fs::remove_dir_all(cache_dir).await.unwrap();

    pb.finish_and_clear();
    pb.println(pretty::format(Some(Status::REMOVED), "Cache emptied"));

    Step::CACHE
  });

  let pb = default_spinner();
  let pb = multi_pg.add(pb);
  pb.set_message("Removing executable");
  set.spawn(async move {
    tokio::time::sleep(Duration::from_secs(3)).await;
    fs::remove_file(env::current_exe().unwrap()).await.unwrap();

    pb.finish_and_clear();
    pb.println(pretty::format(Some(Status::REMOVED), "Executable removed"));

    Step::EXE
  });

  while let Some(_) = set.join_next().await {}

  println!("\n\nYou will be missed. Bye. 👋");

  ExitCode::SUCCESS
}
