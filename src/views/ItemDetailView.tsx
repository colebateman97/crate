import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { FastAverageColor } from 'fast-average-color'
import { useCrateStore } from '../store'
import { TagChip } from '../components/TagChip'
import { StarRating } from '../components/StarRating'
import { getInitials, buildSpotifyDeepLink, buildAppleMusicDeepLink, formatYear } from '../utils'
import { getArtistDiscography, getReleaseGroupCoverArt, fetchLastfmTracklist } from '../api/musicbrainz'
import type { MBReleaseGroup } from '../api/musicbrainz'
import type { ListenStatus } from '../types'
import { LISTEN_STATUS_LABELS } from '../types'

const fac = new FastAverageColor()

// ── theme helpers ──────────────────────────────────────────────────────────────

interface DetailTheme {
  textPrimary: string
  textSecondary: string
  textMuted: string
  textLabel: string
  genreChip: string
  chipBase: string
  chipActive: string
  inputCls: string
  border: string
  backBtn: string
  editBtn: string
}

function buildTheme(bgColors: [string, string, string] | null, textLight: boolean): DetailTheme {
  if (!bgColors) {
    return {
      textPrimary: 'text-zinc-900 dark:text-zinc-100',
      textSecondary: 'text-zinc-500 dark:text-zinc-400',
      textMuted: 'text-zinc-400',
      textLabel: 'text-xs text-zinc-400 uppercase tracking-wider',
      genreChip: 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400',
      chipBase: 'border border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400',
      chipActive: 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent font-medium',
      inputCls: 'bg-white/5 dark:bg-white/5 border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:border-zinc-400 dark:focus:border-zinc-600',
      border: 'border-zinc-100 dark:border-zinc-800',
      backBtn: 'text-zinc-500 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100',
      editBtn: 'border-zinc-300 dark:border-zinc-700 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800',
    }
  }
  if (textLight) {
    return {
      textPrimary: 'text-white',
      textSecondary: 'text-zinc-200',
      textMuted: 'text-zinc-300',
      textLabel: 'text-xs text-zinc-300 uppercase tracking-wider',
      genreChip: 'bg-white/15 text-zinc-200',
      chipBase: 'border border-white/25 text-zinc-200',
      chipActive: 'bg-white text-zinc-900 border-transparent font-medium',
      inputCls: 'bg-white/10 border border-white/20 text-white placeholder-white/40 focus:border-white/50',
      border: 'border-white/15',
      backBtn: 'text-zinc-300 hover:text-white',
      editBtn: 'border-white/30 text-zinc-200 hover:bg-white/10',
    }
  }
  return {
    textPrimary: 'text-zinc-900',
    textSecondary: 'text-zinc-600',
    textMuted: 'text-zinc-500',
    textLabel: 'text-xs text-zinc-500 uppercase tracking-wider',
    genreChip: 'bg-zinc-900/10 text-zinc-700',
    chipBase: 'border border-zinc-300 text-zinc-600',
    chipActive: 'bg-zinc-900 text-white border-transparent font-medium',
    inputCls: 'bg-zinc-50/80 border border-zinc-300 text-zinc-900 placeholder-zinc-400 focus:border-zinc-400',
    border: 'border-zinc-200',
    backBtn: 'text-zinc-500 hover:text-zinc-900',
    editBtn: 'border-zinc-300 text-zinc-600 hover:bg-zinc-100',
  }
}

