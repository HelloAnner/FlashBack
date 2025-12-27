interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  projectName: string
}

export default function DeleteConfirmModal({ isOpen, onClose, onConfirm, projectName }: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-2xl p-6">
        {/* 标题 */}
        <div className="flex items-center gap-2 mb-3">
          <span className="material-symbols-outlined text-red-500 text-[20px]">warning</span>
          <h3 className="text-[14px] font-bold text-slate-900 dark:text-white">确认删除项目</h3>
        </div>

        {/* 内容 */}
        <div className="mb-6">
          <p className="text-[12px] text-slate-600 dark:text-slate-300 mb-2">
            您确定要删除项目 <span className="font-bold text-red-500">{projectName}</span> 吗？
          </p>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            此操作将永久删除：
          </p>
          <ul className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 space-y-0.5 list-disc list-inside">
            <li>项目文件夹及其所有数据</li>
            <li>数据库中的项目记录</li>
            <li>扫描结果和配置信息</li>
          </ul>
          <p className="text-[11px] text-red-500 mt-2 font-medium">
            ⚠️ 此操作无法撤销！
          </p>
        </div>

        {/* 按钮组 */}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 rounded-lg text-[12px] font-medium transition-all active:scale-95"
          >
            取消
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-lg text-[12px] font-medium transition-all active:scale-95 shadow-lg shadow-red-500/30"
          >
            确认删除
          </button>
        </div>
      </div>
    </div>
  )
}