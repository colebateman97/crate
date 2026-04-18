import { useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { useCrateStore } from '../store'
import type { ItemType, MusicItem } from '../types'
import { ITEM_TYPE_LABELS } from '../types'

export function RandomView() {
  const { items, lists, tags } = useCrateStore()
  const navigate = useNavigate()
  const [filterType, setFilterType] = useState<ItemType | 'all'>('all')
  const [filterListId, setFilterListId] = useState<string | 'all'>('all')
  const [filterTagId, setFilterTagId] = useState<string | 'all'>('all')
  const [picked, setPicked] = useState<MusicItem | null>(null)
  const [spin, setSpin] = useState(false)

  const pool = items.filter((i) => {
    if (i.listenStatus !== 'unlistened' && i.listenStatus !== 'want_to_revisit') return false
    if (filterType !== 'all' && i.type !== filterType) return false
    if (filterListId !== 'all' && !i.listIds.includes(filterListId)) return false
    if (filterTagId !== 'all' && !i.tagIds.includes(filterTagId)) return false
    return true
  })

  const pick = useCallback(() => {
    if (pool.length === 0) return
    setSpin(true)
    setTimeout(() => {
      const next = pool[Math.floor(Math.random() * pool.length)]
      setPicked(next)
      setSpin(false)
    }, 400)
  }, [pool])

  const reroll = () => {
    if (pool.length <= 1) return
    setSpin(true)
    setTimeout(() => {
      const others = pool.filter((i) => i.id !== picked?.id)
      setPicked(others[Math.floor(Math.random() * others.length)])
      setSpin(false)
    }, 400)
  }

  return (
    <div className="flex flex-col min-h-full px-4 pt-14 pb-28 md:pt-8 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Surprise Me</h1>
        <p className="text-sm text-zinc-400 mt-1">{pool.length} items in the pool</p>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 mb-8">
        <FilterRow label="Type">
          <FilterBtn active={filterType === 'all'} onClick={() => setFilterType('all')}>All</FilterBtn>
          {(['album', 'song', 'artist', 'playlist'] as ItemType[]).map((t) => (
            <FilterBtn key={t} active={filterType === t} onClick={() => setFilterType(t)}>
              {ITEM_TYPE_LABELS[t]}
            </FilterBtn>
          ))}
        </FilterRow>
        <FilterRow label="List">
          <FilterBtn active={filterListId === 'all'} onClick={() => setFilterListId('all')}>All</FilterBtn>
          {lists.map((l) => (
            <FilterBtn key={l.id} active={filterListId === l.id} onClick={() => setFilterListId(l.id)}>
              {l.name}
            </FilterBtn>
          ))}
        </FilterRow>
        {tags.length > 0 && (
          <FilterRow label="Tag">
            <FilterBtn active={filterTagId === 'all'} onClick={() => setFilterTagId('all')}>All</FilterBtn>
            {tags.map((t) => (
              <FilterBtn key={t.id} active={filterTagId === t.id} onClick={() => setFilterTagId(t.id)}>
                {t.name}
              </FilterBtn>
            ))}
          </FilterRow>
        )}
      </div>

      {/* Picked item */}
      <div className="flex flex-col items-center gap-6">
        <AnimatePresence mode="wait">
          {picked && !spin ? (
            <motion.div
              key={picked.id}
              initial={{ opacity: 0, scale: 0.8, rotateY: 90 }}
              animate={{ opacity: 1, scale: 1, rotateY: 0 }}
              exit={{ opacity: 0, scale: 0.8, rotateY: -90 }}
              transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              className="flex flex-col items-center gap-4 cursor-pointer"
              onClick={() => navigate(`/item/${picked.id}`)}
            >
              <div className="w-52 h-52 rounded-3xl overflow-hidden shadow-2xl bg-zinc-200 dark:bg-zinc-800">
                {picked.coverArtUrl ? (
                  <img src={picked.coverArtUrl} alt={picked.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-6xl">
                    {picked.type === 'album' ? '💿' : picked.type === 'song' ? '🎵' : picked.type === 'artist' ? '🎤' : '📋'}
                  </div>
                )}
              </div>
              <div className="text-center">
                <p className="text-xl font-bold text-zinc-900 dark:text-zinc-100">{picked.title}</p>
                {picked.artist && <p className="text-sm text-zinc-400 mt-0.5">{picked.artist}</p>}
                <p className="text-xs text-zinc-500 mt-1 uppercase tracking-wider">{ITEM_TYPE_LABELS[picked.type]}</p>
              </div>
              <p className="text-xs text-zinc-400">Tap to open</p>
            </motion.div>
          ) : spin ? (
            <motion.div
              key="spin"
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 0.3, ease: 'linear' }}
              className="text-5xl"
            >
              🎲
            </motion.div>
          ) : (
            <motion.div
              key="empty"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-center"
            >
              <div className="text-6xl mb-4">🎲</div>
              <p className="text-zinc-400 text-sm">
                {pool.length === 0
                  ? 'No items in the pool with these filters'
                  : 'Press the button to pick something'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex gap-3">
          <motion.button
            onClick={pick}
            disabled={pool.length === 0}
            className="px-8 py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold disabled:opacity-40 transition-opacity"
            whileTap={{ scale: 0.95 }}
          >
            {picked ? 'Re-roll' : 'Pick for me'}
          </motion.button>
          {picked && (
            <motion.button
              onClick={reroll}
              disabled={pool.length <= 1}
              className="px-6 py-3.5 rounded-2xl border border-zinc-200 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 font-medium disabled:opacity-40 transition-opacity text-sm"
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
            >
              Not feeling it
            </motion.button>
          )}
        </div>
      </div>
    </div>
  )
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-zinc-400 w-8 flex-shrink-0">{label}</span>
      <div className="flex gap-1.5 overflow-x-auto no-scrollbar flex-1">{children}</div>
    </div>
  )
}

function FilterBtn({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full border transition-colors ${
        active
          ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent font-medium'
          : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
      }`}
    >
      {children}
    </button>
  )
}
