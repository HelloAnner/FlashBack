//! FlashBack Tauri 后端
//! 功能：项目管理、本地扫描（Git 仓库、文档、聊天数据库路径），事件推送到前端

use rayon::prelude::*;
use rusqlite::{Connection, Result as SqlResult};
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use tauri::{Emitter, Manager};
use uuid::Uuid;
use walkdir::{DirEntry, WalkDir};

// ==================== 数据结构定义 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    id: String,
    name: String,
    folder_path: String,
    time_range: String,
    // 新增：扫描范围（ALL 全部 / CUSTOM 自定义）与自定义目录列表（JSON 字符串序列化）
    #[serde(default)]
    scan_scope: Option<String>,
    #[serde(default)]
    scan_folders: Option<String>,
    scan_summary: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectInput {
    name: String,
    time_range: String,
    #[serde(default)]
    scan_scope: Option<String>,
    #[serde(default)]
    scan_folders: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectListResponse {
    projects: Vec<Project>,
    total: usize,
    page: usize,
    total_pages: usize,
}

// 扫描结果来源（扩展用）
#[derive(Debug, Clone)]
enum SourceKind {
    WeChatMessage,
    WeChatFile,
    WeComMessage,
    WeComFile,
    DingTalkMessage,
    DingTalkFile,
    Downloads,
    Desktop,
    Documents,
    CustomSpecified,
    Other,
}

impl SourceKind {
    fn as_str(&self) -> &'static str {
        match self {
            SourceKind::WeChatMessage => "WECHAT_MESSAGE",
            SourceKind::WeChatFile => "WECHAT_FILE",
            SourceKind::WeComMessage => "WECOM_MESSAGE",
            SourceKind::WeComFile => "WECOM_FILE",
            SourceKind::DingTalkMessage => "DINGTALK_MESSAGE",
            SourceKind::DingTalkFile => "DINGTALK_FILE",
            SourceKind::Downloads => "DOWNLOADS",
            SourceKind::Desktop => "DESKTOP",
            SourceKind::Documents => "DOCUMENTS",
            SourceKind::CustomSpecified => "CUSTOM_SPECIFIED",
            SourceKind::Other => "OTHER",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ScanResultItem {
    id: String,
    project_id: String,
    file_path: String,
    file_type: String,
    source: String,
    created_at: String,
    modified_at: String,
    size_bytes: i64,
    is_valid: bool,
    inserted_at: String,
    updated_at: String,
}

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

// ==================== 数据库管理 ====================

struct DatabaseManager {
    conn: Mutex<Option<Connection>>,
}

impl DatabaseManager {
    fn new() -> Self {
        DatabaseManager {
            conn: Mutex::new(None),
        }
    }

    fn initialize(&self) -> SqlResult<()> {
        let db_path = Self::get_db_path();

        // 确保 FlashBack 目录存在
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent).ok();
        }

        let conn = Connection::open(&db_path)?;

        // 检查表是否存在
        let table_exists: bool = conn
            .query_row(
                "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'",
                [],
                |_| Ok(true),
            )
            .unwrap_or(false);

        if !table_exists {
            // 表不存在，直接创建（含新增字段）
            conn.execute(
                "CREATE TABLE projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    folder_path TEXT NOT NULL,
                    time_range TEXT NOT NULL,
                    scan_scope TEXT,
                    scan_folders TEXT,
                    scan_summary TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )",
                [],
            )?;
        } else {
            // 表存在，检查列结构
            let mut stmt = conn.prepare("PRAGMA table_info(projects)")?;
            let columns: Vec<String> = stmt
                .query_map([], |row| {
                    Ok(row.get::<_, String>(1)?) // 获取列名
                })?
                .filter_map(|r| r.ok())
                .collect();

            // 检查必需的列是否存在
            let has_time_range = columns.iter().any(|c| c == "time_range");
            let has_scan_summary = columns.iter().any(|c| c == "scan_summary");
            let has_scan_scope = columns.iter().any(|c| c == "scan_scope");
            let has_scan_folders = columns.iter().any(|c| c == "scan_folders");

            // 渐进式迁移：缺哪个列就补哪个列，避免 DROP/重建
            if !has_time_range {
                let _ = conn.execute("ALTER TABLE projects ADD COLUMN time_range TEXT", []);
            }
            if !has_scan_summary {
                let _ = conn.execute("ALTER TABLE projects ADD COLUMN scan_summary TEXT", []);
            }
            if !has_scan_scope {
                let _ = conn.execute("ALTER TABLE projects ADD COLUMN scan_scope TEXT", []);
            }
            if !has_scan_folders {
                let _ = conn.execute("ALTER TABLE projects ADD COLUMN scan_folders TEXT", []);
            }
        }

        // 创建索引
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)",
            [],
        )?;

        // 创建扫描结果表
        conn.execute(
            "CREATE TABLE IF NOT EXISTS scan_results (
                id TEXT PRIMARY KEY,
                project_id TEXT NOT NULL,
                file_path TEXT NOT NULL,
                file_type TEXT NOT NULL,
                source TEXT NOT NULL,
                created_at TEXT NOT NULL,
                modified_at TEXT NOT NULL,
                size_bytes INTEGER NOT NULL,
                is_valid INTEGER NOT NULL,
                inserted_at TEXT NOT NULL,
                updated_at TEXT NOT NULL,
                UNIQUE(project_id, file_path)
            )",
            [],
        )?;
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_scan_results_project ON scan_results(project_id)",
            [],
        )?;

        // 应用配置表（k-v）
        conn.execute(
            "CREATE TABLE IF NOT EXISTS app_config (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )",
            [],
        )?;

        let mut guard = self.conn.lock().unwrap();
        *guard = Some(conn);

        Ok(())
    }

    fn get_db_path() -> PathBuf {
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        home.join("FlashBack").join("flashback.db")
    }

    fn get_connection(&self) -> SqlResult<Connection> {
        let _guard = self.conn.lock().unwrap();
        // 直接打开新连接，避免借用问题
        Connection::open(Self::get_db_path())
    }
}

