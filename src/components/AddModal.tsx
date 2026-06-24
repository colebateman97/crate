import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useCrateStore } from '../store'
import { TagChip } from './TagChip'
import {
  searchAlbums, searchSongs, searchArtists,
  fetchSpotifyOEmbed, detectSpotifyType, detectAppleMusicType,
  fetchAppleMusicMetadata, searchItunesMetadata,
  getCoverArtUrl, isPodcastUrl, fetchPodcastMetadata,
  isYoutubeUrl, fetchYoutubeMetadata,
} from '../api/musicbrainz'
import {
  searchTmdb, fetchTmdbMovie, fetchTmdbTv,
  tmdbPosterUrl, formatRuntime, formatAirDates,
} from '../api/tmdb'
import type { TmdbSearchResult, TmdbMovieDetail, TmdbTvDetail } from '../api/tmdb'
import type { MBRelease, MBRecording, MBArtist } from '../api/musicbrainz'
import { generateId, getRandomTagColor } from '../utils'
import type { ItemType, ListenStatus } from '../types'
import { ITEM_TYPE_LABELS } from '../types'

interface Props {
  open: boolean
  onClose: () => void
  initialUrl?: string
}

type Step = 'input' | 'preview' | 'details'

interface FormState {
  type: ItemType
  title: string
  artist: string
  releaseDate: string
  genre: string
  coverArtUrl: string
  sourceUrl: string
  sourcePlatform: 'spotify' | 'apple_music' | 'youtube' | 'manual'
  listenStatus: ListenStatus
  recommendedBy: string
  recommendationNote: string
  notes: string
  listIds: string[]
  tagIds: string[]
  mbid: string
  runtime: string
  language: string
  seasonCount: string
  airDates: string
  tmdbId: number | null
  overview: string
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
  runtime: '',
  language: '',
  seasonCount: '',
  airDates: '',
  tmdbId: null,
  overview: '',
}

function statusLabel(status: ListenStatus, type: ItemType): string {
  if (type === 'movie' || type === 'show' || type === 'video') {
    const map: Record<ListenStatus, string> = {
      unlistened: 'Unwatched',
      in_progress: 'Watching',
      listened: 'Watched',
      want_to_revisit: 'Rewatch',
    }
    return map[status]
  }
  const map: Record<ListenStatus, string> = {
    unlistened: 'Unlistened',
    in_progress: 'In Progress',
    listened: 'Listened',
    want_to_revisit: 'Revisit',
  }
  return map[status]
}

