import { useNavigate } from 'react-router-dom'
import { motion, type Variants } from 'framer-motion'
import { useCrateStore } from '../store'
import type { ItemType, MusicItem } from '../types'

const CATEGORIES: { type: ItemType; label: string; emoji: string; color: string }[] = [
  { type: 'album', label: 'Albums', emoji: '💿', color: 'from-violet-500/20 to-purple-500/10' },
  { type: 'song', label: 'Songs', emoji: '🎵', color: 'from-blue-500/20 to-cyan-500/10' },
  { type: 'artist', label: 'Artists', emoji: '🎤', color: 'from-rose-500/20 to-pink-500/10' },
  { type: 'playlist', label: 'Playlists', emoji: '📋', color: 'from-amber-500/20 to-orange-500/10' },
]

const stagger: Variants = {
  visible: { transition: { staggerChildren: 0.06 } },
}
const item: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { type: 'spring', stiffness: 300, damping: 24 } },
}

export function HomeView() {
  const navigate = useNavigate()
  const items = useCrateStore((s) => s.items)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-5 pt-14 pb-6 md:pt-8">
        <h1 className="text-3xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">Crate</h1>
        <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">Your music backlog</p>
      </div>

      {/* Category grid */}
      <motion.div
        className="grid grid-cols-2 gap-3 px-4 pb-28 md:pb-8"
        variants={stagger}
        initial="hidden"
        animate="visible"
      >
        {CATEGORIES.map(({ type, label, emoji, color }) => {
          const typeItems = items.filter((i) => i.type === type)
          const unlistened = typeItems.filter((i) => i.listenStatus === 'unlistened').length
          const recent = typeItems.slice(0, 4)

          return (
            <motion.button
              key={type}
              variants={item}
              className={`relative overflow-hidden backdrop-blur-sm border border-white/10 dark:border-white/5 rounded-2xl p-4 text-left cursor-pointer`}
              style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}
              onClick={() => navigate(`/category/${type}`)}
              whileTap={{ scale: 0.97 }}
            >
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${color} opacity-70 pointer-events-none`} />
              <div className="relative">
                <span className="text-2xl">{emoji}</span>
                <h2 className="text-lg font-semibold text-zinc-900 dark:text-zinc-100 mt-2">{label}</h2>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                  {typeItems.length} item{typeItems.length !== 1 ? 's' : ''}
                  {unlistened > 0 && ` · ${unlistened} new`}
                </p>

                {/* Cover art strip */}
                {recent.length > 0 && (
                  <div className="flex gap-1.5 mt-3 -mx-1">
                    {recent.map((ri) => (
                      <CoverThumb key={ri.id} item={ri} />
                    ))}
                  </div>
                )}
              </div>
            </motion.button>
          )
        })}
      </motion.div>
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
          {item.type === 'album' ? '💿' : item.type === 'song' ? '🎵' : item.type === 'artist' ? '🎤' : '📋'}
        </div>
      )}
    </div>
  )
}