// ==================== 数据库操作 ====================

#[tauri::command]
fn init_database(db: tauri::State<DatabaseManager>) -> Result<String, String> {
    db.initialize().map_err(|e| e.to_string())?;
    Ok("Database initialized successfully".to_string())
}

#[tauri::command]
fn create_project(
    db: tauri::State<DatabaseManager>,
    project_input: ProjectInput,
) -> Result<Project, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // 生成 UUID
    let id = Uuid::new_v4().to_string();

    // 创建项目文件夹
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let project_folder = home.join("FlashBack").join(&project_input.name);

    std::fs::create_dir_all(&project_folder).map_err(|e| format!("创建项目文件夹失败: {}", e))?;

    // 插入数据库
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let empty_string = String::new();
    let scan_scope = project_input
        .scan_scope
        .clone()
        .unwrap_or_else(|| "ALL".into());
    let scan_folders_json = serde_json::to_string(&project_input.scan_folders.unwrap_or_default())
        .unwrap_or_else(|_| "[]".into());
    conn.execute(
        "INSERT INTO projects (id, name, folder_path, time_range, scan_scope, scan_folders, scan_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        &[&id, &project_input.name, &project_folder.to_string_lossy().to_string(), &project_input.time_range, &scan_scope, &scan_folders_json, &empty_string, &now, &now],
    ).map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name: project_input.name,
        folder_path: project_folder.to_string_lossy().to_string(),
        time_range: project_input.time_range,
        scan_summary: None,
        scan_scope: Some(scan_scope),
        scan_folders: Some(scan_folders_json),
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn get_projects(db: tauri::State<DatabaseManager>) -> Result<Vec<Project>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_scope, scan_folders, scan_summary, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects = stmt
        .query_map([], |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_path: row.get(2)?,
                time_range: row.get(3)?,
                scan_scope: row.get(4).ok(),
                scan_folders: row.get(5).ok(),
                scan_summary: row.get(6).ok(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| e.to_string())?;

    let result: Vec<Project> = projects
        .map(|p| p.map_err(|e| e.to_string()))
        .collect::<Result<_, _>>()?;

    Ok(result)
}

