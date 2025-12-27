/**
 * FlashBack 开发代理工作指引（客户端）
 *
 * - 使用 Tauri v2 + React + Vite
 * - UI 默认 Tailwind + 原子类，优先复刻 ui/ 下的 code.html 样式；如需组件，优先使用 shadcn 原生组件
 * - 主题：右上角主题切换，基于 html.class=dark
 * - 步骤解锁：侧栏四项默认灰化，完成一项自动解锁下一项（持久化 localStorage: unlocked-steps）
 * - 扫描：不弹目录选择；默认扫描常见目录与聊天数据库路径（WeChat/WeCom/DingTalk）
 * - DEV=true：跳过云端验证逻辑
 * - Makefile：make dev | make start | make package
 */

- MCP: 新框架与 API 可使用 context7 获取资料；设计系统相关知识可用 shadcn mcp。
- UI：严格像素复刻 ui/ 目录设计（颜色、间距、阴影、布局已在 Tailwind 配置中还原）。
- Java 代码规范：若后续新增服务端/Java 模块，遵循仓库根 AGENTS.md 中 3.x 规范（注释、行数限制、import 规则等）。
- 日志：英文优先；注释中文优先。
- 对话：中文为主。

变更日志：
- 2025-12-25 初始化 Tauri 工程 flashback-app，接入前端 React/Vite，主题切换与步骤解锁；实现本地扫描（Git/文档/聊天路径识别）。
- 2025-12-26 开发体验与权限完善：
  - 新增 `make dev-clean`：清理 5173 端口残留、终止 tauri/cargo 进程、释放 cargo 包缓存锁；`make dev` 自动调用。
  - `make dev` 并发启动：Vite(`--strictPort 5173`) + `tauri dev`，前后端热更新稳定；默认 `DEV=true`。
  - 能力权限：启用 `tauri-plugin-dialog` 并在 `src-tauri/capabilities/default.json` 授权 `"dialog:default"`；为开发模式添加 `remote.urls` 白名单（`http://localhost:5173`、`http://127.0.0.1:5173`）。
  - 前端 `工作目录` 选择：通过 `@tauri-apps/plugin-dialog` 的 `open({ directory: true, defaultPath })` 实现，并在首次调用前聚焦主窗口避免无响应。
- 2025-12-27 项目管理系统重构：
  - **后端数据库**：新增 SQLite 数据库管理（`~/FlashBack/flashback.db`），包含 `projects` 表（UUID 主键、项目名称、文件夹路径、时间戳）。
  - **项目存储结构**：每个项目独立子文件夹 `~/FlashBack/{project_name}`，所有扫描数据存储在项目目录下。
  - **Tauri 命令**：实现 `init_database`、`create_project`、`get_projects`、`get_project_by_name`、`delete_project` 等完整 CRUD 操作。
  - **前端 API**：`src/lib/tauri.ts` 新增项目管理接口，支持从数据库加载真实数据。
  - **首页重构**：`App.tsx` 显示真实项目列表，支持选择项目，输入项目名称后点击"开始扫描"会自动创建项目和子文件夹。
  - **页面联动**：所有页面（Processing/Configure/Results）右上角显示当前项目名称，通过路由 state 传递项目信息。
  - **扫描流程**：`Processing.tsx` 使用项目名称启动扫描，后端自动创建项目（如果不存在）并存储数据到对应子文件夹。
  - **简化流程**：删除"新建项目"按钮，用户只需输入项目名称并点击"开始扫描"即可自动完成项目创建。

使用约定（重要）：
- 启动本地开发：`make dev`；如遇 "Blocking waiting for file lock on package cache" 或端口占用，先执行 `make dev-clean`。
- 保持 Vite 端口固定为 5173；否则 devUrl 漂移会导致能力（capabilities）校验失败，插件不可用。
- 项目数据存储路径：`~/FlashBack/{project_name}/`，数据库文件：`~/FlashBack/flashback.db`。
