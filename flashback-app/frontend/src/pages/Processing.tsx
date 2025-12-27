import { useEffect, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from '../components/Sidebar'
import { startScan, type ScanSummary } from '../lib/tauri'

interface LogEntry {
  icon: string
  text: string
}

export default function Processing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [projectName, setProjectName] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('')
  const [scanComplete, setScanComplete] = useState(false)
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null)

  useEffect(() => {
    // 从路由状态获取参数
    const state = location.state as { projectName?: string; timeRange?: string } | null
    const name = state?.projectName || ''
    const range = state?.timeRange || ''

    setProjectName(name)
    setTimeRange(range)

    console.log('Processing - projectName:', name, 'timeRange:', range)
  }, [location.state])

  useEffect(() => {
    if (!projectName) return

    let unlistenLog: (() => void) | undefined
    let unlistenProgress: (() => void) | undefined
    let unlistenDone: (() => void) | undefined

    const setupListeners = async () => {
      // 监听日志
      unlistenLog = await listen<{ icon: string; text: string }>('scan-log', (event) => {
        setLogs(prev => [...prev, { icon: event.payload.icon, text: event.payload.text }])
      })

      // 监听进度
      unlistenProgress = await listen<{ progress: number }>('scan-progress', (event) => {
        setProgress(event.payload.progress)
      })

      // 监听完成
      unlistenDone = await listen<ScanSummary>('scan-done', (event) => {
        console.log('Scan completed:', event.payload)
        setScanSummary(event.payload)
        setScanComplete(true)
      })

      // 启动扫描
      try {
        console.log('Starting scan:', { projectName, timeRange })
        await projectName && timeRange && startScan(
          projectName,
          timeRange,
          (log) => setLogs(prev => [...prev, log]),
          (p) => setProgress(p),
          (summary) => {
            setScanSummary(summary)
            setScanComplete(true)
          }
        )
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
  }, [projectName, timeRange, navigate])

  const handleSelectStyle = () => {
    navigate('/configure', { state: { summary: scanSummary, projectName } })
  }

  const handleViewResults = () => {
    navigate('/results', { state: { summary: scanSummary, projectName } })
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* 右上角当前项目指示器 */}
        {projectName && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">当前项目</span>
                <span className="text-[11px] font-bold text-primary">{projectName}</span>
              </div>
            </div>
          </div>
        )}

        {/* 侧边栏占位空间 */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 w-full max-w-4xl mx-auto">
          {/* 进度条 */}
          <div className="w-full max-w-2xl mb-6">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">扫描进度</span>
              <span className="text-[12px] font-mono text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>

          {/* 雷达扫描动画 */}
          <div className="relative mb-6">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-primary/20 rounded-full blur-[40px] animate-pulse-slow" />
            <div className="relative w-24 h-24 rounded-full bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-slate-900/5 dark:ring-white/10">
              <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/40 via-transparent to-transparent" />
              <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(#60a5fa 1px, transparent 1px)', backgroundSize: '12px 12px' }} />
              <div className="absolute inset-0 bg-[conic-gradient(from_0deg,transparent_0_300deg,var(--tw-gradient-stops))] from-primary/0 via-primary/40 to-primary/0 animate-scan opacity-70" />
              <div className="absolute inset-0 rounded-full border border-primary/20 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite]" />
              <div className="absolute inset-2 rounded-full border border-primary/10 animate-[ping_3s_cubic-bezier(0,0,0.2,1)_infinite_1.5s]" />
              <div className="relative z-10 bg-white dark:bg-[#0f172a] p-2.5 rounded-full border border-primary/30 shadow-[0_0_12px_rgba(59,130,246,0.5)]">
                <span className="material-symbols-outlined text-[12px] text-primary animate-pulse">radar</span>
              </div>
            </div>
          </div>

          {/* 标题 */}
          <div className="text-center max-w-lg mb-6 space-y-1">
            <h2 className="text-[12px] font-bold tracking-tight text-slate-900 dark:text-white">
              {scanComplete ? '扫描完成' : `正在分析: ${projectName}`}
            </h2>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 font-light">
              {scanComplete ? '数据已准备就绪，请选择下一步操作' : (
                <>
                  时间范围: {timeRange === 'past_year' ? '过去一年' : timeRange === 'past_month' ? '过去一个月' : '过去一周'}
                </>
              )}
            </p>
          </div>

          {/* 扫描完成后的操作按钮 */}
          {scanComplete && (
            <div className="flex gap-3 mb-6">
              <button
                onClick={handleSelectStyle}
                className="flex items-center gap-1 px-3 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium text-[12px] shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[12px]">palette</span>
                选择风格
              </button>
              <button
                onClick={handleViewResults}
                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg font-medium text-[12px] transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[12px]">visibility</span>
                查看结果
              </button>
            </div>
          )}

          {/* 系统日志 */}
          <div className="w-full max-w-2xl relative">
            <div className="absolute -inset-0.5 bg-gradient-to-b from-primary/20 to-transparent rounded-xl blur opacity-20" />
            <div className="bg-white/50 dark:bg-[#1e293b]/50 backdrop-blur-md rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">
              <div className="px-3 py-2 border-b border-slate-200/50 dark:border-slate-700/50 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="flex gap-1">
                    <div className="w-2 h-2 rounded-full bg-red-500/80" />
                    <div className="w-2 h-2 rounded-full bg-yellow-500/80" />
                    <div className="w-2 h-2 rounded-full bg-green-500/80" />
                  </div>
                  <span className="ml-2 text-[11px] font-mono text-slate-500 dark:text-slate-400 font-medium">System_Log.log</span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  <span className="w-1 h-1 rounded-full bg-primary animate-pulse" />
                  {scanComplete ? 'COMPLETE' : 'LIVE'}
                </div>
              </div>
              <div className="h-56 p-3 overflow-hidden relative">
                <div className="absolute inset-0 pointer-events-none bg-gradient-to-b from-white dark:from-[#1e293b] via-transparent to-white dark:to-[#1e293b] opacity-40 z-10" />
                <ul className="font-mono text-[12px] space-y-2 pb-8 relative z-0 flex flex-col justify-end h-full overflow-y-auto">
                  {logs.length === 0 ? (
                    <li className="flex items-start gap-2 text-slate-500 dark:text-slate-500">
                      <span className="text-blue-400 shrink-0 mt-0.5 material-symbols-outlined text-[12px]">hourglass</span>
                      <span>等待扫描启动...</span>
                    </li>
                  ) : (
                    logs.map((log, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-slate-600 dark:text-slate-400">
                        <span className={`shrink-0 mt-0.5 material-symbols-outlined text-[12px] ${
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