#[tauri::command]
fn get_projects_paginated(
    db: tauri::State<DatabaseManager>,
    page: usize,
    page_size: usize,
) -> Result<ProjectListResponse, String> {
    println!(
        "[DEBUG] get_projects_paginated called: page={}, page_size={}",
        page, page_size
    );

    let conn = db.get_connection().map_err(|e| {
        println!("[DEBUG] get_connection error: {}", e);
        e.to_string()
    })?;

    // 确保 page 至少为 1
    let page = if page == 0 { 1 } else { page };

    // 计算偏移量
    let offset = (page - 1) * page_size;
    println!("[DEBUG] offset={}", offset);

    // 获取总数
    let total: usize = conn
        .query_row("SELECT COUNT(*) FROM projects", [], |row| {
            let count: usize = row.get(0)?;
            println!("[DEBUG] total projects count: {}", count);
            Ok(count)
        })
        .map_err(|e| {
            println!("[DEBUG] COUNT query error: {}", e);
            e.to_string()
        })?;

    // 计算总页数
    let total_pages = if total == 0 {
        1
    } else {
        (total + page_size - 1) / page_size
    };

    // 获取分页数据
    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_scope, scan_folders, scan_summary, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?")
        .map_err(|e| {
            println!("[DEBUG] prepare error: {}", e);
            e.to_string()
        })?;

    let params: &[&dyn rusqlite::ToSql] = &[&(page_size as i64), &(offset as i64)];
    println!(
        "[DEBUG] query params: page_size={}, offset={}",
        page_size as i64, offset as i64
    );

    let projects = stmt
        .query_map(params, |row| {
            Ok(Project {
                id: row.get(0)?,
                name: row.get(1)?,
                folder_path: row.get(2)?,
                time_range: row.get(3)?,
                scan_scope: row.get(4).ok(),
                scan_folders: row.get(5).ok(),
                scan_summary: row.get(6).ok(),
                created_at: row.get(7)?,
                updated_at: row.get(8)?,
            })
        })
        .map_err(|e| {
            println!("[DEBUG] query_map error: {}", e);
            e.to_string()
        })?;

    let result: Vec<Project> = projects
        .map(|p| p.map_err(|e| e.to_string()))
        .collect::<Result<_, _>>()?;

    println!("[DEBUG] returning {} projects", result.len());

    Ok(ProjectListResponse {
        projects: result,
        total,
        page,
        total_pages,
    })
}

#[tauri::command]
fn get_project_by_name(
    db: tauri::State<DatabaseManager>,
    name: String,
) -> Result<Option<Project>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_scope, scan_folders, scan_summary, created_at, updated_at FROM projects WHERE name = ?")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(&[&name]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(Project {
            id: row.get(0).map_err(|e| e.to_string())?,
            name: row.get(1).map_err(|e| e.to_string())?,
            folder_path: row.get(2).map_err(|e| e.to_string())?,
            time_range: row.get(3).map_err(|e| e.to_string())?,
            scan_scope: row.get(4).ok(),
            scan_folders: row.get(5).ok(),
            scan_summary: row.get(6).ok(),
            created_at: row.get(7).map_err(|e| e.to_string())?,
            updated_at: row.get(8).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn get_project_by_id(
    db: tauri::State<DatabaseManager>,
    id: String,
) -> Result<Option<Project>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_scope, scan_folders, scan_summary, created_at, updated_at FROM projects WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(Project {
            id: row.get(0).map_err(|e| e.to_string())?,
            name: row.get(1).map_err(|e| e.to_string())?,
            folder_path: row.get(2).map_err(|e| e.to_string())?,
            time_range: row.get(3).map_err(|e| e.to_string())?,
            scan_scope: row.get(4).ok(),
            scan_folders: row.get(5).ok(),
            scan_summary: row.get(6).ok(),
            created_at: row.get(7).map_err(|e| e.to_string())?,
            updated_at: row.get(8).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

// ====== KV 配置：app_config ======

#[tauri::command]
fn set_config(db: tauri::State<DatabaseManager>, key: String, value: String) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    conn.execute("INSERT INTO app_config(key,value) VALUES(?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value", &[&key, &value])
        .map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn get_config(db: tauri::State<DatabaseManager>, key: String) -> Result<Option<String>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT value FROM app_config WHERE key = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&key]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let v: String = row.get(0).map_err(|e| e.to_string())?;
        Ok(Some(v))
    } else {
        Ok(None)
    }
}

const CFG_CURRENT_PROJECT: &str = "current_project_id";

#[tauri::command]
fn set_current_project(
    db: tauri::State<DatabaseManager>,
    project_id: String,
) -> Result<(), String> {
    set_config(db, CFG_CURRENT_PROJECT.into(), project_id)
}

#[tauri::command]
fn get_current_project(db: tauri::State<DatabaseManager>) -> Result<Option<Project>, String> {
    if let Some(pid) = get_config(db.clone(), CFG_CURRENT_PROJECT.into())? {
        if let Some(p) = get_project_by_id(db, pid)? {
            return Ok(Some(p));
        }
    }
    Ok(None)
}

