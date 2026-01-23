#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::fs;
use std::path::PathBuf;
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Manager, State};
use serde::{Deserialize, Serialize};
use serde_json::Value;
// Using std::process::Command directly for process spawning

struct ServerState {
    is_running: bool,
    port: u16,
}

impl Default for ServerState {
    fn default() -> Self {
        ServerState {
            is_running: false,
            port: 3001,
        }
    }
}

struct AppState {
    server_state: Arc<Mutex<ServerState>>,
    _child: Option<std::process::Child>,
}

impl Default for AppState {
    fn default() -> Self {
        AppState {
            server_state: Arc::new(Mutex::new(ServerState {
                is_running: false,
                port: 3001,
            })),
            _child: None,
        }
    }
}

#[derive(Serialize, Deserialize, Debug)]
pub struct ServerStatus {
    running: bool,
    port: u16,
    url: String,
}

#[derive(Serialize, Deserialize, Debug)]
pub struct FetchOptions {
    endpoint: String,
    method: String,
    body: Option<Value>,
    headers: Option<Value>,
}

#[tauri::command]
fn get_platform() -> String {
    std::env::consts::OS.to_string()
}

#[tauri::command]
fn get_version() -> String {
    env!("CARGO_PKG_VERSION").to_string()
}

#[tauri::command]
fn get_app_data_dir(app: AppHandle) -> PathBuf {
    app.path().app_data_dir().unwrap_or_else(|_| {
        PathBuf::from(".")
    })
}

fn get_resource_path(app: &AppHandle) -> PathBuf {
    app.path().resource_dir().unwrap_or_else(|_| {
        PathBuf::from(".")
    })
}

fn get_node_executable() -> String {
    let paths = [
        "node",
        "/usr/local/bin/node",
        "/opt/homebrew/bin/node",
        "/usr/bin/node"
    ];

    for path in paths {
        if std::process::Command::new(path).arg("--version").spawn().is_ok() {
            return path.to_string();
        }
    }

    "node".to_string()
}

#[tauri::command]
async fn server_health_check(_state: State<'_, Arc<Mutex<ServerState>>>, timeout: u64) -> Result<bool, String> {
    let start_time = std::time::Instant::now();
    let check_interval = std::time::Duration::from_millis(1000);
    let addr = "127.0.0.1:3001".parse::<std::net::SocketAddr>().unwrap();
    
    println!("[TAURI] Checking server health on 127.0.0.1:3001 with timeout {}s...", timeout);
    
    loop {
        if std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(500)).is_ok() {
            println!("[TAURI] Server is responding!");
            return Ok(true);
        }
        
        if start_time.elapsed().as_secs() > timeout {
            return Err("Server did not start in time".to_string());
        }
        
        tokio::time::sleep(check_interval).await;
    }
}

