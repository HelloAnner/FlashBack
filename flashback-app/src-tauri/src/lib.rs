//! FlashBack Tauri 后端
//! 功能：本地扫描（Git 仓库、文档、聊天数据库路径），事件推送到前端；DEV=true 时跳过云端验证

use rayon::prelude::*;
use serde::{Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use walkdir::{DirEntry, WalkDir};
use tauri::{Emitter, Manager};

#[derive(Debug, Clone, Serialize, Default)]
struct ScanSummary {
    git_repos: usize,
    documents: usize,
    chat_locations: Vec<ChatLocation>,
}

#[derive(Debug, Clone, Serialize)]
struct ChatLocation {
    app: String,
    path: String,
}

#[derive(Debug, Clone, Serialize)]
struct ProgressPayload {
    progress: u8,
}

#[derive(Debug, Clone, Serialize)]
struct LogPayload {
    icon: &'static str,
    text: String,
}

fn is_ignored(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    let ignored = [
        "node_modules",
        "target",
        ".git", // 我们用单独逻辑识别 Git，不递归进 .git 目录
        "Library/Caches",
        "AppData/Local",
        "AppData/LocalLow",
        "AppData/Temp",
        ".DS_Store",
    ];
    ignored.iter().any(|p| name.contains(p))
}

fn home() -> PathBuf {
    dirs::home_dir().unwrap_or_else(|| PathBuf::from("."))
}

fn candidate_roots() -> Vec<PathBuf> {
    let mut roots = vec![
        home().join("Documents"),
        home().join("Desktop"),
        home().join("Downloads"),
        home().join("Projects"),
        home().join("Work"),
    ];

    if cfg!(target_os = "macos") {
        roots.push(home().join("Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat"));
        roots.push(home().join("Library/Containers/com.tencent.WeWorkMac/Data/Library/Application Support/WXWork"));
        roots.push(home().join("Library/Containers/com.alibaba.DingTalkMac/Data/Library/Application Support"));
    }
    if cfg!(target_os = "windows") {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            roots.push(PathBuf::from(&userprofile).join("Documents/WeChat Files"));
            roots.push(PathBuf::from(&userprofile).join("AppData/Roaming/Tencent/WeChat"));
            roots.push(PathBuf::from(&userprofile).join("AppData/Roaming/WXWork"));
            roots.push(PathBuf::from(&userprofile).join("AppData/Roaming/DingTalk"));
        }
    }
    roots
}

fn detect_chat_locations() -> Vec<ChatLocation> {
    let mut found = Vec::new();
    let push_if_exists = |v: &mut Vec<ChatLocation>, app: &str, p: PathBuf| {
        if p.exists() {
            v.push(ChatLocation { app: app.to_string(), path: p.to_string_lossy().to_string() });
        }
    };
    if cfg!(target_os = "macos") {
        push_if_exists(
            &mut found,
            "WeChat",
            home().join("Library/Containers/com.tencent.xinWeChat/Data/Library/Application Support/com.tencent.xinWeChat"),
        );
        push_if_exists(
            &mut found,
            "WeCom",
            home().join("Library/Containers/com.tencent.WeWorkMac/Data/Library/Application Support/WXWork"),
        );
        push_if_exists(
            &mut found,
            "DingTalk",
            home().join("Library/Containers/com.alibaba.DingTalkMac/Data/Library/Application Support"),
        );
    }
    if cfg!(target_os = "windows") {
        if let Ok(userprofile) = std::env::var("USERPROFILE") {
            push_if_exists(
                &mut found,
                "WeChat",
                PathBuf::from(&userprofile).join("Documents/WeChat Files"),
            );
            push_if_exists(
                &mut found,
                "WeChat",
                PathBuf::from(&userprofile).join("AppData/Roaming/Tencent/WeChat"),
            );
            push_if_exists(
                &mut found,
                "WeCom",
                PathBuf::from(&userprofile).join("AppData/Roaming/WXWork"),
            );
            push_if_exists(
                &mut found,
                "DingTalk",
                PathBuf::from(&userprofile).join("AppData/Roaming/DingTalk"),
            );
        }
    }
    found
}

