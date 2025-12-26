// 主题切换：在 <html> 上挂载 class=dark
export function getInitialTheme() {
  const persist = localStorage.getItem('theme')
  if (persist === 'dark' || persist === 'light') return persist
  // 跟随系统
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  return prefersDark ? 'dark' : 'light'
}

export function applyTheme(theme: 'light' | 'dark') {
  const root = document.documentElement
  if (theme === 'dark') root.classList.add('dark')
  else root.classList.remove('dark')
  localStorage.setItem('theme', theme)
}
