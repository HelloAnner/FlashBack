# FlashBack Makefile

# DEV 模式：跳过云端验证（前后端均可读取）
export DEV ?= true
# 启用 Rust 增量编译
export CARGO_INCREMENTAL ?= 1

FRONTEND_DIR=flashback-app/frontend
TAURI_DIR=flashback-app

.PHONY: dev start package install clean dev-clean

install:
	@echo "安装依赖 (frontend + tauri) ..."
	pnpm -C $(FRONTEND_DIR) install
	pnpm -C $(TAURI_DIR) install

# 一条命令同时热更新前端与 Rust：
# - Vite 负责前端 HMR
# - tauri dev 内置监听 src-tauri 变更并自动重编译/热重启
# - DEV=true 作用于两个进程
dev: install dev-clean
	@echo "启动开发环境"
	@echo "  - Vite: http://localhost:5173 (strictPort)"
	@echo "  - Tauri: Rust 热重载 (src-tauri/*)"
	@echo "按 Ctrl+C 退出，两个进程将一并结束"
	@bash -lc 'set -euo pipefail; trap "kill 0" EXIT; \
	  echo "预检查: 确保 5173 端口空闲"; \
	  (lsof -ti tcp:5173 | xargs -r kill -9) 2>/dev/null || true; \
	  export DEV=true; \
	  pnpm -C $(FRONTEND_DIR) dev & \
	  pnpm -C $(FRONTEND_DIR) exec wait-on tcp:5173; \
	  pnpm -C $(TAURI_DIR) tauri dev'

start: dev

package: install
	pnpm -C $(FRONTEND_DIR) build
	pnpm -C $(TAURI_DIR) tauri build || true
	- rustup target add x86_64-pc-windows-msvc && pnpm -C $(TAURI_DIR) tauri build --target x86_64-pc-windows-msvc
	@echo "安装包已生成：flashback-app/src-tauri/target/**/release/bundle"

clean:
	@echo "仅清理本仓库的构建产物 (不会清空全局 cargo 缓存) ..."
	rm -rf $(FRONTEND_DIR)/dist $(TAURI_DIR)/src-tauri/target

# 清理遗留进程与 cargo 包缓存锁
dev-clean:
	@echo "预清理: 终止残留 dev 进程并释放 cargo 包缓存锁"
	-@echo "  - 杀掉端口 5173 的 Vite"; (lsof -ti tcp:5173 | xargs -r kill -9) 2>/dev/null || true
	-@echo "  - 杀掉与本项目相关的 cargo/tauri 进程"; \
	  (pgrep -f "$(TAURI_DIR)/src-tauri" | xargs -r kill -9) 2>/dev/null || true; \
	  (pgrep -f "tauri.*dev" | xargs -r kill -9) 2>/dev/null || true; \
	  (pgrep -f "cargo .*flashback-app" | xargs -r kill -9) 2>/dev/null || true
	-@echo "  - 释放 ~/.cargo 包缓存锁(如有占用)"; \
	  PLOCKS="$${HOME}/.cargo/.package-cache $${HOME}/.cargo/.global-cache"; \
	  for f in $$PLOCKS; do \
	    if [ -e "$$f" ]; then \
	      pids=$$(lsof -t "$$f" 2>/dev/null || true); \
	      if [ -n "$$pids" ]; then kill -9 $$pids 2>/dev/null || true; fi; \
	    fi; \
	  done; \
	  true
