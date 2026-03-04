mod commands;
mod models;
mod utils;

use std::sync::Mutex;
use tauri::{Emitter, Listener};

// Store pending OAuth state
pub struct OAuthState {
    pub pending: Mutex<Option<String>>, // Store the state parameter
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .manage(OAuthState {
            pending: Mutex::new(None),
        })
        .invoke_handler(tauri::generate_handler![
            commands::api::fetch,
            commands::oauth::open_oauth_window,
            commands::oauth::check_oauth_callback
        ])
        .setup(|app| {
            // Handle custom protocol on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Regular);
            }

            // Listen for custom protocol events
            let app_handle = app.handle().clone();
            app.listen("tauri://open-url", move |event: tauri::Event| {
                if let Ok(url) = serde_json::from_str::<String>(event.payload()) {
                    handle_custom_protocol(&app_handle, &url);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_custom_protocol(app_handle: &tauri::AppHandle, url: &str) {
    println!("[Custom Protocol] Received URL: {}", url);

    // Parse the URL to extract OAuth callback data
    // Expected format: id.mock-service://oauth/callback?state=xxx&code=xxx
    if url.starts_with("id.mock-service://oauth/callback") {
        if let Some(query_start) = url.find('?') {
            let query = &url[query_start + 1..];
            let params: std::collections::HashMap<_, _> = query
                .split('&')
                .filter_map(|p| {
                    let mut parts = p.splitn(2, '=');
                    Some((parts.next()?.to_string(), parts.next().unwrap_or("").to_string()))
                })
                .collect();

            if let (Some(state), Some(code)) = (params.get("state"), params.get("code")) {
                println!("[Custom Protocol] State: {}, Code: {}", state, code);

                // Emit event to frontend with the auth data
                let _ = app_handle.emit("oauth-callback", serde_json::json!({
                    "state": state,
                    "code": code,
                    "session_state": params.get("session_state"),
                    "iss": params.get("iss")
                }));
            }
        }
    }
}
