import { useNavigate } from 'react-router-dom'
import ThemeToggle from '../components/ThemeToggle'
import Sidebar from '../components/Sidebar'

export default function App() {
  const navigate = useNavigate()

  const handleStart = () => {
    navigate('/processing')
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
        <div className="flex-1 flex flex-col items-center justify-center px-8 py-12 w-full max-w-6xl mx-auto relative z-10">
          <div className="text-center space-y-4 mb-8">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight text-slate-900 dark:text-white leading-tight">
              项目回溯
            </h2>
            <p className="text-sm text-slate-500 dark:text-slate-400 font-normal max-w-xl mx-auto leading-relaxed">
              设定回顾范围。选择年份和工作目录，开启您的全景扫描。
            </p>
          </div>

          <div className="w-full max-w-4xl flex flex-col gap-4">
            {/* 输入框 */}
            <div className="relative group flex items-center w-full transform transition-transform duration-300 hover:scale-[1.005]">
              <div className="absolute inset-0 bg-white/80 dark:bg-white/5 border border-white/60 dark:border-white/10 rounded-2xl backdrop-blur-xl shadow-glass transition-all duration-300 group-focus-within:ring-4 group-focus-within:ring-primary/10 group-focus-within:border-primary/30" />
              <div className="relative z-10 flex w-full items-center p-3">
                {/* 日期图标 */}
                <div className="flex items-center h-14 px-4">
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-3xl mr-3 select-none group-focus-within:text-primary transition-colors">calendar_today</span>
                </div>
                <div className="h-8 w-px bg-slate-200 dark:bg-slate-700 mx-2" />
                {/* 年份输入 */}
                <div className="flex-1 flex items-center">
                  <input
                    className="w-full bg-transparent border-none text-2xl font-medium text-slate-800 dark:text-white placeholder-slate-300 dark:placeholder-slate-600 focus:ring-0 p-0 tracking-tight leading-none"
                    defaultValue="2024"
                    onKeyDown={(e) => e.key === 'Enter' && handleStart()}
                  />
                </div>
                {/* 工作目录 */}
                <div className="flex items-center px-3">
                  <button className="flex flex-col items-start gap-1 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">
                    <span className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">工作目录</span>
                    <div className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
                      <span className="material-symbols-outlined text-xl text-slate-400 dark:text-slate-500">folder_open</span>
                      <span className="text-sm font-medium">/Users/Dev/Work</span>
                    </div>
                  </button>
                </div>
                {/* 开始按钮 */}
                <button
                  onClick={handleStart}
                  className="h-11 px-6 flex items-center justify-center bg-primary hover:bg-blue-700 text-white rounded-lg font-medium text-sm tracking-wide transition-all shadow-lg shadow-blue-500/30 active:scale-95 ml-2"
                >
                  开始回溯
                </button>
              </div>
            </div>

            {/* 快捷键提示 */}
            <div className="flex justify-between px-4 text-xs text-slate-400 dark:text-slate-500 font-medium select-none">
              <span className="flex items-center gap-2">
                <kbd className="font-sans px-2 py-1 bg-white dark:bg-slate-800 rounded-md border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 shadow-sm text-[10px]">Enter</kbd>
                <span>开始分析</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="material-symbols-outlined text-sm">history</span>
                最近: <span className="text-slate-500 dark:text-slate-400 font-semibold">/2023-Retrospective</span>
              </span>
            </div>
          </div>

          {/* 最近回顾 */}
          <div className="w-full max-w-4xl mt-12 pt-8 border-t border-slate-200/60 dark:border-slate-700/60">
            <div className="flex items-center justify-between mb-6">
              <p className="text-sm text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">最近回顾</p>
              <a className="text-xs text-primary hover:text-blue-600 dark:hover:text-blue-400 font-semibold transition-colors flex items-center gap-1" href="#">
                查看全部
                <span className="material-symbols-outlined text-sm">arrow_right_alt</span>
              </a>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { year: '2023', path: '/Projects/2023' },
                { year: 'Q4 22', path: '/Work/Archived' },
                { year: 'Alpha', path: 'D:\\Clients\\Acme' }
              ].map((item, i) => (
                <a
                  key={i}
                  className="group block p-5 rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md hover:border-primary/30 dark:hover:border-primary/50 transition-all hover:-translate-y-1 duration-200"
                  href="#"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-2xl font-semibold text-slate-700 dark:text-slate-300 group-hover:text-primary transition-colors">{item.year}</span>
                    <div className="size-8 rounded-full bg-slate-50 dark:bg-slate-700 flex items-center justify-center group-hover:bg-primary/10 transition-colors">
                      <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 group-hover:text-primary text-sm transition-colors">arrow_forward</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-slate-400 dark:text-slate-500 font-medium">
                    <span className="material-symbols-outlined text-[14px]">folder</span>
                    <span className="truncate font-mono">{item.path}</span>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
