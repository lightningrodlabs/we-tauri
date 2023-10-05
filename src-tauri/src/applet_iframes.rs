use std::net::SocketAddr;
use futures::lock::Mutex;
use holochain_client::AdminWebsocket;
use hyper::{
    service::{make_service_fn, service_fn},
    Body, Response, Server,
};
use tauri::{AppHandle, Manager};

use crate::{
    error::{WeError, WeResult},
    filesystem::{WeFileSystem, UiIdentifier},
};

pub fn pong_iframe() -> String {
    format!("<html><head></head><body><script>window.onload = () => window.parent.postMessage('pong', '*') </script></body></html>")
}

pub fn start_applet_uis_server(app_handle: AppHandle, ui_server_port: u16) -> () {
    tauri::async_runtime::spawn(async move {
        let addr: SocketAddr = ([127, 0, 0, 1], ui_server_port).into();
        let app_handle = app_handle.clone();
        // The closure inside `make_service_fn` is run for each connection,
        // creating a 'service' to handle requests for that specific connection.
        let make_service = make_service_fn(move |_| {
            let app_handle = app_handle.clone();
            // While the state was moved into the make_service closure,
            // we need to clone it here because this closure is called
            // once for every connection.
            //
            // Each connection could send multiple requests, so
            // the `Service` needs a clone to handle later requests.
            async move {
                // This is the `Service` that will handle the connection.
                // `service_fn` is a helper to convert a function that
                // returns a Response into a `Service`.
                let app_handle = app_handle.clone();
                Ok::<_, hyper::Error>(service_fn(move |request| {
                    let app_handle = app_handle.clone();
                    async move {
                        let app_handle = app_handle.clone();
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
                            let r: WeResult<Response<Body>> = Ok(Response::builder()
                                .status(202)
                                .header("content-type", "text/html")
                                .body(pong_iframe().into())
                                .map_err(|err| {
                                    WeError::AppletsUIServerError(format!("{:?}", err))
                                })?);
                            return r;
                        }

                        let split_host: Vec<String> =
                            host.split(".").into_iter().map(|s| s.to_string()).collect();
                        let lowercase_applet_id = split_host.get(0).unwrap();

                        let file_name = request.uri().path();

                        let fs = app_handle.state::<WeFileSystem>();
                        let mutex = app_handle.state::<Mutex<AdminWebsocket>>();
                        let mut admin_ws = mutex.lock().await;

                        let r: WeResult<Response<Body>> = match read_asset(
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

                                Ok(response_builder.body(asset.into()).unwrap())
                            }
                            Ok(None) => Ok(Response::builder()
                                .status(404)
                                .body(vec![].into())
                                .map_err(|err| {
                                    WeError::AppletsUIServerError(format!("{:?}", err))
                                })?),
                            Err(e) => Ok(Response::builder()
                                .status(500)
                                .body(format!("{:?}", e).into())
                                .unwrap()),
                        };
                        admin_ws.close();
                        r
                    }
                }))
            }
        });

        // let app_handle = &app_handle;
        // let make_svc = make_service_fn(|_conn| async {
        //     // service_fn converts our function into a `Service`
        //     Ok::<_, Infallible>(service_fn(|request: Request<Body>| async move {
        //         }
        // })
        // });

        let server = Server::bind(&addr).serve(make_service);
        if let Err(err) = server.await {
            println!("Error serving connection: {:?}", err);
        }
    });
}

// pub fn _iframe() -> String {
//     format!(
//         r#"
//         <html>
//           <head>
//             <style>
//               body {{
//                 margin: 0;
//                 height: 100%;
//                 width: 100%;
//                 display: flex;
//               }}
//             </style>
//           </head>
//           <body>
//             <script type="module">
//               {}
//             </script>
//           </body>
//         </html>
//     "#,
//         include_str!("../../ui/applet-iframe/dist/index.mjs")
//     )
// }

pub fn app_id_from_applet_id(applet_id: &String) -> String {
    format!("applet#{}", applet_id)
}

pub fn applet_id_from_app_id(installed_app_id: &String) -> WeResult<String> {
    match installed_app_id.strip_prefix("applet#") {
        Some(id) => Ok(id.to_string()),
        None => Err(WeError::CustomError(String::from("Failed to convert installed_app_id to applet id.")))
    }
}

async fn get_applet_id_from_lowercase(
    lowercase_applet_id: &String,
    admin_ws: &mut AdminWebsocket,
) -> WeResult<String> {
    let apps = admin_ws.list_apps(None).await?;

    let app = apps
        .into_iter()
        .find(|app| {
            app.installed_app_id.eq(&app_id_from_applet_id(lowercase_applet_id))
                || app.installed_app_id.to_lowercase().eq(&app_id_from_applet_id(lowercase_applet_id))
        })
        .ok_or(WeError::AdminWebsocketError(String::from(
            "Applet is not installed",
        )))?;
    applet_id_from_app_id(&app.installed_app_id)
}

pub async fn read_asset(
    we_fs: &WeFileSystem,
    admin_ws: &mut AdminWebsocket,
    applet_id_lowercase: &String,
    mut asset_name: String,
) -> WeResult<Option<(Vec<u8>, Option<String>)>> {
    println!("Reading asset from filesystem. Asset name: {}", asset_name);
    if asset_name.starts_with("/") {
        asset_name = asset_name.strip_prefix("/").unwrap().to_string();
    }
    if let "" = asset_name.as_str() {
        asset_name = String::from("index.html");
    }
    let applet_app_id = app_id_from_applet_id(
        &get_applet_id_from_lowercase(applet_id_lowercase, admin_ws).await?
    );
    println!("got applet id from lowercase: {}", applet_app_id);

    let gui_release_hash_option = we_fs.apps_store().get_gui_release_hash(&applet_app_id)?;

    let gui_release_hash = match gui_release_hash_option {
        Some(hash) => hash,
        None => return Ok(None)
    };

    let assets_dir = we_fs.ui_store().assets_dir(UiIdentifier::GuiReleaseHash(gui_release_hash));
    let asset_file = assets_dir.join(asset_name);

    println!("Reading asset file: {:?}", asset_file);

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
        Err(e) => {
            println!("Failed to read asset. Error: {}", e);
            Ok(None)
        },
    }
}
