import { supabase } from './supabase'

const SYNC_KEY_STORAGE = 'crate-sync-key'

function generateSyncKey(): string {
  const hex = crypto.randomUUID().replace(/-/g, '')
  return `crate-${hex.slice(0, 4)}-${hex.slice(4, 8)}-${hex.slice(8, 12)}`
}

export function getOrCreateSyncKey(): string {
  let key = localStorage.getItem(SYNC_KEY_STORAGE)
  if (!key) {
    key = generateSyncKey()
    localStorage.setItem(SYNC_KEY_STORAGE, key)
  }
  return key
}

export function getStoredSyncKey(): string | null {
  return localStorage.getItem(SYNC_KEY_STORAGE)
}

export function storeSyncKey(key: string): void {
  localStorage.setItem(SYNC_KEY_STORAGE, key.trim().toLowerCase())
}

export async function pushToCloud(syncKey: string, data: object): Promise<boolean> {
  if (!supabase) return false
  try {
    const { error } = await supabase.from('crate_sync').upsert({
      sync_key: syncKey,
      data,
      updated_at: new Date().toISOString(),
    })
    if (error) { console.error('Sync push failed:', error.message); return false }
    return true
  } catch (e) {
    console.error('Sync push exception:', e)
    return false
  }
}

export async function pullFromCloud(syncKey: string): Promise<object | null> {
  if (!supabase) return null
  try {
    const { data, error } = await supabase
      .from('crate_sync')
      .select('data')
      .eq('sync_key', syncKey)
      .maybeSingle()
    if (error) { console.error('Sync pull failed:', error.message); return null }
    return data?.data ?? null
  } catch (e) {
    console.error('Sync pull exception:', e)
    return null
  }
}

let pushTimeout: ReturnType<typeof setTimeout> | null = null

export function schedulePush(syncKey: string, data: object): void {
  if (pushTimeout) clearTimeout(pushTimeout)
  pushTimeout = setTimeout(() => pushToCloud(syncKey, data), 3000)
}
