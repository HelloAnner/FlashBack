import { useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

export default function Results() {
  const location = useLocation()
  const [projectName, setProjectName] = useState<string>('')

  useEffect(() => {
    const state = location.state as { summary?: any; projectName?: string } | null
    const name = state?.projectName || ''
    setProjectName(name)
  }, [location.state])

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">
        {/* 右上角当前项目指示器 */}
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

        <header className="bg-white dark:bg-[#111422] border-b border-slate-200 dark:border-slate-800 px-6 py-3 z-10">
          <div className="max-w-[1200px] mx-auto w-full">
            <nav className="flex items-center gap-1 text-[11px] mb-2">
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">Home</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[11px]">chevron_right</span>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">Projects</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[11px]">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">Q3 Retrospective</span>
            </nav>
            <div className="flex justify-between items-end gap-4">
              <div>
                <h2 className="text-[12px] md:text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">Results: Preview & Delivery</h2>
                <div className="flex items-center gap-1 mt-1">
                  <span className="material-symbols-outlined text-green-600 dark:text-green-500 text-[11px]">cloud_done</span>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">Last saved: Just now</p>
                </div>
              </div>
              <div className="flex gap-1.5">
                <button className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[11px]">share</span>
                  Share
                </button>
                <button className="flex items-center gap-1 px-2 py-1 bg-white dark:bg-white/5 hover:bg-slate-50 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 rounded-lg text-slate-700 dark:text-slate-300 text-[11px] font-medium transition-colors shadow-sm">
                  <span className="material-symbols-outlined text-[11px]">print</span>
                  Print
                </button>
              </div>
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-5 flex justify-center bg-slate-100 dark:bg-slate-800">
          <div className="w-full max-w-[850px]">
            <div className="bg-white dark:bg-[#1e293b] text-slate-900 dark:text-white shadow-xl rounded-sm min-h-[800px] p-5 md:p-6 mx-auto ring-1 ring-slate-900/5 dark:ring-slate-700/50">
              <div className="border-b-2 border-slate-100 dark:border-slate-700 pb-2.5 mb-2.5 flex justify-between items-start">
                <div>
                  <h1 className="text-[12px] font-bold mb-1 tracking-tight">Q3 Performance Report</h1>
                  <p className="text-slate-500 dark:text-slate-400 text-[11px]">Retrospective Analysis & Future Outlook</p>
                </div>
                <div className="text-right">
                  <div className="text-primary font-bold text-[11px] mb-1 flex items-center justify-end gap-1">
                    <span className="material-symbols-outlined text-[11px] filled">verified</span> RetroApp
                  </div>
                  <div className="text-slate-400 dark:text-slate-500 text-[11px]">October 2023</div>
                </div>
              </div>

              <div className="space-y-4">
                <section>
                  <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">1. Executive Summary</h3>
                  <p className="text-[12px] text-slate-600 dark:text-slate-300 leading-relaxed mb-1">
                    The third quarter has been a pivotal period for the team, marked by significant improvements in delivery velocity and code quality.
                  </p>
                  <p className="text-[12px] text-slate-800 dark:text-slate-200 leading-relaxed bg-indigo-50 dark:bg-indigo-900/30 rounded px-1 -mx-1 py-1 border-b-2 border-primary/40">
                    The team velocity increased by 15% compared to the previous quarter.
                  </p>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">2. Key Metrics</h3>
                  <div className="grid grid-cols-2 gap-2 mb-2">
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Sprint Completion</div>
                      <div className="flex items-end gap-1">
                        <div className="text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">94%</div>
                        <div className="text-[11px] text-green-600 dark:text-green-400 flex items-center mb-0.5 font-medium bg-green-100 dark:bg-green-900/50 px-1 py-0.5 rounded">
                          +4.2%
                        </div>
                      </div>
                    </div>
                    <div className="p-2 bg-slate-50 dark:bg-slate-800 rounded-lg border border-slate-100 dark:border-slate-700">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 font-medium">Defect Density</div>
                      <div className="flex items-end gap-1">
                        <div className="text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">0.8</div>
                        <div className="text-[11px] text-green-600 dark:text-green-400 flex items-center mb-0.5 font-medium bg-green-100 dark:bg-green-900/50 px-1 py-0.5 rounded">
                          -12%
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="w-full h-24 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 flex items-center justify-center relative overflow-hidden">
                    <div className="flex items-end gap-2 h-16 w-full px-5 justify-between opacity-90">
                      <div className="w-4 bg-indigo-300 dark:bg-indigo-700 h-[40%] rounded-t-sm" />
                      <div className="w-4 bg-indigo-400 dark:bg-indigo-600 h-[55%] rounded-t-sm" />
                      <div className="w-4 bg-indigo-500 dark:bg-indigo-500 h-[45%] rounded-t-sm" />
                      <div className="w-4 bg-indigo-600 dark:bg-indigo-400 h-[70%] rounded-t-sm" />
                      <div className="w-4 bg-primary h-[85%] rounded-t-sm" />
                    </div>
                  </div>
                  <p className="text-center text-[11px] text-slate-400 dark:text-slate-500 mt-1 font-medium">Figure 1: Sprint Velocity Trend</p>
                </section>

                <section>
                  <h3 className="text-[11px] font-bold text-slate-800 dark:text-slate-200 mb-1">3. Retrospective Outcomes</h3>
                  <ul className="list-none space-y-1 text-[12px] text-slate-600 dark:text-slate-300">
                    <li className="flex gap-1 items-start">
                      <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-400 flex items-center justify-center text-[10px] font-bold mt-0.5">S</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Start:</strong> Implement daily syncs</span>
                    </li>
                    <li className="flex gap-1 items-start">
                      <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-red-100 dark:bg-red-900/50 text-red-700 dark:text-red-400 flex items-center justify-center text-[10px] font-bold mt-0.5">S</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Stop:</strong> Overloading sprint backlog</span>
                    </li>
                    <li className="flex gap-1 items-start">
                      <span className="flex-shrink-0 w-3.5 h-3.5 rounded-full bg-blue-100 dark:bg-blue-900/50 text-blue-700 dark:text-blue-400 flex items-center justify-center text-[10px] font-bold mt-0.5">C</span>
                      <span><strong className="text-slate-800 dark:text-slate-200">Continue:</strong> Bi-weekly sharing</span>
                    </li>
                  </ul>
                </section>
              </div>

              <div className="absolute bottom-3 right-4 text-slate-400 dark:text-slate-500 text-[11px] font-medium">Page 1 of 5</div>
            </div>

            <div className="bg-white/80 dark:bg-white/5 backdrop-blur-sm mx-auto w-[96%] h-3 rounded-b-lg mt-0.5 shadow-lg border-t border-slate-100 dark:border-slate-700" />
            <div className="bg-white/50 dark:bg-white/5 backdrop-blur-sm mx-auto w-[92%] h-2.5 rounded-b-lg mt-0.5 shadow-md border-t border-slate-100 dark:border-slate-700" />
          </div>
        </div>

        <div className="border-t border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-[#0f172a]/90 backdrop-blur-xl px-5 py-2.5">
          <div className="max-w-[1200px] mx-auto flex justify-center">
            <div className="bg-white dark:bg-[#1e293b] border border-slate-200 dark:border-slate-700 p-0.5 pr-2 pl-2.5 rounded-full shadow-[0_20px_50px_rgba(0,0,0,0.15)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] flex items-center gap-2.5">
              <div className="flex flex-col py-0.5">
                <div className="flex items-center gap-0.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-slate-900 dark:text-white text-[10px] font-semibold">Ready for delivery</span>
                </div>
                <span className="text-slate-500 dark:text-slate-400 text-[9px] pl-2">3.2 MB • PDF Format</span>
              </div>
              <div className="h-3 w-px bg-slate-200 dark:bg-slate-700" />
              <button className="group bg-primary hover:bg-blue-700 text-white h-6 px-2.5 rounded-full font-bold text-[10px] shadow-lg shadow-blue-600/20 flex items-center gap-0.5 transition-all active:scale-95">
                <span className="material-symbols-outlined text-[10px] group-hover:animate-bounce">download</span>
                Export
              </button>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
