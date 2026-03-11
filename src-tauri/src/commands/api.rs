use crate::{models::http::ApiOptions, utils::http_client::api};
use serde_json::Value;

#[tauri::command]
pub async fn fetch(options: ApiOptions) -> Result<Value, String> {
    api(&options.url, &options.method, options.headers, options.body).await
}
