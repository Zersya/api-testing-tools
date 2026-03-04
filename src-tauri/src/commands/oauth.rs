use tauri::{command, AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

/// Open OAuth URL in external browser
#[command]
pub async fn open_oauth_window(
    app: AppHandle,
    url: String,
    state: String,
) -> Result<(), String> {
    // Store the state for verification
    let oauth_state = app.state::<super::super::OAuthState>();
    let mut pending = oauth_state.pending.lock().map_err(|e: std::sync::PoisonError<std::sync::MutexGuard<'_, Option<String>>>| e.to_string())?;
    *pending = Some(state);

    // Open URL in default browser using opener plugin
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())?;

    Ok(())
}

/// Check if OAuth callback has been received
#[command]
pub async fn check_oauth_callback(
    _app: AppHandle,
) -> Result<Option<serde_json::Value>, String> {
    // This is a placeholder - in practice, the callback is handled via events
    // The frontend should listen for 'oauth-callback' event instead
    Ok(None)
}
