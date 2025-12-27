import { useNavigate, useLocation } from 'react-router-dom'
import { useState, useEffect } from 'react'
import Sidebar from '../components/Sidebar'

export default function Configure() {
  const navigate = useNavigate()
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
          <div className="absolute top-4 right-4 z-20">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-1.5 shadow-sm">
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] text-slate-500 dark:text-slate-400">当前项目</span>
                <span className="text-[11px] font-bold text-primary">{projectName}</span>
              </div>
            </div>
          </div>
        )}

        <div className="flex-1 flex flex-col items-center py-5 px-5 w-full max-w-[1440px] mx-auto overflow-y-auto">
          <div className="w-full flex flex-col gap-3 mb-5">
            <div className="flex items-center gap-1 text-[11px]">
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">首页</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[11px]">chevron_right</span>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">项目分析</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-[11px]">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">报告配置</span>
            </div>
            <div className="flex justify-between items-end gap-4">
              <div className="flex flex-col gap-1">
                <h1 className="text-[12px] font-bold text-slate-900 dark:text-white tracking-tight">配置报告输出</h1>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">在生成之前自定义您的复盘分析报告的内容、风格与格式。</p>
              </div>
              <button
                onClick={() => navigate('/results', { state: { projectName } })}
                className="flex items-center gap-1 px-2 py-1.5 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium text-[11px] shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-[11px]">auto_fix_high</span>
                立即生成报告
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 w-full">
            {/* 数据概览 */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm sticky top-0">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[11px] font-bold text-slate-900 dark:text-white">数据概览</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-[11px]">tune</span>
                </div>
                <div className="relative mb-3">
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-1.5 pl-7 pr-2.5 text-[11px] text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="筛选关键词..."
                  />
                  <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 text-[10px]">search</span>
                </div>
                <div className="flex flex-wrap gap-0.5 content-start">
                  {['重构', '高并发', '上线', 'BugFix', '团队士气', 'UI 更新', 'Q3 目标', '后端架构', '市场推广', '跨部门协作'].map((tag) => {
                    const active = ['重构', '高并发', '上线', '团队士气', 'Q3 目标', '后端架构'].includes(tag)
                    return (
                      <button
                        key={tag}
                        className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium transition-all ${
                          active
                            ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 text-primary'
                            : 'bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                        }`}
                      >
                        {tag}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>

            {/* 模版选择 */}
            <div className="lg:col-span-5">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm h-full">
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-[12px] font-bold text-slate-900 dark:text-white">模版选择</h3>
                  <span className="text-[10px] font-bold text-primary uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded">必选项</span>
                </div>
                <div className="flex flex-col gap-1.5">
                  {/* 晋升答辩风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" defaultChecked />
                    <div className="flex items-start gap-1.5 p-1.5 rounded-lg border-2 border-primary bg-blue-50/30 dark:bg-blue-900/10 transition-all">
                      <div className="w-10 h-10 shrink-0 rounded-md bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">analytics</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="font-bold text-[12px] text-slate-900 dark:text-white">晋升答辩风</h4>
                          <div className="size-4 rounded-full bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-[11px]">check</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">严肃、数据导向。专注于量化指标、技术成就以及对业务的深层价值。</p>
                      </div>
                    </div>
                  </label>

                  {/* 团队分享风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" />
                    <div className="flex items-start gap-1.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="w-10 h-10 shrink-0 rounded-md bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">groups</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="font-bold text-[12px] text-slate-900 dark:text-white">团队分享风</h4>
                          <div className="size-4 rounded-full border border-slate-300 dark:border-slate-500 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-transparent peer-checked:text-white transition-all">
                            <span className="material-symbols-outlined text-[11px]">check</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">活泼、故事导向。突出团队高光时刻、踩坑经验和未来规划。</p>
                      </div>
                    </div>
                  </label>

                  {/* 极简大纲风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" />
                    <div className="flex items-start gap-1.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="w-10 h-10 shrink-0 rounded-md bg-gradient-to-br from-slate-700 to-black flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-sm">format_list_bulleted</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-0.5">
                          <h4 className="font-bold text-[12px] text-slate-900 dark:text-white">极简大纲风</h4>
                          <div className="size-4 rounded-full border border-slate-300 dark:border-slate-500 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-transparent peer-checked:text-white transition-all">
                            <span className="material-symbols-outlined text-[11px]">check</span>
                          </div>
                        </div>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">纯文字格式。仅保留核心要点、关键结论和后续行动项。</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 输出格式 */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-3 shadow-sm">
                <h3 className="text-[12px] font-bold text-slate-900 dark:text-white mb-2">输出格式</h3>
                <div className="flex flex-col gap-1.5">
                  {/* PPT */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" defaultChecked />
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg border-2 border-primary bg-blue-50/30 dark:bg-blue-900/10 transition-all">
                      <div className="size-7 rounded-md bg-orange-100 dark:bg-orange-900/30 text-[#ea580c] dark:text-orange-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">slideshow</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[12px] text-slate-900 dark:text-white">生成 PPT</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">.pptx 演示文稿</p>
                      </div>
                      <div className="size-4 bg-primary rounded flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-[11px]">check</span>
                      </div>
                    </div>
                  </label>

                  {/* PDF */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" />
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="size-7 rounded-md bg-red-100 dark:bg-red-900/30 text-[#dc2626] dark:text-red-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">picture_as_pdf</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[12px] text-slate-900 dark:text-white">生成 PDF</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">.pdf 报告文件</p>
                      </div>
                      <div className="size-4 border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 rounded flex items-center justify-center text-transparent peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all">
                        <span className="material-symbols-outlined text-[11px]">check</span>
                      </div>
                    </div>
                  </label>

                  {/* Markdown */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" />
                    <div className="flex items-center gap-1.5 p-1.5 rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="size-7 rounded-md bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-sm">markdown</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-[12px] text-slate-900 dark:text-white">生成 Markdown</p>
                        <p className="text-[10px] text-slate-500 dark:text-slate-400">.md 纯文本</p>
                      </div>
                      <div className="size-4 border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 rounded flex items-center justify-center text-transparent peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all">
                        <span className="material-symbols-outlined text-[11px]">check</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-2 p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex gap-1.5">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400 text-[12px] shrink-0">info</span>
                  <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">根据分析深度，生成报告可能需要 1-2 分钟。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
