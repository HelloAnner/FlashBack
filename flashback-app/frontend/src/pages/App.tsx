import { useNavigate } from 'react-router-dom'
import { useState, useEffect } from 'react'
import { mkdir, BaseDirectory } from '@tauri-apps/plugin-fs'
import ThemeToggle from '../components/ThemeToggle'
import Sidebar from '../components/Sidebar'
import CustomSelect from '../components/CustomSelect'
import { initDatabase, getProjects, type Project } from '../lib/tauri'

export default function App() {
  const navigate = useNavigate()
  const [projectName, setProjectName] = useState<string>('')
  const [timeRange, setTimeRange] = useState<string>('past_year')
  const [projects, setProjects] = useState<Project[]>([])
  const [currentProject, setCurrentProject] = useState<Project | null>(null)
  const [loading, setLoading] = useState(true)

  // 初始化：创建 FlashBack 目录、初始化数据库、加载项目列表
  useEffect(() => {
    async function initApp() {
      try {
        // 确保 FlashBack 目录存在
        await mkdir('FlashBack', { baseDir: BaseDirectory.Home, recursive: true })
        console.log('工作目录已初始化: ~/FlashBack')

        // 初始化数据库
        await initDatabase()
        console.log('数据库初始化完成')

        // 加载项目列表
        const projectList = await getProjects()
        setProjects(projectList)
        console.log('已加载项目列表:', projectList.length, '个项目')
      } catch (e) {
        console.error('初始化失败:', e)
      } finally {
        setLoading(false)
      }
    }

    initApp()
  }, [])

  // 处理开始扫描（自动创建项目）
  const handleStartScan = () => {
    const name = currentProject?.name || projectName.trim()
    if (!name) {
      alert('请输入项目名称或选择已有项目')
      return
    }

    navigate('/processing', {
      state: {
        projectName: name,
        timeRange
      }
    })
  }

  // 选择项目
  const handleSelectProject = (project: Project) => {
    setCurrentProject(project)
    setProjectName(project.name)
  }

  const timeRangeOptions = [
    { value: 'past_year', label: '过去一年' },
    { value: 'past_month', label: '过去一个月' },
    { value: 'past_week', label: '过去一周' }
  ]

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

              {/* 开始扫描按钮 - 增加下方间距避免被下拉框遮挡 */}
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

          {/* 项目列表 */}
          <div className="w-full max-w-2xl mt-4">
            <div className="bg-white/60 dark:bg-slate-800/60 backdrop-blur-sm rounded-xl border border-slate-200/60 dark:border-slate-700/60 p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                  已有项目 ({projects.length})
                </p>
                {loading && (
                  <span className="text-[10px] text-slate-400">加载中...</span>
                )}
              </div>

              {projects.length === 0 ? (
                <div className="text-center py-6">
                  <p className="text-[11px] text-slate-400 dark:text-slate-500">
                    暂无项目，请创建一个新项目
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto">
                  {projects.map((project) => (
                    <button
                      key={project.id}
                      onClick={() => handleSelectProject(project)}
                      className={`group block w-full text-left p-3 rounded-lg border transition-all ${
                        currentProject?.id === project.id
                          ? 'bg-blue-50 dark:bg-blue-900/20 border-primary'
                          : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:border-primary/30 dark:hover:border-primary/50 hover:shadow-md'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <span className={`text-[12px] font-semibold ${
                          currentProject?.id === project.id
                            ? 'text-primary'
                            : 'text-slate-700 dark:text-slate-300'
                        }`}>
                          {project.name}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-500">
                          {project.created_at.split(' ')[0]}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-400 dark:text-slate-500 font-mono">
                        <span className="material-symbols-outlined text-[10px]">folder</span>
                        <span className="truncate">{project.folder_path}</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>

      </main>
    </div>
  )
}
