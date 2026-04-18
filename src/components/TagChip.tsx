import { useNavigate } from 'react-router-dom'
import type { Tag } from '../types'

interface Props {
  tag: Tag
  size?: 'sm' | 'md'
  clickable?: boolean
}

export function TagChip({ tag, size = 'md', clickable = true }: Props) {
  const navigate = useNavigate()

  const base =
    size === 'sm'
      ? 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-xs font-medium'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-sm font-medium'

  const style = {
    backgroundColor: tag.color + '28',
    color: tag.color,
    border: `1px solid ${tag.color}44`,
  }

  if (!clickable) {
    return (
      <span className={base} style={style}>
        {tag.name}
      </span>
    )
  }

  return (
    <button
      className={`${base} cursor-pointer transition-opacity hover:opacity-80 active:opacity-60`}
      style={style}
      onClick={(e) => {
        e.stopPropagation()
        navigate(`/tag/${tag.id}`)
      }}
    >
      {tag.name}
    </button>
  )
}

export function TagDot({ color }: { color: string }) {
  return (
    <span
      className="inline-block w-2 h-2 rounded-full flex-shrink-0"
      style={{ backgroundColor: color }}
    />
  )
}