#[tauri::command]
fn delete_project(db: tauri::State<DatabaseManager>, name: String) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // 先查询项目路径
    let mut stmt = conn
        .prepare("SELECT folder_path FROM projects WHERE name = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&name]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let folder_path: String = row.get(0).map_err(|e| e.to_string())?;

        // 删除数据库记录
        conn.execute("DELETE FROM projects WHERE name = ?", &[&name])
            .map_err(|e| e.to_string())?;

        // 删除文件夹及其所有内容
        std::fs::remove_dir_all(&folder_path).map_err(|e| format!("删除项目文件夹失败: {}", e))?;
    }

    Ok(())
}

// ==================== 扫描逻辑 ====================

fn is_ignored(entry: &DirEntry) -> bool {
    let name = entry.file_name().to_string_lossy();
    let ignored = [
        "node_modules",
        "target",
        ".git",
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
        roots.push(home().join(
            "Library/Containers/com.tencent.WeWorkMac/Data/Library/Application Support/WXWork",
        ));
        roots.push(
            home().join(
                "Library/Containers/com.alibaba.DingTalkMac/Data/Library/Application Support",
            ),
        );
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
            v.push(ChatLocation {
                app: app.to_string(),
                path: p.to_string_lossy().to_string(),
            });
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
            home().join(
                "Library/Containers/com.tencent.WeWorkMac/Data/Library/Application Support/WXWork",
            ),
        );
        push_if_exists(
            &mut found,
            "DingTalk",
            home().join(
                "Library/Containers/com.alibaba.DingTalkMac/Data/Library/Application Support",
            ),
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

// 仅扫描常见可用于分析的办公/文本/图片等文件
fn is_doc(path: &Path) -> bool {
    let ext = path
        .extension()
        .and_then(|s| s.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    // 常见文本/办公/数据/图片/矢量/设计等（可按需扩展）
    const ALLOWED: &[&str] = &[
        // 文本/标记/代码片段
        "txt", "md", "markdown", "log", "rst", // Office / OpenOffice / iWork
        "doc", "docx", "dotx", "rtf", "xls", "xlsx", "xlsm", "csv", "tsv", "ods", "numbers", "ppt",
        "pptx", "odp", "key", // 文档与数据
        "pdf", "json", "yaml", "yml", "xml", "sql", // 图片（便于做视觉回溯）
        "png", "jpg", "jpeg", "gif", "webp", "bmp", "tif", "tiff", "heic",
        // 矢量/设计
        "svg", "ai", "psd",
    ];
    ALLOWED.contains(&ext.as_str())
}

fn classify_source_from_path(p: &str) -> &'static str {
    // macOS
    if p.contains("com.tencent.xinWeChat") {
        return SourceKind::WeChatFile.as_str();
    }
    if p.contains("WXWork") {
        return SourceKind::WeComFile.as_str();
    }
    if p.contains("com.alibaba.DingTalkMac") {
        return SourceKind::DingTalkFile.as_str();
    }
    // Windows 典型路径
    if p.contains("WeChat Files") || p.contains("Tencent/WeChat") {
        return SourceKind::WeChatFile.as_str();
    }
    if p.contains("WXWork") {
        return SourceKind::WeComFile.as_str();
    }
    if p.contains("DingTalk") {
        return SourceKind::DingTalkFile.as_str();
    }
    // 常见用户目录
    if p.contains("/Downloads/") || p.ends_with("/Downloads") {
        return SourceKind::Downloads.as_str();
    }
    if p.contains("/Desktop/") || p.ends_with("/Desktop") {
        return SourceKind::Desktop.as_str();
    }
    if p.contains("/Documents/") || p.ends_with("/Documents") {
        return SourceKind::Documents.as_str();
    }
    SourceKind::Other.as_str()
}

fn is_within_time_range(path: &Path, time_range: &str) -> bool {
    // 获取文件修改时间
    match std::fs::metadata(path).and_then(|m| m.modified()) {
        Ok(modified) => {
            let now = std::time::SystemTime::now();
            let duration = now.duration_since(modified).unwrap_or_default();
            let days = duration.as_secs() / (24 * 3600);

            match time_range {
                "past_year" => days <= 365,
                "past_month" => days <= 30,
                "past_week" => days <= 7,
                _ => true, // 默认不过滤
            }
        }
        Err(_) => true, // 无法获取时间，不过滤
    }
}

#[tauri::command]
fn start_scan(
    window: tauri::Window,
    project_name: String,
    time_range: String,
) -> Result<(), String> {
    // 获取项目信息
    let db = window.state::<DatabaseManager>();

    // 先尝试获取项目
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_summary, created_at, updated_at FROM projects WHERE name = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&project_name]).map_err(|e| e.to_string())?;

    let project_folder = if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        // 项目已存在
        row.get(2).map_err(|e| e.to_string())?
    } else {
        // 项目不存在，创建它
        let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
        let project_folder = home.join("FlashBack").join(&project_name);

        std::fs::create_dir_all(&project_folder)
            .map_err(|e| format!("创建项目文件夹失败: {}", e))?;

        let id = Uuid::new_v4().to_string();
        let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
        let empty_string = String::new();

        conn.execute(
            "INSERT INTO projects (id, name, folder_path, time_range, scan_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
            &[&id, &project_name, &project_folder.to_string_lossy().to_string(), &time_range, &empty_string, &now, &now],
        ).map_err(|e| e.to_string())?;

        project_folder.to_string_lossy().to_string()
    };

    // 开新线程避免阻塞 UI
    std::thread::spawn(move || {
        let dev = std::env::var("DEV").unwrap_or_default() == "true";
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "check_circle",
                text: "初始化扫描序列 v2.4.1 [OK]".into(),
            },
        );
        if dev {
            let _ = window.emit(
                "scan-log",
                LogPayload {
                    icon: "shield",
                    text: "DEV=true 检测到，跳过云端验证".into(),
                },
            );
        }

        // 显示配置信息
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "folder",
                text: format!("项目名称: {}", project_name),
            },
        );
        let range_label = match time_range.as_str() {
            "past_year" => "过去一年",
            "past_month" => "过去一个月",
            "past_week" => "过去一周",
            _ => "未知范围",
        };
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "schedule",
                text: format!("时间范围: {}", range_label),
            },
        );
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "folder_open",
                text: format!("项目目录: {}", project_folder),
            },
        );

        let mut summary = ScanSummary::default();

        // 步骤 1：聊天数据库位置
        let chats = detect_chat_locations();
        for c in &chats {
            let _ = window.emit(
                "scan-log",
                LogPayload {
                    icon: "chat",
                    text: format!("发现聊天数据路径: {} ({})", c.path, c.app),
                },
            );
        }
        summary.chat_locations = chats;
        let _ = window.emit("scan-progress", ProgressPayload { progress: 18 });

        // 步骤 2：Git 仓库识别
        let mut git_count = 0usize;
        let mut roots = candidate_roots();
        // 添加项目的目录
        roots.push(PathBuf::from(&project_folder));

        for (idx, root) in roots.iter().enumerate() {
            if !root.exists() {
                continue;
            }
            let _ = window.emit(
                "scan-log",
                LogPayload {
                    icon: "folder_open",
                    text: format!("扫描目录: {}", root.to_string_lossy()),
                },
            );
            for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
                if entry.file_name() == ".git" && entry.file_type().is_dir() {
                    if let Some(repo_root) = entry.path().parent() {
                        if git2::Repository::open(repo_root).is_ok() {
                            git_count += 1;
                            let _ = window.emit(
                                "scan-log",
                                LogPayload {
                                    icon: "data_object",
                                    text: format!("发现 Git 仓库: {}", repo_root.to_string_lossy()),
                                },
                            );
                        }
                    }
                }
                if is_ignored(&entry) {
                    continue;
                }
            }
            let pct = 18 + (((idx + 1) as f32 / roots.len().max(1) as f32) * 42.0) as u8;
            let _ = window.emit(
                "scan-progress",
                ProgressPayload {
                    progress: pct.min(60),
                },
            );
        }
        summary.git_repos = git_count;

        // 步骤 3：文档抽样统计（带时间范围过滤）
        let time_range_clone = time_range.clone();
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
                    .filter(|e| is_within_time_range(e.path(), &time_range_clone))
                    .count()
            })
            .sum();
        summary.documents = docs_count;
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "description",
                text: format!(
                    "文档统计完成: {} 个候选文件 (时间范围: {})",
                    docs_count, time_range_clone
                ),
            },
        );
        let _ = window.emit("scan-progress", ProgressPayload { progress: 84 });

        // 步骤 4：完成
        if let Some(state) = window
            .app_handle()
            .try_state::<Mutex<Option<ScanSummary>>>()
        {
            if let Ok(mut s) = state.lock() {
                *s = Some(summary.clone());
            }
        }
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "sync",
                text: "正在分析会议记录...".into(),
            },
        );
        std::thread::sleep(std::time::Duration::from_millis(500));

        // 更新数据库中的扫描摘要
        let summary_json = serde_json::to_string(&summary).unwrap_or_default();
        if let Ok(conn) = Connection::open(DatabaseManager::get_db_path()) {
            let _ = conn.execute(
                "UPDATE projects SET scan_summary = ?, updated_at = ? WHERE name = ?",
                &[
                    &summary_json,
                    &chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(),
                    &project_name,
                ],
            );
        }

        let _ = window.emit("scan-progress", ProgressPayload { progress: 100 });
        let _ = window.emit("scan-done", &summary);
    });
    Ok(())
}

