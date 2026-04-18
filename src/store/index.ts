import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import type { MusicItem, MusicList, Tag, AppSettings } from '../types'
import { DEFAULT_LISTS, DEFAULT_SETTINGS } from '../types'

interface CrateStore {
  items: MusicItem[]
  lists: MusicList[]
  tags: Tag[]
  settings: AppSettings

  // Items
  addItem: (item: MusicItem) => void
  updateItem: (id: string, updates: Partial<MusicItem>) => void
  deleteItem: (id: string) => void
  getItemById: (id: string) => MusicItem | undefined

  // Lists
  addList: (list: MusicList) => void
  updateList: (id: string, updates: Partial<MusicList>) => void
  deleteList: (id: string) => void

  // Tags
  addTag: (tag: Tag) => void
  updateTag: (id: string, updates: Partial<Tag>) => void
  deleteTag: (id: string) => void

  // Settings
  updateSettings: (updates: Partial<AppSettings>) => void

  // Data management
  exportData: () => string
  importData: (json: string) => void
  clearAllData: () => void
}

export const useCrateStore = create<CrateStore>()(
  persist(
    (set, get) => ({
      items: [],
      lists: DEFAULT_LISTS,
      tags: [],
      settings: DEFAULT_SETTINGS,

      addItem: (item) => set((s) => ({ items: [item, ...s.items] })),
      updateItem: (id, updates) =>
        set((s) => ({ items: s.items.map((i) => (i.id === id ? { ...i, ...updates } : i)) })),
      deleteItem: (id) => set((s) => ({ items: s.items.filter((i) => i.id !== id) })),
      getItemById: (id) => get().items.find((i) => i.id === id),

      addList: (list) => set((s) => ({ lists: [...s.lists, list] })),
      updateList: (id, updates) =>
        set((s) => ({ lists: s.lists.map((l) => (l.id === id ? { ...l, ...updates } : l)) })),
      deleteList: (id) => {
        set((s) => ({
          lists: s.lists.filter((l) => l.id !== id),
          items: s.items.map((i) => ({
            ...i,
            listIds: i.listIds.filter((lid) => lid !== id),
          })),
        }))
      },

      addTag: (tag) => set((s) => ({ tags: [...s.tags, tag] })),
      updateTag: (id, updates) =>
        set((s) => ({ tags: s.tags.map((t) => (t.id === id ? { ...t, ...updates } : t)) })),
      deleteTag: (id) => {
        set((s) => ({
          tags: s.tags.filter((t) => t.id !== id),
          items: s.items.map((i) => ({
            ...i,
            tagIds: i.tagIds.filter((tid) => tid !== id),
          })),
        }))
      },

      updateSettings: (updates) =>
        set((s) => ({ settings: { ...s.settings, ...updates } })),

      exportData: () => {
        const { items, lists, tags, settings } = get()
        return JSON.stringify({ items, lists, tags, settings, exportedAt: new Date().toISOString() }, null, 2)
      },

      importData: (json) => {
        try {
          const data = JSON.parse(json)
          set({
            items: data.items ?? [],
            lists: data.lists ?? DEFAULT_LISTS,
            tags: data.tags ?? [],
            settings: { ...DEFAULT_SETTINGS, ...(data.settings ?? {}) },
          })
        } catch {
          throw new Error('Invalid JSON data')
        }
      },

      clearAllData: () =>
        set({ items: [], lists: DEFAULT_LISTS, tags: [], settings: DEFAULT_SETTINGS }),
    }),
    {
      name: 'crate-data',
      storage: createJSONStorage(() => localStorage),
      version: 1,
      migrate: (state: unknown, version: number) => {
        const s = state as { items?: MusicItem[]; lists?: MusicList[]; tags?: Tag[]; settings?: AppSettings }
        if (version < 1) {
          // Ensure all built-in lists exist (handles adding Discoveries to existing data)
          const lists: MusicList[] = s.lists ?? []
          for (const defaultList of DEFAULT_LISTS) {
            if (defaultList.isBuiltIn && !lists.some((l) => l.id === defaultList.id)) {
              lists.push(defaultList)
            }
          }
          s.lists = lists
        }
        return s
      },
    }
  )
)
