export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function formatDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

export function formatYear(dateStr?: string): string {
  if (!dateStr) return ''
  return dateStr.slice(0, 4)
}

export function pluralize(n: number, singular: string, plural?: string): string {
  return `${n} ${n === 1 ? singular : (plural ?? singular + 's')}`
}

export function getInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('')
}

export function buildAppleMusicDeepLink(query: string, type: string): string {
  const kinds: Record<string, string> = { album: 'album', song: 'song', artist: 'artist', playlist: 'playlist' }
  return `https://music.apple.com/search?term=${encodeURIComponent(query)}&kinds=${kinds[type] ?? 'album'}`
}

export function buildSpotifyDeepLink(query: string, type: string): string {
  const types: Record<string, string> = { album: 'album', song: 'track', artist: 'artist', playlist: 'playlist' }
  return `https://open.spotify.com/search/${encodeURIComponent(query)}/${types[type] ?? 'album'}`
}

export function downloadJson(data: string, filename: string) {
  const blob = new Blob([data], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const TAG_PALETTE = [
  '#ef4444', '#f97316', '#eab308', '#22c55e',
  '#14b8a6', '#3b82f6', '#8b5cf6', '#ec4899',
  '#f43f5e', '#06b6d4', '#84cc16', '#a855f7',
]

export function getRandomTagColor(): string {
  return TAG_PALETTE[Math.floor(Math.random() * TAG_PALETTE.length)]
}
