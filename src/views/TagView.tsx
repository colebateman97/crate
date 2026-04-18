import { useParams, useNavigate } from 'react-router-dom'
import { useCrateStore } from '../store'
import { ItemCard } from '../components/ItemCard'
import { TagChip } from '../components/TagChip'

export function TagView() {
  const { tagId } = useParams<{ tagId: string }>()
  const navigate = useNavigate()
  const { items, tags } = useCrateStore()

  const tag = tags.find((t) => t.id === tagId)
  const tagItems = items.filter((i) => i.tagIds.includes(tagId ?? ''))

  if (!tag) return null

  return (
    <div className="flex flex-col min-h-full">
      <div className="flex items-center gap-3 px-4 pt-14 pb-4 md:pt-6">
        <button
          onClick={() => navigate(-1)}
          className="w-8 h-8 flex items-center justify-center rounded-full text-zinc-500 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
        >
          ‹
        </button>
        <TagChip tag={tag} clickable={false} size="md" />
        <span className="text-sm text-zinc-400">{tagItems.length} items</span>
      </div>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 px-4 pb-28 md:pb-8">
        {tagItems.map((item) => (
          <ItemCard key={item.id} item={item} tags={tags} size="sm" />
        ))}
      </div>
      {tagItems.length === 0 && (
        <p className="text-center text-zinc-400 text-sm py-16">No items with this tag.</p>
      )}
    </div>
  )
}
