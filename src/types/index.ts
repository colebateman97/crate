export type ItemType = 'album' | 'song' | 'artist' | 'playlist'

export type ListenStatus = 'unlistened' | 'in_progress' | 'listened' | 'want_to_revisit'

export type SourcePlatform = 'spotify' | 'apple_music' | 'manual'

export interface MusicItem {
  id: string
  type: ItemType
  title: string
  artist?: string
  releaseDate?: string
  genre?: string[]
  coverArtUrl?: string
  sourceUrl?: string
  sourcePlatform?: SourcePlatform

  listenStatus: ListenStatus
  starRating?: 1 | 2 | 3 | 4 | 5
  notes?: string

  recommendedBy?: string
  recommendationNote?: string

  listIds: string[]
  tagIds: string[]

  tracklist?: string[]
  albumCount?: number
  wikipediaUrl?: string
  pitchforkUrl?: string
  lastfmUrl?: string

  // MusicBrainz IDs for linking
  mbid?: string
  artistMbid?: string

  dateAdded: string
  dateListened?: string
}

export interface MusicList {
  id: string
  name: string
  isBuiltIn: boolean
  applicableTypes: ItemType[]
}

export interface Tag {
  id: string
  name: string
  color: string
}

export interface AppSettings {
  theme: 'light' | 'dark' | 'system'
  platforms: {
    spotify: boolean
    apple_music: boolean
  }
  lastfmApiKey: string
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'system',
  platforms: { spotify: true, apple_music: false },
  lastfmApiKey: '',
}

export const BUILT_IN_LIST_IDS = {
  RECOMMENDATIONS: 'list-recommendations',
  NEW_RELEASES: 'list-new-releases',
  REVISITS: 'list-revisits',
  DISCOVERIES: 'list-discoveries',
} as const

export const DEFAULT_LISTS: MusicList[] = [
  {
    id: BUILT_IN_LIST_IDS.RECOMMENDATIONS,
    name: 'Recommendations',
    isBuiltIn: true,
    applicableTypes: ['album', 'song', 'artist', 'playlist'],
  },
  {
    id: BUILT_IN_LIST_IDS.NEW_RELEASES,
    name: 'New Releases',
    isBuiltIn: true,
    applicableTypes: ['album', 'song', 'playlist'],
  },
  {
    id: BUILT_IN_LIST_IDS.REVISITS,
    name: 'Revisits',
    isBuiltIn: true,
    applicableTypes: ['album', 'song', 'artist', 'playlist'],
  },
  {
    id: BUILT_IN_LIST_IDS.DISCOVERIES,
    name: 'Discoveries',
    isBuiltIn: true,
    applicableTypes: ['album', 'song', 'artist', 'playlist'],
  },
]

export const LISTEN_STATUS_LABELS: Record<ListenStatus, string> = {
  unlistened: 'Unlistened',
  in_progress: 'In Progress',
  listened: 'Listened',
  want_to_revisit: 'Want to Revisit',
}

export const ITEM_TYPE_LABELS: Record<ItemType, string> = {
  album: 'Album',
  song: 'Song',
  artist: 'Artist',
  playlist: 'Playlist',
}
