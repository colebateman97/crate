import type { ListenStatus } from '../types'
import { LISTEN_STATUS_LABELS } from '../types'

interface Props {
  status: ListenStatus
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const STATUS_STYLES: Record<ListenStatus, string> = {
  unlistened: 'bg-zinc-500/20 text-zinc-400 border-zinc-500/30',
  in_progress: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  listened: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  want_to_revisit: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
}

const STATUS_DOTS: Record<ListenStatus, string> = {
  unlistened: 'bg-zinc-400',
  in_progress: 'bg-amber-400',
  listened: 'bg-emerald-400',
  want_to_revisit: 'bg-violet-400',
}

export function StatusBadge({ status, size = 'md', showLabel = true }: Props) {
  const dot = <span className={`inline-block w-1.5 h-1.5 rounded-full ${STATUS_DOTS[status]}`} />

  if (!showLabel) return dot

  const cls =
    size === 'sm'
      ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs border'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border font-medium'

  return (
    <span className={`${cls} ${STATUS_STYLES[status]}`}>
      {dot}
      {LISTEN_STATUS_LABELS[status]}
    </span>
  )
}