#[tauri::command]
fn start_scan_by_id(window: tauri::Window, project_id: String) -> Result<(), String> {
    let db = window.state::<DatabaseManager>();
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // 查询项目信息
    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_scope, scan_folders FROM projects WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&project_id]).map_err(|e| e.to_string())?;
    let (pid, name, project_folder, time_range, scan_scope, scan_folders_json): (
        String,
        String,
        String,
        String,
        Option<String>,
        Option<String>,
    ) = if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        (
            row.get(0).map_err(|e| e.to_string())?,
            row.get(1).map_err(|e| e.to_string())?,
            row.get(2).map_err(|e| e.to_string())?,
            row.get(3).map_err(|e| e.to_string())?,
            row.get(4).ok(),
            row.get(5).ok(),
        )
    } else {
        return Err("项目不存在".into());
    };

    // 根据范围决定扫描根目录
    let mut roots: Vec<PathBuf> = vec![];
    if scan_scope.as_deref() == Some("CUSTOM") {
        if let Some(json) = scan_folders_json {
            if let Ok(vec) = serde_json::from_str::<Vec<String>>(&json) {
                for p in vec {
                    roots.push(PathBuf::from(p));
                }
            }
        }
        if roots.is_empty() {
            roots.push(PathBuf::from(&project_folder));
        }
    } else {
        roots = candidate_roots();
        roots.push(PathBuf::from(&project_folder));
    }

    // 清空旧结果（本次全量重扫）
    let _ = conn.execute("DELETE FROM scan_results WHERE project_id = ?", &[&pid]);

    // 启动扫描线程
    std::thread::spawn(move || {
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "folder",
                text: format!("项目名称: {}", name),
            },
        );
        let range_label = match time_range.as_str() {
            "past_year" => "过去一年",
            "past_month" => "过去一个月",
            "past_week" => "过去一周",
            _ => "未知范围",
        };
        let _ = window.emit(
            "scan-log",
            LogPayload {
                icon: "schedule",
                text: format!("时间范围: {}", range_label),
            },
        );

        let mut processed_roots = 0usize;
        let total_roots = roots.len().max(1);

        // 扫描并入库
        for root in &roots {
            processed_roots += 1;
            let _ = window.emit(
                "scan-log",
                LogPayload {
                    icon: "folder_open",
                    text: format!("扫描目录: {}", root.to_string_lossy()),
                },
            );

            for entry in WalkDir::new(root).into_iter().filter_map(Result::ok) {
                if entry.file_type().is_dir() {
                    continue;
                }
                if is_ignored(&entry) {
                    continue;
                }
                let path = entry.path();
                if !is_doc(path) {
                    continue;
                }
                if !is_within_time_range(path, &time_range) {
                    continue;
                }

                // 采集元数据
                let meta = match std::fs::metadata(path) {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                let size = meta.len() as i64;
                let modified_s = meta
                    .modified()
                    .ok()
                    .map(|t| {
                        chrono::DateTime::<chrono::Local>::from(t)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                    })
                    .unwrap_or_default();
                let created_s = meta
                    .created()
                    .ok()
                    .map(|t| {
                        chrono::DateTime::<chrono::Local>::from(t)
                            .format("%Y-%m-%d %H:%M:%S")
                            .to_string()
                    })
                    .unwrap_or_else(|| modified_s.clone());
                let file_type = path
                    .extension()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_ascii_lowercase();
                let source = if scan_scope.as_deref() == Some("CUSTOM") {
                    SourceKind::CustomSpecified.as_str()
                } else {
                    classify_source_from_path(&path.to_string_lossy())
                };

                let id = Uuid::new_v4().to_string();
                let now_s = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
                let is_valid = true;

                if let Ok(conn2) = Connection::open(DatabaseManager::get_db_path()) {
                    let _ = conn2.execute(
                        "INSERT OR REPLACE INTO scan_results (id, project_id, file_path, file_type, source, created_at, modified_at, size_bytes, is_valid, inserted_at, updated_at)
                         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
                        &[&id as &dyn rusqlite::ToSql,
                          &pid,
                          &path.to_string_lossy().to_string(),
                          &file_type,
                          &source.to_string(),
                          &created_s,
                          &modified_s,
                          &(size as i64),
                          &(if is_valid {1i64} else {0i64}),
                          &now_s,
                          &now_s],
                    );
                }
            }

            let pct = (processed_roots as f32 / total_roots as f32 * 100.0) as u8;
            let _ = window.emit(
                "scan-progress",
                ProgressPayload {
                    progress: pct.min(95),
                },
            );
        }

        let _ = window.emit("scan-progress", ProgressPayload { progress: 100 });
        let _ = window.emit(
            "scan-done",
            ScanSummary {
                git_repos: 0,
                documents: 0,
                chat_locations: vec![],
            },
        );
    });

    Ok(())
}

