import { useState } from 'react'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  onPageChange: (page: number) => void
}

export default function Pagination({ currentPage, totalPages, totalItems, pageSize, onPageChange }: PaginationProps) {
  const [inputPage, setInputPage] = useState(currentPage.toString())

  // 处理页码输入
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setInputPage(value)
  }

  // 跳转到指定页面
  const handleGoToPage = () => {
    const page = parseInt(inputPage)
    if (page >= 1 && page <= totalPages) {
      onPageChange(page)
    } else {
      setInputPage(currentPage.toString())
    }
  }

  // 处理键盘事件
  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleGoToPage()
    }
  }

  // 计算显示的页码范围
  const getVisiblePages = () => {
    const delta = 2
    const range = []
    for (let i = Math.max(2, currentPage - delta); i <= Math.min(totalPages - 1, currentPage + delta); i++) {
      range.push(i)
    }
    return range
  }

  const visiblePages = getVisiblePages()

  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
      {/* 页码信息 */}
      <div className="text-[11px] text-slate-600 dark:text-slate-400">
        共 {totalItems} 条，第 {currentPage}/{totalPages} 页
      </div>

      {/* 分页控制 */}
      <div className="flex items-center gap-1.5">
        {/* 上一页 */}
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-[11px]"
        >
          ←
        </button>

        {/* 第一页 */}
        {totalPages > 3 && (
          <button
            onClick={() => onPageChange(1)}
            className={`px-2 py-1 rounded border text-[11px] transition-all ${
              currentPage === 1
                ? 'bg-primary text-white border-primary'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            1
          </button>
        )}

        {/* 省略号 */}
        {currentPage > 4 && totalPages > 5 && (
          <span className="px-2 text-slate-400">...</span>
        )}

        {/* 中间页码 */}
        {visiblePages.map(page => (
          <button
            key={page}
            onClick={() => onPageChange(page)}
            className={`px-2 py-1 rounded border text-[11px] transition-all ${
              currentPage === page
                ? 'bg-primary text-white border-primary'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {page}
          </button>
        ))}

        {/* 省略号 */}
        {currentPage < totalPages - 3 && totalPages > 5 && (
          <span className="px-2 text-slate-400">...</span>
        )}

        {/* 最后一页 */}
        {totalPages > 3 && (
          <button
            onClick={() => onPageChange(totalPages)}
            className={`px-2 py-1 rounded border text-[11px] transition-all ${
              currentPage === totalPages
                ? 'bg-primary text-white border-primary'
                : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700'
            }`}
          >
            {totalPages}
          </button>
        )}

        {/* 下一页 */}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="px-2 py-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-slate-50 dark:hover:bg-slate-700 transition-all text-[11px]"
        >
          →
        </button>

        {/* 跳转输入框 */}
        <div className="flex items-center gap-1 ml-2">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">跳至</span>
          <input
            type="number"
            min="1"
            max={totalPages}
            value={inputPage}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            onBlur={handleGoToPage}
            className="w-12 px-2 py-1 text-[11px] border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-primary focus:border-primary outline-none"
          />
          <span className="text-[11px] text-slate-500 dark:text-slate-400">页</span>
        </div>
      </div>
    </div>
  )
}