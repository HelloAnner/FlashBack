import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from '../components/Sidebar'

interface LogEntry {
  icon: string
  text: string
}

interface ProgressPayload {
  progress: number
}

interface ScanSummary {
  git_repos: number
  documents: number
  chat_locations: Array<{ app: string; path: string }>
}

export default function Processing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [workDir, setWorkDir] = useState<string>('')

  useEffect(() => {
    // 从路由状态获取工作目录，或使用默认值
    const state = location.state as { workDir?: string } | null
    const dir = state?.workDir || ''
    setWorkDir(dir)
    console.log('Processing - workDir:', dir)
  }, [location.state])

  useEffect(() => {
    if (!workDir) return

    let unlistenLog: (() => void) | undefined
    let unlistenProgress: (() => void) | undefined
    let unlistenDone: (() => void) | undefined

    const setupListeners = async () => {
      // 监听日志
      unlistenLog = await listen<{ icon: string; text: string }>('scan-log', (event) => {
        setLogs(prev => [...prev, { icon: event.payload.icon, text: event.payload.text }])
      })

      // 监听进度
      unlistenProgress = await listen<ProgressPayload>('scan-progress', (event) => {
        setProgress(event.payload.progress)
      })

      // 监听完成
      unlistenDone = await listen<ScanSummary>('scan-done', (event) => {
        console.log('Scan completed:', event.payload)
        // 延迟跳转到结果页面
        setTimeout(() => {
          navigate('/results', { state: { summary: event.payload } })
        }, 1000)
      })

      // 启动扫描
      try {
        console.log('Starting scan with workDir:', workDir)
        await invoke('start_scan', { workDir })
      } catch (e) {
        console.error('Scan failed:', e)
        setLogs(prev => [...prev, { icon: 'error', text: `扫描失败: ${e}` }])
      }
    }

    setupListeners()

    return () => {
      unlistenLog?.()
      unlistenProgress?.()
      unlistenDone?.()
    }
  }, [workDir, navigate])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        {/* 主要内容 */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 w-full max-w-5xl mx-auto">
          {/* 进度条 */}
          <div className="w-full max-w-3xl mb-8">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">扫描进度</span>
              <span className="text-sm font-mono text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-2 overflow-hidden">
              <div
                className="bg-primary h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 雷达扫描动画 */}
          <div className="relative mb-12">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-72 bg-primary/20 rounded-full blur-[80px] animate-pulse-slow" />
            <div className="relative w-56 h-56 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-2xl flex items-center justify-center overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#60a5fa 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,var(--tw-gradient-stops))] from-primary/0 via-primary/40 to-primary/0 animate-scan opacity-70" />
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-4 rounded-full border border-primary/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1.5s]" />
              <div className="relative z-10 bg-white dark:bg-[#0f172a] p-5 rounded-full border border-primary/30 shadow-[0_0_15px_rgba(59,130,246,0.5)]">
                <span className="material-symbols-outlined text-4xl text-primary animate-pulse">radar</span>
              </div>
            </div>
          </div>

          {/* 标题 */}
          <div className="text-center max-w-lg mb-8 space-y-3">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight text-slate-900 dark:text-white">
              正在分析项目数据
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-light">
              系统正在深度扫描代码库与文档，构建全景时间线...
            </p>
          </div>

          {/* 系统日志 */}
          <div className="w-full max-w-3xl relative">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-xl blur opacity-20" />
            <div className="bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1.5">
                    <div className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-yellow-500/80" />
                    <div className="w-2.5 h-2.5 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-3 text-xs font-mono text-slate-500 dark:text-slate-400 font-medium">System_Log.log</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-400 dark:text-slate-500 font-mono">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
                  LIVE
                </div>
              </div>
              <div className="h-64 p-5 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white dark:from-[#1e293b] via-transparent to-white dark:to-[#1e293b] opacity-40 z-10" />
                <ul className="font-mono text-sm space-y-3 pb-12 relative z-0 flex flex-col justify-end h-full overflow-y-auto">
                  {logs.length === 0 ? (
                    <li className="flex items-start gap-3 text-slate-500 dark:text-slate-500">
                      <span className="text-blue-400 shrink-0 mt-0.5 material-symbols-outlined text-[14px]">hourglass</span>
                      <span>等待扫描启动...</span>
                    </li>
                  ) : (
                    logs.map((log, idx) => (
                      <li key={idx} className="flex items-start gap-3 text-slate-600 dark:text-slate-400">
                        <span className={`shrink-0 mt-0.5 material-symbols-outlined text-[14px] ${
                          log.icon === 'check_circle' ? 'text-green-500' :
                          log.icon === 'error' ? 'text-red-500' :
                          log.icon === 'shield' ? 'text-yellow-500' :
                          log.icon === 'folder' ? 'text-blue-400' :
                          log.icon === 'folder_open' ? 'text-blue-400' :
                          log.icon === 'chat' ? 'text-purple-400' :
                          log.icon === 'description' ? 'text-purple-400' :
                          log.icon === 'data_object' ? 'text-cyan-400' :
                          log.icon === 'sync' ? 'text-primary animate-spin' :
                          'text-slate-400'
                        }`}>{log.icon}</span>
                        <span className={log.icon === 'sync' ? 'font-medium text-slate-900 dark:text-white' : ''}>{log.text}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