#[tauri::command]
fn get_results_paginated(
    db: tauri::State<DatabaseManager>,
    project_id: String,
    page: usize,
    page_size: usize,
) -> Result<ProjectListResponseLike<ScanResultItem>, String> {
    paginate_results(&db, &project_id, page, page_size)
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct ProjectListResponseLike<T> {
    items: Vec<T>,
    total: usize,
    page: usize,
    total_pages: usize,
}

fn paginate_results(
    db: &tauri::State<DatabaseManager>,
    project_id: &str,
    page: usize,
    page_size: usize,
) -> Result<ProjectListResponseLike<ScanResultItem>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let page = if page == 0 { 1 } else { page };
    let offset = (page - 1) * page_size;

    let total: usize = conn
        .query_row(
            "SELECT COUNT(*) FROM scan_results WHERE project_id = ?",
            [&project_id],
            |row| row.get(0),
        )
        .map_err(|e| e.to_string())?;
    let total_pages = if total == 0 {
        1
    } else {
        (total + page_size - 1) / page_size
    };

    let mut stmt = conn.prepare("SELECT id, project_id, file_path, file_type, source, created_at, modified_at, size_bytes, is_valid, inserted_at, updated_at FROM scan_results WHERE project_id = ? ORDER BY updated_at DESC LIMIT ? OFFSET ?").map_err(|e| e.to_string())?;
    let items_iter = stmt
        .query_map(
            [
                &project_id as &dyn rusqlite::ToSql,
                &(page_size as i64),
                &(offset as i64),
            ],
            |row| {
                Ok(ScanResultItem {
                    id: row.get(0)?,
                    project_id: row.get(1)?,
                    file_path: row.get(2)?,
                    file_type: row.get(3)?,
                    source: row.get(4)?,
                    created_at: row.get(5)?,
                    modified_at: row.get(6)?,
                    size_bytes: row.get(7)?,
                    is_valid: row.get::<_, i64>(8)? == 1,
                    inserted_at: row.get(9)?,
                    updated_at: row.get(10)?,
                })
            },
        )
        .map_err(|e| e.to_string())?;
    let items: Vec<ScanResultItem> = items_iter.map(|r| r.unwrap()).collect();

    Ok(ProjectListResponseLike {
        items,
        total,
        page,
        total_pages,
    })
}

