import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCrateStore } from '../store'
import { TagChip } from './TagChip'
import {
  searchAlbums, searchSongs, searchArtists,
  fetchSpotifyOEmbed, detectSpotifyType, detectAppleMusicType,
  fetchAppleMusicMetadata, searchItunesMetadata,
  getCoverArtUrl,
} from '../api/musicbrainz'
import type { MBRelease, MBRecording, MBArtist } from '../api/musicbrainz'
import { generateId, getRandomTagColor } from '../utils'
import type { ItemType, ListenStatus } from '../types'
import { ITEM_TYPE_LABELS } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  initialUrl?: string
}

type Step = 'input' | 'details'

interface FormState {
  type: ItemType
  title: string
  artist: string
  releaseDate: string
  genre: string
  coverArtUrl: string
  sourceUrl: string
  sourcePlatform: 'spotify' | 'apple_music' | 'manual'
  listenStatus: ListenStatus
  recommendedBy: string
  recommendationNote: string
  notes: string
  listIds: string[]
  tagIds: string[]
  mbid: string
}

const DEFAULT_FORM: FormState = {
  type: 'album',
  title: '',
  artist: '',
  releaseDate: '',
  genre: '',
  coverArtUrl: '',
  sourceUrl: '',
  sourcePlatform: 'manual',
  listenStatus: 'unlistened',
  recommendedBy: '',
  recommendationNote: '',
  notes: '',
  listIds: [],
  tagIds: [],
  mbid: '',
}

