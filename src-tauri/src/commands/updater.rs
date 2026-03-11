use tauri::{command, AppHandle};
use tauri_plugin_updater::UpdaterExt;

/// Check for available updates
#[command]
pub async fn check_update(app: AppHandle) -> Result<Option<UpdateInfo>, String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            println!("[Updater] Update available: {}", update.version);
            Ok(Some(UpdateInfo {
                version: update.version.to_string(),
                current_version: update.current_version.to_string(),
                body: update.body.clone().unwrap_or_default(),
                date: update.date.map(|d| d.to_string()).unwrap_or_default(),
            }))
        }
        Ok(None) => {
            println!("[Updater] No updates available");
            Ok(None)
        }
        Err(e) => {
            println!("[Updater] Error checking for updates: {}", e);
            Err(e.to_string())
        }
    }
}

/// Install the available update
#[command]
pub async fn install_update(app: AppHandle) -> Result<(), String> {
    let updater = app.updater().map_err(|e| e.to_string())?;

    match updater.check().await {
        Ok(Some(update)) => {
            println!("[Updater] Downloading and installing update...");

            // Download and install the update
            // First closure: progress callback (chunk_length, content_length)
            // Second closure: completion callback
            let _ = update
                .download_and_install(|_chunk_length, _content_length| {}, || {})
                .await
                .map_err(|e: tauri_plugin_updater::Error| e.to_string())?;

            println!("[Updater] Update installed, restarting...");

            // Restart the app (this never returns)
            app.restart();
        }
        Ok(None) => Err("No update available".to_string()),
        Err(e) => Err(e.to_string()),
    }
}

/// Update information returned to the frontend
#[derive(serde::Serialize, Clone)]
pub struct UpdateInfo {
    pub version: String,
    pub current_version: String,
    pub body: String,
    pub date: String,
}