function mute(rgba: Uint8ClampedArray | number[]): string {
  const [r, g, b] = Array.from(rgba).map((v) => Math.round(v * 0.5 + 20))
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`
}

function effectiveBrightness(r: number, g: number, b: number): number {
  const mr = r * 0.5 + 20
  const mg = g * 0.5 + 20
  const mb = b * 0.5 + 20
  const mutedPerceived = 0.299 * mr + 0.587 * mg + 0.114 * mb
  const isDarkMode = document.documentElement.classList.contains('dark')
  const baseBrightness = isDarkMode ? 24 : 250
  return mutedPerceived * 0.6 + baseBrightness * 0.4
}

// ── component ─────────────────────────────────────────────────────────────────

export function ItemDetailView() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { items, tags, lists, settings, updateItem, deleteItem } = useCrateStore()
  const item = items.find((i) => i.id === id)

  const [editing, setEditing] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [bgColors, setBgColors] = useState<[string, string, string] | null>(null)
  const [textLight, setTextLight] = useState(false)

  const [discography, setDiscography] = useState<MBReleaseGroup[]>([])
  const [discArt, setDiscArt] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!item?.coverArtUrl) {
      setBgColors(null)
      setTextLight(false)
      return
    }
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.src = item.coverArtUrl
    img.onload = () => {
      try {
        const c1 = fac.getColor(img, { algorithm: 'dominant' })
        const c2 = fac.getColor(img, { algorithm: 'simple', left: 0, top: 0, width: Math.floor(img.width / 2), height: img.height })
        const c3 = fac.getColor(img, { algorithm: 'simple', left: Math.floor(img.width / 2), top: Math.floor(img.height / 2), width: Math.floor(img.width / 2), height: Math.floor(img.height / 2) })
        setBgColors([mute(c1.value), mute(c2.value), mute(c3.value)])
        const [r, g, b] = [c1.value[0], c1.value[1], c1.value[2]]
        setTextLight(effectiveBrightness(r, g, b) < 155)
      } catch {
        setBgColors(null)
        setTextLight(false)
      }
    }
  }, [item?.coverArtUrl])

  useEffect(() => {
    if (item?.type !== 'album') return
    if (item.tracklist && item.tracklist.length > 0) return
    if (!settings.lastfmApiKey || !item.artist) return
    fetchLastfmTracklist(item.artist, item.title, settings.lastfmApiKey).then((tracks) => {
      if (tracks && tracks.length > 0) updateItem(item.id, { tracklist: tracks })
    })
  }, [item?.id, settings.lastfmApiKey])

  useEffect(() => {
    if (item?.type !== 'artist' || !item.mbid) return
    getArtistDiscography(item.mbid).then(async (groups) => {
      setDiscography(groups)
      const artMap: Record<string, string> = {}
      for (const g of groups.slice(0, 20)) {
        const art = await getReleaseGroupCoverArt(g.id)
        if (art) artMap[g.id] = art
      }
      setDiscArt(artMap)
    })
  }, [item?.type, item?.mbid])

  if (!item) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen">
        <p className="text-zinc-400">Item not found.</p>
        <button onClick={() => navigate(-1)} className="mt-4 text-sm text-zinc-500 underline">Go back</button>
      </div>
    )
  }

  const th = buildTheme(bgColors, textLight)
  const itemTags = tags.filter((t) => item.tagIds.includes(t.id))
  const compatibleLists = lists.filter((l) => l.applicableTypes.includes(item.type))

  function handleStatusChange(status: ListenStatus) {
    updateItem(item!.id, {
      listenStatus: status,
      dateListened: status === 'listened' ? new Date().toISOString() : item!.dateListened,
    })
  }

  function toggleList(listId: string) {
    updateItem(item!.id, {
      listIds: item!.listIds.includes(listId)
        ? item!.listIds.filter((id) => id !== listId)
        : [...item!.listIds, listId],
    })
  }

  function handleDelete() {
    deleteItem(item!.id)
    navigate(-1)
  }

  const GradBg = () => {
    if (!bgColors) return null
    const [c1, c2, c3] = bgColors
    return (
      <motion.div
        className="fixed inset-0 -z-10 opacity-60"
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.6 }}
        transition={{ duration: 1.2 }}
        style={{
          background: `radial-gradient(ellipse at 20% 30%, ${c2} 0%, transparent 60%), radial-gradient(ellipse at 80% 70%, ${c3} 0%, transparent 60%), ${c1}`,
        }}
      />
    )
  }

  return (
    <motion.div
      className="flex flex-col min-h-full"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
    >
      <GradBg />

      {/* Back + actions */}
      <div className="flex items-center justify-between px-4 pt-14 pb-2 md:pt-6">
        <button
          onClick={() => navigate(-1)}
          className={`flex items-center gap-1 text-sm transition-colors ${th.backBtn}`}
        >
          <span className="text-xl">‹</span> Back
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setEditing(!editing)}
            className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${th.editBtn}`}
          >
            {editing ? 'Done' : 'Edit'}
          </button>
          {confirmDelete ? (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-red-400">Remove?</span>
              <button
                onClick={handleDelete}
                className="text-xs px-3 py-1.5 rounded-full bg-red-500 text-white transition-colors"
              >
                Yes
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${th.editBtn}`}
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-xs px-3 py-1.5 rounded-full border border-red-300/50 text-red-400 hover:bg-red-500/10 transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      <div className="flex flex-col gap-0 pb-28 md:pb-8">
        {/* Cover art */}
        {item.type === 'artist' ? (
          <ArtistHeader item={item} th={th} />
        ) : (
          <div className="px-4 pt-2 pb-6">
            <div className="mx-auto w-52 h-52 sm:w-64 sm:h-64 rounded-2xl overflow-hidden shadow-2xl bg-zinc-200 dark:bg-zinc-800">
              {item.coverArtUrl ? (
                <img src={item.coverArtUrl} alt={item.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl opacity-40">
                  {item.type === 'album' ? '💿' : item.type === 'song' ? '🎵' : '📋'}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Title & meta */}
        <div className="px-5">
          <EditableField
            editing={editing}
            value={item.title}
            onChange={(v) => updateItem(item.id, { title: v })}
            className={`text-2xl font-bold tracking-tight leading-tight ${th.textPrimary}`}
          />
          {item.artist !== undefined && (
            <EditableField
              editing={editing}
              value={item.artist ?? ''}
              onChange={(v) => updateItem(item.id, { artist: v })}
              className={`text-base mt-1 ${th.textSecondary}`}
              placeholder="Artist"
            />
          )}
          <div className="flex items-center gap-2 flex-wrap mt-2">
            {item.releaseDate && (
              <span className={`text-xs ${th.textMuted}`}>{formatYear(item.releaseDate)}</span>
            )}
            {item.genre?.map((g) => (
              <span key={g} className={`text-xs px-2 py-0.5 rounded-full ${th.genreChip}`}>
                {g}
              </span>
            ))}
          </div>
        </div>

        {/* Status & rating */}
        <div className="px-5 mt-5 flex flex-col gap-4">
          <div>
            <p className={`${th.textLabel} mb-2`}>Status</p>
            <div className="flex flex-wrap gap-2">
              {(['unlistened', 'in_progress', 'listened', 'want_to_revisit'] as ListenStatus[]).map((s) => (
                <button
                  key={s}
                  onClick={() => handleStatusChange(s)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    item.listenStatus === s ? th.chipActive : th.chipBase
                  }`}
                >
                  {LISTEN_STATUS_LABELS[s]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <p className={`${th.textLabel} mb-2`}>Rating</p>
            <StarRating
              value={item.starRating}
              onChange={(v) => updateItem(item.id, { starRating: v })}
              size="lg"
            />
          </div>
        </div>

        {/* Lists — always interactive */}
        {compatibleLists.length > 0 && (
          <div className="px-5 mt-5">
            <p className={`${th.textLabel} mb-2`}>Lists</p>
            <div className="flex flex-wrap gap-2">
              {compatibleLists.map((l) => (
                <button
                  key={l.id}
                  onClick={() => toggleList(l.id)}
                  className={`text-xs px-3 py-1.5 rounded-full border transition-all ${
                    item.listIds.includes(l.id) ? th.chipActive : th.chipBase
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes */}
        <div className="px-5 mt-5">
          <p className={`${th.textLabel} mb-2`}>Notes</p>
          <textarea
            value={item.notes ?? ''}
            onChange={(e) => updateItem(item.id, { notes: e.target.value })}
            placeholder="Add notes…"
            rows={3}
            className={`w-full rounded-xl px-3 py-2.5 text-sm resize-none focus:outline-none transition-colors ${th.inputCls}`}
          />
        </div>

        {/* Tags */}
        {itemTags.length > 0 && (
          <div className="px-5 mt-5">
            <p className={`${th.textLabel} mb-2`}>Tags</p>
            <div className="flex flex-wrap gap-2">
              {itemTags.map((t) => (
                <TagChip key={t.id} tag={t} />
              ))}
            </div>
          </div>
        )}

        {/* Recommended by */}
        {(item.recommendedBy || editing) && (
          <div className="px-5 mt-5">
            <p className={`${th.textLabel} mb-2`}>Recommended by</p>
            {editing ? (
              <input
                value={item.recommendedBy ?? ''}
                onChange={(e) => updateItem(item.id, { recommendedBy: e.target.value })}
                placeholder="Who recommended this?"
                className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${th.inputCls}`}
              />
            ) : (
              <p className={`text-sm ${th.textSecondary}`}>{item.recommendedBy}</p>
            )}
            {(item.recommendationNote || editing) && (
              <div className="mt-2">
                {editing ? (
                  <input
                    value={item.recommendationNote ?? ''}
                    onChange={(e) => updateItem(item.id, { recommendationNote: e.target.value })}
                    placeholder="Their note…"
                    className={`w-full rounded-xl px-3 py-2 text-sm focus:outline-none transition-colors ${th.inputCls}`}
                  />
                ) : item.recommendationNote ? (
                  <p className={`text-sm italic ${th.textMuted}`}>"{item.recommendationNote}"</p>
                ) : null}
              </div>
            )}
          </div>
        )}

        <ExternalLinks item={item} th={th} />
        <PlatformLinks item={item} settings={settings} />

        {(item.type === 'album' || item.type === 'playlist') && (
          <TracklistSection item={item} editing={editing} th={th} onUpdate={(t) => updateItem(item.id, { tracklist: t })} />
        )}

        {item.type === 'artist' && discography.length > 0 && (
          <DiscographySection discography={discography} discArt={discArt} savedItems={items} th={th} />
        )}
      </div>
    </motion.div>
  )
}

// ── sub-components ─────────────────────────────────────────────────────────────

function ArtistHeader({ item, th }: { item: import('../types').MusicItem; th: DetailTheme }) {
  const initials = getInitials(item.title)
  return (
    <div className="px-4 pt-2 pb-6 flex items-center gap-5">
      <div className="w-24 h-24 rounded-full bg-gradient-to-br from-zinc-300 to-zinc-400 dark:from-zinc-700 dark:to-zinc-600 flex items-center justify-center text-3xl font-bold text-zinc-600 dark:text-zinc-300 flex-shrink-0 shadow-xl">
        {initials}
      </div>
      <div>
        <p className={`text-2xl font-bold tracking-tight ${th.textPrimary}`}>{item.title}</p>
        {item.genre && item.genre.length > 0 && (
          <p className={`text-sm mt-1 ${th.textSecondary}`}>{item.genre.join(', ')}</p>
        )}
      </div>
    </div>
  )
}

function EditableField({
  editing,
  value,
  onChange,
  className,
  placeholder,
}: {
  editing: boolean
  value: string
  onChange: (v: string) => void
  className?: string
  placeholder?: string
}) {
  if (!editing) return <p className={className}>{value || placeholder}</p>
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className={`${className} bg-transparent border-b border-zinc-300 dark:border-zinc-700 focus:outline-none focus:border-zinc-500 w-full`}
    />
  )
}

