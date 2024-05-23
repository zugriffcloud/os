use std::{env, process::ExitCode};

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
  #[cfg(windows)]
  {
    pretty::log(
      Some(Status::WARNING),
      "Please remove the executable manually",
    );
    pretty::log(None, &format!("{:?}\n", env::current_exe().unwrap()));
  }

  let mut set = JoinSet::new();

  let multi_pg = MultiProgress::new();
  multi_pg.set_move_cursor(true);

  let pb = default_spinner();
  let pb = multi_pg.add(pb);
  pb.set_message("Emptying cache");
  set.spawn(async move {
    let cache_dir = cache_dir();
    fs::remove_dir_all(cache_dir).await.unwrap();

    pb.finish_and_clear();
    pb.println(pretty::format(Some(Status::REMOVED), "Cache emptied"));

    Step::CACHE
  });

  #[cfg(unix)]
  {
    let pb = default_spinner();
    let pb = multi_pg.add(pb);
    pb.set_message("Removing executable");
    set.spawn(async move {
      fs::remove_file(env::current_exe().unwrap()).await.unwrap();

      pb.finish_and_clear();
      pb.println(pretty::format(Some(Status::REMOVED), "Executable removed"));

      Step::EXE
    });
  }

  while let Some(_) = set.join_next().await {}

  println!("\n\nYou will be missed. Take care.");

  ExitCode::SUCCESS
}