#[tauri::command]
fn get_results_paginated_adv(
    db: tauri::State<DatabaseManager>,
    project_id: String,
    page: usize,
    page_size: usize,
    q: Option<String>,
    file_types: Option<Vec<String>>,
) -> Result<ProjectListResponseLike<ScanResultItem>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let page = if page == 0 { 1 } else { page };
    let offset = (page - 1) * page_size;

    // 构建 WHERE 子句与参数
    let mut where_sql = String::from("project_id = ?");
    let mut params: Vec<Box<dyn rusqlite::ToSql>> = vec![Box::new(project_id.clone())];

    if let Some(query) = q.clone().filter(|s| !s.trim().is_empty()) {
        where_sql.push_str(" AND file_path LIKE ? ESCAPE '\\'");
        let like = format!("%{}%", query.replace('%', "\\%").replace('_', "\\_"));
        params.push(Box::new(like));
    }

    if let Some(types) = file_types.clone().filter(|v| !v.is_empty()) {
        let placeholders = std::iter::repeat("?")
            .take(types.len())
            .collect::<Vec<_>>()
            .join(",");
        where_sql.push_str(&format!(" AND file_type IN ({})", placeholders));
        for t in types {
            params.push(Box::new(t));
        }
    }

    // 统计总数
    let count_sql = format!("SELECT COUNT(*) FROM scan_results WHERE {}", where_sql);
    let total: usize = {
        let mut stmt = conn.prepare(&count_sql).map_err(|e| e.to_string())?;
        let mut count: usize = 0;
        {
            let mut rows = stmt
                .query(rusqlite::params_from_iter(params.iter().map(|b| &**b)))
                .map_err(|e| e.to_string())?;
            if let Some(row) = rows.next().map_err(|e| e.to_string())? {
                count = row.get(0).map_err(|e| e.to_string())?;
            }
        }
        count
    };
    let total_pages = if total == 0 {
        1
    } else {
        (total + page_size - 1) / page_size
    };

    // 查询分页
    let data_sql = format!(
        "SELECT id, project_id, file_path, file_type, source, created_at, modified_at, size_bytes, is_valid, inserted_at, updated_at \
         FROM scan_results WHERE {} ORDER BY updated_at DESC LIMIT ? OFFSET ?",
        where_sql
    );
    let mut stmt = conn.prepare(&data_sql).map_err(|e| e.to_string())?;
    // 注意：不能向 Vec<&dyn ToSql> 推入对临时值 (page_size as i64) 的引用，
    // 否则会触发 E0716（临时值在使用时已被释放）。
    // 这里通过中间变量延长生命周期，保证引用在 query_map 调用期间仍然有效。
    let mut run_params: Vec<&dyn rusqlite::ToSql> = params
        .iter()
        .map(|b| &**b as &dyn rusqlite::ToSql)
        .collect();
    let page_size_i64 = page_size as i64;
    let offset_i64 = offset as i64;
    run_params.push(&page_size_i64);
    run_params.push(&offset_i64);

    let iter = stmt
        .query_map(run_params.as_slice(), |row| {
            Ok(ScanResultItem {
                id: row.get(0)?,
                project_id: row.get(1)?,
                file_path: row.get(2)?,
                file_type: row.get(3)?,
                source: row.get(4)?,
                created_at: row.get(5)?,
                modified_at: row.get(6)?,
                size_bytes: row.get(7)?,
                is_valid: row.get::<_, i64>(8)? == 1,
                inserted_at: row.get(9)?,
                updated_at: row.get(10)?,
            })
        })
        .map_err(|e| e.to_string())?;
    let items: Vec<ScanResultItem> = iter.map(|r| r.unwrap()).collect();

    Ok(ProjectListResponseLike {
        items,
        total,
        page,
        total_pages,
    })
}

