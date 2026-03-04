mod commands;
mod models;
mod utils;

use std::sync::{Arc, Mutex};
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

// Store pending OAuth state and callback data
pub struct OAuthState {
    pub pending: Mutex<Option<String>>, // Store the state parameter
    pub callback_data: Arc<Mutex<Option<serde_json::Value>>>, // Store received callback data
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_http::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_deep_link::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .manage(OAuthState {
            pending: Mutex::new(None),
            callback_data: Arc::new(Mutex::new(None)),
        })
        .invoke_handler(tauri::generate_handler![
            commands::api::fetch,
            commands::oauth::open_oauth_window,
            commands::oauth::check_oauth_callback,
            commands::updater::check_update,
            commands::updater::install_update
        ])
        .setup(|app| {
            // Handle custom protocol on macOS
            #[cfg(target_os = "macos")]
            {
                app.set_activation_policy(tauri::ActivationPolicy::Regular);
            }

            // Handle URL scheme events (custom protocol)
            let app_handle = app.handle().clone();
            let app_handle_for_closure = app_handle.clone();
            app_handle.deep_link().on_open_url(move |event: tauri_plugin_deep_link::OpenUrlEvent| {
                let urls = event.urls();
                println!("[URL Scheme] Event received with {} URLs", urls.len());
                for url in urls {
                    println!("[URL Scheme] Processing URL: {}", url);
                    handle_custom_protocol(&app_handle_for_closure, url.as_str());
                }
            });

            // Check if there are any pending URLs (in case app was launched via URL)
            match app.deep_link().get_current() {
                Ok(Some(urls)) => {
                    println!("[URL Scheme] Startup URLs found: {}", urls.len());
                    for url in urls {
                        println!("[URL Scheme] Processing startup URL: {}", url);
                        handle_custom_protocol(&app_handle, url.as_str());
                    }
                }
                Ok(None) => {
                    println!("[URL Scheme] No startup URLs found");
                }
                Err(e) => {
                    println!("[URL Scheme] Error getting startup URLs: {}", e);
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

fn handle_custom_protocol(app_handle: &tauri::AppHandle, url: &str) {
    println!("[Custom Protocol] Received URL: {}", url);

    // Parse the URL to extract OAuth callback data
    // Expected format: mockservice://oauth/callback?state=xxx&code=xxx
    // Also support legacy format: id.mock-service://oauth/callback?state=xxx&code=xxx
    if url.starts_with("mockservice://oauth/callback") || url.starts_with("id.mock-service://oauth/callback") {
        println!("[Custom Protocol] Matched callback URL pattern: {}", url);

        if let Some(query_start) = url.find('?') {
            let query = &url[query_start + 1..];
            println!("[Custom Protocol] Query string: {}", query);

            let params: std::collections::HashMap<_, _> = query
                .split('&')
                .filter_map(|p| {
                    let mut parts = p.splitn(2, '=');
                    let key = parts.next()?;
                    let value = parts.next().unwrap_or("");
                    // URL decode the value
                    let decoded_value = urlencoding::decode(value).unwrap_or(value.into()).to_string();
                    Some((key.to_string(), decoded_value))
                })
                .collect();

            println!("[Custom Protocol] Parsed params: {:?}", params.keys().collect::<Vec<_>>());

            if let (Some(state), Some(code)) = (params.get("state"), params.get("code")) {
                println!("[Custom Protocol] State: {}, Code: {}", state, code);

                let callback_data = serde_json::json!({
                    "state": state,
                    "code": code,
                    "session_state": params.get("session_state"),
                    "iss": params.get("iss")
                });

                // Store callback data for polling fallback
                if let Some(oauth_state) = app_handle.try_state::<OAuthState>() {
                    if let Ok(mut data) = oauth_state.callback_data.lock() {
                        *data = Some(callback_data.clone());
                        println!("[Custom Protocol] Stored callback data for polling");
                    }
                }

                // Emit event to frontend with the auth data
                match app_handle.emit("oauth-callback", callback_data) {
                    Ok(_) => println!("[Custom Protocol] Successfully emitted oauth-callback event"),
                    Err(e) => println!("[Custom Protocol] Failed to emit event: {}", e),
                }
            } else {
                println!("[Custom Protocol] Missing state or code in params");
            }
        } else {
            println!("[Custom Protocol] No query string found in URL");
        }
    } else {
        println!("[Custom Protocol] URL did not match callback pattern");
    }
}
