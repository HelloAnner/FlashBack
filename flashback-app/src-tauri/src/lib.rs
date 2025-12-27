//! FlashBack Tauri 后端
//! 功能：项目管理、本地扫描（Git 仓库、文档、聊天数据库路径），事件推送到前端

use rayon::prelude::*;
use serde::{Serialize, Deserialize};
use std::path::{Path, PathBuf};
use std::sync::Mutex;
use walkdir::{DirEntry, WalkDir};
use tauri::{Emitter, Manager};
use rusqlite::{Connection, Result as SqlResult};
use uuid::Uuid;

// ==================== 数据结构定义 ====================

#[derive(Debug, Clone, Serialize, Deserialize)]
struct Project {
    id: String,
    name: String,
    folder_path: String,
    time_range: String,
    scan_summary: Option<String>,
    created_at: String,
    updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectInput {
    name: String,
    time_range: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
struct ProjectListResponse {
    projects: Vec<Project>,
    total: usize,
    page: usize,
    total_pages: usize,
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
        let table_exists: bool = conn.query_row(
            "SELECT name FROM sqlite_master WHERE type='table' AND name='projects'",
            [],
            |_| Ok(true),
        ).unwrap_or(false);

        if !table_exists {
            // 表不存在，直接创建
            conn.execute(
                "CREATE TABLE projects (
                    id TEXT PRIMARY KEY,
                    name TEXT NOT NULL UNIQUE,
                    folder_path TEXT NOT NULL,
                    time_range TEXT NOT NULL,
                    scan_summary TEXT,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                )",
                [],
            )?;
        } else {
            // 表存在，检查列结构
            let mut stmt = conn.prepare("PRAGMA table_info(projects)")?;
            let columns: Vec<String> = stmt.query_map([], |row| {
                Ok(row.get::<_, String>(1)?) // 获取列名
            })?.filter_map(|r| r.ok()).collect();

            // 检查必需的列是否存在
            let has_time_range = columns.iter().any(|c| c == "time_range");
            let has_scan_summary = columns.iter().any(|c| c == "scan_summary");

            if !has_time_range || !has_scan_summary {
                // 需要迁移：备份旧数据，删除表，重新创建
                println!("检测到表结构变更，正在迁移数据...");

                // 备份旧数据
                let old_data: Vec<(String, String, String, String, String)> = conn
                    .prepare("SELECT id, name, folder_path, created_at, updated_at FROM projects")?
                    .query_map([], |row| {
                        Ok((
                            row.get(0)?,
                            row.get(1)?,
                            row.get(2)?,
                            row.get(3)?,
                            row.get(4)?,
                        ))
                    })?
                    .filter_map(|r| r.ok())
                    .collect();

                // 删除旧表
                conn.execute("DROP TABLE projects", [])?;

                // 创建新表
                conn.execute(
                    "CREATE TABLE projects (
                        id TEXT PRIMARY KEY,
                        name TEXT NOT NULL UNIQUE,
                        folder_path TEXT NOT NULL,
                        time_range TEXT NOT NULL,
                        scan_summary TEXT,
                        created_at TEXT NOT NULL,
                        updated_at TEXT NOT NULL
                    )",
                    [],
                )?;

                // 恢复数据（使用默认值填充新字段）
                let default_time_range = String::from("past_year");
                let empty_string = String::new();
                let old_data_len = old_data.len();
                for (id, name, folder_path, created_at, updated_at) in old_data {
                    let _ = conn.execute(
                        "INSERT INTO projects (id, name, folder_path, time_range, scan_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
                        &[&id, &name, &folder_path, &default_time_range, &empty_string, &created_at, &updated_at],
                    );
                }

                println!("数据迁移完成，共迁移 {} 个项目", old_data_len);
            }
        }

