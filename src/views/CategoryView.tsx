import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCrateStore } from '../store'
import { ItemCard } from '../components/ItemCard'
import type { ItemType, ListenStatus, MusicItem } from '../types'
import { ITEM_TYPE_LABELS } from '../types'

type SortMode = 'newest' | 'oldest' | 'az'
type ViewMode = 'bylists' | 'all'

export function CategoryView() {
  const { type } = useParams<{ type: string }>()
  const navigate = useNavigate()
  const { items, lists, tags } = useCrateStore()
  const [viewMode, setViewMode] = useState<ViewMode>('bylists')
  const [sortMode, setSortMode] = useState<SortMode>('newest')
  const [filterStatus, setFilterStatus] = useState<ListenStatus | 'all'>('all')
  const [filterTagId, setFilterTagId] = useState<string | null>(null)

  const itemType = type as ItemType
  const typeLabel = ITEM_TYPE_LABELS[itemType] ?? itemType
  const typeItems = items.filter((i) => i.type === itemType)

  function applyFilters(arr: MusicItem[]) {
    let result = arr
    if (filterStatus !== 'all') result = result.filter((i) => i.listenStatus === filterStatus)
    if (filterTagId) result = result.filter((i) => i.tagIds.includes(filterTagId))
    return result
  }

  function applySort(arr: MusicItem[]) {
    if (sortMode === 'newest') return [...arr].sort((a, b) => b.dateAdded.localeCompare(a.dateAdded))
    if (sortMode === 'oldest') return [...arr].sort((a, b) => a.dateAdded.localeCompare(b.dateAdded))
    return [...arr].sort((a, b) => a.title.localeCompare(b.title))
  }

  const relevantLists = lists.filter((l) => l.applicableTypes.includes(itemType))

  const statusOptions: { value: ListenStatus | 'all'; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'unlistened', label: 'Unlistened' },
    { value: 'in_progress', label: 'In Progress' },
    { value: 'listened', label: 'Listened' },
    { value: 'want_to_revisit', label: 'Revisit' },
  ]

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          ‹
        </button>
        <div>
          <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">{typeLabel}s</h1>
          <p className="text-xs text-zinc-400 mt-0.5">{typeItems.length} items</p>
        </div>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-2 px-4 pb-3">
        <div className="flex rounded-full border border-zinc-200 dark:border-zinc-700 overflow-hidden text-sm">
          {(['bylists', 'all'] as ViewMode[]).map((m) => (
            <button
              key={m}
              onClick={() => setViewMode(m)}
              className={`px-4 py-1.5 transition-colors ${
                viewMode === m
                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-medium'
                  : 'text-zinc-500 dark:text-zinc-400'
              }`}
            >
              {m === 'bylists' ? 'By list' : `All ${typeLabel}s`}
            </button>
          ))}
        </div>
      </div>

      <AnimatePresence mode="wait">
        {viewMode === 'bylists' ? (
          <motion.div
            key="bylists"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 10 }}
            className="flex flex-col gap-6 pb-28 md:pb-8"
          >
            {relevantLists.map((list) => {
              const listItems = typeItems.filter((i) => i.listIds.includes(list.id))
              if (listItems.length === 0) return null
              return (
                <div key={list.id}>
                  <div className="flex items-center justify-between px-4 mb-3">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">{list.name}</h2>
                    {listItems.length > 5 && (
                      <button
                        onClick={() => navigate(`/list/${list.id}?type=${itemType}`)}
                        className="text-xs text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors"
                      >
                        See all ({listItems.length})
                      </button>
                    )}
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
                    {listItems.slice(0, 10).map((i) => (
                      <ItemCard key={i.id} item={i} tags={tags} size="md" />
                    ))}
                  </div>
                </div>
              )
            })}
            {/* Items not in any list */}
            {(() => {
              const unlistedItems = typeItems.filter((i) => i.listIds.length === 0)
              if (unlistedItems.length === 0) return null
              return (
                <div>
                  <div className="flex items-center justify-between px-4 mb-3">
                    <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">Other</h2>
                  </div>
                  <div className="flex gap-3 overflow-x-auto no-scrollbar px-4">
                    {unlistedItems.slice(0, 10).map((i) => (
                      <ItemCard key={i.id} item={i} tags={tags} size="md" />
                    ))}
                  </div>
                </div>
              )
            })()}
          </motion.div>
        ) : (
          <motion.div
            key="all"
            initial={{ opacity: 0, x: 10 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -10 }}
            className="flex flex-col pb-28 md:pb-8"
          >
            {/* Filters */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar px-4 pb-4">
              {statusOptions.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setFilterStatus(opt.value)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                    filterStatus === opt.value
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
              <div className="w-px bg-zinc-200 dark:bg-zinc-700 flex-shrink-0" />
              {tags.map((tag) => (
                <button
                  key={tag.id}
                  onClick={() => setFilterTagId(filterTagId === tag.id ? null : tag.id)}
                  className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors`}
                  style={{
                    backgroundColor: filterTagId === tag.id ? tag.color : 'transparent',
                    color: filterTagId === tag.id ? '#fff' : tag.color,
                    borderColor: tag.color + '66',
                  }}
                >
                  {tag.name}
                </button>
              ))}
            </div>

            {/* Sort */}
            <div className="flex gap-2 px-4 pb-4">
              <span className="text-xs text-zinc-400 self-center">Sort:</span>
              {(['newest', 'oldest', 'az'] as SortMode[]).map((s) => (
                <button
                  key={s}
                  onClick={() => setSortMode(s)}
                  className={`text-xs px-2.5 py-1 rounded-md transition-colors ${
                    sortMode === s
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900'
                      : 'text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300'
                  }`}
                >
                  {s === 'newest' ? 'Newest' : s === 'oldest' ? 'Oldest' : 'A–Z'}
                </button>
              ))}
            </div>

            {/* Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 px-4">
              {applySort(applyFilters(typeItems)).map((i) => (
                <ItemCard key={i.id} item={i} tags={tags} size="sm" />
              ))}
            </div>
            {applyFilters(typeItems).length === 0 && (
              <p className="text-center text-zinc-400 text-sm py-16">No items match your filters.</p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
