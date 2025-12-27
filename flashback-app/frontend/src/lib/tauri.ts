import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

// ==================== 类型定义 ====================

export interface Project {
  id: string
  name: string
  folder_path: string
  time_range: string
  scan_summary: string | null
  created_at: string
  updated_at: string
}

export interface ProjectInput {
  name: string
  time_range: string
}

export interface ProjectListResponse {
  projects: Project[]
  total: number
  page: number
  total_pages: number
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
  // tauri 命令参数名必须与后端函数签名一致（snake_case）。
  // 后端签名: create_project(..., project_input: ProjectInput)
  try {
    return await invoke('create_project', { project_input: projectInput })
  } catch (e: any) {
    // 兼容历史代码：如果后端意外要求 camelCase（projectInput），做一次回退重试
    const msg = String(e || '')
    if (msg.includes('missing required key project_input') || msg.includes('missing required key projectInput') || msg.includes('invalid args')) {
      return await invoke('create_project', { projectInput: projectInput as any })
    }
    throw e
  }
}

/**
 * 获取所有项目列表
 */
export async function getProjects(): Promise<Project[]> {
  return await invoke('get_projects')
}

/**
 * 获取分页项目列表
 */
export async function getProjectsPaginated(page: number, page_size: number): Promise<ProjectListResponse> {
  try {
    return await invoke('get_projects_paginated', { page, page_size })
  } catch (e) {
    // 回退策略：若分页接口不可用，退化为全量查询 + 前端分页，避免首页空列表
    console.warn('get_projects_paginated 调用失败，回退到 get_projects。错误：', e)
    const all = await invoke<Project[]>('get_projects')
    const total = all.length
    const total_pages = Math.max(1, Math.ceil(total / page_size))
    const start = (page - 1) * page_size
    const projects = all.slice(start, start + page_size)
    return { projects, total, page, total_pages }
  }
}

/**
 * 根据项目名称获取项目
 */
export async function getProjectByName(name: string): Promise<Project | null> {
  return await invoke('get_project_by_name', { name })
}

/**
 * 删除项目（删除文件夹和数据库记录）
 */
export async function deleteProject(name: string): Promise<void> {
  return await invoke('delete_project', { name })
}

// ==================== 扫描 API ====================

export async function startScan(projectName: string, timeRange: string, onLog: (p: {icon: string; text: string}) => void, onProgress: (v: number) => void, onDone: (s: ScanSummary) => void) {
  await listen('scan-log', (e) => onLog(e.payload as any))
  await listen('scan-progress', (e) => onProgress((e.payload as any).progress))
  await listen('scan-done', (e) => onDone(e.payload as any))
  // 后端签名: start_scan(window, project_name: String, time_range: String)
  try {
    await invoke('start_scan', { project_name: projectName, time_range: timeRange })
  } catch (e: any) {
    const msg = String(e || '')
    if (msg.includes('missing required key project_name') || msg.includes('missing required key projectName') || msg.includes('invalid args')) {
      await invoke('start_scan', { projectName, timeRange })
      return
    }
    throw e
  }
}

export async function getSummary(): Promise<ScanSummary | null> {
  return await invoke('get_scan_summary')
}