        // 创建索引
        conn.execute(
            "CREATE INDEX IF NOT EXISTS idx_projects_name ON projects(name)",
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
fn create_project(db: tauri::State<DatabaseManager>, project_input: ProjectInput) -> Result<Project, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // 生成 UUID
    let id = Uuid::new_v4().to_string();

    // 创建项目文件夹
    let home = dirs::home_dir().unwrap_or_else(|| PathBuf::from("."));
    let project_folder = home.join("FlashBack").join(&project_input.name);

    std::fs::create_dir_all(&project_folder)
        .map_err(|e| format!("创建项目文件夹失败: {}", e))?;

    // 插入数据库
    let now = chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string();
    let empty_string = String::new();
    conn.execute(
        "INSERT INTO projects (id, name, folder_path, time_range, scan_summary, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
        &[&id, &project_input.name, &project_folder.to_string_lossy().to_string(), &project_input.time_range, &empty_string, &now, &now],
    ).map_err(|e| e.to_string())?;

    Ok(Project {
        id,
        name: project_input.name,
        folder_path: project_folder.to_string_lossy().to_string(),
        time_range: project_input.time_range,
        scan_summary: None,
        created_at: now.clone(),
        updated_at: now,
    })
}

#[tauri::command]
fn get_projects(db: tauri::State<DatabaseManager>) -> Result<Vec<Project>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_summary, created_at, updated_at FROM projects ORDER BY updated_at DESC")
        .map_err(|e| e.to_string())?;

    let projects = stmt.query_map([], |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            folder_path: row.get(2)?,
            time_range: row.get(3)?,
            scan_summary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| e.to_string())?;

    let result: Vec<Project> = projects
        .map(|p| p.map_err(|e| e.to_string()))
        .collect::<Result<_, _>>()?;

    Ok(result)
}

