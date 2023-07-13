use std::net::SocketAddr;

use bytes::Bytes;
use futures::lock::Mutex;
use holochain::conductor::ConductorHandle;
use holochain_client::AdminWebsocket;
use http_body_util::Full;
use hyper::{server::conn::http1, service::service_fn, Response};
use tauri::{AppHandle, Manager};
use tokio::net::TcpListener;

use crate::{
    error::{WeError, WeResult},
    filesystem::WeFileSystem,
    launch::get_admin_ws,
};

pub fn pong_iframe() -> String {
    format!("<html><head></head><body><script>window.onload = () => window.parent.postMessage('pong', '*') </script></body></html>")
}

pub fn start_applet_uis_server(app_handle: AppHandle, ui_server_port: u16) -> () {
    tauri::async_runtime::spawn(async move {
        let addr: SocketAddr = ([127, 0, 0, 1], ui_server_port).into();

        let listener = TcpListener::bind(addr).await.expect("Can't bind to port");

        loop {
            let (stream, _) = listener
                .accept()
                .await
                .expect("Can't accept new request on stream");
            let app_handle = app_handle.clone();
            tauri::async_runtime::spawn(async move {
                let app_handle = &app_handle;
                let sfn = service_fn(move |request| async move {
                    let host = request
                        .headers()
                        .get("host")
                        .ok_or(WeError::AppletsUIServerError(String::from(
                            "URI has no host",
                        )))?
                        .clone()
                        .to_str()
                        .map_err(|err| WeError::AppletsUIServerError(format!("{:?}", err)))?
                        .to_string();

                    if host.starts_with("ping.localhost") {
                        let r: WeResult<Response<Full<Bytes>>> = Ok(Response::builder()
                            .status(202)
                            .header("content-type", "text/html")
                            .body(Full::new(Bytes::from(pong_iframe().as_bytes().to_vec())))
                            .map_err(|err| WeError::AppletsUIServerError(format!("{:?}", err)))?);
                        return r;
                    }

                    let split_host: Vec<String> =
                        host.split(".").into_iter().map(|s| s.to_string()).collect();
                    let lowercase_applet_id = split_host.get(0).unwrap();

                    let file_name = request.uri().path();

                    let fs = app_handle.state::<WeFileSystem>();
                    let mutex = app_handle.state::<Mutex<ConductorHandle>>();
                    let conductor = mutex.lock().await;
                    let mut admin_ws = get_admin_ws(&conductor).await?;

                    let r: WeResult<Response<Full<Bytes>>> = match read_asset(
                        &fs,
                        &mut admin_ws,
                        &lowercase_applet_id,
                        file_name.to_string(),
                    )
                    .await
                    {
                        Ok(Some((asset, mime_type))) => {
                            let mut response_builder = Response::builder().status(202);
                            if let Some(mime_type) = mime_type {
                                response_builder =
                                    response_builder.header("content-type", mime_type);
                            }

                            Ok(response_builder
                                .body(Full::new(Bytes::from(asset)))
                                .unwrap())
                        }
                        Ok(None) => Ok(Response::builder()
                            .status(404)
                            .body(Full::new(Bytes::from(vec![])))
                            .map_err(|err| WeError::AppletsUIServerError(format!("{:?}", err)))?),
                        Err(e) => Ok(Response::builder()
                            .status(500)
                            .body(Full::new(Bytes::from(format!("{:?}", e))))
                            .unwrap()),
                    };
                    r
                });
                if let Err(err) = http1::Builder::new().serve_connection(stream, sfn).await {
                    println!("Error serving connection: {:?}", err);
                }
            });
        }
    });
}

pub fn iframe() -> String {
    format!(
        r#"
        <html>
          <head>
            <style>
              body {{
                margin: 0; 
                height: 100%; 
                width: 100%; 
                display: flex;
              }}
            </style>
            <link href="/styles.css" rel="stylesheet"></link>
          </head>
          <body>
            <script type="module">
              {}
            </script>
          </body>
        </html>
    "#,
        include_str!("../../ui/applet-iframe/dist/index.mjs")
    )
}

async fn get_applet_id_from_lowercase(
    lowercase_applet_id: &String,
    admin_ws: &mut AdminWebsocket,
) -> WeResult<String> {
    let apps = admin_ws.list_apps(None).await?;

    let app = apps
        .into_iter()
        .find(|app| {
            app.installed_app_id.eq(lowercase_applet_id)
                || app.installed_app_id.to_lowercase().eq(lowercase_applet_id)
        })
        .ok_or(WeError::AdminWebsocketError(String::from(
            "Applet is not installed",
        )))?;
    Ok(app.installed_app_id.clone())
}

pub async fn read_asset(
    we_fs: &WeFileSystem,
    admin_ws: &mut AdminWebsocket,
    applet_id: &String,
    mut asset_name: String,
) -> WeResult<Option<(Vec<u8>, Option<String>)>> {
    if asset_name.starts_with("/") {
        asset_name = asset_name.strip_prefix("/").unwrap().to_string();
    }
    if let "index.html" | "" = asset_name.as_str() {
        return Ok(Some((
            iframe().as_bytes().to_vec(),
            Some(String::from("text/html")),
        )));
    }

    let applet_id = get_applet_id_from_lowercase(applet_id, admin_ws).await?;

    let assets_path = we_fs.ui_store().ui_path(&applet_id);
    let asset_file = assets_path.join(asset_name);

    let mime_guess = mime_guess::from_path(asset_file.clone());

    let mime_type = match mime_guess.first() {
        Some(mime) => Some(mime.essence_str().to_string()),
        None => {
            log::info!("Could not determine MIME Type of file '{:?}'", asset_file);
            // println!("\n### ERROR ### Could not determine MIME Type of file '{:?}'\n", asset_file);
            None
        }
    };

    match std::fs::read(asset_file.clone()) {
        Ok(asset) => Ok(Some((asset, mime_type))),
        Err(_e) => Ok(None), // {
    }
}
