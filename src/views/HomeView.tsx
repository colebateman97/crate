import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCrateStore } from '../store'
import type { ItemType, MusicItem } from '../types'

const CATEGORY_META: Record<ItemType, { label: string; emoji: string; color: string }> = {
  album:   { label: 'Albums',    emoji: '💿',  color: 'from-violet-500/20 to-purple-500/10' },
  song:    { label: 'Songs',     emoji: '🎵',  color: 'from-blue-500/20 to-cyan-500/10' },
  artist:  { label: 'Artists',   emoji: '🎤',  color: 'from-rose-500/20 to-pink-500/10' },
  playlist:{ label: 'Playlists', emoji: '📋',  color: 'from-amber-500/20 to-orange-500/10' },
  podcast: { label: 'Podcasts',  emoji: '🎙️', color: 'from-teal-500/20 to-emerald-500/10' },
  video:   { label: 'Videos',    emoji: '🎬',  color: 'from-red-500/20 to-rose-500/10' },
  movie:   { label: 'Movies',    emoji: '🎥',  color: 'from-indigo-500/20 to-blue-500/10' },
  show:    { label: 'Shows',     emoji: '📺',  color: 'from-cyan-500/20 to-sky-500/10' },
  book:    { label: 'Books',     emoji: '📚',  color: 'from-emerald-500/20 to-green-500/10' },
}

const DEFAULT_ORDER: ItemType[] = ['album', 'song', 'artist', 'playlist', 'podcast', 'video', 'movie', 'show', 'book']

export function HomeView() {
  const navigate = useNavigate()
  const items = useCrateStore((s) => s.items)
  const settings = useCrateStore((s) => s.settings)
  const updateSettings = useCrateStore((s) => s.updateSettings)
  const [isReordering, setIsReordering] = useState(false)

  const savedOrder = settings.categoryOrder ?? []
  const order = savedOrder.length === 0
    ? DEFAULT_ORDER
    : [...savedOrder, ...DEFAULT_ORDER.filter((t) => !savedOrder.includes(t))]

  function move(index: number, direction: -1 | 1) {
    const next = [...order]
    const swapIndex = index + direction
    if (swapIndex < 0 || swapIndex >= next.length) return
    ;[next[index], next[swapIndex]] = [next[swapIndex], next[index]]
    updateSettings({ categoryOrder: next })
  }

  return (
    <div className="flex flex-col min-h-full">
      <div className="px-5 pt-14 pb-6 md:pt-8 flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Crate</h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your media backlog</p>
        </div>
        <button
          onClick={() => setIsReordering((v) => !v)}
          className="text-sm font-medium text-violet-500 dark:text-violet-400 pb-1"
        >
          {isReordering ? 'Done' : 'Edit'}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 px-4 pb-28 md:pb-8">
        {order.map((type, index) => (
          <CategoryCard
            key={type}
            type={type}
            allItems={items}
            isReordering={isReordering}
            index={index}
            total={order.length}
            onMove={move}
            onClick={() => navigate(`/category/${type}`)}
          />
        ))}
      </div>
    </div>
  )
}

interface CardProps {
  type: ItemType
  allItems: MusicItem[]
  isReordering: boolean
  index: number
  total: number
  onMove: (index: number, direction: -1 | 1) => void
  onClick: () => void
}

function CategoryCard({ type, allItems, isReordering, index, total, onMove, onClick }: CardProps) {
  const { label, emoji, color } = CATEGORY_META[type]
  const typeItems = allItems.filter((i) => i.type === type)
  const unlistened = typeItems.filter((i) => i.listenStatus === 'unlistened').length
  const recent = typeItems.slice(0, 4)

  return (
    <div
      style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
      className={[
        'relative overflow-hidden backdrop-blur-sm rounded-2xl p-4 text-left select-none transition-shadow',
        isReordering
          ? 'border-2 border-violet-400/40 dark:border-violet-500/30'
          : 'border border-white/10 dark:border-white/5 cursor-pointer active:scale-[0.97]',
      ].join(' ')}
      onClick={isReordering ? undefined : onClick}
    >
      <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-70 pointer-events-none`} />
      <div className="relative">
        <span className="text-2xl">{emoji}</span>
        <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-2">{label}</h2>
        <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
          {typeItems.length} item{typeItems.length !== 1 ? 's' : ''}
          {unlistened > 0 && ` · ${unlistened} new`}
        </p>

        {isReordering ? (
          <div className="flex gap-2 mt-3">
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onMove(index, -1) }}
              disabled={index === 0}
              className="flex-1 py-2 rounded-xl bg-black/8 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 text-base font-medium disabled:opacity-25 active:bg-black/15 dark:active:bg-white/20 transition-colors"
            >
              ←
            </button>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => { e.stopPropagation(); onMove(index, 1) }}
              disabled={index === total - 1}
              className="flex-1 py-2 rounded-xl bg-black/8 dark:bg-white/10 text-zinc-700 dark:text-zinc-200 text-base font-medium disabled:opacity-25 active:bg-black/15 dark:active:bg-white/20 transition-colors"
            >
              →
            </button>
          </div>
        ) : recent.length > 0 ? (
          <div className="flex gap-1.5 mt-3 -mx-1">
            {recent.map((ri) => (
              <CoverThumb key={ri.id} item={ri} />
            ))}
          </div>
        ) : null}
      </div>
    </div>
  )
}

function CoverThumb({ item }: { item: MusicItem }) {
  return (
    <div className="w-10 h-10 rounded-lg overflow-hidden bg-zinc-300 dark:bg-zinc-700 flex-shrink-0">
      {item.coverArtUrl ? (
        <img src={item.coverArtUrl} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-lg opacity-50">
          {item.type === 'album' ? '💿' : item.type === 'song' ? '🎵' : item.type === 'artist' ? '🎤' : item.type === 'podcast' ? '🎙️' : item.type === 'video' ? '🎬' : item.type === 'movie' ? '🎥' : item.type === 'show' ? '📺' : item.type === 'book' ? '📚' : '📋'}
        </div>
      )}
    </div>
  )
}