#[tauri::command]
fn get_projects_paginated(db: tauri::State<DatabaseManager>, page: usize, page_size: usize) -> Result<ProjectListResponse, String> {
    println!("[DEBUG] get_projects_paginated called: page={}, page_size={}", page, page_size);

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
    let total: usize = conn.query_row("SELECT COUNT(*) FROM projects", [], |row| {
        let count: usize = row.get(0)?;
        println!("[DEBUG] total projects count: {}", count);
        Ok(count)
    }).map_err(|e| {
        println!("[DEBUG] COUNT query error: {}", e);
        e.to_string()
    })?;

    // 计算总页数
    let total_pages = if total == 0 { 1 } else { (total + page_size - 1) / page_size };

    // 获取分页数据
    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_summary, created_at, updated_at FROM projects ORDER BY updated_at DESC LIMIT ? OFFSET ?")
        .map_err(|e| {
            println!("[DEBUG] prepare error: {}", e);
            e.to_string()
        })?;

    let params: &[&dyn rusqlite::ToSql] = &[&(page_size as i64), &(offset as i64)];
    println!("[DEBUG] query params: page_size={}, offset={}", page_size as i64, offset as i64);

    let projects = stmt.query_map(params, |row| {
        Ok(Project {
            id: row.get(0)?,
            name: row.get(1)?,
            folder_path: row.get(2)?,
            time_range: row.get(3)?,
            scan_summary: row.get(4)?,
            created_at: row.get(5)?,
            updated_at: row.get(6)?,
        })
    }).map_err(|e| {
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
fn get_project_by_name(db: tauri::State<DatabaseManager>, name: String) -> Result<Option<Project>, String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    let mut stmt = conn.prepare("SELECT id, name, folder_path, time_range, scan_summary, created_at, updated_at FROM projects WHERE name = ?")
        .map_err(|e| e.to_string())?;

    let mut rows = stmt.query(&[&name]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        Ok(Some(Project {
            id: row.get(0).map_err(|e| e.to_string())?,
            name: row.get(1).map_err(|e| e.to_string())?,
            folder_path: row.get(2).map_err(|e| e.to_string())?,
            time_range: row.get(3).map_err(|e| e.to_string())?,
            scan_summary: row.get(4).map_err(|e| e.to_string())?,
            created_at: row.get(5).map_err(|e| e.to_string())?,
            updated_at: row.get(6).map_err(|e| e.to_string())?,
        }))
    } else {
        Ok(None)
    }
}

#[tauri::command]
fn delete_project(db: tauri::State<DatabaseManager>, name: String) -> Result<(), String> {
    let conn = db.get_connection().map_err(|e| e.to_string())?;

    // 先查询项目路径
    let mut stmt = conn.prepare("SELECT folder_path FROM projects WHERE name = ?")
        .map_err(|e| e.to_string())?;
    let mut rows = stmt.query(&[&name]).map_err(|e| e.to_string())?;

    if let Some(row) = rows.next().map_err(|e| e.to_string())? {
        let folder_path: String = row.get(0).map_err(|e| e.to_string())?;

        // 删除数据库记录
        conn.execute("DELETE FROM projects WHERE name = ?", &[&name])
            .map_err(|e| e.to_string())?;

        // 删除文件夹及其所有内容
        std::fs::remove_dir_all(&folder_path)
            .map_err(|e| format!("删除项目文件夹失败: {}", e))?;
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
fn start_scan(window: tauri::Window, project_name: String, time_range: String) -> Result<(), String> {
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
        let _ = window.emit("scan-log", LogPayload { icon: "check_circle", text: "初始化扫描序列 v2.4.1 [OK]".into() });
        if dev {
            let _ = window.emit("scan-log", LogPayload { icon: "shield", text: "DEV=true 检测到，跳过云端验证".into() });
        }

        // 显示配置信息
        let _ = window.emit("scan-log", LogPayload { icon: "folder", text: format!("项目名称: {}", project_name) });
        let range_label = match time_range.as_str() {
            "past_year" => "过去一年",
            "past_month" => "过去一个月",
            "past_week" => "过去一周",
            _ => "未知范围",
        };
        let _ = window.emit("scan-log", LogPayload { icon: "schedule", text: format!("时间范围: {}", range_label) });
        let _ = window.emit("scan-log", LogPayload { icon: "folder_open", text: format!("项目目录: {}", project_folder) });

        let mut summary = ScanSummary::default();

        // 步骤 1：聊天数据库位置
        let chats = detect_chat_locations();
        for c in &chats {
            let _ = window.emit("scan-log", LogPayload { icon: "chat", text: format!("发现聊天数据路径: {} ({})", c.path, c.app) });
        }
        summary.chat_locations = chats;
        let _ = window.emit("scan-progress", ProgressPayload { progress: 18 });

        // 步骤 2：Git 仓库识别
        let mut git_count = 0usize;
        let mut roots = candidate_roots();
        // 添加项目的目录
        roots.push(PathBuf::from(&project_folder));

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
            let pct = 18 + (((idx + 1) as f32 / roots.len().max(1) as f32) * 42.0) as u8;
            let _ = window.emit("scan-progress", ProgressPayload { progress: pct.min(60) });
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
        let _ = window.emit("scan-log", LogPayload { icon: "description", text: format!("文档统计完成: {} 个候选文件 (时间范围: {})", docs_count, time_range_clone) });
        let _ = window.emit("scan-progress", ProgressPayload { progress: 84 });

        // 步骤 4：完成
        if let Some(state) = window.app_handle().try_state::<Mutex<Option<ScanSummary>>>() {
            if let Ok(mut s) = state.lock() { *s = Some(summary.clone()); }
        }
        let _ = window.emit("scan-log", LogPayload { icon: "sync", text: "正在分析会议记录...".into() });
        std::thread::sleep(std::time::Duration::from_millis(500));

        // 更新数据库中的扫描摘要
        let summary_json = serde_json::to_string(&summary).unwrap_or_default();
        if let Ok(conn) = Connection::open(DatabaseManager::get_db_path()) {
            let _ = conn.execute(
                "UPDATE projects SET scan_summary = ?, updated_at = ? WHERE name = ?",
                &[&summary_json, &chrono::Local::now().format("%Y-%m-%d %H:%M:%S").to_string(), &project_name],
            );
        }

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
            delete_project,
            start_scan,
            get_scan_summary
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}