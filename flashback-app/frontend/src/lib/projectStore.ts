// 项目全局选择状态（Zustand 简洁实现）
// 说明：维护当前选中的项目，供“扫描/风格/预览”三页右上角展示，以及所有请求携带 projectId

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface SelectedProject {
  id: string
  name: string
  time_range: string
  scan_scope?: 'ALL' | 'CUSTOM'
  scan_folders?: string[]
}

interface ProjectState {
  project: SelectedProject | null
  setProject: (p: SelectedProject | null) => void
}

export const useProjectStore = create<ProjectState>()(
  persist(
    (set) => ({
      project: null,
      setProject: (p) => set({ project: p }),
    }),
    {
      name: 'flashback-selected-project', // localStorage key
    }
  )
)
