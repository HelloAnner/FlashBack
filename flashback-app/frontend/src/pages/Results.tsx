import { useLocation } from 'react-router-dom'
import { useProjectStore } from '../lib/projectStore'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'
import { getResultsPaginated, type ResultItem, getCurrentProject } from '../lib/tauri'

export default function Results() {
  const location = useLocation()
  const { project } = useProjectStore()

  const [projectId, setProjectId] = useState<string>('')
  const [projectName, setProjectName] = useState<string>('')
  const [items, setItems] = useState<ResultItem[]>([])
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 8
  const [total, setTotal] = useState(0)
  const [totalPages, setTotalPages] = useState(1)

  useEffect(() => {
    (async () => {
      try {
        const p = await getCurrentProject()
        if (p) {
          setProjectId(p.id)
          setProjectName(p.name)
          return
        }
      } catch {}
      const state = location.state as { projectId?: string; projectName?: string } | null
      const id = state?.projectId || project?.id || ''
      const name = state?.projectName || project?.name || ''
      setProjectId(id)
      setProjectName(name)
    })()
  }, [location.state])

  useEffect(() => {
    if (!projectId) return
    getResultsPaginated(projectId, page, PAGE_SIZE)
      .then(res => { setItems(res.items); setTotal(res.total); setTotalPages(res.total_pages) })
      .catch(console.error)
  }, [projectId, page])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {projectName && (
          <div className="absolute top-4 right-4 z-30">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">当前项目</span>
                <span className="text-[11px] font-bold text-primary">{projectName}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 overflow-y-auto p-5 flex justify-center bg-slate-100 dark:bg-slate-800">
          <div className="w-full max-w-[940px]">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-sm">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">table</span>
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">扫描结果</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">(共 {total} 条)</span>
                </div>
              </div>
              <div className="divide-y divide-slate-200 dark:divide-slate-700">
                <div className="grid grid-cols-12 gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-900/40 text-[11px] text-slate-500 dark:text-slate-400">
                  <div className="col-span-5">文件路径</div>
                  <div className="col-span-1">类型</div>
                  <div className="col-span-2">来源</div>
                  <div className="col-span-1 text-right">大小</div>
                  <div className="col-span-1">创建时间</div>
                  <div className="col-span-1">修改时间</div>
                  <div className="col-span-1 text-center">有效</div>
                </div>
                {items.length === 0 ? (
                  <div className="px-4 py-10 text-center text-[12px] text-slate-500 dark:text-slate-400">暂无数据</div>
                ) : (
                  items.map(row => (
                    <div key={row.id} className="grid grid-cols-12 gap-2 px-4 py-2 text-[11px] text-slate-700 dark:text-slate-300">
                      <div className="col-span-5 truncate font-mono">{row.file_path}</div>
                      <div className="col-span-1">{row.file_type || '-'}</div>
                      <div className="col-span-2">{row.source}</div>
                      <div className="col-span-1 text-right">{(row.size_bytes/1024).toFixed(1)} KB</div>
                      <div className="col-span-1">{row.created_at.split(' ')[0]}</div>
                      <div className="col-span-1">{row.modified_at.split(' ')[0]}</div>
                      <div className="col-span-1 text-center">
                        <span className={`inline-flex items-center justify-center w-4 h-4 rounded ${row.is_valid ? 'bg-green-500' : 'bg-red-500'}`}></span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              {totalPages > 1 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <div className="flex items-center justify-between px-4 py-2 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>第 {page} / {totalPages} 页</span>
                    <div className="flex gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50">上一页</button>
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 disabled:opacity-50">下一页</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
