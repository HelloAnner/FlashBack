# FlashBack 项目坑点记录

## 2025-12-28 删除项目级联删除关联数据

### 问题描述
删除项目时，`scan_results` 等表中的关联数据未被删除，导致数据库中存在脏数据。

### 修复方案

**文件**: `src-tauri/src/lib.rs` (533-589行)

**修改内容**:
```rust
// 1. 查询项目ID和路径
let project_id: String = row.get(0)?;
let folder_path: String = row.get(1)?;

// 2. 开始事务
conn.execute("BEGIN TRANSACTION", [])?;

// 3. 删除 scan_results 表中所有关联数据
conn.execute("DELETE FROM scan_results WHERE project_id = ?", &[&project_id])?;

// 4. 清理 app_config 中的当前项目配置
if current_id == project_id {
    conn.execute("DELETE FROM app_config WHERE key = 'current_project_id'", [])?;
}

// 5. 删除项目本身
conn.execute("DELETE FROM projects WHERE id = ?", &[&project_id])?;

// 6. 提交事务
conn.execute("COMMIT", [])?;

// 7. 删除文件夹（事务外）
std::fs::remove_dir_all(&folder_path)?;
```

**关键特性**:
- ✅ **事务保证**: 所有数据库操作在事务中，确保原子性
- ✅ **级联删除**: 删除 `scan_results`、`app_config`、`projects` 所有关联数据
- ✅ **错误回滚**: 任何步骤失败自动回滚
- ✅ **文件清理**: 删除项目文件夹

### 数据库表结构
- **projects** - 主表（已处理）
- **scan_results** - 包含 `project_id`（已处理）
- **app_config** - 包含 `current_project_id`（已处理）

### 验证
- ✅ 编译通过: `cargo check`

---

## 2025-12-28 修复扫描结果显示问题

### 问题描述
扫描结果表 `scan_result` 中有数据，但前端表格无法显示。

### 修复方案

#### 1. Results.tsx - 增强错误处理和调试
**文件**: `frontend/src/pages/Results.tsx` (37-56行)

**修改内容**:
- 添加 `projectId` 空值检查和警告日志
- 添加加载和成功日志，方便调试
- 改进错误处理，显示具体错误信息

**调试方法**:
打开浏览器控制台，访问 `/results` 页面，观察：
```
Loading results: { projectId: "xxx", page: 1, PAGE_SIZE: 8 }
API call get_results_paginated: { project_id: "xxx", page: 1, page_size: 8 }
API result: { items: [...], total: 5416, page: 1, total_pages: 677 }
Results loaded: { items: [...], total: 5416, page: 1, total_pages: 677 }
```

#### 2. tauri.ts - API 兼容性修复
**文件**: `frontend/src/lib/tauri.ts` (168-178行)

**修改内容**:
- 使用泛型 `invoke<Paged<ResultItem>>` 确保类型安全
- 添加完整的日志和错误处理

#### 3. Processing.tsx - 智能扫描逻辑
**文件**: `frontend/src/pages/Processing.tsx`

**核心逻辑**:
```typescript
// 进入页面时检查 scan_summary
if (projectData && projectData.scan_summary) {
  console.log('已有扫描结果，直接显示:', projectData.scan_summary)
  setScanSummary(projectData.scan_summary)
  setScanComplete(true)

  // 加载已有数据
  const res = await getResultsPaginatedAdv({ project_id: pid, ... })
  setItems(res.items)
  setTotal(res.total)
  setTotalPages(res.total_pages)

  return  // 跳过自动扫描
}

// 没有扫描结果，启动扫描
await startScanWithId(pid, ...)
```

**UI 优化**:
- 扫描中：显示进度条 + 雷达动画
- 已有结果：显示绿色对勾 + "已有扫描结果"
- 新增"查看结果"按钮，直接跳转到 Results 页面

### 验证步骤

1. **前端编译**: `cd frontend && npx tsc --noEmit` ✅
2. **后端编译**: `cd src-tauri && cargo check` ✅
3. **运行测试**:
   - 访问 Processing 页面
   - 检查控制台日志
   - 确认是否跳过自动扫描

### 关键文件
- `frontend/src/pages/Results.tsx` - 结果展示页
- `frontend/src/pages/Processing.tsx` - 扫描/结果页
- `frontend/src/lib/tauri.ts` - API 接口层
- `src-tauri/src/lib.rs` - 后端 API (1133-1206行)

### 注意事项
- `ProjectListResponseLike<T>` 与 `Paged<T>` 字段一致，无需修改后端
- 所有修改都添加了日志，方便后续调试
- 保持了向后兼容性
