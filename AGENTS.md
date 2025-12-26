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