#[tauri::command]
async fn start_server(app: AppHandle, state: State<'_, Arc<Mutex<ServerState>>>) -> Result<ServerStatus, String> {
    // 1. Check if already running (scoped lock)
    let port = {
        let state_guard = state.lock().map_err(|_| "Failed to lock server state".to_string())?;
        let addr = "127.0.0.1:3001".parse::<std::net::SocketAddr>().unwrap(); 
        if std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(500)).is_ok() {
            println!("[TAURI] Server already running");
            return Ok(ServerStatus {
                running: true,
                port: state_guard.port,
                url: format!("http://127.0.0.1:{}", state_guard.port),
            });
        }
        state_guard.port
    };

    let resource_dir = get_resource_path(&app);
    let server_resources = resource_dir.join("server");
    let server_entry = server_resources.join("index.mjs");
    
    println!("[TAURI] Resource dir: {:?}", resource_dir);
    println!("[TAURI] Server resources: {:?}", server_resources);
    println!("[TAURI] Server entry: {:?}", server_entry);
    
    let app_data_dir = get_app_data_dir(app.clone());
    let target_db = app_data_dir.join("sqlite.db");
    
    println!("[TAURI] App data dir: {:?}", app_data_dir);
    println!("[TAURI] Target DB: {:?}", target_db);
    
    // Create app data directory if it doesn't exist
    if let Err(e) = fs::create_dir_all(&app_data_dir) {
        println!("[TAURI] Warning: Failed to create app data dir: {}", e);
    }
    
    if !target_db.exists() {
        let source_db = server_resources.join("sqlite.db");
        if source_db.exists() {
            println!("[TAURI] Copying database from {:?} to {:?}", source_db, target_db);
            if let Err(e) = fs::copy(&source_db, &target_db) {
                println!("[TAURI] Warning: Failed to copy database: {}", e);
            }
        } else {
            println!("[TAURI] Warning: Source database not found at {:?}", source_db);
        }
    }
    
    let node_path = get_node_executable();
    println!("[TAURI] Using Node.js at: {}", node_path);
    
    // Check if Node.js is available
    let node_check = std::process::Command::new(&node_path)
        .arg("--version")
        .output();
    
    match node_check {
        Ok(output) => {
            let version = String::from_utf8_lossy(&output.stdout);
            println!("[TAURI] Node.js version: {}", version.trim());
        }
        Err(e) => {
            return Err(format!("Node.js not found or not executable: {}. Please install Node.js.", e));
        }
    }
    
    // Log file existence checks for debugging
    println!("[TAURI] Checking server_entry.exists(): {}", server_entry.exists());
    println!("[TAURI] Checking server_resources.exists(): {}", server_resources.exists());
    
    // List contents of server_resources for debugging
    if server_resources.exists() {
        println!("[TAURI] Contents of server_resources:");
        if let Ok(entries) = fs::read_dir(&server_resources) {
            for entry in entries.flatten() {
                println!("[TAURI]   - {:?}", entry.file_name());
            }
        }
    }
    
    if !server_entry.exists() {
        return Err(format!("Server entry point not found: {:?}. The server files may not have been bundled correctly.", server_entry));
    }
    
    // Check if server directory exists and has required files
    if !server_resources.exists() {
        return Err(format!("Server resources directory not found: {:?}", server_resources));
    }

    // Start the server with stdout/stderr capture for debugging
    println!("[TAURI] Starting Node.js server...");
    
    let child = std::process::Command::new(&node_path)
        .arg(server_entry.to_string_lossy().to_string())
        .env("TAURI_ENV_DEV", "false")
        .env("TAURI", "true")
        .env("NODE_ENV", "production")
        .env("PORT", "3001")
        .env("HOST", "127.0.0.1")
        .env("NITRO_PORT", "3001")
        .env("NITRO_HOST", "127.0.0.1")
        .env("SQLITE_DB_PATH", target_db.to_string_lossy().to_string())
        .current_dir(&server_resources)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped())
        .spawn();
    
    match child {
        Ok(mut process) => {
            // Spawn a thread to capture and log stdout
            if let Some(stdout) = process.stdout.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    let reader = BufReader::new(stdout);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            println!("[NODE-OUT] {}", line);
                        }
                    }
                });
            }
            
            // Spawn a thread to capture and log stderr
            if let Some(stderr) = process.stderr.take() {
                std::thread::spawn(move || {
                    use std::io::{BufRead, BufReader};
                    let reader = BufReader::new(stderr);
                    for line in reader.lines() {
                        if let Ok(line) = line {
                            eprintln!("[NODE-ERR] {}", line);
                        }
                    }
                });
            }
            
            println!("[TAURI] Node.js process spawned with PID: {:?}", process.id());
        }
        Err(e) => {
            return Err(format!("Failed to start server: {}", e));
        }
    }

    // 2. Set running status (scoped lock)
    {
        let mut state_guard = state.lock().map_err(|_| "Failed to lock server state".to_string())?;
        state_guard.is_running = true;
    }

    // 3. Wait for server to be ready with health check
    println!("[TAURI] Waiting for server to be ready...");
    let start_time = std::time::Instant::now();
    let timeout = std::time::Duration::from_secs(15);
    let check_interval = std::time::Duration::from_millis(500);
    let addr = "127.0.0.1:3001".parse::<std::net::SocketAddr>().unwrap();
    
    loop {
        if std::net::TcpStream::connect_timeout(&addr, std::time::Duration::from_millis(200)).is_ok() {
            println!("[TAURI] Server is ready and accepting connections!");
            break;
        }
        
        if start_time.elapsed() > timeout {
            return Err("Server failed to start within 15 seconds. Check if Node.js is installed and working correctly.".to_string());
        }
        
        tokio::time::sleep(check_interval).await;
    }

    Ok(ServerStatus {
        running: true,
        port,
        url: format!("http://127.0.0.1:{}", port),
    })
}

