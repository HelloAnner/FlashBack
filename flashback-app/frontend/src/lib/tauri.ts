import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ==================== 类型定义 ====================

export interface Project {
  id: string
  name: string
  folder_path: string
  created_at: string
  updated_at: string
}

export interface ProjectInput {
  name: string
}

export interface ScanSummary {
  git_repos: number
  documents: number
  chat_locations: { app: string; path: string }[]
}

// ==================== 项目管理 API ====================

/**
 * 初始化数据库
 */
export async function initDatabase(): Promise<string> {
  return await invoke('init_database')
}

/**
 * 创建项目
 */
export async function createProject(projectInput: ProjectInput): Promise<Project> {
  return await invoke('create_project', { projectInput })
}

/**
 * 获取所有项目列表
 */
export async function getProjects(): Promise<Project[]> {
  return await invoke('get_projects')
}

/**
 * 根据项目名称获取项目
 */
export async function getProjectByName(name: string): Promise<Project | null> {
  return await invoke('get_project_by_name', { name })
}

/**
 * 删除项目
 */
export async function deleteProject(name: string): Promise<void> {
  return await invoke('delete_project', { name })
}

// ==================== 扫描 API ====================

export async function startScan(projectName: string, timeRange: string, onLog: (p: {icon: string; text: string}) => void, onProgress: (v: number) => void, onDone: (s: ScanSummary) => void) {
  await listen('scan-log', (e) => onLog(e.payload as any))
  await listen('scan-progress', (e) => onProgress((e.payload as any).progress))
  await listen('scan-done', (e) => onDone(e.payload as any))
  await invoke('start_scan', { projectName, timeRange })
}

export async function getSummary(): Promise<ScanSummary | null> {
  return await invoke('get_scan_summary')
}
