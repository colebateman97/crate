const POSTER_BASE = 'https://image.tmdb.org/t/p/w500'

export interface TmdbSearchResult {
  id: number
  media_type: 'movie' | 'tv'
  title?: string
  name?: string
  release_date?: string
  first_air_date?: string
  poster_path: string | null
  overview: string
  vote_average: number
}

export interface TmdbMovieDetail {
  id: number
  title: string
  release_date: string
  genres: { id: number; name: string }[]
  runtime: number | null
  spoken_languages: { english_name: string }[]
  credits: {
    crew: { job: string; name: string; department: string }[]
  }
  poster_path: string | null
  overview: string
}

export interface TmdbTvDetail {
  id: number
  name: string
  first_air_date: string
  last_air_date: string
  in_production: boolean
  genres: { id: number; name: string }[]
  number_of_seasons: number
  spoken_languages: { english_name: string }[]
  created_by: { id: number; name: string }[]
  poster_path: string | null
  overview: string
}

export function tmdbPosterUrl(path: string | null | undefined): string | null {
  return path ? `${POSTER_BASE}${path}` : null
}

export function formatRuntime(minutes: number | null | undefined): string {
  if (!minutes) return ''
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  if (h === 0) return `${m}m`
  if (m === 0) return `${h}h`
  return `${h}h ${m}m`
}

export function formatAirDates(first: string, last: string, inProduction: boolean): string {
  const fmt = (d: string) => {
    try {
      const date = new Date(d + 'T00:00:00')
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    } catch {
      return d
    }
  }
  const start = first ? fmt(first) : ''
  if (!start) return ''
  if (inProduction) return `${start} – present`
  const end = last ? fmt(last) : ''
  return end ? `${start} – ${end}` : start
}

export async function searchTmdb(query: string, apiKey: string): Promise<TmdbSearchResult[]> {
  try {
    const url = `https://api.themoviedb.org/3/search/multi?query=${encodeURIComponent(query)}&api_key=${encodeURIComponent(apiKey)}&page=1`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.results ?? [])
      .filter((r: TmdbSearchResult) => r.media_type === 'movie' || r.media_type === 'tv')
      .slice(0, 8)
  } catch {
    return []
  }
}

export async function fetchTmdbMovie(id: number, apiKey: string): Promise<TmdbMovieDetail | null> {
  try {
    const url = `https://api.themoviedb.org/3/movie/${id}?api_key=${encodeURIComponent(apiKey)}&append_to_response=credits`
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function fetchTmdbTv(id: number, apiKey: string): Promise<TmdbTvDetail | null> {
  try {
    const url = `https://api.themoviedb.org/3/tv/${id}?api_key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}
