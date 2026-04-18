import { useMemo } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell } from 'recharts'
import { useCrateStore } from '../store'
import type { ListenStatus } from '../types'
import { LISTEN_STATUS_LABELS, ITEM_TYPE_LABELS } from '../types'

const STATUS_COLORS: Record<ListenStatus, string> = {
  unlistened: '#71717a',
  in_progress: '#f59e0b',
  listened: '#22c55e',
  want_to_revisit: '#a78bfa',
}

export function StatsView() {
  const { items, tags } = useCrateStore()

  const byType = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      counts[item.type] = (counts[item.type] ?? 0) + 1
    }
    return Object.entries(counts).map(([type, count]) => ({
      name: ITEM_TYPE_LABELS[type as keyof typeof ITEM_TYPE_LABELS],
      value: count,
    }))
  }, [items])

  const byStatus = useMemo(() => {
    const counts: Record<string, number> = {
      unlistened: 0, in_progress: 0, listened: 0, want_to_revisit: 0,
    }
    for (const item of items) counts[item.listenStatus]++
    return Object.entries(counts).map(([status, count]) => ({
      name: LISTEN_STATUS_LABELS[status as ListenStatus],
      value: count,
      status,
    }))
  }, [items])

  const byMonth = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      const month = item.dateAdded.slice(0, 7)
      counts[month] = (counts[month] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-12)
      .map(([month, count]) => ({
        name: new Date(month + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count,
      }))
  }, [items])

  const topTags = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      for (const tid of item.tagIds) counts[tid] = (counts[tid] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([id, count]) => ({
        tag: tags.find((t) => t.id === id),
        count,
      }))
      .filter((x) => x.tag)
  }, [items, tags])

  const topRecommenders = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const item of items) {
      if (item.recommendedBy) counts[item.recommendedBy] = (counts[item.recommendedBy] ?? 0) + 1
    }
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
  }, [items])

  const stagger = { visible: { transition: { staggerChildren: 0.05 } } }
  const card = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } }

  return (
    <div className="flex flex-col min-h-full px-4 pt-14 pb-28 md:pt-8 md:pb-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-zinc-900 dark:text-zinc-100 tracking-tight">Stats</h1>
        <p className="text-sm text-zinc-400 mt-1">{items.length} items in your crate</p>
      </div>

      {items.length === 0 ? (
        <div className="text-center pt-16">
          <p className="text-4xl mb-3">📊</p>
          <p className="text-zinc-400 text-sm">Add some items to see stats</p>
        </div>
      ) : (
        <motion.div className="flex flex-col gap-5" variants={stagger} initial="hidden" animate="visible">
          {/* By type */}
          <motion.div variants={card} className={cardCls}>
            <h2 className={headingCls}>By type</h2>
            <div className="flex gap-3">
              {byType.map(({ name, value }) => (
                <div key={name} className="flex-1 text-center">
                  <p className="text-2xl font-bold text-zinc-900 dark:text-zinc-100">{value}</p>
                  <p className="text-xs text-zinc-400 mt-0.5">{name}s</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* By status */}
          <motion.div variants={card} className={cardCls}>
            <h2 className={headingCls}>By status</h2>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={byStatus} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 10, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                <Bar dataKey="value" radius={[6, 6, 0, 0]}>
                  {byStatus.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status as ListenStatus]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </motion.div>

          {/* Added per month */}
          {byMonth.length > 1 && (
            <motion.div variants={card} className={cardCls}>
              <h2 className={headingCls}>Added per month</h2>
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={byMonth} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 9, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: '#a1a1aa' }} axisLine={false} tickLine={false} />
                  <Bar dataKey="count" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </motion.div>
          )}

          {/* Top tags */}
          {topTags.length > 0 && (
            <motion.div variants={card} className={cardCls}>
              <h2 className={headingCls}>Top tags</h2>
              <div className="flex flex-col gap-2">
                {topTags.map(({ tag, count }) => (
                  <div key={tag!.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: tag!.color }} />
                      <span className="text-sm text-zinc-700 dark:text-zinc-300">{tag!.name}</span>
                    </div>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{count}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* Top recommenders */}
          {topRecommenders.length > 0 && (
            <motion.div variants={card} className={cardCls}>
              <h2 className={headingCls}>Top recommenders</h2>
              <div className="flex flex-col gap-2">
                {topRecommenders.map(([name, count]) => (
                  <div key={name} className="flex items-center justify-between">
                    <span className="text-sm text-zinc-700 dark:text-zinc-300">{name}</span>
                    <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">{count}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  )
}

const cardCls = 'bg-white/60 dark:bg-zinc-900/60 backdrop-blur-sm border border-zinc-200/60 dark:border-zinc-800/60 rounded-2xl p-4'
const headingCls = 'text-xs text-zinc-400 uppercase tracking-wider mb-3'
