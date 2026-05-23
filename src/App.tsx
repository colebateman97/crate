import { useState, useEffect } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import { AnimatePresence } from 'framer-motion'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'

import { useTheme } from './hooks/useTheme'
import { AnimatedBackground } from './components/AnimatedBackground'
import { BottomNav, SideNav } from './components/Nav'
import { AddFAB } from './components/AddButton'
import { AddModal } from './components/AddModal'
import { useCrateStore } from './store'
import { getOrCreateSyncKey, pullFromCloud, pushToCloud, schedulePush } from './lib/sync'

import { HomeView } from './views/HomeView'
import { CategoryView } from './views/CategoryView'
import { ItemDetailView } from './views/ItemDetailView'
import { SearchView } from './views/SearchView'
import { RandomView } from './views/RandomView'
import { StatsView } from './views/StatsView'
import { SettingsView } from './views/SettingsView'
import { TagView } from './views/TagView'

const queryClient = new QueryClient({
  defaultOptions: { queries: { staleTime: 5 * 60 * 1000, retry: 1 } },
})

export default function App() {
  useTheme()
  const location = useLocation()
  const [addOpen, setAddOpen] = useState(false)
  const [shareUrl, setShareUrl] = useState<string | undefined>()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const url = params.get('url') || params.get('text')
    if (url && (url.includes('spotify.com') || url.includes('apple.com') || url.includes('music.apple.com') || url.includes('youtube.com') || url.includes('youtu.be'))) {
      setShareUrl(url)
      setAddOpen(true)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  // Cloud sync
  useEffect(() => {
    try {
      const syncKey = getOrCreateSyncKey()
      const state = useCrateStore.getState()

      if (state.items.length > 0) {
        const { items, lists, tags, settings } = state
        pushToCloud(syncKey, { items, lists, tags, settings })
      } else {
        pullFromCloud(syncKey).then((cloudData) => {
          if (cloudData && (cloudData as { items?: unknown[] }).items?.length) {
            useCrateStore.getState().importData(JSON.stringify(cloudData))
          }
        }).catch(() => {})
      }

      const unsubscribe = useCrateStore.subscribe((state) => {
        try {
          const { items, lists, tags, settings } = state
          schedulePush(syncKey, { items, lists, tags, settings })
        } catch {}
      })
      return unsubscribe
    } catch (e) {
      console.error('Sync init failed:', e)
    }
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <div className="flex min-h-dvh text-zinc-900 dark:text-zinc-100">
        <AnimatedBackground />

        {/* Desktop sidebar */}
        <div className="hidden md:flex border-r border-zinc-200 dark:border-zinc-800 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-md h-dvh sticky top-0 flex-shrink-0">
          <SideNav onAdd={() => setAddOpen(true)} />
        </div>

        {/* Main content */}
        <main className="flex-1 min-w-0 relative overflow-y-auto">
          <AnimatePresence mode="wait" initial={false}>
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<HomeView />} />
              <Route path="/category/:type" element={<CategoryView />} />
              <Route path="/item/:id" element={<ItemDetailView />} />
              <Route path="/search" element={<SearchView />} />
              <Route path="/random" element={<RandomView />} />
              <Route path="/stats" element={<StatsView />} />
              <Route path="/settings" element={<SettingsView />} />
              <Route path="/tag/:tagId" element={<TagView />} />
              <Route path="/add" element={<HomeView />} />
            </Routes>
          </AnimatePresence>
        </main>

        <BottomNav />
        <AddFAB onClick={() => setAddOpen(true)} />

        <AddModal
          open={addOpen}
          onClose={() => { setAddOpen(false); setShareUrl(undefined) }}
          initialUrl={shareUrl}
        />
      </div>
    </QueryClientProvider>
  )
}
