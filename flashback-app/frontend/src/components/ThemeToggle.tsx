import { useEffect, useState } from 'react'
import { applyTheme, getInitialTheme } from '../lib/theme'

export default function ThemeToggle() {
  const [theme, setTheme] = useState<'light' | 'dark'>(() => getInitialTheme())

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  const isDark = theme === 'dark'

  return (
    <button
      aria-label="切换主题"
      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
      onClick={() => setTheme(isDark ? 'light' : 'dark')}
    >
      <span className="material-symbols-outlined text-lg">{isDark ? 'light_mode' : 'dark_mode'}</span>
    </button>
  )
}
