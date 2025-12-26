像素复刻对齐说明：
- Tailwind 配置已对齐 ui/ 设计稿中的颜色、阴影、圆角、字体。
- 首页、处理页、配置页、结果页分别映射到 `/`, `/processing`, `/configure`, `/results`。
- 右上角主题切换：`src/components/ThemeToggle.tsx`。
- 侧边栏解锁：`src/components/Sidebar.tsx`，状态存储 `localStorage: unlocked-steps`。

开发入口：
- `make dev` 本地 Vite + Tauri。
- `make start` 直接弹出 Tauri 窗口进行验收。
- `make package` 构建安装包。

数据流：
- 后端 `start_scan` 事件通过 `scan-log`/`scan-progress`/`scan-done` 向前端推送。
- 前端消费见 `src/lib/tauri.ts` 与 `src/pages/Processing.tsx`。
