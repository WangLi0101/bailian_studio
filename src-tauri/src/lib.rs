use std::path::PathBuf;

use serde::Serialize;
use serde_json::Value;
use tauri::Manager;

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct ApiResponse {
    status: u16,
    body: Value,
    text: String,
}

fn http_client(timeout_secs: u64) -> Result<reqwest::Client, String> {
    reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(timeout_secs))
        .user_agent("BailianStudio/0.1")
        .build()
        .map_err(|e| format!("无法创建网络客户端: {e}"))
}

fn ensure_http_url(url: &str) -> Result<(), String> {
    let parsed = reqwest::Url::parse(url).map_err(|_| "URL 格式不正确".to_string())?;
    match parsed.scheme() {
        "http" | "https" => Ok(()),
        other => Err(format!("不支持的协议: {other}")),
    }
}

/// Proxy a JSON request to DashScope (or a compatible endpoint) from Rust so the
/// webview never has to fight CORS restrictions.
#[tauri::command]
async fn api_request(
    url: String,
    api_key: String,
    method: String,
    body: Option<Value>,
    headers: Option<std::collections::HashMap<String, String>>,
) -> Result<ApiResponse, String> {
    ensure_http_url(&url)?;

    let client = http_client(300)?;
    let verb = reqwest::Method::from_bytes(method.as_bytes())
        .map_err(|_| format!("不支持的请求方法: {method}"))?;

    let mut request = client.request(verb, &url).header("Accept", "application/json");
    if !api_key.trim().is_empty() {
        request = request.header("Authorization", format!("Bearer {}", api_key.trim()));
    }
    if let Some(extra) = headers {
        for (name, value) in extra {
            request = request.header(name, value);
        }
    }
    if let Some(payload) = body {
        request = request
            .header("Content-Type", "application/json")
            .json(&payload);
    }

    let response = request
        .send()
        .await
        .map_err(|e| format!("网络请求失败: {e}"))?;
    let status = response.status().as_u16();
    let text = response
        .text()
        .await
        .map_err(|e| format!("读取响应失败: {e}"))?;
    let body = serde_json::from_str(&text).unwrap_or(Value::Null);

    Ok(ApiResponse { status, body, text })
}

fn safe_file_name(input: &str) -> String {
    let cleaned: String = input
        .chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' | '\n' | '\r' | '\t' => '_',
            _ => c,
        })
        .collect();
    let trimmed = cleaned.trim().trim_matches('.').to_string();
    if trimmed.is_empty() {
        format!("bailian-{}", chrono_like_stamp())
    } else {
        trimmed.chars().take(120).collect()
    }
}

fn chrono_like_stamp() -> u64 {
    std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs())
        .unwrap_or(0)
}

fn extension_from_content_type(content_type: Option<&str>) -> Option<&'static str> {
    let ct = content_type?.to_ascii_lowercase();
    if ct.contains("image/png") {
        Some("png")
    } else if ct.contains("image/jpeg") {
        Some("jpg")
    } else if ct.contains("image/webp") {
        Some("webp")
    } else if ct.contains("video/mp4") {
        Some("mp4")
    } else if ct.contains("video/quicktime") {
        Some("mov")
    } else if ct.contains("video/webm") {
        Some("webm")
    } else {
        None
    }
}

fn unique_path(dir: &PathBuf, file_name: &str) -> PathBuf {
    let initial = dir.join(file_name);
    if !initial.exists() {
        return initial;
    }
    let path = std::path::Path::new(file_name);
    let stem = path.file_stem().and_then(|s| s.to_str()).unwrap_or("file");
    let ext = path.extension().and_then(|s| s.to_str()).unwrap_or("");
    for index in 1..1000 {
        let candidate = if ext.is_empty() {
            dir.join(format!("{stem}-{index}"))
        } else {
            dir.join(format!("{stem}-{index}.{ext}"))
        };
        if !candidate.exists() {
            return candidate;
        }
    }
    dir.join(file_name)
}

/// Download a generated asset into the user's Downloads folder and return the
/// final absolute path.
#[tauri::command]
async fn download_file(
    app: tauri::AppHandle,
    url: String,
    file_name: String,
) -> Result<String, String> {
    ensure_http_url(&url)?;

    let client = http_client(600)?;
    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| format!("下载失败: {e}"))?;
    if !response.status().is_success() {
        return Err(format!("下载失败，服务器返回 {}", response.status()));
    }

    let content_type = response
        .headers()
        .get("content-type")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string());

    let mut name = safe_file_name(&file_name);
    if std::path::Path::new(&name).extension().is_none() {
        let url_extension = reqwest::Url::parse(&url)
            .ok()
            .and_then(|u| {
                std::path::Path::new(u.path())
                    .extension()
                    .and_then(|s| s.to_str())
                    .map(|s| s.to_string())
            })
            .filter(|s| !s.is_empty());
        let extension = extension_from_content_type(content_type.as_deref())
            .map(|s| s.to_string())
            .or(url_extension)
            .unwrap_or_else(|| "bin".to_string());
        name = format!("{name}.{extension}");
    }

    let bytes = response
        .bytes()
        .await
        .map_err(|e| format!("读取下载内容失败: {e}"))?;

    let dir = app
        .path()
        .download_dir()
        .or_else(|_| app.path().home_dir())
        .map_err(|e| format!("无法定位下载目录: {e}"))?;
    std::fs::create_dir_all(&dir).map_err(|e| format!("无法创建下载目录: {e}"))?;

    let target = unique_path(&dir, &name);
    std::fs::write(&target, &bytes).map_err(|e| format!("写入文件失败: {e}"))?;

    Ok(target.to_string_lossy().to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![api_request, download_file])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}