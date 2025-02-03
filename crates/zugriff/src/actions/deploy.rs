use awc::{
  http::StatusCode,
  ws::{self, Frame},
  Client,
};
use bytes::{Bytes, BytesMut};
use futures::{channel::mpsc, SinkExt, StreamExt};
use garde::Validate;
use serde::Deserialize;
use serde_json::from_str;
use std::{fs::OpenOptions, io::Seek};
use std::{
  fs::{read_to_string, remove_dir_all},
  process::ExitCode,
  time::Duration,
};
use std::{io::Write, path::Path};
use tokio::io::AsyncReadExt;
use url::Url;

use crate::utils::configuration::Legacy1ConfigurationFile;
use crate::utils::pack::attach_asset_cache_control;
use crate::{
  utils::{
    configuration::ConfigurationFile,
    deploy::{self, Message, State},
    pack::{attach_middleware, compress, report, shadow},
    pretty::{self, default_spinner},
  },
  ENVIRONMENT,
};

pub async fn deploy(
  cwd: Option<String>,
  deployment_token: Option<String>,
  function: Option<String>,
  assets: Vec<String>,
  promotions: Vec<String>,
  name: Option<String>,
  description: Option<String>,
  dry_run: bool,
  external: Vec<String>,
  puppet: Vec<String>,
  redirect: Vec<String>,
  disable_assets_default_index_html_redirect: bool,
  pack: bool,
  interceptors: Vec<String>,
  prefer_file_router: bool,
  prefer_puppets: bool,
  enable_static_router: bool,
  disable_static_router: bool,
  disable_function_discovery: bool,
  guards: Vec<String>,
  asset_cache_control: Vec<String>,
) -> ExitCode {
  let deployment_token = match deployment_token {
    Some(deployment_token) => deployment_token,
    None => {
      if dry_run {
        "".into()
      } else {
        println!("Missing Deploymen Token. Aborting.");
        return ExitCode::FAILURE;
      }
    }
  };

  let build_base = match cwd.clone() {
    Some(cwd) => Path::new(&cwd).join(".zugriff"),
    None => Path::new(".zugriff").to_path_buf(),
  };

  let build_config = build_base.join("config.json");

  let found_dot_zugriff = build_base.is_dir();

  let mut packed;

  if build_config.is_file() && !pack {
    debug!("Found pack to use");
    pretty::log(None, "Found `.zugriff` to deploy.");

    let mut build_config = OpenOptions::new()
      .write(true)
      .read(true)
      .open(build_config)
      .unwrap();
    let mut config = String::new();
    std::io::Read::read_to_string(&mut build_config, &mut config).unwrap();
    let original_configuration = config.clone();

    let mut config = match serde_json::from_str::<ConfigurationFile>(&config) {
      Ok(config) => config,
      Err(err) => match serde_json::from_str::<Legacy1ConfigurationFile>(&config) {
        Ok(config) => ConfigurationFile::from(config),
        Err(_) => {
          println!("Found invalid configuration file");
          debug!("{}", err);
          return ExitCode::FAILURE;
        }
      },
    };

    attach_asset_cache_control(&mut config, asset_cache_control);

    attach_middleware(
      &mut config,
      interceptors,
      puppet,
      redirect,
      prefer_file_router,
      prefer_puppets,
      enable_static_router,
      true,
      guards,
    );

    if let Err(error) = config.validate() {
      eprintln!("Found invalid configuration");
      eprintln!("{}", error);
      return ExitCode::FAILURE;
    }

    build_config.set_len(0).unwrap();
    build_config.rewind().unwrap();

    build_config
      .write_all(&serde_json::to_vec(&config).unwrap())
      .unwrap();

    let pack = compress(build_base.clone());

    build_config.set_len(0).unwrap();
    build_config.rewind().unwrap();

    build_config
      .write_all(original_configuration.as_bytes())
      .unwrap();

    packed = match pack {
      Ok(packed) => packed,
      Err(err) => {
        panic!("{}", err);
      }
    };
  } else {
    debug!("Packing or re-packing");

    let shadow = match shadow(
      external,
      cwd,
      function,
      assets,
      puppet,
      redirect,
      disable_assets_default_index_html_redirect,
      interceptors,
      prefer_file_router,
      prefer_puppets,
      enable_static_router,
      disable_static_router,
      disable_function_discovery,
      guards,
      asset_cache_control,
    )
    .await
    {
      Ok(shadow) => shadow,
      Err(err) => {
        if !found_dot_zugriff {
          remove_dir_all(build_base).ok();
        }
        panic!("{err}")
      }
    };

    let config = shadow.join("config.json");
    let config = read_to_string(config).unwrap();
    let config = from_str::<ConfigurationFile>(&config).unwrap();
    if let Err(error) = config.validate() {
      eprintln!("Found invalid configuration");
      eprintln!("{}", error);
      return ExitCode::FAILURE;
    }

    packed = compress(shadow).unwrap();
  }

  if !found_dot_zugriff {
    remove_dir_all(build_base).ok();
  }

  if dry_run {
    println!("THIS DEPLOYMENT WILL NOT BE DEPLOYED\n");
    report(packed.as_file_mut());

    return ExitCode::SUCCESS;
  }

  let client = Client::builder()
    .timeout(Duration::from_secs(60 * 15))
    .bearer_auth(&deployment_token)
    .max_redirects(10);

  debug!("Deployment API: {}", &ENVIRONMENT.deployment_api);

  let mut url = Url::parse(&ENVIRONMENT.deployment_api).unwrap();
  url.set_path("/api/v1/deployment/create");

  let client = client
    .finish()
    .post(url.to_string())
    .append_header((
      "User-Agent",
      format!("zugriff cli/{}", env!("CARGO_PKG_VERSION")),
    ))
    .append_header(("X-Zugriff-Cli-Version", env!("CARGO_PKG_VERSION")));

  let client = match name {
    Some(name) => client.append_header(("X-DEPLOYMENT-NAME", name)),
    None => client,
  };

  let client = match description {
    Some(description) => client.append_header(("X-DEPLOYMENT-DESCRIPTION", description)),
    None => client,
  };

  let client = client.append_header((
    "X-DEPLOYMENT-PROMOTIONS",
    serde_json::to_string(&promotions).unwrap(),
  ));

  let (mut tx, rx) = mpsc::channel::<Result<Bytes, awc::error::HttpError>>(1);

  tokio::spawn(async move {
    let mut reader = tokio::fs::File::open(packed.path()).await.unwrap();

    loop {
      let capacity = 1024;
      let mut buf = BytesMut::with_capacity(capacity);
      reader.read_buf(&mut buf).await.unwrap();

      let buf_len = buf.len();

      trace!("Sending chunk of size {}", buf_len);
      tx.send(Ok(buf.into())).await.unwrap();
      trace!("Chunk sent");

      if buf_len < capacity {
        trace!("Sent last chunk");
        break;
      }
    }
  });

  let mut response = match client.send_stream(rx).await {
    Ok(response) => response,
    Err(err) => {
      debug!("{}", err);

      pretty::log(
        Some(pretty::Status::WARNING),
        "Unable to establish connection with the Deployment API",
      );
      return ExitCode::FAILURE;
    }
  };
  debug!("Uploaded application with status {}", response.status());

  if response.status() == StatusCode::UNAUTHORIZED {
    println!("Unauthorised.");
    return ExitCode::FAILURE;
  }

  if response.status() == StatusCode::FORBIDDEN {
    #[derive(Deserialize)]
    struct Info {
      account: bool,
      organisation: bool,
      project: bool,
    }

    let info = response.json::<Info>().await.unwrap();

    if info.account {
      eprintln!("Account token deployment created with suspended.");
    }

    if info.organisation {
      eprintln!("Organisation suspended.");
    }

    if info.project {
      eprintln!("Project suspended.");
    }

    if !info.account && !info.organisation && !info.project {
      eprintln!("Something went terribly wrong.");
    }

    return ExitCode::FAILURE;
  }

  if response.status() == StatusCode::TOO_MANY_REQUESTS {
    let info = response.body().await.unwrap();
    eprintln!("Wow, please slow down.");
    eprintln!("{}", String::from_utf8_lossy(&info));
    return ExitCode::FAILURE;
  }

  let body: deploy::Result = match response.json().await {
    Ok(body) => body,
    Err(err) => panic!("{:?}", err),
  };

  debug!(
    "WS General Purpose API: {}",
    &ENVIRONMENT.ws_general_purpose_api
  );

  let mut url = Url::parse(&ENVIRONMENT.ws_general_purpose_api).unwrap();
  url.set_path(&format!(
    "api/v1/organisation/0/project/0/deployment/{}/status",
    body.deployment
  ));

  let (_response, mut connection) = match Client::builder()
    .max_http_version(awc::http::Version::HTTP_11)
    .finish()
    .ws(url.to_string())
    .connect()
    .await
  {
    Ok(response) => response,
    Err(err) => {
      debug!("{}", err);

      pretty::log(
        Some(pretty::Status::WARNING),
        "Unable to establish connection with the General Purpose API to fetch the deployment state",
      );
      return ExitCode::FAILURE;
    }
  };

  connection
    .send(ws::Message::Text(deployment_token.into()))
    .await
    .unwrap();

  let pb = default_spinner();

  pb.set_message("Waiting for status report …");

  let mut domains = Vec::new();

  loop {
    let frame = match connection.next().await.unwrap() {
      Ok(frame) => frame,
      Err(err) => {
        panic!("Protocol error. {}", err.to_string());
      }
    };

    match frame {
      Frame::Text(text) => {
        let text: &'static [u8] = Box::leak(Box::new(text));
        let text = String::from_utf8_lossy(text).to_owned();
        pb.set_message(text)
      }
      Frame::Binary(message) => match bincode::deserialize::<Message>(&message) {
        Ok(message) => match message {
          Message::DOMAINS(mut value) => domains.append(&mut value),
          Message::STATE(state) => {
            pb.set_message(match state {
              State::SIZE => "Checking size of deployment.",
              State::SECURITY => "Validating deployment security.",
              State::STRUCTURE => "Validating deployment structure.",
              State::UPLOAD => "Preparing deployment for distribution.",
              State::DNS => "Triggering deployment distribution.",
              State::ERROR => "An error occurred.",
            });
            if state == State::ERROR {
              pb.finish_and_clear();
              eprintln!("An error occurred.");
              break ExitCode::FAILURE;
            }
          }
          Message::ERROR(value) => {
            pb.finish_and_clear();

            if value.len() == 0 {
              eprintln!("An error occurred.");
              break ExitCode::FAILURE;
            }

            eprintln!("{}", value);
            break ExitCode::FAILURE;
          }
          Message::SUCCESS => {
            pb.finish_and_clear();

            if domains.len() > 0 {
              println!("All set! Access your deployment at … \n");
            } else {
              println!("All set! \n");
            }

            for domain in domains {
              pretty::log(Some(pretty::Status::LINK), &format!("https://{}", &domain));
            }

            break ExitCode::SUCCESS;
          }
        },
        Err(err) => {
          panic!("Unable to extract message from bincode. {}", err);
        }
      },
      Frame::Close(_) => break ExitCode::SUCCESS,
      _ => eprintln!("unknown messag received"),
    }
  }
}
