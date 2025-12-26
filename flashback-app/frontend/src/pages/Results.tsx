import Sidebar from '../components/Sidebar'

export default function Results() {
  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        <header className="bg-white dark:bg-[#111422] border-b border-slate-200 dark:border-slate-800 px-8 py-6 z-10">
          <div className="max-w-[1200px] mx-auto w-full">
            <nav className="flex items-center gap-2 text-sm mb-4">
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">Home</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-base">chevron_right</span>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">Projects</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-base">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">Q3 Retrospective</span>
            </nav>
            <div className="flex justify-between items-end gap-4">
              <div>
                <h2 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Results: Preview & Delivery</h2>
                <div className="flex items-center gap-2 mt-1">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-500 text-sm">cloud_done</span>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Last saved: Just now</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-base">share</span>
                  Share
                </button>
                <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-sm font-medium transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-base">print</span>
                  Print
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-8 flex justify-center bg-slate-100 dark:bg-slate-800">
          <div className="w-full max-w-[850px]">
            {/* 报告预览 */}
            <div className="bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xl rounded-sm min-h-[800px] p-10 md:p-12 mx-auto ring-1 ring-slate-900/5 dark:ring-slate-700/50">
              <div className="border-b-2 border-slate-100 dark:border-slate-700 pb-6 mb-6 flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold mb-1 tracking-tight">Q3 Performance Report</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-sm">Retrospective Analysis & Future Outlook</p>
                </div>
                <div className="text-right">
                  <div className="text-primary font-bold text-base mb-1 flex items-center justify-end gap-1">
                    <span className="material-symbols-outlined text-sm filled">verified</span> RetroApp
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-xs">October 2023</div>
                </div>
              </div>

              <div className="space-y-8">
                {/* Executive Summary */}
                <section>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">1. Executive Summary</h3>
                  <p className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed mb-3">
                    The third quarter has been a pivotal period for the team, marked by significant improvements in delivery velocity and code quality.
                  </p>
                  <p className="text-sm text-slate-800 dark:text-slate-200 leading-relaxed bg-indigo-50 dark:bg-indigo-900/30 rounded px-1 -mx-1 py-1 border-b-2 border-primary/40">
                    The team velocity increased by 15% compared to the previous quarter.
                  </p>
                </section>

                {/* Key Metrics */}
                <section>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-3">2. Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Sprint Completion</div>
                      <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">94%</div>
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center mb-1 font-medium bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded">
                          +4.2%
                        </div>
                      </div>
                    </div>
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="text-xs text-slate-500 dark:text-slate-400 mb-1 font-medium">Defect Density</div>
                      <div className="flex items-end gap-2">
                        <div className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">0.8</div>
                        <div className="text-xs text-green-600 dark:text-green-400 flex items-center mb-1 font-medium bg-green-100 dark:bg-green-900/50 px-1.5 py-0.5 rounded">
                          -12%
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 图表 */}
                  <div className="w-full h-64 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                    <div className="flex items-end gap-6 h-40 w-full px-16 justify-between opacity-90">
                      <div className="w-10 bg-indigo-300 dark:bg-indigo-700 h-[40%] rounded-t-md" />
                      <div className="w-10 bg-indigo-400 dark:bg-indigo-600 h-[55%] rounded-t-md" />
                      <div className="w-10 bg-indigo-500 dark:bg-indigo-500 h-[45%] rounded-t-md" />
                      <div className="w-10 bg-indigo-600 dark:bg-indigo-400 h-[70%] rounded-t-md" />
                      <div className="w-10 bg-primary h-[85%] rounded-t-md" />
                    </div>
                  </div>
                  <p className="text-center text-xs text-slate-400 dark:text-slate-500 mt-3 font-medium">Figure 1: Sprint Velocity Trend</p>
                </section>

                {/* Retrospective Outcomes */}
                <section>
                  <h3 className="text-base font-bold text-slate-800 dark:text-slate-200 mb-2">3. Retrospective Outcomes</h3>
                  <ul className="list-none space-y-2 text-sm text-slate-600 dark:text-slate-300">
                    <li className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 flex items-center justify-center text-xs font-bold mt-0.5">S</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Start:</strong> Implement daily syncs</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 flex items-center justify-center text-xs font-bold mt-0.5">S</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Stop:</strong> Overloading sprint backlog</span>
                    </li>
                    <li className="flex gap-2 items-start">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-xs font-bold mt-0.5">C</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Continue:</strong> Bi-weekly sharing</span>
                    </li>
                  </ul>
                </section>
              </div>

              <div className="absolute bottom-6 right-8 text-slate-400 dark:text-slate-500 text-xs font-medium">Page 1 of 5</div>
            </div>

            {/* 纸张阴影 */}
            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm mx-auto w-[96%] h-6 rounded-b-lg mt-0.5 shadow-lg border-t border-slate-100 dark:border-slate-700" />
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm mx-auto w-[92%] h-4 rounded-b-lg mt-0.5 shadow-md border-t border-slate-100 dark:border-slate-700" />
          </div>
        </div>

        {/* 底部导出栏 */}
        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl px-8 py-6">
          <div className="max-w-[1200px] mx-auto flex justify-center">
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-2 pr-4 pl-6 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-6">
              <div className="flex flex-col py-1">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-slate-900 dark:text-white text-base font-semibold">Ready for delivery</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-xs pl-4">3.2 MB • PDF Format</span>
              </div>
              <div className="h-10 w-px bg-slate-200 dark:bg-slate-700" />
              <button className="group bg-primary hover:bg-blue-700 text-white h-12 px-8 rounded-full font-bold text-base shadow-lg shadow-blue-600/20 flex items-center gap-2 transition-all active:scale-95">
                <span className="material-symbols-outlined text-[22px] group-hover:animate-bounce">download</span>
                Export File
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
