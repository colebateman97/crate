const MB_BASE = 'https://musicbrainz.org/ws/2'
const CAA_BASE = 'https://coverartarchive.org'
const headers = { 'User-Agent': 'CrateApp/1.0 (colebateman97@gmail.com)' }

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms))
let lastRequest = 0
async function rateLimitedFetch(url: string): Promise<Response> {
  const now = Date.now()
  const diff = now - lastRequest
  if (diff < 1100) await delay(1100 - diff)
  lastRequest = Date.now()
  return fetch(url, { headers })
}

export interface MBRelease {
  id: string
  title: string
  date?: string
  'artist-credit'?: Array<{ artist: { id: string; name: string } }>
  genres?: Array<{ name: string }>
  'label-info'?: Array<{ label?: { name: string } }>
}

export interface MBRecording {
  id: string
  title: string
  'artist-credit'?: Array<{ artist: { id: string; name: string } }>
  releases?: MBRelease[]
  length?: number
}

export interface MBArtist {
  id: string
  name: string
  'sort-name': string
  genres?: Array<{ name: string }>
  'release-groups'?: MBReleaseGroup[]
}

export interface MBReleaseGroup {
  id: string
  title: string
  'primary-type'?: string
  'first-release-date'?: string
  'artist-credit'?: Array<{ artist: { id: string; name: string } }>
}

export async function searchAlbums(query: string): Promise<MBRelease[]> {
  const url = `${MB_BASE}/release/?query=${encodeURIComponent(query)}&fmt=json&limit=8`
  const res = await rateLimitedFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data.releases ?? []
}

export async function searchSongs(query: string): Promise<MBRecording[]> {
  const url = `${MB_BASE}/recording/?query=${encodeURIComponent(query)}&fmt=json&limit=8`
  const res = await rateLimitedFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data.recordings ?? []
}

export async function searchArtists(query: string): Promise<MBArtist[]> {
  const url = `${MB_BASE}/artist/?query=${encodeURIComponent(query)}&fmt=json&limit=8`
  const res = await rateLimitedFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data.artists ?? []
}

export async function getRelease(mbid: string): Promise<MBRelease | null> {
  const url = `${MB_BASE}/release/${mbid}?inc=artist-credits+genres+recordings&fmt=json`
  const res = await rateLimitedFetch(url)
  if (!res.ok) return null
  return res.json()
}

export async function getArtistDiscography(mbid: string): Promise<MBReleaseGroup[]> {
  const url = `${MB_BASE}/release-group?artist=${mbid}&type=album|ep|single&inc=artist-credits&fmt=json&limit=100`
  const res = await rateLimitedFetch(url)
  if (!res.ok) return []
  const data = await res.json()
  return data['release-groups'] ?? []
}

export async function getCoverArtUrl(mbid: string): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release/${mbid}`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const front = data.images?.find((img: { front?: boolean; thumbnails?: { 500?: string; large?: string } }) => img.front)
    return front?.thumbnails?.['500'] ?? front?.thumbnails?.large ?? null
  } catch {
    return null
  }
}

export async function getReleaseGroupCoverArt(rgMbid: string): Promise<string | null> {
  try {
    const res = await fetch(`${CAA_BASE}/release-group/${rgMbid}`, { headers })
    if (!res.ok) return null
    const data = await res.json()
    const front = data.images?.find((img: { front?: boolean; thumbnails?: { 500?: string; large?: string } }) => img.front)
    return front?.thumbnails?.['500'] ?? front?.thumbnails?.large ?? null
  } catch {
    return null
  }
}

export async function getWikipediaUrl(name: string, type: 'album' | 'artist' | 'song'): Promise<string | null> {
  const suffixes: Record<string, string> = {
    album: 'album',
    artist: 'band musician',
    song: 'song',
  }
  const q = `${name} ${suffixes[type]}`
  try {
    const res = await fetch(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(q)}&format=json&origin=*&srlimit=1`
    )
    const data = await res.json()
    const title = data?.query?.search?.[0]?.title
    if (!title) return null
    return `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, '_'))}`
  } catch {
    return null
  }
}

