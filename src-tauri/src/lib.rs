mod commands;
mod models;
mod utils;

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![commands::api::fetch])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