#[tauri::command]
fn get_project_scan_roots(
    db: tauri::State<DatabaseManager>,
    project_id: String,
) -> Result<Vec<String>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;
    let mut stmt = conn
        .prepare("SELECT folder_path, scan_scope, scan_folders FROM projects WHERE id = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&project_id]).map_err(|e| e.to_string())?;
    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let project_folder: String = row.get(0).map_err(|e| e.to_string())?;
        let scan_scope: Option<String> = row.get(1).ok();
        let scan_folders_json: Option<String> = row.get(2).ok();
        let mut roots: Vec<String> = Vec::new();
        if scan_scope.as_deref() == Some("CUSTOM") {
            if let Some(json) = scan_folders_json {
                if let Ok(vec) = serde_json::from_str::<Vec<String>>(&json) {
                    roots.extend(vec);
                }
            }
            if roots.is_empty() {
                roots.push(project_folder);
            }
        } else {
            roots = candidate_roots()
                .into_iter()
                .map(|p| p.to_string_lossy().to_string())
                .collect();
            roots.push(project_folder);
        }
        return Ok(roots);
    }
    Ok(vec![])
}

#[tauri::command]
fn get_scan_summary(state: tauri::State<Mutex<Option<ScanSummary>>>) -> Option<ScanSummary> {
    state.lock().ok().and_then(|s| s.clone())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let db_manager = DatabaseManager::new();

    // 初始化数据库（忽略错误，允许首次运行失败）
    let _ = db_manager.initialize();

    tauri::Builder::default()
        .manage(db_manager)
        .manage::<Mutex<Option<ScanSummary>>>(Mutex::new(None))
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            init_database,
            create_project,
            get_projects,
            get_projects_paginated,
            get_project_by_name,
            get_project_by_id,
            delete_project,
            start_scan,
            start_scan_by_id,
            get_results_paginated,
            get_results_paginated_adv,
            get_project_scan_roots,
            get_scan_summary,
            set_config,
            get_config,
            set_current_project,
            get_current_project
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