export function AddModal({ open, onClose, initialUrl }: Props) {
  const { addItem, items, lists, addTag, settings } = useCrateStore()
  const [step, setStep] = useState<Step>('input')
  const [urlInput, setUrlInput] = useState(initialUrl ?? '')
  const [query, setQuery] = useState('')
  const [form, setForm] = useState<FormState>(DEFAULT_FORM)
  const [suggestions, setSuggestions] = useState<(MBRelease | MBRecording | MBArtist)[]>([])
  const [loading, setLoading] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [duplicateWarning, setDuplicateWarning] = useState(false)

  // TMDB-specific state
  const [tmdbQuery, setTmdbQuery] = useState('')
  const [tmdbResults, setTmdbResults] = useState<TmdbSearchResult[]>([])
  const [tmdbPreview, setTmdbPreview] = useState<{
    result: TmdbSearchResult
    movieDetail: TmdbMovieDetail | null
    tvDetail: TmdbTvDetail | null
  } | null>(null)

  const searchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)
  const tmdbSearchTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
      setTmdbQuery('')
      setTmdbResults([])
      setTmdbPreview(null)
      setDuplicateWarning(false)
    }
  }, [open])

  async function handleUrlParse(url: string) {
    const spotifyType = detectSpotifyType(url)
    const appleMusicType = detectAppleMusicType(url)

    if (isYoutubeUrl(url)) {
      setLoading(true)
      try {
        const meta = await fetchYoutubeMetadata(url)
        if (meta) {
          setForm((f) => ({
            ...f,
            type: 'video',
            title: meta.title,
            artist: meta.channel,
            releaseDate: '',
            genre: '',
            coverArtUrl: meta.thumbnailUrl,
            sourceUrl: url,
            sourcePlatform: 'youtube',
          }))
          setStep('details')
        }
      } finally {
        setLoading(false)
      }
      return
    }

    if (isPodcastUrl(url)) {
      setLoading(true)
      try {
        const meta = await fetchPodcastMetadata(url)
        if (meta) {
          setForm((f) => ({
            ...f,
            type: 'podcast',
            title: meta.title,
            artist: meta.isEpisode ? meta.show : meta.host,
            releaseDate: meta.releaseDate,
            genre: '',
            coverArtUrl: meta.coverArtUrl,
            sourceUrl: url,
            sourcePlatform: url.includes('spotify') ? 'spotify' : 'apple_music',
          }))
          setStep('details')
        }
      } finally {
        setLoading(false)
      }
      return
    }

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

  function handleTmdbQueryChange(q: string) {
    setTmdbQuery(q)
    if (tmdbSearchTimeout.current) clearTimeout(tmdbSearchTimeout.current)
    if (!q.trim()) { setTmdbResults([]); return }
    tmdbSearchTimeout.current = setTimeout(async () => {
      if (!settings.tmdbApiKey) return
      setLoading(true)
      try {
        const results = await searchTmdb(q, settings.tmdbApiKey)
        setTmdbResults(results)
      } finally {
        setLoading(false)
      }
    }, 500)
  }

  async function handleTmdbResultClick(result: TmdbSearchResult) {
    if (!settings.tmdbApiKey) return
    setTmdbPreview({ result, movieDetail: null, tvDetail: null })
    setStep('preview')
    setLoading(true)
    try {
      if (result.media_type === 'movie') {
        const detail = await fetchTmdbMovie(result.id, settings.tmdbApiKey)
        setTmdbPreview((prev) => prev ? { ...prev, movieDetail: detail } : null)
      } else {
        const detail = await fetchTmdbTv(result.id, settings.tmdbApiKey)
        setTmdbPreview((prev) => prev ? { ...prev, tvDetail: detail } : null)
      }
    } finally {
      setLoading(false)
    }
  }

  function handleTmdbConfirm() {
    if (!tmdbPreview) return
    const { result, movieDetail, tvDetail } = tmdbPreview

    if (result.media_type === 'movie' && movieDetail) {
      const director = movieDetail.credits?.crew?.find((c) => c.job === 'Director')?.name ?? ''
      const genres = movieDetail.genres?.map((g) => g.name).join(', ') ?? ''
      const language = movieDetail.spoken_languages?.[0]?.english_name ?? ''
      const runtime = formatRuntime(movieDetail.runtime)
      const posterUrl = tmdbPosterUrl(movieDetail.poster_path) ?? ''
      setForm((f) => ({
        ...f,
        type: 'movie',
        title: movieDetail.title,
        artist: director,
        releaseDate: movieDetail.release_date?.slice(0, 4) ?? '',
        genre: genres,
        coverArtUrl: posterUrl,
        runtime,
        language,
        airDates: '',
        seasonCount: '',
        tmdbId: movieDetail.id,
        overview: movieDetail.overview ?? '',
      }))
    } else if (result.media_type === 'tv' && tvDetail) {
      const creator = tvDetail.created_by?.map((c) => c.name).join(', ') ?? ''
      const genres = tvDetail.genres?.map((g) => g.name).join(', ') ?? ''
      const language = tvDetail.spoken_languages?.[0]?.english_name ?? ''
      const airDatesStr = formatAirDates(tvDetail.first_air_date, tvDetail.last_air_date, tvDetail.in_production)
      const posterUrl = tmdbPosterUrl(tvDetail.poster_path) ?? ''
      setForm((f) => ({
        ...f,
        type: 'show',
        title: tvDetail.name,
        artist: creator,
        releaseDate: '',
        genre: genres,
        coverArtUrl: posterUrl,
        runtime: '',
        language,
        airDates: airDatesStr,
        seasonCount: tvDetail.number_of_seasons?.toString() ?? '',
        tmdbId: tvDetail.id,
        overview: tvDetail.overview ?? '',
      }))
    }

    setStep('details')
    setTmdbPreview(null)
    setTmdbResults([])
    setTmdbQuery('')
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

  async function handleSave(force = false) {
    if (!form.title.trim()) return

    if (!force) {
      const isDuplicate = items.some((item) => {
        if (form.tmdbId != null && item.tmdbId === form.tmdbId) return true
        if (form.mbid && item.mbid === form.mbid) return true
        return item.title.toLowerCase() === form.title.trim().toLowerCase() && item.type === form.type
      })
      if (isDuplicate) {
        setDuplicateWarning(true)
        return
      }
    }

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
      runtime: form.runtime || undefined,
      language: form.language || undefined,
      seasonCount: form.seasonCount ? (parseInt(form.seasonCount) || undefined) : undefined,
      airDates: form.airDates || undefined,
      tmdbId: form.tmdbId ?? undefined,
      overview: form.overview || undefined,
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

  const f = (k: keyof FormState, v: string | string[] | ListenStatus | ItemType | number | null) =>
    setForm((prev) => ({ ...prev, [k]: v }))

  const relevantLists = lists.filter((l) => l.applicableTypes.includes(form.type))
  const isTmdbType = form.type === 'movie' || form.type === 'show'

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
              className="relative w-full md:max-w-lg bg-white dark:bg-zinc-900 rounded-t-3xl md:rounded-2xl shadow-2xl overflow-hidden flex flex-col"
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
                  {(step === 'details' || step === 'preview') && (
                    <button
                      onClick={() => setStep(step === 'preview' ? 'input' : 'input')}
                      className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 transition-colors mr-1"
                    >
                      ‹
                    </button>
                  )}
                  <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    {step === 'input' ? 'Add to Crate' : step === 'preview' ? 'Confirm' : 'Save item'}
                  </h2>
                </div>
                <button
                  onClick={onClose}
                  className="text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 text-xl w-7 h-7 flex items-center justify-center rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                >
                  ×
                </button>
              </div>

              {/* Duplicate warning overlay */}
              {duplicateWarning && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-black/40 backdrop-blur-sm rounded-t-3xl md:rounded-2xl">
                  <div className="mx-5 w-full max-w-sm bg-white dark:bg-zinc-800 rounded-2xl p-6 shadow-xl">
                    <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Already in your collection</h3>
                    <p className="text-sm text-zinc-500 dark:text-zinc-400 mb-5">
                      <span className="font-medium text-zinc-700 dark:text-zinc-300">{form.title.trim()}</span> is already in your Crate. Do you still want to add a duplicate?
                    </p>
                    <div className="flex gap-3">
                      <button
                        onClick={() => setDuplicateWarning(false)}
                        className="flex-1 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-medium text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={() => { setDuplicateWarning(false); handleSave(true) }}
                        className="flex-1 py-2.5 rounded-xl bg-zinc-900 dark:bg-zinc-100 text-sm font-semibold text-white dark:text-zinc-900 hover:opacity-90 transition-opacity"
                      >
                        Add anyway
                      </button>
                    </div>
                  </div>
                </div>
              )}

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
                          {(['album', 'song', 'artist', 'playlist', 'podcast', 'video', 'movie', 'show'] as ItemType[]).map((t) => (
                            <button
                              key={t}
                              onClick={() => {
                                f('type', t)
                                setSuggestions([])
                                setTmdbResults([])
                                setTmdbQuery('')
                              }}
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

                      {isTmdbType ? (
                        /* TMDB search for movies and shows */
                        <div>
                          {!settings.tmdbApiKey ? (
                            <div className="text-center py-4">
                              <p className="text-sm text-zinc-500 dark:text-zinc-400">
                                Add your TMDB API key in{' '}
                                <span className="font-medium text-zinc-700 dark:text-zinc-300">Settings → API Keys</span>
                                {' '}to search for movies and shows.
                              </p>
                              <p className="text-xs text-zinc-400 mt-1">It's free and takes about a minute to set up.</p>
                            </div>
                          ) : (
                            <>
                              <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Search</label>
                              <input
                                value={tmdbQuery}
                                onChange={(e) => handleTmdbQueryChange(e.target.value)}
                                placeholder="Search movies and shows…"
                                className="w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600"
                              />
                              {loading && <p className="text-xs text-zinc-400 mt-1.5 px-1">Searching…</p>}
                              {tmdbResults.length > 0 && (
                                <div className="mt-2 flex flex-col gap-1">
                                  {tmdbResults.map((r) => (
                                    <TmdbResultRow key={r.id} result={r} onClick={() => handleTmdbResultClick(r)} />
                                  ))}
                                </div>
                              )}
                            </>
                          )}
                        </div>
                      ) : (
                        <>
                          {/* URL paste — only for non-movie/show types */}
                          <div>
                            <label className="text-xs text-zinc-400 uppercase tracking-wider mb-2 block">Paste link</label>
                            <div className="flex gap-2">
                              <input
                                value={urlInput}
                                onChange={(e) => setUrlInput(e.target.value)}
                                placeholder="Spotify, Apple Music, Podcasts, or YouTube URL…"
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
                          {form.type === 'podcast' ? (
                            <p className="text-xs text-zinc-400 text-center">Paste an Apple Podcasts or Spotify link above to auto-fill details.</p>
                          ) : form.type === 'video' ? (
                            <p className="text-xs text-zinc-400 text-center">Paste a YouTube link above to auto-fill details.</p>
                          ) : (
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
                          )}
                        </>
                      )}

                      <button
                        onClick={() => setStep('details')}
                        className="text-sm text-zinc-400 underline text-center"
                      >
                        Enter manually without searching
                      </button>
                    </motion.div>
                  ) : step === 'preview' ? (
                    <motion.div
                      key="preview"
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      className="p-5 flex flex-col gap-4"
                    >
                      {tmdbPreview && (() => {
                        const { result, movieDetail, tvDetail } = tmdbPreview
                        const isMovie = result.media_type === 'movie'
                        const detail = movieDetail ?? tvDetail
                        const title = isMovie ? (movieDetail?.title ?? result.title ?? '') : (tvDetail?.name ?? result.name ?? '')
                        const year = isMovie
                          ? (movieDetail?.release_date ?? result.release_date ?? '').slice(0, 4)
                          : (tvDetail?.first_air_date ?? result.first_air_date ?? '').slice(0, 4)
                        const poster = tmdbPosterUrl(detail?.poster_path ?? result.poster_path)
                        const genres = detail ? (isMovie ? movieDetail?.genres?.map((g) => g.name) : tvDetail?.genres?.map((g) => g.name)) : []
                        const overview = detail?.overview ?? result.overview ?? ''
                        const director = movieDetail?.credits?.crew?.find((c) => c.job === 'Director')?.name
                        const creator = tvDetail?.created_by?.map((c) => c.name).join(', ')
                        const runtime = movieDetail ? formatRuntime(movieDetail.runtime) : null
                        const seasons = tvDetail?.number_of_seasons
                        const language = isMovie
                          ? movieDetail?.spoken_languages?.[0]?.english_name
                          : tvDetail?.spoken_languages?.[0]?.english_name
                        const airDates = tvDetail
                          ? formatAirDates(tvDetail.first_air_date, tvDetail.last_air_date, tvDetail.in_production)
                          : null

                        return (
                          <>
                            <div className="flex gap-4">
                              {poster ? (
                                <img
                                  src={poster}
                                  alt={title}
                                  className="w-24 rounded-xl object-cover flex-shrink-0 shadow-lg"
                                  style={{ aspectRatio: '2/3' }}
                                />
                              ) : (
                                <div
                                  className="w-24 rounded-xl bg-zinc-200 dark:bg-zinc-800 flex-shrink-0 flex items-center justify-center text-3xl opacity-40"
                                  style={{ aspectRatio: '2/3' }}
                                >
                                  {isMovie ? '🎥' : '📺'}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                  isMovie
                                    ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400'
                                    : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
                                }`}>
                                  {isMovie ? 'Movie' : 'Show'}
                                </span>
                                <h3 className="text-base font-bold text-zinc-900 dark:text-zinc-100 mt-1 leading-snug">{title}</h3>
                                {year && <p className="text-xs text-zinc-400">{year}</p>}
                                {(director || creator) && (
                                  <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
                                    {isMovie ? `Dir. ${director}` : `By ${creator || '—'}`}
                                  </p>
                                )}
                                {genres && genres.length > 0 && (
                                  <div className="flex flex-wrap gap-1 mt-2">
                                    {genres.slice(0, 3).map((g) => (
                                      <span key={g} className="text-xs px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400">{g}</span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>

                            {loading && !detail && (
                              <p className="text-xs text-zinc-400 text-center">Loading details…</p>
                            )}

                            {detail && (
                              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500 dark:text-zinc-400">
                                {runtime && <span>⏱ {runtime}</span>}
                                {seasons !== undefined && <span>📺 {seasons} season{seasons !== 1 ? 's' : ''}</span>}
                                {airDates && <span>📅 {airDates}</span>}
                                {language && <span>🌐 {language}</span>}
                              </div>
                            )}

                            {overview ? (
                              <p className="text-sm text-zinc-500 dark:text-zinc-400 leading-relaxed line-clamp-4">{overview}</p>
                            ) : null}

                            <button
                              onClick={handleTmdbConfirm}
                              disabled={loading || !detail}
                              className="w-full py-3.5 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-semibold text-sm disabled:opacity-40 transition-opacity hover:opacity-90 active:scale-[0.98]"
                            >
                              {loading && !detail ? 'Loading…' : 'Add to Crate'}
                            </button>
                          </>
                        )
                      })()}
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
                          <img
                            src={form.coverArtUrl}
                            alt=""
                            className={`rounded-2xl object-cover shadow-lg ${
                              form.type === 'movie' || form.type === 'show'
                                ? 'h-44'
                                : 'w-32 h-32'
                            }`}
                            style={form.type === 'movie' || form.type === 'show' ? { aspectRatio: '2/3' } : {}}
                          />
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
                        <FormField label={
                          form.type === 'podcast' ? 'Show / Host' :
                          form.type === 'video' ? 'Channel' :
                          form.type === 'movie' ? 'Director' :
                          form.type === 'show' ? 'Creator' :
                          'Artist'
                        }>
                          <input
                            value={form.artist}
                            onChange={(e) => f('artist', e.target.value)}
                            placeholder={
                              form.type === 'podcast' ? 'Show name or host' :
                              form.type === 'video' ? 'Channel name' :
                              form.type === 'movie' ? 'Director name' :
                              form.type === 'show' ? 'Creator / showrunner' :
                              'Artist name'
                            }
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {(form.type === 'album' || form.type === 'song' || form.type === 'podcast' || form.type === 'movie') && (
                        <FormField label="Release date">
                          <input
                            value={form.releaseDate}
                            onChange={(e) => f('releaseDate', e.target.value)}
                            placeholder="YYYY or YYYY-MM-DD"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {form.type === 'show' && (
                        <FormField label="Dates on Air">
                          <input
                            value={form.airDates}
                            onChange={(e) => f('airDates', e.target.value)}
                            placeholder="e.g. Sep. 22, 1994 – May 6, 2004"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {form.type === 'show' && (
                        <FormField label="Number of Seasons">
                          <input
                            value={form.seasonCount}
                            onChange={(e) => f('seasonCount', e.target.value)}
                            placeholder="e.g. 10"
                            type="number"
                            min="1"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {form.type === 'movie' && (
                        <FormField label="Runtime">
                          <input
                            value={form.runtime}
                            onChange={(e) => f('runtime', e.target.value)}
                            placeholder="e.g. 2h 28m"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      {(form.type === 'movie' || form.type === 'show') && (
                        <FormField label="Language">
                          <input
                            value={form.language}
                            onChange={(e) => f('language', e.target.value)}
                            placeholder="e.g. English"
                            className={inputCls}
                          />
                        </FormField>
                      )}

                      <FormField label="Genre(s)">
                        <input
                          value={form.genre}
                          onChange={(e) => f('genre', e.target.value)}
                          placeholder="e.g. Drama, Comedy (comma-separated)"
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
                              {statusLabel(s, form.type)}
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
                          onClick={() => handleSave()}
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

function TmdbResultRow({ result, onClick }: { result: TmdbSearchResult; onClick: () => void }) {
  const isMovie = result.media_type === 'movie'
  const title = isMovie ? result.title : result.name
  const year = (isMovie ? result.release_date : result.first_air_date)?.slice(0, 4)
  const poster = tmdbPosterUrl(result.poster_path)

  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors text-left w-full"
    >
      <div className="w-8 flex-shrink-0 rounded-md overflow-hidden bg-zinc-200 dark:bg-zinc-700" style={{ aspectRatio: '2/3' }}>
        {poster ? (
          <img src={poster} alt={title} className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-sm opacity-40">{isMovie ? '🎥' : '📺'}</div>
        )}
      </div>
      <div className="flex flex-col min-w-0 flex-1">
        <span className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">{title}</span>
        <div className="flex items-center gap-1.5 mt-0.5">
          {year && <span className="text-xs text-zinc-400">{year}</span>}
          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
            isMovie
              ? 'bg-indigo-100 text-indigo-500 dark:bg-indigo-900/30 dark:text-indigo-400'
              : 'bg-cyan-100 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400'
          }`}>
            {isMovie ? 'Movie' : 'Show'}
          </span>
        </div>
      </div>
      <span className="text-zinc-300 dark:text-zinc-600 text-lg flex-shrink-0">›</span>
    </button>
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