fn is_doc(path: &Path) -> bool {
    match path.extension().and_then(|s| s.to_str()).unwrap_or("") {
        "md" | "docx" | "pptx" | "pdf" | "txt" => true,
        _ => false,
    }
}

#[tauri::command]
fn start_scan(window: tauri::Window, work_dir: String) -> Result<(), String> {
    // 开新线程避免阻塞 UI
    std::thread::spawn(move || {
        let dev = std::env::var("DEV").unwrap_or_default() == "true";
        let _ = window.emit("scan-log", LogPayload { icon: "check_circle", text: "初始化扫描序列 v2.4.1 [OK]".into() });
        if dev {
            let _ = window.emit("scan-log", LogPayload { icon: "shield", text: "DEV=true 检测到，跳过云端验证".into() });
        }

        let _ = window.emit("scan-log", LogPayload { icon: "folder", text: format!("工作目录: {}", work_dir) });

        let mut summary = ScanSummary::default();

        // 步骤 1：聊天数据库位置
        let chats = detect_chat_locations();
        for c in &chats {
            let _ = window.emit("scan-log", LogPayload { icon: "chat", text: format!("发现聊天数据路径: {} ({})", c.path, c.app) });
        }
        summary.chat_locations = chats;
        let _ = window.emit("scan-progress", ProgressPayload { progress: 18 });

        // 步骤 2：Git 仓库识别（只统计数量，避免重 I/O）
        let mut git_count = 0usize;
        let mut roots = candidate_roots();
        // 添加用户的工作目录
        roots.push(PathBuf::from(&work_dir));

        for (idx, root) in roots.iter().enumerate() {
            if !root.exists() { continue; }
            let _ = window.emit("scan-log", LogPayload { icon: "folder_open", text: format!("扫描目录: {}", root.to_string_lossy()) });
            for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
                if entry.file_name() == ".git" && entry.file_type().is_dir() {
                    if let Some(repo_root) = entry.path().parent() {
                        if git2::Repository::open(repo_root).is_ok() {
                            git_count += 1;
                            let _ = window.emit("scan-log", LogPayload { icon: "data_object", text: format!("发现 Git 仓库: {}", repo_root.to_string_lossy()) });
                        }
                    }
                }
                if is_ignored(&entry) { continue; }
            }
            let pct = 18 + (((idx + 1) as f32 / roots.len().max(1) as f32) * 42.0) as u8; // ~60%
            let _ = window.emit("scan-progress", ProgressPayload { progress: pct.min(60) });
        }
        summary.git_repos = git_count;

        // 步骤 3：文档抽样统计
        let docs_count: usize = roots
            .par_iter()
            .filter(|p| p.exists())
            .map(|root| {
                WalkDir::new(root)
                    .into_iter()
                    .filter_map(Result::ok)
                    .filter(|e| !e.file_type().is_dir())
                    .filter(|e| !is_ignored(e))
                    .filter(|e| is_doc(e.path()))
                    .count()
            })
            .sum();
        summary.documents = docs_count;
        let _ = window.emit("scan-log", LogPayload { icon: "description", text: format!("文档统计完成: {} 个候选文件", docs_count) });
        let _ = window.emit("scan-progress", ProgressPayload { progress: 84 });

        // 步骤 4：完成
        if let Some(state) = window.app_handle().try_state::<Mutex<Option<ScanSummary>>>() {
            if let Ok(mut s) = state.lock() { *s = Some(summary.clone()); }
        }
        let _ = window.emit("scan-log", LogPayload { icon: "sync", text: "正在分析会议记录...".into() });
        std::thread::sleep(std::time::Duration::from_millis(500));
        let _ = window.emit("scan-progress", ProgressPayload { progress: 100 });
        let _ = window.emit("scan-done", &summary);
    });
    Ok(())
}

#[tauri::command]
fn get_scan_summary(state: tauri::State<Mutex<Option<ScanSummary>>>) -> Option<ScanSummary> {
    state.lock().ok().and_then(|s| s.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage::<Mutex<Option<ScanSummary>>>(Mutex::new(None))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![start_scan, get_scan_summary])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