export function AddModal({ open, onClose, initialUrl }: Props) {
  const { addItem, lists, addTag } = useCrateStore()
  const [step, setStep] = useState<Step>('input')
  const [urlInput, setUrlInput] = useState(initialUrl ?? '')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [suggestions, setSuggestions] = useState<(MBRelease | MBRecording | MBArtist)[]>([])
  const [loading, setLoading] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (initialUrl) {
      setUrlInput(initialUrl)
      handleUrlParse(initialUrl)
    }
  }, [initialUrl])

  useEffect(() => {
    if (!open) {
      setStep('input')
      setForm(DEFAULT_FORM)
      setUrlInput('')
      setQuery('')
      setSuggestions([])
    }
  }, [open])

  async function handleUrlParse(url: string) {
    const spotifyType = detectSpotifyType(url)
    const appleMusicType = detectAppleMusicType(url)

    if (spotifyType) {
      setLoading(true)
      try {
        const oembed = await fetchSpotifyOEmbed(url)
        if (oembed) {
          const title = oembed.title ?? ''
          let artist = oembed.author_name ?? ''
          let releaseDate = ''
          let genre = ''

          if (spotifyType !== 'playlist' && title) {
            const itunes = await searchItunesMetadata(title, artist, spotifyType as 'album' | 'song' | 'artist')
            if (itunes) {
              releaseDate = itunes.releaseDate
              genre = itunes.genre
              if (itunes.artist) artist = itunes.artist
            }
          }

          setForm((f) => ({
            ...f,
            type: spotifyType,
            title,
            artist,
            releaseDate,
            genre,
            coverArtUrl: oembed.thumbnail_url ?? '',
            sourceUrl: url,
            sourcePlatform: 'spotify',
          }))
          setStep('details')
        }
      } finally {
        setLoading(false)
      }
    } else if (appleMusicType) {
      setLoading(true)
      try {
        const meta = await fetchAppleMusicMetadata(url)
        setForm((f) => ({
          ...f,
          type: appleMusicType,
          title: meta?.title ?? '',
          artist: meta?.artist ?? '',
          releaseDate: meta?.releaseDate ?? '',
          genre: meta?.genre ?? '',
          coverArtUrl: meta?.coverArtUrl ?? '',
          sourceUrl: url,
          sourcePlatform: 'apple_music',
        }))
        setStep('details')
      } finally {
        setLoading(false)
      }
    }
  }

  async function handleSearch(q: string, type: ItemType) {
    if (!q.trim()) { setSuggestions([]); return }
    setLoading(true)
    try {
      let results: (MBRelease | MBRecording | MBArtist)[] = []
      if (type === 'album') results = await searchAlbums(q)
      else if (type === 'song') results = await searchSongs(q)
      else if (type === 'artist') results = await searchArtists(q)
      setSuggestions(results.slice(0, 6))
    } finally {
      setLoading(false)
    }
  }

  function handleQueryChange(q: string) {
    setQuery(q)
    if (searchTimeout.current) clearTimeout(searchTimeout.current)
    searchTimeout.current = setTimeout(() => handleSearch(q, form.type), 500)
  }

  async function handleSuggestionPick(suggestion: MBRelease | MBRecording | MBArtist) {
    setLoading(true)
    try {
      const mbid = suggestion.id
      let coverUrl = ''

      if (form.type === 'album') {
        const r = suggestion as MBRelease
        coverUrl = (await getCoverArtUrl(mbid)) ?? ''
        const artist = r['artist-credit']?.[0]?.artist?.name ?? ''
        setForm((f) => ({
          ...f,
          title: r.title,
          artist,
          releaseDate: r.date ?? '',
          genre: r.genres?.map((g: { name: string }) => g.name).join(', ') ?? '',
          coverArtUrl: coverUrl,
          mbid,
        }))
      } else if (form.type === 'song') {
        const rec = suggestion as MBRecording
        const artist = rec['artist-credit']?.[0]?.artist?.name ?? ''
        setForm((f) => ({
          ...f,
          title: rec.title,
          artist,
          mbid,
        }))
      } else if (form.type === 'artist') {
        const art = suggestion as MBArtist
        setForm((f) => ({
          ...f,
          title: art.name,
          genre: art.genres?.map((g: { name: string }) => g.name).join(', ') ?? '',
          mbid,
        }))
      }
    } finally {
      setLoading(false)
      setSuggestions([])
      setStep('details')
    }
  }

  async function handleSave() {
    if (!form.title.trim()) return
    const genres = form.genre ? form.genre.split(',').map((g) => g.trim()).filter(Boolean) : []
    const newItem = {
      id: generateId(),
      type: form.type,
      title: form.title.trim(),
      artist: form.artist || undefined,
      releaseDate: form.releaseDate || undefined,
      genre: genres.length > 0 ? genres : undefined,
      coverArtUrl: form.coverArtUrl || undefined,
      sourceUrl: form.sourceUrl || undefined,
      sourcePlatform: form.sourcePlatform !== 'manual' ? form.sourcePlatform : undefined,
      listenStatus: form.listenStatus,
      notes: form.notes || undefined,
      recommendedBy: form.recommendedBy || undefined,
      recommendationNote: form.recommendationNote || undefined,
      listIds: form.listIds,
      tagIds: form.tagIds,
      mbid: form.mbid || undefined,
      dateAdded: new Date().toISOString(),
    }
    addItem(newItem)
    onClose()
  }

  function addNewTag() {
    if (!newTagName.trim()) return
    const tag = { id: generateId(), name: newTagName.trim(), color: getRandomTagColor() }
    addTag(tag)
    setForm((f) => ({ ...f, tagIds: [...f.tagIds, tag.id] }))
    setNewTagName('')
  }

  const f = (k: keyof FormState, v: string | string[] | ListenStatus | ItemType) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const relevantLists = lists.filter((l) => l.applicableTypes.includes(form.type))

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />

          {/* Sheet */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 md:inset-0 md:flex md:items-center md:justify-center"
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
          >
            <div
              className="w-full md:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
              style={{ maxHeight: '90dvh' }}
              onClick={(e) => e.stopPropagation()}
            >
              {/* Handle */}
              <div className="flex-shrink-0 flex justify-center pt-3 pb-1 md:hidden">
                <div className="w-10 h-1 rounded-full bg-zinc-200 dark:bg-zinc-700" />
              </div>

              {/* Header */}
              <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center gap-2">
                  {step === 'details' && (
                    <button
                      onClick={() => setStep('input')}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mr-1"
                    >
                      ‹
                    </button>
                  )}
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {step === 'input' ? 'Add to Crate' : 'Save item'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ×
                </button>
              </div>

              <div className="flex-1 overflow-y-auto">
                <AnimatePresence mode="wait">
                  {step === 'input' ? (
                    <motion.div
                      key="input"
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="p-5 flex flex-col gap-4"
                    >
                      {/* Type selector */}
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Type</label>
                        <div className="grid grid-cols-4 gap-1.5">
                          {(['album', 'song', 'artist', 'playlist'] as ItemType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => f('type', t)}
                              className={`py-2 rounded-xl text-xs font-medium border transition-colors ${
                                form.type === t
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {ITEM_TYPE_LABELS[t]}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* URL paste */}
                      <div>
                        <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Paste link</label>
                        <div className="flex gap-2">
                          <input
                            value={urlInput}
                            onChange={(e) => setUrlInput(e.target.value)}
                            placeholder="Spotify or Apple Music URL…"
                            className="flex-1 bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                          />
                          <button
                            onClick={() => handleUrlParse(urlInput)}
                            disabled={!urlInput || loading}
                            className="px-4 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 text-sm font-medium disabled:opacity-40 transition-opacity"
                          >
                            {loading ? '…' : 'Go'}
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                        <span className="text-xs text-zinc-400">or search manually</span>
                        <div className="flex-1 h-px bg-zinc-100 dark:bg-zinc-800" />
                      </div>

                      {/* Manual search */}
                      <div>
                        <input
                          value={query}
                          onChange={(e) => handleQueryChange(e.target.value)}
                          placeholder={`Search for a ${ITEM_TYPE_LABELS[form.type].toLowerCase()}…`}
                          className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                        />
                        {loading && <p className="text-xs text-zinc-400 mt-1.5 px-1">Searching…</p>}
                        {suggestions.length > 0 && (
                          <div className="mt-2 flex flex-col gap-1">
                            {suggestions.map((s) => (
                              <SuggestionRow
                                key={s.id}
                                suggestion={s}
                                type={form.type}
                                onClick={() => handleSuggestionPick(s)}
                              />
                            ))}
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => setStep('details')}
                        className="text-sm text-zinc-400 underline text-center"
                      >
                        Enter manually without searching
                      </button>
                    </motion.div>
                  ) : (
                    <motion.div
                      key="details"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 flex flex-col gap-4"
                    >
                      {/* Cover art preview */}
                      {form.coverArtUrl && (
                        <div className="flex justify-center">
                          <img src={form.coverArtUrl} alt="" className="w-32 h-32 rounded-2xl object-cover shadow-lg" />
                        </div>
                      )}

                      <FormField label="Title *">
                        <input
                          value={form.title}
                          onChange={(e) => f('title', e.target.value)}
                          placeholder="Title"
                          className={inputCls}
                        />
                      </FormField>

                      {form.type !== 'artist' && (
                        <FormField label="Artist">
                          <input
                            value={form.artist}
                            onChange={(e) => f('artist', e.target.value)}
                            placeholder="Artist name"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {(form.type === 'album' || form.type === 'song') && (
                        <FormField label="Release date">
                          <input
                            value={form.releaseDate}
                            onChange={(e) => f('releaseDate', e.target.value)}
                            placeholder="YYYY or YYYY-MM-DD"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      <FormField label="Genre(s)">
                        <input
                          value={form.genre}
                          onChange={(e) => f('genre', e.target.value)}
                          placeholder="e.g. Rock, Indie (comma-separated)"
                          className={inputCls}
                        />
                      </FormField>

                      <FormField label="Cover art URL">
                        <input
                          value={form.coverArtUrl}
                          onChange={(e) => f('coverArtUrl', e.target.value)}
                          placeholder="https://…"
                          className={inputCls}
                        />
                      </FormField>

                      <FormField label="Status">
                        <div className="flex flex-wrap gap-1.5">
                          {(['unlistened', 'in_progress', 'listened', 'want_to_revisit'] as ListenStatus[]).map((s) => (
                            <button
                              key={s}
                              onClick={() => f('listenStatus', s)}
                              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                form.listenStatus === s
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {s === 'unlistened' ? 'Unlistened' : s === 'in_progress' ? 'In Progress' : s === 'listened' ? 'Listened' : 'Revisit'}
                            </button>
                          ))}
                        </div>
                      </FormField>

                      <FormField label="Add to lists">
                        <div className="flex flex-wrap gap-1.5">
                          {relevantLists.map((l) => (
                            <button
                              key={l.id}
                              onClick={() =>
                                f('listIds', form.listIds.includes(l.id)
                                  ? form.listIds.filter((id) => id !== l.id)
                                  : [...form.listIds, l.id])
                              }
                              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                                form.listIds.includes(l.id)
                                  ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                                  : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                              }`}
                            >
                              {l.name}
                            </button>
                          ))}
                        </div>
                      </FormField>

                      {/* Tags */}
                      <FormField label="Tags">
                        <div className="flex flex-wrap gap-1.5 mb-2">
                          {useCrateStore.getState().tags.map((t) => (
                            <button
                              key={t.id}
                              onClick={() =>
                                f('tagIds', form.tagIds.includes(t.id)
                                  ? form.tagIds.filter((id) => id !== t.id)
                                  : [...form.tagIds, t.id])
                              }
                              className="transition-all"
                              style={{
                                opacity: form.tagIds.includes(t.id) ? 1 : 0.5,
                                transform: form.tagIds.includes(t.id) ? 'scale(1.05)' : 'scale(1)',
                              }}
                            >
                              <TagChip tag={t} clickable={false} />
                            </button>
                          ))}
                        </div>
                        <div className="flex gap-2">
                          <input
                            value={newTagName}
                            onChange={(e) => setNewTagName(e.target.value)}
                            placeholder="New tag…"
                            onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
                            className={`${inputCls} flex-1`}
                          />
                          <button
                            onClick={addNewTag}
                            className="px-3 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300"
                          >
                            +
                          </button>
                        </div>
                      </FormField>

                      <FormField label="Recommended by">
                        <input
                          value={form.recommendedBy}
                          onChange={(e) => f('recommendedBy', e.target.value)}
                          placeholder="Person's name"
                          className={inputCls}
                        />
                      </FormField>

                      <FormField label="Their note">
                        <input
                          value={form.recommendationNote}
                          onChange={(e) => f('recommendationNote', e.target.value)}
                          placeholder="What they said…"
                          className={inputCls}
                        />
                      </FormField>

                      <FormField label="Your notes">
                        <textarea
                          value={form.notes}
                          onChange={(e) => f('notes', e.target.value)}
                          placeholder="Add notes…"
                          rows={2}
                          className={`${inputCls} resize-none`}
                        />
                      </FormField>

                      {/* Save */}
                      <div className="pt-2 pb-safe">
                        <button
                          onClick={handleSave}
                          disabled={!form.title.trim()}
                          className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90 active:scale-[0.98]"
                        >
                          Save to Crate
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}

const inputCls =
  'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors'

function FormField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-xs text-zinc-400 uppercase tracking-wider mb-1.5 block">{label}</label>
      {children}
    </div>
  )
}

function SuggestionRow({
  suggestion,
  type,
  onClick,
}: {
  suggestion: MBRelease | MBRecording | MBArtist
  type: ItemType
  onClick: () => void
}) {
  let primary = ''
  let secondary = ''
  if (type === 'album') {
    const r = suggestion as MBRelease
    primary = r.title
    secondary = r['artist-credit']?.[0]?.artist?.name ?? ''
  } else if (type === 'song') {
    const rec = suggestion as MBRecording
    primary = rec.title
    secondary = rec['artist-credit']?.[0]?.artist?.name ?? ''
  } else if (type === 'artist') {
    const art = suggestion as MBArtist
    primary = art.name
    secondary = art.genres?.map((g: { name: string }) => g.name).join(', ') ?? ''
  }

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left w-full"
    >
      <div className="flex flex-col min-w-0">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{primary}</span>
        {secondary && <span className="text-xs text-zinc-400 truncate">{secondary}</span>}
      </div>
    </button>
  )
}
