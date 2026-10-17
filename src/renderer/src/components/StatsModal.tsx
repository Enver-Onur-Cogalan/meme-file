import { BarChart3, Clock, Film, HardDrive, Send } from 'lucide-react'
import { motion } from 'motion/react'
import { useEffect, useState } from 'react'
import type { InsightsReport, Tag, Video } from '../../../shared/api'
import { formatDuration, formatSize, stripExtension } from '../lib/format'
import { useT } from '../lib/i18n'
import { spring } from '../lib/motion'
import { useStore } from '../lib/store'
import { TagSticker } from './TagSticker'
import { AnimatedNumber, DialogHeader, Modal } from './ui'

export function StatsModal(): React.JSX.Element {
  const open = useStore((s) => s.statsOpen)
  const close = useStore((s) => s.setStatsOpen)
  return (
    <Modal open={open} onClose={() => close(false)} width={880}>
      {open && <StatsBody onClose={() => close(false)} />}
    </Modal>
  )
}

function StatsBody({ onClose }: { onClose(): void }): React.JSX.Element {
  const t = useT()
  const language = useStore((s) => s.language)
  const tags = useStore((s) => s.tags)
  const [report, setReport] = useState<InsightsReport | null>(null)

  useEffect(() => {
    let alive = true
    void window.api.getInsights().then((result) => {
      if (alive) setReport(result)
    })
    return () => {
      alive = false
    }
  }, [])

  const totals = report?.totals
  const peak = Math.max(1, ...(report?.months.map((month) => month.added) ?? [0]))
  const topTagPeak = Math.max(1, ...(report?.topTags.map((tag) => tag.count) ?? [0]))
  const byId = new Map(tags.map((tag) => [tag.id, tag]))

  return (
    <>
      <DialogHeader
        icon={BarChart3}
        title={t('stats.title')}
        subtitle={t('stats.subtitle')}
        onClose={onClose}
      />
      <div className="flex min-h-[260px] flex-col gap-5 overflow-y-auto px-[22px] py-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Metric icon={Film} color="var(--color-sticker-yellow)" label={t('stats.videos')}>
            <AnimatedNumber value={totals?.videos ?? 0} />
          </Metric>
          <Metric icon={HardDrive} color="var(--color-sticker-blue)" label={t('stats.size')}>
            {formatSize(totals?.bytes ?? 0)}
          </Metric>
          <Metric icon={Clock} color="var(--color-sticker-purple)" label={t('stats.duration')}>
            {longDuration(t, totals?.durationMs ?? 0)}
          </Metric>
          <Metric icon={Send} color="var(--color-sticker-green)" label={t('stats.sends')}>
            <AnimatedNumber value={totals?.sends ?? 0} />
          </Metric>
        </div>

        <Panel title={t('stats.added')}>
          <div className="flex h-[108px] items-end gap-1.5">
            {(report?.months ?? []).map((month, index) => (
              <div key={month.month} className="flex min-w-0 grow flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${Math.max(3, (month.added / peak) * 84)}px` }}
                  transition={{ ...spring, delay: index * 0.025 }}
                  title={`${month.added}`}
                  className={`w-full rounded-t-[5px] border-[1.5px] border-ink ${
                    month.added > 0 ? 'bg-sticker-yellow' : 'bg-line'
                  }`}
                />
                <span className="truncate text-[10px] font-semibold text-dim">
                  {monthLabel(month.month, language)}
                </span>
              </div>
            ))}
          </div>
        </Panel>

        <div className="grid items-start gap-3 md:grid-cols-2">
          <Panel title={t('stats.topSent')}>
            {report && report.topSent.length === 0 ? (
              <Empty text={t('stats.noSends')} />
            ) : (
              <div className="flex flex-col gap-2">
                {report?.topSent.map((video, index) => (
                  <SentRow key={video.id} video={video} rank={index + 1} />
                ))}
              </div>
            )}
          </Panel>

          <Panel title={t('stats.chips')}>
            {report && report.topTags.length === 0 ? (
              <Empty text={t('stats.noChips')} />
            ) : (
              <div className="flex flex-col gap-[7px]">
                {report?.topTags.map((entry) => {
                  const tag = byId.get(entry.id)
                  if (!tag) return null
                  return <TagRow key={entry.id} tag={tag} count={entry.count} peak={topTagPeak} />
                })}
                {!!report?.untagged && (
                  <div className="pt-0.5 text-[12px] text-dim">
                    {t('stats.untagged', { count: report.untagged })}
                  </div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Fact
            label={t('stats.largest')}
            value={report?.records.largest ? stripExtension(report.records.largest.name) : '—'}
            note={report?.records.largest ? formatSize(report.records.largest.size) : ''}
          />
          <Fact
            label={t('stats.longest')}
            value={report?.records.longest ? stripExtension(report.records.longest.name) : '—'}
            note={report?.records.longest ? formatDuration(report.records.longest.durationMs) : ''}
          />
          <Fact
            label={t('stats.neverSent')}
            value={String(totals?.neverSent ?? 0)}
            note={t('stats.withSound', { count: totals?.withSound ?? 0 })}
          />
        </div>
      </div>
    </>
  )
}

function Metric({
  icon: Icon,
  color,
  label,
  children
}: {
  icon: typeof Film
  color: string
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8, rotate: -1.5 }}
      animate={{ opacity: 1, y: 0, rotate: 0 }}
      transition={spring}
      className="flex flex-col gap-1.5 rounded-[14px] border-2 border-ink bg-surf px-3.5 py-3 shadow-[3px_4px_0_var(--color-ink)]"
    >
      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute">
        <Icon size={13} color={color} />
        {label}
      </div>
      <div className="text-[22px] leading-none font-extrabold">{children}</div>
    </motion.div>
  )
}

function Panel({
  title,
  children
}: {
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-line bg-surf/60 px-4 py-3.5">
      <span className="text-[12px] font-bold text-dim">{title}</span>
      {children}
    </div>
  )
}

function Empty({ text }: { text: string }): React.JSX.Element {
  return <div className="py-4 text-center text-[12.5px] text-dim">{text}</div>
}

function SentRow({ video, rank }: { video: Video; rank: number }): React.JSX.Element {
  const t = useT()
  const open = useStore((s) => s.openPlayer)
  const close = useStore((s) => s.setStatsOpen)
  return (
    <motion.button
      whileHover={{ x: 2 }}
      onClick={() => {
        close(false)
        open(video.id)
      }}
      className="flex items-center gap-2.5 text-left"
    >
      <span className="w-4 shrink-0 font-mono text-[11px] text-dim">{rank}</span>
      <div className="h-[30px] w-[48px] shrink-0 overflow-hidden rounded-[7px] border-[1.5px] border-ink bg-ink">
        {video.mediaStatus === 'ready' && (
          <img
            src={window.api.thumbUrl(video)}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        )}
      </div>
      <span className="min-w-0 grow truncate text-[13px] font-semibold">
        {stripExtension(video.name)}
      </span>
      <span className="shrink-0 text-[11.5px] font-bold text-mute">
        {t('stats.sendCount', { count: video.sendCount })}
      </span>
    </motion.button>
  )
}

function TagRow({
  tag,
  count,
  peak
}: {
  tag: Tag
  count: number
  peak: number
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-2.5">
      <div className="w-[108px] shrink-0">
        <TagSticker tag={tag} size="sm" tilt={0} />
      </div>
      <div className="h-[10px] grow overflow-hidden rounded-full border-[1.5px] border-ink bg-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(count / peak) * 100}%` }}
          transition={spring}
          style={{ background: tag.color }}
          className="h-full"
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-mute">{count}</span>
    </div>
  )
}

function Fact({
  label,
  value,
  note
}: {
  label: string
  value: string
  note: string
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-0.5 rounded-[14px] border-[1.5px] border-line px-3.5 py-2.5">
      <span className="text-[11.5px] font-bold text-dim">{label}</span>
      <span className="truncate text-[13px] font-semibold" title={value}>
        {value}
      </span>
      {note && <span className="font-mono text-[11px] text-mute">{note}</span>}
    </div>
  )
}

/** "3 sa 12 dk" gibi uzun süre; bir saatin altında yalnızca dakika gösterilir. */
function longDuration(t: ReturnType<typeof useT>, ms: number): string {
  const minutes = Math.round(ms / 60000)
  const hours = Math.floor(minutes / 60)
  return hours > 0
    ? t('stats.durationHm', { hours, minutes: minutes % 60 })
    : t('stats.durationM', { minutes })
}

function monthLabel(month: string, language: string): string {
  const [year, index] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(year, index - 1, 1))
}
