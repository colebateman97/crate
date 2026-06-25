const COVER_BASE = 'https://covers.openlibrary.org/b/id'

export interface OpenLibraryDoc {
  key: string
  title: string
  author_name?: string[]
  first_publish_year?: number
  cover_i?: number
  language?: string[]
  subject?: string[]
  isbn?: string[]
}

const LANG_CODES: Record<string, string> = {
  eng: 'English', fre: 'French', fra: 'French', spa: 'Spanish',
  ger: 'German', deu: 'German', jpn: 'Japanese', chi: 'Chinese',
  zho: 'Chinese', ita: 'Italian', por: 'Portuguese', rus: 'Russian',
  ara: 'Arabic', kor: 'Korean', dut: 'Dutch', nld: 'Dutch',
  pol: 'Polish', swe: 'Swedish', nor: 'Norwegian', dan: 'Danish',
  fin: 'Finnish', tur: 'Turkish', heb: 'Hebrew', hin: 'Hindi',
  vie: 'Vietnamese', ind: 'Indonesian', ukr: 'Ukrainian',
  ces: 'Czech', cze: 'Czech', ron: 'Romanian', rum: 'Romanian',
  hun: 'Hungarian', cat: 'Catalan', hrv: 'Croatian', slk: 'Slovak',
  bul: 'Bulgarian', srp: 'Serbian', lit: 'Lithuanian', lat: 'Latin',
  gre: 'Greek', ell: 'Greek', sco: 'Scots', wel: 'Welsh', cym: 'Welsh',
}

export function bookLanguageName(code: string): string {
  return LANG_CODES[code.toLowerCase()] ?? code
}

export function bookCoverUrl(coverId: number | undefined | null): string | null {
  return coverId ? `${COVER_BASE}/${coverId}-L.jpg` : null
}

export async function searchBooks(query: string): Promise<OpenLibraryDoc[]> {
  try {
    const fields = 'key,title,author_name,first_publish_year,cover_i,language,subject,isbn'
    const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&fields=${fields}&limit=8`
    const res = await fetch(url)
    if (!res.ok) return []
    const data = await res.json()
    return (data.docs ?? []).slice(0, 8) as OpenLibraryDoc[]
  } catch {
    return []
  }
}
