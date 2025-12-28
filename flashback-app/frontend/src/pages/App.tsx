import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect, useRef, useCallback } from 'react'
import { mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import { open } from '@tauri-apps/plugin-dialog'
import ThemeToggle from '../components/ThemeToggle'
import Sidebar from '../components/Sidebar'
import CustomSelect from '../components/CustomSelect'
import Pagination from '../components/Pagination'
import DeleteConfirmModal from '../components/DeleteConfirmModal'
import { initDatabase, getProjectsPaginated, deleteProject, createProject, getProjectByName, getProjectScanRoots, type Project, type ProjectListResponse, setCurrentProject } from '../lib/tauri'
import { useProjectStore } from '../lib/projectStore'

export default function App() {
  const navigate = useNavigate()
  const location = useLocation()
  const [projectName, setProjectName] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('past_year')
  const [scanScope, setScanScope] = useState<'ALL' | 'CUSTOM'>('ALL')
  const [scanFolders, setScanFolders] = useState<string[]>([])
  const { setProject } = useProjectStore()

  // 分页相关状态
  const [pageData, setPageData] = useState<ProjectListResponse>({
    projects: [],
    total: 0,
    page: 1,
    total_pages: 0
  })
  const [currentPage, setCurrentPage] = useState(1)
  const PAGE_SIZE = 5

  // UI 状态
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [scanRootsMap, setScanRootsMap] = useState<Record<string, string[]>>({})

  // 删除确认弹窗
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    projectName: ''
  })

  // 路由监听状态
  const prevPathRef = useRef<string>('')

  // 加载项目列表（分页）放最前，供下面所有 effect 使用
  const loadProjects = useCallback(async (page: number) => {
    try {
      const response = await getProjectsPaginated(page, PAGE_SIZE)
      setPageData(response)
      setCurrentPage(page)
      console.log(`已加载项目列表 (第 ${page} 页):`, response.projects.length, '个，共', response.total, '个')

      // 加载每个项目的实际扫描根目录（显示在表格路径处）
      const rootsEntries = await Promise.all(
        response.projects.map(async (p) => {
          try {
            const roots = await getProjectScanRoots(p.id)
            return [p.id, roots] as const
          } catch {
            return [p.id, []] as const
          }
        })
      )
      setScanRootsMap(Object.fromEntries(rootsEntries))
    } catch (e) {
      console.error('加载项目列表失败:', e)
    }
  }, [])

  // 初始化：创建 FlashBack 目录、初始化数据库
  useEffect(() => {
    async function initApp() {
      try {
        // 确保 FlashBack 目录存在
        await mkdir('FlashBack', { baseDir: BaseDirectory.Home, recursive: true })
        console.log('工作目录已初始化: ~/FlashBack')

        // 初始化数据库
        await initDatabase()
        console.log('数据库初始化完成')

        // 加载项目列表（第一页）
        await loadProjects(1)
      } catch (e) {
        console.error('初始化失败:', e)
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [])

  // 当路由变化到首页时，重新加载项目列表
  useEffect(() => {
    // 每次进入首页都刷新数据
    if (location.pathname === '/') {
      console.log('首页，重新加载项目列表')
      loadProjects(1)
    }

    // 记录上一次路径，用于检测路由变化
    prevPathRef.current = location.pathname
  }, [location.pathname])

  // 监听来自 Sidebar 的刷新事件（点击左侧“首页”时会触发）
  useEffect(() => {
    const handler = () => {
      console.log('收到 refresh-projects 事件，重新加载项目列表...')
      loadProjects(1)
    }
    window.addEventListener('refresh-projects' as any, handler)
    return () => window.removeEventListener('refresh-projects' as any, handler)
  }, [loadProjects])

  // 处理开始扫描（自动创建项目）
  const handleStartScan = async () => {
    const name = projectName.trim()
    if (!name) {
      alert('请输入项目名称')
      return
    }

    try {
      // 先创建项目（如果不存在）
      console.log('开始创建项目:', name, timeRange)
      const p = await createProject({ name, time_range: timeRange, scan_scope: scanScope, scan_folders: scanFolders })
      console.log('项目创建成功')

      // 重新加载项目列表，显示新项目
      await loadProjects(currentPage)

      // 清空输入框
      setProjectName('')

      // 记录全局选择的项目（供右上角显示 & 后续请求携带 id）
      setProject({ id: p.id, name: p.name, time_range: p.time_range, scan_scope: (p as any).scan_scope, scan_folders: (p as any).scan_folders ? JSON.parse((p as any).scan_folders) : [] })
      // 同步写入后端 KV（跨进程/重启也能获取）
      await setCurrentProject(p.id)

      // 跳转到扫描页面
      navigate('/processing', {
        state: {
          projectId: p.id,
          projectName: name,
          timeRange
        }
      })
    } catch (e) {
      console.error('创建项目失败:', e)
      // 如果项目已存在，也跳转到扫描页面
      if (String(e).includes('UNIQUE constraint')) {
        try {
          const p = await getProjectByName(name)
          if (p) {
            // 同步设置为当前项目（store + 后端KV）
            setProject({ id: p.id, name: p.name, time_range: p.time_range, scan_scope: (p as any).scan_scope, scan_folders: (p as any).scan_folders ? JSON.parse((p as any).scan_folders) : [] })
            await setCurrentProject(p.id)
            navigate('/processing', {
              state: {
                projectId: p.id,
                projectName: p.name,
                timeRange
              }
            })
            return
          }
        } catch {}
        // 回退：仅携带名称与时间范围（扫描页会从后端KV或store兜底）
        navigate('/processing', { state: { projectName: name, timeRange } })
      } else {
        alert(`创建项目失败: ${e}`)
      }
    }
  }

  // 处理分页变化
  const handlePageChange = (page: number) => {
    loadProjects(page)
  }

  // 处理删除确认
  const handleDeleteClick = (projectName: string) => {
    setDeleteModal({
      isOpen: true,
      projectName
    })
  }

  // 执行删除
  const handleConfirmDelete = async () => {
    const projectName = deleteModal.projectName
    if (!projectName) return

    setDeleting(projectName)
    try {
      await deleteProject(projectName)
      console.log('项目已删除:', projectName)

      // 关闭弹窗
      setDeleteModal({ isOpen: false, projectName: '' })

      // 重新加载当前页（如果当前页没有数据了，跳到上一页）
      await loadProjects(currentPage)
    } catch (e) {
      console.error('删除项目失败:', e)
      alert(`删除失败: ${e}`)
    } finally {
      setDeleting(null)
    }
  }

  // 关闭弹窗
  const handleCloseModal = () => {
    setDeleteModal({ isOpen: false, projectName: '' })
  }

  const timeRangeOptions = [
    { value: 'past_year', label: '过去一年' },
    { value: 'past_month', label: '过去一个月' },
    { value: 'past_week', label: '过去一周' }
  ]

  const scanScopeOptions = [
    { value: 'ALL', label: '全部常见目录' },
    { value: 'CUSTOM', label: '自定义目录' },
  ]

  const handlePickFolders = async () => {
    try {
      const res = await open({ directory: true, multiple: true })
      if (!res) return
      const arr = Array.isArray(res) ? res : [res]
      setScanFolders(prev => Array.from(new Set([...(prev || []), ...arr])))
    } catch (e) {
      console.error('选择目录失败:', e)
    }
  }

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        {/* 背景装饰 */}
        <div className="fixed top-[-10%] left-[20%] w-[50vw] h-[50vw] bg-blue-200/40 dark:bg-blue-900/20 rounded-full blur-[100px] pointer-events-none z-0 animate-pulse" />
        <div className="fixed bottom-[-10%] right-[-5%] w-[40vw] h-[40vw] bg-purple-200/40 dark:bg-purple-900/20 rounded-full blur-[100px] pointer-events-none z-0" />
        <div className="fixed top-[30%] right-[10%] w-[25vw] h-[25vw] bg-indigo-200/30 dark:bg-indigo-900/20 rounded-full blur-[80px] pointer-events-none z-0" />

        {/* 主要内容区 */}
        <div className="flex-1 flex flex-col items-center justify-start px-8 py-8 w-full max-w-4xl mx-auto relative z-10">

          {/* 标题 */}
          <div className="text-center space-y-1.5 mb-5">
            <h2 className="text-[12px] font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              新建项目
            </h2>
          </div>

          {/* 配置卡片 */}
          <div className="w-full max-w-2xl">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl p-5">

              {/* 项目名称 */}
              <div className="mb-3.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  项目名称
                </label>
                <input
                  type="text"
                  value={projectName}
                  onChange={(e) => setProjectName(e.target.value)}
                  placeholder="输入项目名称..."
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-[12px] text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:ring-2 focus:ring-primary focus:border-primary transition-all outline-none"
                />
              </div>

              {/* 回溯时间 */}
              <div className="mb-3.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  回溯时间范围
                </label>
                <CustomSelect
                  options={timeRangeOptions}
                  value={timeRange}
                  onChange={setTimeRange}
                  placeholder="选择时间范围"
                />
              </div>

              {/* 扫描范围 */}
              <div className="mb-3.5">
                <label className="block text-[11px] font-bold text-slate-700 dark:text-slate-300 mb-1">
                  扫描范围
                </label>
                <CustomSelect
                  options={scanScopeOptions}
                  value={scanScope}
                  onChange={(v) => {
                    setScanScope(v as any)
                    if (v === 'ALL') setScanFolders([])
                  }}
                  placeholder="选择扫描范围"
                />
                {scanScope === 'CUSTOM' && (
                  <div className="mt-1">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handlePickFolders}
                        className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 text-[11px] hover:bg-slate-50 dark:hover:bg-slate-700"
                      >选择目录</button>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400">默认已包含项目目录</span>
                    </div>
                    {scanFolders.length > 0 && (
                      <div className="mt-1 max-h-16 overflow-auto rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 p-1">
                        {scanFolders.map((p) => (
                          <div key={p} className="text-[10px] text-slate-600 dark:text-slate-300 font-mono truncate">{p}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* 开始扫描按钮 */}
              <div className="mt-6">
                <button
                  onClick={handleStartScan}
                  className="w-full flex items-center justify-center gap-1 px-3 py-2 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium text-[12px] transition-all active:scale-95 shadow-lg shadow-blue-500/30"
                >
                  <span className="material-symbols-outlined text-[12px]">radar</span>
                  开始扫描
                </button>
              </div>
            </div>
          </div>

          {/* 项目列表 - 表格格式 */}
          <div className="w-full max-w-2xl mt-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden">

              {/* 表头 */}
              <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-[16px] text-primary">folder_special</span>
                  <span className="text-[12px] font-bold text-slate-700 dark:text-slate-200">已有项目</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 ml-1">({pageData.total} 个)</span>
                </div>
                {loading && (
                  <span className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-primary animate-pulse"></span>
                    加载中...
                  </span>
                )}
              </div>

              {/* 表格内容 */}
              <div className="divide-y divide-slate-200 dark:divide-slate-700 min-h-[180px]">
                {pageData.projects.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 text-center">
                    <span className="material-symbols-outlined text-[40px] text-slate-300 dark:text-slate-600 mb-2">inbox</span>
                    <p className="text-[12px] text-slate-500 dark:text-slate-400 mb-1">暂无项目数据</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500">请在上方创建新项目</p>
                  </div>
                ) : (
                  pageData.projects.map((project) => (
                    <div
                      key={project.id}
                      className="flex items-center justify-between px-4 py-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group"
                    >
                      {/* 项目信息 */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-[12px] font-semibold text-slate-900 dark:text-white truncate">
                            {project.name}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 rounded">
                            {project.time_range === 'past_year' ? '一年' : project.time_range === 'past_month' ? '一月' : '一周'}
                          </span>
                          {project.scan_summary && (
                            <span className="text-[9px] px-1.5 py-0.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded">已扫描</span>
                          )}
                        </div>
                        <div className="flex items-center gap-3 text-[10px] text-slate-500 dark:text-slate-400 font-mono mt-0.5">
                          <span className="flex items-center gap-0.5">
                            <span className="material-symbols-outlined text-[10px]">folder</span>
                            <span className="truncate max-w-[200px] md:max-w-[300px]">
                              {(scanRootsMap[project.id] && scanRootsMap[project.id].length > 0)
                                ? scanRootsMap[project.id].join(' | ')
                                : '计算中...'}
                            </span>
                          </span>
                          <span className="hidden md:inline">|</span>
                          <span>{project.created_at.split(' ')[0]}</span>
                        </div>
                      </div>

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-1 ml-2 shrink-0 opacity-60 group-hover:opacity-100 transition-opacity">
                        {/* 选择按钮 */}
                        <button
                          title="选择项目并开始扫描"
                          onClick={async () => {
                            setProject({ id: project.id, name: project.name, time_range: project.time_range, scan_scope: project.scan_scope as any, scan_folders: (project as any).scan_folders ? JSON.parse((project as any).scan_folders) : [] })
                            setProjectName(project.name)
                            await setCurrentProject(project.id)
                          }}
                          className="p-1.5 rounded hover:bg-primary/10 text-slate-600 dark:text-slate-300 hover:text-primary transition-all"
                        >
                          <span className="material-symbols-outlined text-[16px]">check_circle</span>
                        </button>

                        {/* 删除按钮 */}
                        <button
                          title="删除项目"
                          onClick={() => handleDeleteClick(project.name)}
                          disabled={deleting === project.name}
                          className="p-1.5 rounded hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-600 dark:text-slate-300 hover:text-red-500 transition-all disabled:opacity-50 disabled:cursor-wait"
                        >
                          <span className="material-symbols-outlined text-[16px]">delete</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* 分页组件 */}
              {pageData.total_pages > 1 && (
                <div className="border-t border-slate-200 dark:border-slate-700">
                  <Pagination
                    currentPage={currentPage}
                    totalPages={pageData.total_pages}
                    totalItems={pageData.total}
                    pageSize={PAGE_SIZE}
                    onPageChange={handlePageChange}
                  />
                </div>
              )}
            </div>
          </div>

        </div>

      </main>

      {/* 删除确认弹窗 */}
      <DeleteConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={handleCloseModal}
        onConfirm={handleConfirmDelete}
        projectName={deleteModal.projectName}
      />
    </div>
  )
}