#[tauri::command]
async fn stop_server(state: State<'_, Arc<Mutex<ServerState>>>) -> Result<bool, String> {
    let mut state_guard = state.lock().map_err(|_| "Failed to lock server state".to_string())?;
    state_guard.is_running = false;
    Ok(true)
}

#[tauri::command]
async fn get_server_status(state: State<'_, Arc<Mutex<ServerState>>>) -> Result<ServerStatus, String> {
    let state_guard = state.lock().map_err(|_| "Failed to lock server state".to_string())?;
    
    Ok(ServerStatus {
        running: state_guard.is_running,
        port: state_guard.port,
        url: format!("http://127.0.0.1:{}", state_guard.port),
    })
}

#[tauri::command]
async fn get_api_url() -> String {
    "http://127.0.0.1:3001".to_string()
}

#[tauri::command]
async fn tauri_api_fetch(
    _app: AppHandle,
    options: FetchOptions,
) -> Result<Value, String> {
    let base_url = "http://127.0.0.1:3001";
    let url = format!("{}{}", base_url, options.endpoint);
    
    let client = reqwest::Client::new();
    
    let mut request = match options.method.as_str() {
        "GET" => client.get(&url),
        "POST" => client.post(&url),
        "PUT" => client.put(&url),
        "DELETE" => client.delete(&url),
        "PATCH" => client.patch(&url),
        _ => client.get(&url),
    };

    if let Some(headers) = options.headers {
        if let Some(obj) = headers.as_object() {
            for (key, value) in obj {
                request = request.header(key, value.as_str().unwrap_or(""));
            }
        }
    }

    if let Some(body) = options.body {
        request = request.json(&body);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("Request failed: {}", e))?;

    let status = response.status();
    let text = response.text().await.map_err(|e| format!("Failed to read response: {}", e))?;

    if status.is_success() {
        let json: Value = serde_json::from_str(&text).unwrap_or_else(|_| {
            serde_json::json!({
                "success": true,
                "data": text
            })
        });
        Ok(json)
    } else {
        Err(format!("Server error ({}): {}", status, text))
    }
}

async fn auto_start_server(app: AppHandle) {
    println!("[TAURI] auto_start_server called");
    let app_clone = app.clone();
    let state = app_clone.state::<Arc<Mutex<ServerState>>>().clone();
    
    match start_server(app.clone(), state).await {
        Ok(status) => {
            println!("[TAURI] Server started successfully: {:?}", status.url);
        }
        Err(e) => {
            eprintln!("[TAURI] ERROR: Failed to start server: {}", e);
        }
    }
}

fn main() {
    let server_state: Arc<Mutex<ServerState>> = Arc::new(Mutex::new(ServerState::default()));

    tauri::Builder::default()
        .manage(server_state)
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_store::Builder::default().build())
        .invoke_handler(tauri::generate_handler![
            get_platform,
            get_version,
            get_app_data_dir,
            start_server,
            stop_server,
            get_server_status,
            get_api_url,
            tauri_api_fetch,
            server_health_check
        ])
        .setup(|app| {
            let handle = app.handle().clone();
            std::thread::spawn(move || {
                let rt = tokio::runtime::Runtime::new().unwrap();
                rt.block_on(async move {
                    auto_start_server(handle).await;
                });
            });
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
