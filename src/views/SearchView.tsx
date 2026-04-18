import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { useCrateStore } from '../store'
import { ItemCard } from '../components/ItemCard'
import type { ItemType } from '../types'
import { ITEM_TYPE_LABELS } from '../types'

export function SearchView() {
  const { items, tags } = useCrateStore()
  const [query, setQuery] = useState('')

  const results = useMemo(() => {
    if (!query.trim()) return null
    const q = query.toLowerCase()
    return items.filter(
      (i) =>
        i.title.toLowerCase().includes(q) ||
        i.artist?.toLowerCase().includes(q) ||
        i.notes?.toLowerCase().includes(q) ||
        i.recommendedBy?.toLowerCase().includes(q) ||
        i.tagIds.some((tid) => tags.find((t) => t.id === tid)?.name.toLowerCase().includes(q))
    )
  }, [query, items, tags])

  const grouped = useMemo(() => {
    if (!results) return {}
    const g: Record<string, typeof results> = {}
    for (const item of results) {
      if (!g[item.type]) g[item.type] = []
      g[item.type].push(item)
    }
    return g
  }, [results])

  return (
    <div className="flex flex-col min-h-full">
      {/* Search bar */}
      <div className="px-4 pt-14 pb-4 md:pt-8 sticky top-0 z-10 bg-gradient-to-b from-white/80 dark:from-zinc-950/80 to-transparent backdrop-blur-md">
        <div className="relative">
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your crate…"
            className="w-full bg-zinc-100 dark:bg-zinc-800 rounded-2xl px-4 py-3 pl-10 text-base text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-zinc-300 dark:focus:ring-zinc-700 transition-all"
          />
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300"
            >
              ×
            </button>
          )}
        </div>
      </div>

      <div className="px-4 pb-28 md:pb-8">
        {!query.trim() && (
          <div className="text-center pt-16">
            <p className="text-4xl mb-3">🔍</p>
            <p className="text-zinc-400 text-sm">Search by title, artist, notes, tags, or recommender</p>
          </div>
        )}

        {results?.length === 0 && (
          <div className="text-center pt-16">
            <p className="text-4xl mb-3">😕</p>
            <p className="text-zinc-400 text-sm">No results for "{query}"</p>
          </div>
        )}

        {Object.entries(grouped).map(([type, typeItems]) => (
          <motion.div
            key={type}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6"
          >
            <h2 className="text-sm font-semibold text-zinc-400 mb-3">
              {ITEM_TYPE_LABELS[type as ItemType]}s
              <span className="ml-2 text-zinc-500 font-normal">{typeItems.length}</span>
            </h2>
            <div className="flex gap-3 overflow-x-auto no-scrollbar">
              {typeItems.map((item) => (
                <ItemCard key={item.id} item={item} tags={tags} size="md" />
              ))}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
