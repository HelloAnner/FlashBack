import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'

export type ScanSummary = { git_repos: number; documents: number; chat_locations: { app: string; path: string }[] }

export async function startScan(onLog: (p: {icon: string; text: string}) => void, onProgress: (v: number) => void, onDone: (s: ScanSummary) => void) {
  await listen('scan-log', (e) => onLog(e.payload as any))
  await listen('scan-progress', (e) => onProgress((e.payload as any).progress))
  await listen('scan-done', (e) => onDone(e.payload as any))
  await invoke('start_scan')
}

export async function getSummary(): Promise<ScanSummary | null> {
  return await invoke('get_scan_summary')
}

