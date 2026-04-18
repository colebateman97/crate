import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import type { MusicItem, Tag } from '../types'
import { TagDot } from './TagChip'
import { StatusBadge } from './StatusBadge'

interface ItemCardProps {
  item: MusicItem
  tags: Tag[]
  size?: 'sm' | 'md' | 'lg'
  showStatus?: boolean
}

export function ItemCard({ item, tags, size = 'md', showStatus = true }: ItemCardProps) {
  const navigate = useNavigate()
  const itemTags = tags.filter((t) => item.tagIds.includes(t.id))

  const sizes = {
    sm: { wrapper: 'w-20', art: 'h-20 w-20 rounded-lg', title: 'text-xs', artist: 'text-[10px]' },
    md: { wrapper: 'w-28', art: 'h-28 w-28 rounded-xl', title: 'text-xs', artist: 'text-[10px]' },
    lg: { wrapper: 'w-36', art: 'h-36 w-36 rounded-xl', title: 'text-sm', artist: 'text-xs' },
  }

  const s = sizes[size]

  return (
    <motion.button
      className={`${s.wrapper} flex flex-col gap-1.5 text-left flex-shrink-0 scroll-snap-item group cursor-pointer`}
      onClick={() => navigate(`/item/${item.id}`)}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.96 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
    >
      <div className={`${s.art} bg-zinc-800 dark:bg-zinc-800 bg-zinc-200 relative overflow-hidden flex-shrink-0`}>
        {item.coverArtUrl ? (
          <img
            src={item.coverArtUrl}
            alt={item.title}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <TypeIcon type={item.type} className="w-8 h-8 opacity-30" />
          </div>
        )}
        {/* Status dot overlay */}
        {showStatus && (
          <span className="absolute top-1.5 right-1.5">
            <StatusBadge status={item.listenStatus} showLabel={false} />
          </span>
        )}
      </div>
      <div className="min-w-0 w-full">
        <p className={`${s.title} font-medium text-zinc-900 dark:text-zinc-100 truncate leading-snug`}>
          {item.title}
        </p>
        {item.artist && (
          <p className={`${s.artist} text-zinc-500 dark:text-zinc-400 truncate`}>{item.artist}</p>
        )}
        {itemTags.length > 0 && (
          <div className="flex gap-1 mt-1 flex-wrap">
            {itemTags.slice(0, 3).map((t) => (
              <TagDot key={t.id} color={t.color} />
            ))}
          </div>
        )}
      </div>
    </motion.button>
  )
}

export function TypeIcon({ type, className = 'w-6 h-6' }: { type: string; className?: string }) {
  const icons: Record<string, string> = {
    album: '💿',
    song: '🎵',
    artist: '🎤',
    playlist: '📋',
  }
  return <span className={`${className} flex items-center justify-center text-2xl`}>{icons[type] ?? '🎵'}</span>
}
