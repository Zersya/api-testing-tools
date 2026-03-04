use tauri::{command, AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Open OAuth URL in external browser
#[command]
pub async fn open_oauth_window(
    app: AppHandle,
    url: String,
    state: String,
) -> Result<(), String> {
    println!("[OAuth Command] Received URL: {}", url);
    println!("[OAuth Command] State: {}", state);

    // Validate URL format
    if url.is_empty() {
        return Err("URL cannot be empty".to_string());
    }

    // Check URL starts with http or https (OAuth URLs should)
    if !url.starts_with("http://") && !url.starts_with("https://") {
        return Err(format!("Invalid URL scheme. Expected http:// or https://, got: {}", &url[..url.find("://").map(|i| i + 3).unwrap_or(20.min(url.len()))]));
    }

    // Store the state for verification
    let oauth_state = app.state::<super::super::OAuthState>();
    let mut pending = oauth_state.pending.lock().map_err(|e: std::sync::PoisonError<std::sync::MutexGuard<'_, Option<String>>>| e.to_string())?;
    *pending = Some(state);
    println!("[OAuth Command] State stored successfully");

    // Open URL in default browser using opener plugin
    println!("[OAuth Command] Opening URL in browser...");
    match app.opener().open_url(&url, None::<&str>) {
        Ok(_) => {
            println!("[OAuth Command] URL opened successfully");
            Ok(())
        }
        Err(e) => {
            let error_msg = format!("Failed to open URL: {}", e);
            println!("[OAuth Command] Error: {}", error_msg);
            Err(error_msg)
        }
    }
}

/// Check if OAuth callback has been received (for polling fallback)
#[command]
pub async fn check_oauth_callback(
    app: AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    // Check if we have stored callback data from custom protocol
    if let Some(oauth_state) = app.try_state::<super::super::OAuthState>() {
        if let Ok(mut data) = oauth_state.callback_data.lock() {
            // Return and clear the callback data
            let result: Option<serde_json::Value> = data.take();
            return Ok(result);
        }
    }
    Ok(None)
}