function ExternalLinks({ item, th }: { item: import('../types').MusicItem; th: DetailTheme }) {
  const links: { label: string; url: string; icon: string }[] = []
  if (item.wikipediaUrl) links.push({ label: 'Wikipedia', url: item.wikipediaUrl, icon: 'W' })
  if (item.pitchforkUrl) links.push({ label: 'Pitchfork', url: item.pitchforkUrl, icon: 'P' })
  if (item.lastfmUrl) links.push({ label: 'Last.fm', url: item.lastfmUrl, icon: '♫' })
  if (links.length === 0) return null

  return (
    <div className="px-5 mt-5">
      <p className={`${th.textLabel} mb-2`}>Links</p>
      <div className="flex gap-2 flex-wrap">
        {links.map(({ label, url, icon }) => (
          <a
            key={label}
            href={url}
            target="_blank"
            rel="noreferrer"
            className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs transition-colors ${th.chipBase}`}
          >
            <span className="font-bold">{icon}</span>
            {label}
          </a>
        ))}
      </div>
    </div>
  )
}

function PlatformLinks({ item, settings }: { item: import('../types').MusicItem; settings: import('../types').AppSettings }) {
  const query = item.artist ? `${item.title} ${item.artist}` : item.title
  const links: { label: string; url: string; color: string }[] = []

  if (item.sourceUrl && item.sourcePlatform === 'spotify' && settings.platforms.spotify) {
    links.push({ label: 'Open in Spotify', url: item.sourceUrl, color: '#1DB954' })
  } else if (settings.platforms.spotify) {
    links.push({ label: 'Search Spotify', url: buildSpotifyDeepLink(query, item.type), color: '#1DB954' })
  }

  if (item.sourceUrl && item.sourcePlatform === 'apple_music' && settings.platforms.apple_music) {
    links.push({ label: 'Open in Apple Music', url: item.sourceUrl, color: '#FA2C55' })
  } else if (settings.platforms.apple_music) {
    links.push({ label: 'Search Apple Music', url: buildAppleMusicDeepLink(query, item.type), color: '#FA2C55' })
  }

  if (links.length === 0) return null

  return (
    <div className="px-5 mt-5 flex gap-2 flex-wrap">
      {links.map(({ label, url, color }) => (
        <a
          key={label}
          href={url}
          target="_blank"
          rel="noreferrer"
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium text-white transition-opacity hover:opacity-90 active:opacity-75"
          style={{ backgroundColor: color }}
        >
          {label}
        </a>
      ))}
    </div>
  )
}

function TracklistSection({
  item,
  editing,
  th,
  onUpdate,
}: {
  item: import('../types').MusicItem
  editing: boolean
  th: DetailTheme
  onUpdate: (tracklist: string[]) => void
}) {
  const [newTrack, setNewTrack] = useState('')

  return (
    <div className="px-5 mt-6">
      <p className={`${th.textLabel} mb-3`}>Tracklist</p>
      {(item.tracklist ?? []).length === 0 && !editing ? (
        <p className={`text-sm italic ${th.textMuted}`}>No tracklist available.</p>
      ) : (
        <ol className="flex flex-col gap-1">
          {(item.tracklist ?? []).map((track, idx) => (
            <li key={idx} className={`flex items-center gap-3 text-sm py-1.5 border-b ${th.border}`}>
              <span className={`w-5 text-right text-xs flex-shrink-0 ${th.textMuted}`}>{idx + 1}</span>
              <span className={`flex-1 ${th.textPrimary}`}>{track}</span>
              {editing && (
                <button
                  onClick={() => onUpdate((item.tracklist ?? []).filter((_, i) => i !== idx))}
                  className="text-red-400 text-xs hover:text-red-500"
                >
                  ×
                </button>
              )}
            </li>
          ))}
        </ol>
      )}
      {editing && (
        <div className="flex gap-2 mt-2">
          <input
            value={newTrack}
            onChange={(e) => setNewTrack(e.target.value)}
            placeholder="Add track…"
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newTrack.trim()) {
                onUpdate([...(item.tracklist ?? []), newTrack.trim()])
                setNewTrack('')
              }
            }}
            className={`flex-1 rounded-lg px-3 py-2 text-sm focus:outline-none ${th.inputCls}`}
          />
          <button
            onClick={() => {
              if (newTrack.trim()) {
                onUpdate([...(item.tracklist ?? []), newTrack.trim()])
                setNewTrack('')
              }
            }}
            className="px-3 py-2 rounded-lg bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm"
          >
            Add
          </button>
        </div>
      )}
    </div>
  )
}

function DiscographySection({
  discography,
  discArt,
  savedItems,
  th,
}: {
  discography: MBReleaseGroup[]
  discArt: Record<string, string>
  savedItems: import('../types').MusicItem[]
  th: DetailTheme
}) {
  const navigate = useNavigate()
  const albums = discography.filter((g) => g['primary-type'] === 'Album')
  const eps = discography.filter((g) => g['primary-type'] === 'EP')
  const singles = discography.filter((g) => g['primary-type'] === 'Single').slice(0, 5)

  const Section = ({ title, groups }: { title: string; groups: MBReleaseGroup[] }) => {
    if (groups.length === 0) return null
    return (
      <div className="mb-6">
        <h3 className={`${th.textLabel} px-5 mb-3`}>{title}</h3>
        <div className="flex gap-3 overflow-x-auto no-scrollbar px-5">
          {groups.map((g) => {
            const saved = savedItems.find((i) => i.mbid === g.id || (i.title === g.title && i.type === 'album'))
            return (
              <div
                key={g.id}
                className="flex-shrink-0 w-28 cursor-pointer group"
                onClick={() => saved && navigate(`/item/${saved.id}`)}
              >
                <div className={`w-28 h-28 rounded-xl overflow-hidden bg-zinc-200 dark:bg-zinc-800 relative ${saved ? 'ring-2 ring-zinc-900 dark:ring-zinc-100' : ''}`}>
                  {discArt[g.id] ? (
                    <img src={discArt[g.id]} alt={g.title} className="w-full h-full object-cover" loading="lazy" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-3xl opacity-20">💿</div>
                  )}
                  {saved && (
                    <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center">
                      <span className="text-white dark:text-zinc-900 text-[10px]">✓</span>
                    </div>
                  )}
                </div>
                <p className={`text-xs font-medium mt-1.5 truncate ${th.textPrimary}`}>{g.title}</p>
                <p className={`text-[10px] ${th.textMuted}`}>{g['first-release-date']?.slice(0, 4)}</p>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <p className={`${th.textLabel} px-5 mb-4`}>Discography</p>
      <Section title="Albums" groups={albums} />
      <Section title="EPs" groups={eps} />
      <Section title="Singles" groups={singles} />
    </div>
  )
}
