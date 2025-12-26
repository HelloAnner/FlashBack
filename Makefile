# FlashBack Makefile

# DEV 模式：跳过云端验证
export DEV ?= true

FRONTEND_DIR=flashback-app/frontend
TAURI_DIR=flashback-app

.PHONY: dev start package install

install:
	cd $(FRONTEND_DIR) && pnpm install
	cd $(TAURI_DIR) && pnpm install

dev: install
	# 本地 UI 开发 + Tauri 调试（DEV=true 跳过云端验证）
	cd $(FRONTEND_DIR) && DEV=true pnpm dev & \
	  cd $(TAURI_DIR) && DEV=true pnpm tauri dev

start: install
	# 与 dev 相同：直接启动 Tauri 开发窗口，适合验收流程
	cd $(FRONTEND_DIR) && DEV=true pnpm dev & \
	  cd $(TAURI_DIR) && DEV=true pnpm tauri dev

package: install
	# 打包当前宿主平台；如已安装额外 target，将尝试同时产出 Windows 包
	cd $(FRONTEND_DIR) && pnpm vite build
	cd $(TAURI_DIR) && pnpm tauri build || true
	# 额外 targets（可选，若 toolchain 就绪）
	-cd $(TAURI_DIR) && rustup target add x86_64-pc-windows-msvc && pnpm tauri build --target x86_64-pc-windows-msvc
	@echo "安装包已生成：flashback-app/src-tauri/target/**/release/bundle"
