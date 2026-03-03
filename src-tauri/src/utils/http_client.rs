use reqwest::Method;
use serde_json::Value;
use std::collections::HashMap;

/// Sends an HTTP request using `reqwest` and returns the JSON response.
///
/// This utility acts as a lightweight API forwarder.
/// It validates the HTTP method, attaches optional headers and body,
/// sends the request, and parses the response into `serde_json::Value`.
///
/// # Arguments
///
/// * `url` - Target endpoint URL
/// * `method` - HTTP method as string ("GET", "POST", "PUT", "DELETE")
/// * `headers` - Optional request headers
/// * `body` - Optional JSON body payload
///
/// # Returns
///
/// * `Ok(Value)` - Parsed JSON response
/// * `Err(String)` - Error message if request fails or response is invalid
pub async fn api(
    url: &str,
    method: &str,
    headers: Option<HashMap<String, String>>,
    body: Option<Value>,
) -> Result<Value, String> {
    // Validate HTTP Method
    let method = match method.to_uppercase().as_str() {
        "GET" => Method::GET,
        "POST" => Method::POST,
        "PUT" => Method::PUT,
        "DELETE" => Method::DELETE,
        "PATCH" => Method::PATCH,
        _ => return Err("Invalid HTTP Method".into()),
    };

    // Get API Base URL from .env
    let api_base_url = dotenvy::var("API_BASE_URL")
        .map_err(|e| e.to_string())?;

    // Init HTTP Client
    let client = reqwest::Client::new();

    // Init Client Request
    let mut request = client.request(method, format!("{}{}", api_base_url, url));

    // Init Request Headers
    if let Some(h) = headers {
        for (key, value) in h {
            request = request.header(key, value);
        }
    }

    // Init Request Body
    if let Some(b) = body {
        request = request.json(&b);
    }

    // Send HTTP Request
    let response = request.send().await.map_err(|e| e.to_string())?;

    // Validate & Format HTTP Response
    let status = response.status();
    let response_text = response.text().await.map_err(|e| e.to_string())?;

    if !status.is_success() {
        return Err(response_text);
    }

    let json = serde_json::from_str(&response_text).map_err(|e| e.to_string())?;

    Ok(json)
}
