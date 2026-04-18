import { useState } from 'react'
import { useCrateStore } from '../store'
import { downloadJson, generateId, getRandomTagColor } from '../utils'
import { TagChip } from '../components/TagChip'

export function SettingsView() {
  const { settings, updateSettings, tags, addTag, updateTag, deleteTag, lists, addList, deleteList, exportData, importData, clearAllData } = useCrateStore()
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [importSuccess, setImportSuccess] = useState(false)
  const [newTagName, setNewTagName] = useState('')
  const [editingTagId, setEditingTagId] = useState<string | null>(null)
  const [newListName, setNewListName] = useState('')

  function handleExport() {
    const data = exportData()
    downloadJson(data, `crate-backup-${new Date().toISOString().slice(0, 10)}.json`)
  }

  function handleImport() {
    try {
      importData(importText)
      setImportSuccess(true)
      setImportError('')
      setImportText('')
      setTimeout(() => setImportSuccess(false), 3000)
    } catch (e) {
      setImportError('Invalid JSON. Please check the file.')
    }
  }

  function handleImportFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      const text = ev.target?.result as string
      try {
        importData(text)
        setImportSuccess(true)
        setImportError('')
        setTimeout(() => setImportSuccess(false), 3000)
      } catch {
        setImportError('Invalid file format.')
      }
    }
    reader.readAsText(file)
  }

  function handleClear() {
    if (confirm('This will delete all your saved items, lists, and tags. This cannot be undone. Continue?')) {
      clearAllData()
    }
  }

  function addNewTag() {
    if (!newTagName.trim()) return
    addTag({ id: generateId(), name: newTagName.trim(), color: getRandomTagColor() })
    setNewTagName('')
  }

  function addNewList() {
    if (!newListName.trim()) return
    addList({
      id: generateId(),
      name: newListName.trim(),
      isBuiltIn: false,
      applicableTypes: ['album', 'song', 'artist', 'playlist'],
    })
    setNewListName('')
  }

  return (
    <div className="flex flex-col min-h-full px-4 pt-14 pb-28 md:pt-8 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Settings</h1>
      </div>

      <div className="flex flex-col gap-5">
        {/* Theme */}
        <Section title="Appearance">
          <div>
            <label className={labelCls}>Theme</label>
            <div className="flex gap-1.5">
              {(['system', 'light', 'dark'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => updateSettings({ theme: t })}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium border transition-colors capitalize ${
                    settings.theme === t
                      ? 'bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 border-transparent'
                      : 'border-zinc-200 dark:border-zinc-700 text-zinc-500 dark:text-zinc-400'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>
        </Section>

        {/* Platforms */}
        <Section title="Platforms">
          <p className="text-xs text-zinc-400 mb-3">Controls which "Open in…" buttons appear on item detail pages.</p>
          <Toggle
            label="Spotify"
            checked={settings.platforms.spotify}
            onChange={(v) => updateSettings({ platforms: { ...settings.platforms, spotify: v } })}
          />
          <Toggle
            label="Apple Music"
            checked={settings.platforms.apple_music}
            onChange={(v) => updateSettings({ platforms: { ...settings.platforms, apple_music: v } })}
          />
        </Section>

        {/* API Keys */}
        <Section title="API Keys">
          <div>
            <label className={labelCls}>Last.fm API Key</label>
            <input
              value={settings.lastfmApiKey}
              onChange={(e) => updateSettings({ lastfmApiKey: e.target.value })}
              placeholder="Enter your Last.fm API key"
              type="password"
              className={inputCls}
            />
            <p className="text-xs text-zinc-400 mt-1.5">
              Used to fetch Last.fm links. Stored locally, never sent anywhere except Last.fm directly.
            </p>
          </div>
        </Section>

        {/* Lists management */}
        <Section title="Lists">
          <div className="flex flex-col gap-2 mb-3">
            {lists.map((list) => (
              <div key={list.id} className="flex items-center justify-between">
                <span className="text-sm text-zinc-700 dark:text-zinc-300">{list.name}</span>
                {list.isBuiltIn ? (
                  <span className="text-xs text-zinc-400">built-in</span>
                ) : (
                  <button
                    onClick={() => deleteList(list.id)}
                    className="text-xs text-red-400 hover:text-red-500 transition-colors"
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              placeholder="New list name…"
              onKeyDown={(e) => e.key === 'Enter' && addNewList()}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={addNewList}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Add
            </button>
          </div>
        </Section>

        {/* Tags management */}
        <Section title="Tags">
          <div className="flex flex-wrap gap-2 mb-3">
            {tags.length === 0 && <p className="text-sm text-zinc-400">No tags yet.</p>}
            {tags.map((tag) => (
              <div key={tag.id} className="group flex items-center gap-1">
                {editingTagId === tag.id ? (
                  <div className="flex items-center gap-1.5">
                    <input
                      value={tag.name}
                      onChange={(e) => updateTag(tag.id, { name: e.target.value })}
                      className="text-xs px-2 py-1 border border-zinc-200 dark:border-zinc-700 rounded-lg bg-transparent text-zinc-900 dark:text-zinc-100 focus:outline-none w-24"
                      autoFocus
                    />
                    <input
                      type="color"
                      value={tag.color}
                      onChange={(e) => updateTag(tag.id, { color: e.target.value })}
                      className="w-6 h-6 rounded cursor-pointer border-0"
                    />
                    <button onClick={() => setEditingTagId(null)} className="text-xs text-zinc-400">✓</button>
                    <button onClick={() => deleteTag(tag.id)} className="text-xs text-red-400">×</button>
                  </div>
                ) : (
                  <button onClick={() => setEditingTagId(tag.id)}>
                    <TagChip tag={tag} clickable={false} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input
              value={newTagName}
              onChange={(e) => setNewTagName(e.target.value)}
              placeholder="New tag name…"
              onKeyDown={(e) => e.key === 'Enter' && addNewTag()}
              className={`${inputCls} flex-1`}
            />
            <button
              onClick={addNewTag}
              className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
            >
              Add
            </button>
          </div>
        </Section>

        {/* Data */}
        <Section title="Data">
          <div className="flex flex-col gap-3">
            <button
              onClick={handleExport}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <span>Export as JSON</span>
              <span className="text-zinc-400">↓</span>
            </button>

            <div>
              <label className={labelCls}>Import from file</label>
              <label className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors cursor-pointer">
                <span>Choose JSON file…</span>
                <span className="text-zinc-400">↑</span>
                <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
              </label>
            </div>

            <div>
              <label className={labelCls}>Or paste JSON</label>
              <textarea
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                placeholder="Paste exported JSON here…"
                rows={3}
                className={`${inputCls} resize-none`}
              />
              {importError && <p className="text-xs text-red-400 mt-1">{importError}</p>}
              {importSuccess && <p className="text-xs text-emerald-400 mt-1">Imported successfully!</p>}
              <button
                onClick={handleImport}
                disabled={!importText.trim()}
                className="mt-2 w-full py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm text-zinc-600 dark:text-zinc-300 disabled:opacity-40 hover:bg-zinc-50 dark:hover:bg-zinc-800 transition-colors"
              >
                Import
              </button>
            </div>

            <button
              onClick={handleClear}
              className="flex items-center justify-between w-full px-4 py-3 rounded-xl border border-red-200 dark:border-red-900/50 text-sm text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            >
              <span>Clear all data</span>
              <span>⚠</span>
            </button>
          </div>
        </Section>

        <p className="text-xs text-zinc-400 text-center pb-2">
          Crate · All data stored locally on your device
        </p>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4">
      <h2 className="text-xs text-zinc-400 uppercase tracking-wider mb-4">{title}</h2>
      <div className="flex flex-col gap-4">{children}</div>
    </div>
  )
}

function Toggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm text-zinc-700 dark:text-zinc-300">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`relative w-11 h-6 rounded-full transition-colors ${checked ? 'bg-zinc-900 dark:bg-zinc-100' : 'bg-zinc-200 dark:bg-zinc-700'}`}
      >
        <span
          className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white dark:bg-zinc-900 shadow transition-transform ${checked ? 'translate-x-5' : ''}`}
        />
      </button>
    </div>
  )
}

const inputCls =
  'w-full bg-zinc-50 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-colors'

const labelCls = 'text-xs text-zinc-400 mb-1.5 block'
