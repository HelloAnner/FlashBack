import { useEffect, useRef, useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import Sidebar from '../components/Sidebar'
import Pagination from '../components/Pagination'
import { getResultsPaginatedAdv, getProjectScanRoots } from '../lib/tauri'
import { startScan, startScanWithId, type ScanSummary, getResultsPaginated, type ResultItem, getCurrentProject, getProjectByName, setCurrentProject } from '../lib/tauri'
import { useProjectStore } from '../lib/projectStore'

interface LogEntry {
  icon: string
  text: string
}

export default function Processing() {
  const navigate = useNavigate()
  const location = useLocation()
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState(0)
  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('')
  const { project, setProject } = useProjectStore()
  const [scanComplete, setScanComplete] = useState(false)
  const [scanSummary, setScanSummary] = useState<ScanSummary | null>(null)
  const [items, setItems] = useState<ResultItem[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)
  const [currentFolder, setCurrentFolder] = useState('')
  const lastProgressQueriedRef = useRef(0)
  const [query, setQuery] = useState('')
  const [typesFilter, setTypesFilter] = useState<string[]>([])
  const [scanRoots, setScanRoots] = useState<string[]>([])

  useEffect(() => {
    // 优先从后端 KV 获取当前处理项目；回退路由或本地 store
    (async () => {
      try {
        const p = await getCurrentProject()
        if (p) {
          setProjectId(p.id)
          setProjectName(p.name)
          setTimeRange((p as any).time_range || '')
          return
        }
      } catch {}
      const state = location.state as { projectId?: string; projectName?: string; timeRange?: string } | null
      const id = state?.projectId || project?.id || ''
      const name = state?.projectName || project?.name || ''
      const range = state?.timeRange || ''
      setProjectId(id)
      setProjectName(name)
      setTimeRange(range)
      console.log('Processing - projectName:', name, 'timeRange:', range)
    })()
  }, [location.state])

  useEffect(() => {
    if (!projectName) return

    let unlistenLog: (() => void) | undefined
    let unlistenProgress: (() => void) | undefined
    let unlistenDone: (() => void) | undefined

    const setupListeners = async () => {
      // 监听日志
      unlistenLog = await listen<{ icon: string; text: string }>('scan-log', (event) => {
        const text = event.payload.text
        setLogs(prev => [...prev, { icon: event.payload.icon, text }])
        if (text?.startsWith('扫描目录: ')) {
          setCurrentFolder(text.replace('扫描目录: ', ''))
        }
      })

      // 监听进度
      unlistenProgress = await listen<{ progress: number }>('scan-progress', async (event) => {
        const p = event.payload.progress
        setProgress(p)
        // 扫描过程中，按 10% 阶梯刷新一次分页数据与总数
        if (projectId && p - lastProgressQueriedRef.current >= 10) {
          lastProgressQueriedRef.current = p
          try {
            const res = await getResultsPaginatedAdv({ project_id: projectId, page, page_size: PAGE_SIZE, q: query, file_types: typesFilter })
            setItems(res.items); setTotal(res.total); setTotalPages(res.total_pages)
          } catch (e) {
            console.warn('刷新扫描结果失败:', e)
          }
        }
      })

      // 监听完成
      unlistenDone = await listen<ScanSummary>('scan-done', (event) => {
        console.log('Scan completed:', event.payload)
        setScanSummary(event.payload)
        setScanComplete(true)
        // 扫描完成后刷新一次当前页数据
        if (projectId) {
          getResultsPaginatedAdv({ project_id: projectId, page, page_size: PAGE_SIZE, q: query, file_types: typesFilter }).then(res => {
            setItems(res.items); setTotal(res.total); setTotalPages(res.total_pages)
          }).catch(console.error)
        }
      })

      // 启动扫描（必须拿到 projectId，若缺失则通过名称补齐 id 并回写后端 KV，再按 id 扫描）
      try {
        console.log('Starting scan:', { projectId, projectName, timeRange })
        let pid = projectId
        if (!pid && projectName) {
          try {
            const p = await getProjectByName(projectName)
            if (p) {
              pid = p.id
              await setCurrentProject(pid)
            }
          } catch {}
        }
        if (pid) {
          await startScanWithId(
            pid,
            (log) => setLogs(prev => [...prev, log]),
            (p) => setProgress(p),
            (summary) => {
              setScanSummary(summary)
              setScanComplete(true)
            }
          )
        } else {
          // 兜底：老流程；提示用户尽快在首页设置为当前项目
          if (projectName && timeRange) {
            await startScan(
              projectName,
              timeRange,
              (log) => setLogs(prev => [...prev, log]),
              (p) => setProgress(p),
              (summary) => {
                setScanSummary(summary)
                setScanComplete(true)
              }
            )
          }
        }
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
  
  // 首次进入与翻页时，加载一次结果（如果 projectId 存在）
  useEffect(() => {
    if (!projectId) return
    getResultsPaginatedAdv({ project_id: projectId, page, page_size: PAGE_SIZE, q: query, file_types: typesFilter })
      .then(res => { setItems(res.items); setTotal(res.total); setTotalPages(res.total_pages) })
      .catch(console.error)
  }, [projectId, page, query, typesFilter])

  // 加载扫描根目录（用于 UI 提示）
  useEffect(() => {
    if (!projectId) return
    getProjectScanRoots(projectId).then(setScanRoots).catch(() => setScanRoots([]))
  }, [projectId])

  const handleSelectStyle = () => {
    navigate('/configure', { state: { summary: scanSummary, projectId, projectName } })
  }

  // 查看结果入口已移除；扫描完成后将“重新扫描”按钮放到原查看结果的位置

  const handleRescan = async () => {
    if (!projectId) return
    setScanComplete(false)
    setLogs([])
    setProgress(0)
    setCurrentFolder('')
    setPage(1)
    try {
      await startScanWithId(
        projectId,
        (log) => setLogs(prev => [...prev, log]),
        (p) => setProgress(p),
        (summary) => {
          setScanSummary(summary)
          setScanComplete(true)
        }
      )
    } catch (e) {
      console.error('Rescan failed:', e)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* 右上角当前项目指示器 */}
        {projectName && (
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5">
                  <span className="text-[9px] text-slate-500 dark:text-slate-400">当前项目</span>
                  <span className="text-[11px] font-bold text-primary">{projectName}</span>
                </div>
                {/* 扫描完成后重排按钮：顶部不再显示重新扫描 */}
              </div>
            </div>
          </div>
        )}

        {/* 侧边栏占位空间 */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-8 w-full max-w-4xl mx-auto">
          {/* 进度条 */}
          {/* 进度条 + 当前扫描目录 + 总数 */}
          <div className="w-full max-w-2xl mb-4">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[12px] font-medium text-slate-600 dark:text-slate-300">扫描进度</span>
              <span className="text-[12px] font-mono text-primary">{progress}%</span>
            </div>
            <div className="w-full bg-slate-200 dark:bg-slate-700 rounded-full h-1.5 overflow-hidden">
              <div className="bg-primary h-1.5 rounded-full transition-all duration-300 ease-out" style={{ width: `${progress}%` }} />
            </div>
            <div className="mt-1.5 text-[11px] text-slate-500 dark:text-slate-400 flex items-center justify-between">
              <span className="truncate">当前目录：{currentFolder || '等待开始...'}</span>
              <span>已入库：{total} 条</span>
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
              {/* 将“重新扫描”移动到原“查看结果”的位置与样式 */}
              <button
                onClick={handleRescan}
                disabled={!projectId}
                className="flex items-center gap-1 px-3 py-2 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-900 dark:text-white rounded-lg font-medium text-[12px] transition-all active:scale-95 disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[12px]">cached</span>
                重新扫描
              </button>
            </div>
          )}

          {/* 搜索与筛选 */}
          <div className="w-full max-w-2xl mb-2">
            <div className="flex items-center gap-2">
              <input value={query} onChange={e => { setPage(1); setQuery(e.target.value) }} placeholder="搜索文件路径..." className="flex-1 px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" />
              <select className="px-2 py-1 text-[11px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800" onChange={e => { const v=e.target.value; setPage(1); setTypesFilter(v? [v] : []) }}>
                <option value="">全部类型</option>
                {['txt','md','pdf','docx','xlsx','pptx','png','jpg','jpeg','csv'].map(t => (<option key={t} value={t}>{t}</option>))}
              </select>
            </div>
            {scanRoots.length>0 && (
              <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400 truncate">扫描根目录：{scanRoots.join('  |  ')}</div>
            )}
          </div>

          {/* 扫描结果（分页展示全部数据）*/}
          <div className="w-full max-w-2xl">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-3 py-2 border-b border-slate-200 dark:border-slate-700">
                <div className="text-[12px] font-bold text-slate-700 dark:text-slate-200">扫描结果（共 {total} 条）</div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                <div className="grid grid-cols-12 gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="col-span-6">文件路径</div>
                  <div className="col-span-1">类型</div>
                  <div className="col-span-2">来源</div>
                  <div className="col-span-1 text-right">大小</div>
                  <div className="col-span-1">创建</div>
                  <div className="col-span-1">修改</div>
                  <div className="col-span-1 text-center">有效</div>
                </div>
                {items.length === 0 ? (
                  <div className="px-3 py-8 text-center text-[12px] text-slate-500 dark:text-slate-400">暂无数据</div>
                ) : (
                  items.map(r => (
                    <div key={r.id} className="grid grid-cols-12 gap-2 px-3 py-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="col-span-6 truncate font-mono">{r.file_path}</div>
                      <div className="col-span-1">{r.file_type || '-'}</div>
                      <div className="col-span-2">{r.source}</div>
                      <div className="col-span-1 text-right">{(r.size_bytes/1024).toFixed(1)} KB</div>
                      <div className="col-span-1">{r.created_at.split(' ')[0]}</div>
                      <div className="col-span-1">{r.modified_at.split(' ')[0]}</div>
                      <div className="col-span-1 text-center">
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded ${r.is_valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {totalPages > 1 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <Pagination
                    currentPage={page}
                    totalPages={totalPages}
                    totalItems={total}
                    pageSize={PAGE_SIZE}
                    onPageChange={setPage}
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
