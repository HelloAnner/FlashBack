import { useNavigate } from 'react-router-dom'
import Sidebar from '../components/Sidebar'

export default function Configure() {
  const navigate = useNavigate()

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-900 font-display">
      <Sidebar />
      <main className="flex-1 flex flex-col relative min-w-0 overflow-hidden">

        <div className="flex-1 flex flex-col items-center py-8 px-8 w-full max-w-[1440px] mx-auto overflow-y-auto">
          <div className="w-full flex flex-col gap-6 mb-8">
            <div className="flex items-center gap-2 text-sm">
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">首页</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-base">chevron_right</span>
              <a className="text-slate-500 dark:text-slate-400 hover:text-primary transition-colors font-medium" href="#">项目分析</a>
              <span className="material-symbols-outlined text-slate-400 dark:text-slate-600 text-base">chevron_right</span>
              <span className="text-slate-900 dark:text-white font-medium">报告配置</span>
            </div>
            <div className="flex justify-between items-end gap-4">
              <div className="flex flex-col gap-2">
                <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">配置报告输出</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400">在生成之前自定义您的复盘分析报告的内容、风格与格式。</p>
              </div>
              <button
                onClick={() => navigate('/results')}
                className="flex items-center gap-2 px-5 py-2.5 bg-primary hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-lg shadow-blue-500/30 transition-all active:scale-95"
              >
                <span className="material-symbols-outlined text-sm">auto_fix_high</span>
                立即生成报告
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 w-full">
            {/* 数据概览 */}
            <div className="lg:col-span-3">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm sticky top-0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">数据概览</h3>
                  <span className="material-symbols-outlined text-slate-400 dark:text-slate-500 text-xl">tune</span>
                </div>
                <div className="relative mb-5">
                  <input
                    className="w-full bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg py-2.5 pl-10 pr-4 text-sm text-slate-900 dark:text-white placeholder-slate-400 focus:ring-2 focus:ring-primary/20 focus:border-primary outline-none transition-all"
                    placeholder="筛选关键词..."
                  />
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">search</span>
                </div>
                <div className="flex flex-wrap gap-2 content-start">
                  {['重构', '高并发', '上线', 'BugFix', '团队士气', 'UI 更新', 'Q3 目标', '后端架构', '市场推广', '跨部门协作'].map((tag) => {
                    const active = ['重构', '高并发', '上线', '团队士气', 'Q3 目标', '后端架构'].includes(tag)
                    return (
                      <button
                        key={tag}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
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
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm h-full">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-bold text-slate-900 dark:text-white">模版选择</h3>
                  <span className="text-xs font-bold text-primary uppercase tracking-wider bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2 py-1 rounded">必选项</span>
                </div>
                <div className="flex flex-col gap-4">
                  {/* 晋升答辩风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" defaultChecked />
                    <div className="flex items-start gap-4 p-4 rounded-xl border-2 border-primary bg-blue-50/30 dark:bg-blue-900/10 transition-all">
                      <div className="w-24 h-24 shrink-0 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">analytics</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">晋升答辩风</h4>
                          <div className="size-6 rounded-full bg-primary flex items-center justify-center text-white">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">严肃、数据导向。专注于量化指标、技术成就以及对业务的深层价值。</p>
                      </div>
                    </div>
                  </label>

                  {/* 团队分享风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" />
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="w-24 h-24 shrink-0 rounded-lg bg-gradient-to-br from-purple-500 to-fuchsia-600 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">groups</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">团队分享风</h4>
                          <div className="size-6 rounded-full border border-slate-300 dark:border-slate-500 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-transparent peer-checked:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">活泼、故事导向。突出团队高光时刻、踩坑经验和未来规划。</p>
                      </div>
                    </div>
                  </label>

                  {/* 极简大纲风 */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" name="template" type="radio" />
                    <div className="flex items-start gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-primary/50 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="w-24 h-24 shrink-0 rounded-lg bg-gradient-to-br from-slate-700 to-black flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-3xl">format_list_bulleted</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-bold text-lg text-slate-900 dark:text-white">极简大纲风</h4>
                          <div className="size-6 rounded-full border border-slate-300 dark:border-slate-500 peer-checked:bg-primary peer-checked:border-primary flex items-center justify-center text-transparent peer-checked:text-white transition-all">
                            <span className="material-symbols-outlined text-sm">check</span>
                          </div>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">纯文字格式。仅保留核心要点、关键结论和后续行动项。</p>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            {/* 输出格式 */}
            <div className="lg:col-span-4">
              <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-5 shadow-sm">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-6">输出格式</h3>
                <div className="flex flex-col gap-4">
                  {/* PPT */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" defaultChecked />
                    <div className="flex items-center gap-4 p-4 rounded-xl border-2 border-primary bg-blue-50/30 dark:bg-blue-900/10 transition-all">
                      <div className="size-12 rounded-lg bg-orange-100 dark:bg-orange-900/30 text-[#ea580c] dark:text-orange-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">slideshow</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900 dark:text-white">生成 PPT</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">.pptx 演示文稿</p>
                      </div>
                      <div className="size-6 bg-primary rounded flex items-center justify-center text-white">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    </div>
                  </label>

                  {/* PDF */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" />
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="size-12 rounded-lg bg-red-100 dark:bg-red-900/30 text-[#dc2626] dark:text-red-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">picture_as_pdf</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900 dark:text-white">生成 PDF</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">.pdf 报告文件</p>
                      </div>
                      <div className="size-6 border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 rounded flex items-center justify-center text-transparent peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    </div>
                  </label>

                  {/* Markdown */}
                  <label className="cursor-pointer">
                    <input className="peer sr-only" type="checkbox" />
                    <div className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-700/50 hover:border-slate-300 dark:hover:border-slate-500 transition-all peer-checked:border-primary peer-checked:bg-blue-50/30 dark:peer-checked:bg-blue-900/10">
                      <div className="size-12 rounded-lg bg-slate-100 dark:bg-slate-600 text-slate-700 dark:text-slate-300 flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">markdown</span>
                      </div>
                      <div className="flex-1">
                        <p className="font-bold text-lg text-slate-900 dark:text-white">生成 Markdown</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">.md 纯文本</p>
                      </div>
                      <div className="size-6 border border-slate-300 dark:border-slate-500 bg-white dark:bg-slate-600 rounded flex items-center justify-center text-transparent peer-checked:bg-primary peer-checked:text-white peer-checked:border-primary transition-all">
                        <span className="material-symbols-outlined text-sm">check</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className="mt-6 p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 flex gap-3">
                  <span className="material-symbols-outlined text-primary dark:text-blue-400 text-xl shrink-0">info</span>
                  <p className="text-sm text-slate-600 dark:text-slate-400">根据分析深度，生成报告可能需要 1-2 分钟。</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}