// Spotify oEmbed for metadata fetching
export async function fetchSpotifyOEmbed(url: string): Promise<{ title?: string; author_name?: string; thumbnail_url?: string } | null> {
  try {
    const res = await fetch(`https://open.spotify.com/oembed?url=${encodeURIComponent(url)}`)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export function detectSpotifyType(url: string): 'album' | 'song' | 'artist' | 'playlist' | null {
  if (url.includes('spotify.com/album/')) return 'album'
  if (url.includes('spotify.com/track/')) return 'song'
  if (url.includes('spotify.com/artist/')) return 'artist'
  if (url.includes('spotify.com/playlist/')) return 'playlist'
  return null
}

export function detectAppleMusicType(url: string): 'album' | 'song' | 'artist' | 'playlist' | null {
  if (url.includes('music.apple.com') || url.includes('itunes.apple.com')) {
    if (url.includes('/album/') && url.includes('?i=')) return 'song'
    if (url.includes('/album/')) return 'album'
    if (url.includes('/artist/')) return 'artist'
    if (url.includes('/playlist/')) return 'playlist'
  }
  return null
}

export interface ItunesItem {
  title: string
  artist: string
  releaseDate: string
  genre: string
  coverArtUrl: string
}

interface RawItunesResult {
  wrapperType?: string
  artistName?: string
  collectionName?: string
  trackName?: string
  artworkUrl100?: string
  primaryGenreName?: string
  releaseDate?: string
}

function parseItunesResult(r: RawItunesResult): ItunesItem {
  const rawTitle = r.trackName ?? r.collectionName ?? r.artistName ?? ''
  const artist = r.wrapperType === 'artist' ? '' : (r.artistName ?? '')
  const releaseDate = r.releaseDate ? r.releaseDate.slice(0, 10) : ''
  const genre = r.primaryGenreName ?? ''
  const coverArtUrl = r.artworkUrl100
    ? r.artworkUrl100.replace('100x100bb', '600x600bb').replace('100x100bb.jpg', '600x600bb.jpg')
    : ''
  return { title: rawTitle, artist, releaseDate, genre, coverArtUrl }
}

function extractAppleMusicId(url: string): string | null {
  try {
    const parsed = new URL(url)
    const trackId = parsed.searchParams.get('i')
    if (trackId) return trackId
    const match = parsed.pathname.match(/\/(\d+)\/?$/)
    return match?.[1] ?? null
  } catch {
    return null
  }
}

export async function fetchAppleMusicMetadata(url: string): Promise<ItunesItem | null> {
  const id = extractAppleMusicId(url)
  if (!id) return null
  try {
    const res = await fetch(`https://itunes.apple.com/lookup?id=${id}`)
    if (!res.ok) return null
    const data = await res.json()
    const result: RawItunesResult | undefined = data.results?.[0]
    if (!result) return null
    return parseItunesResult(result)
  } catch {
    return null
  }
}

export async function fetchLastfmTracklist(
  artist: string,
  album: string,
  apiKey: string,
): Promise<string[] | null> {
  try {
    const url = `https://ws.audioscrobbler.com/2.0/?method=album.getinfo&api_key=${encodeURIComponent(apiKey)}&artist=${encodeURIComponent(artist)}&album=${encodeURIComponent(album)}&format=json`
    const res = await fetch(url)
    if (!res.ok) return null
    const data = await res.json()
    if (data.error) return null
    const tracks = data.album?.tracks?.track
    if (!tracks) return null
    const arr = Array.isArray(tracks) ? tracks : [tracks]
    return arr.map((t: { name: string }) => t.name).filter(Boolean)
  } catch {
    return null
  }
}

export async function searchItunesMetadata(
  title: string,
  artist: string,
  type: 'album' | 'song' | 'artist',
): Promise<ItunesItem | null> {
  const entityMap = { album: 'album', song: 'song', artist: 'musicArtist' }
  const term = encodeURIComponent(artist ? `${title} ${artist}` : title)
  try {
    const res = await fetch(
      `https://itunes.apple.com/search?term=${term}&media=music&entity=${entityMap[type]}&limit=3`,
    )
    if (!res.ok) return null
    const data = await res.json()
    const results: RawItunesResult[] = data.results ?? []
    const best = results.find((r) => {
      const name = (r.collectionName ?? r.trackName ?? r.artistName ?? '').toLowerCase()
      return name.includes(title.toLowerCase())
    }) ?? results[0]
    if (!best) return null
    return parseItunesResult(best)
  } catch {
    return null
  }
}
