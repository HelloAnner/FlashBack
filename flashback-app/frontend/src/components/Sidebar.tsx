import { Link, useLocation } from 'react-router-dom'
import ThemeToggle from './ThemeToggle'

// 四个固定步骤
const steps = [
  { key: 'setup', label: '首页', icon: 'home', path: '/' },
  { key: 'scan', label: '扫描', icon: 'radar', path: '/processing' },
  { key: 'configure', label: '风格', icon: 'tune', path: '/configure' },
  { key: 'results', label: '预览', icon: 'bar_chart', path: '/results' },
]

export default function Sidebar() {
  const { pathname } = useLocation()

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col shrink-0 z-20 h-screen sticky top-0">
      <div className="flex flex-col h-full p-4">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8 px-2">
          <div className="rounded-lg h-8 w-8 bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/30">
            <span className="material-symbols-outlined text-sm">history</span>
          </div>
          <h1 className="text-slate-900 dark:text-white text-sm font-bold tracking-wide">FlashBack</h1>
        </div>

        {/* 四个步骤导航 */}
        <nav className="flex flex-col gap-1 flex-1">
          {steps.map((s) => {
            const active = pathname === s.path
            return (
              <Link
                key={s.key}
                to={s.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg transition-all duration-200 group ${
                  active
                    ? 'bg-primary/10 text-slate-900 dark:text-white border border-primary/20'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <span className={`material-symbols-outlined ${active ? 'text-primary' : 'text-slate-400 dark:text-slate-500 group-hover:text-slate-900 dark:group-hover:text-white'} text-sm`}>
                  {s.icon}
                </span>
                <p className="text-[12px] font-medium leading-normal text-slate-900 dark:text-white">{s.label}</p>
                {active && (
                  <span className="material-symbols-outlined text-primary ml-auto text-[12px]">arrow_forward</span>
                )}
              </Link>
            )
          })}
        </nav>

        {/* 底部区域：主题切换 + 用户信息 */}
        <div className="mt-auto pt-4 border-t border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between">
            {/* 用户信息 */}
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800/50 transition-colors cursor-pointer">
              <div className="rounded-full h-7 w-7 bg-gradient-to-tr from-blue-500 to-purple-500 flex items-center justify-center text-white">
                <span className="material-symbols-outlined text-[11px]">person</span>
              </div>
              <div className="flex flex-col">
                <p className="text-slate-900 dark:text-white text-[11px] font-medium">Local User</p>
                <p className="text-slate-500 dark:text-slate-500 text-[10px]">Developer Mode</p>
              </div>
            </div>
            {/* 主题切换按钮 */}
            <ThemeToggle />
          </div>
        </div>
      </div>
    </aside>
  )
}
