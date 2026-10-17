import { BarChart3, Clock, Film, HardDrive, Send } from 'lucide-react'
import { animate, motion, useReducedMotion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import type { InsightsReport, Tag, Video } from '../../../shared/api'
import { formatDuration, formatSize, stripExtension } from '../lib/format'
import { useT } from '../lib/i18n'
import { spring } from '../lib/motion'
import { useStore } from '../lib/store'
import { TagSticker } from './TagSticker'
import { DialogHeader, Modal } from './ui'

/** Sayaçların sıfırdan hedefe sayma süresi. */
const COUNT_DURATION = 0.9
const COUNT_EASE = [0.16, 1, 0.3, 1] as const

/** Bölümler sırayla belirsin diye her birine artan bir gecikme verilir. */
const step = (index: number): number => 0.05 + index * 0.07

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
          <Metric
            index={0}
            icon={Film}
            color="var(--color-sticker-yellow)"
            label={t('stats.videos')}
            value={totals?.videos ?? 0}
            format={countFormat}
            ready={!!report}
          />
          <Metric
            index={1}
            icon={HardDrive}
            color="var(--color-sticker-blue)"
            label={t('stats.size')}
            value={totals?.bytes ?? 0}
            format={formatSize}
            ready={!!report}
          />
          <Metric
            index={2}
            icon={Clock}
            color="var(--color-sticker-purple)"
            label={t('stats.duration')}
            value={totals?.durationMs ?? 0}
            format={(ms) => longDuration(t, ms)}
            ready={!!report}
          />
          <Metric
            index={3}
            icon={Send}
            color="var(--color-sticker-green)"
            label={t('stats.sends')}
            value={totals?.sends ?? 0}
            format={countFormat}
            ready={!!report}
          />
        </div>

        <Panel index={4} title={t('stats.added')}>
          <div className="flex h-[108px] items-end gap-1.5">
            {(report?.months ?? PLACEHOLDER_MONTHS).map((month, index) => (
              <Bar
                key={month.month}
                added={month.added}
                peak={peak}
                index={index}
                last={index === 11}
                label={monthLabel(month.month, language)}
              />
            ))}
          </div>
        </Panel>

        <div className="grid items-start gap-3 md:grid-cols-2">
          <Panel index={5} title={t('stats.topSent')}>
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

          <Panel index={6} title={t('stats.chips')}>
            {report && report.topTags.length === 0 ? (
              <Empty text={t('stats.noChips')} />
            ) : (
              <div className="flex flex-col gap-[7px]">
                {report?.topTags.map((entry, index) => {
                  const tag = byId.get(entry.id)
                  if (!tag) return null
                  return (
                    <TagRow
                      key={entry.id}
                      tag={tag}
                      count={entry.count}
                      peak={topTagPeak}
                      index={index}
                    />
                  )
                })}
                {!!report?.untagged && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="pt-0.5 text-[12px] text-dim"
                  >
                    {t('stats.untagged', { count: report.untagged })}
                  </motion.div>
                )}
              </div>
            )}
          </Panel>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <Fact
            index={7}
            label={t('stats.largest')}
            value={report?.records.largest ? stripExtension(report.records.largest.name) : '—'}
            note={report?.records.largest ? formatSize(report.records.largest.size) : ''}
          />
          <Fact
            index={8}
            label={t('stats.longest')}
            value={report?.records.longest ? stripExtension(report.records.longest.name) : '—'}
            note={report?.records.longest ? formatDuration(report.records.longest.durationMs) : ''}
          />
          <Fact
            index={9}
            label={t('stats.neverSent')}
            value={String(totals?.neverSent ?? 0)}
            note={t('stats.withSound', { count: totals?.withSound ?? 0 })}
          />
        </div>
      </div>
    </>
  )
}

/**
 * Sayıyı sıfırdan hedefe sayarak yazar. Metin doğrudan düğüme yazılır; böylece
 * her karede bileşen yeniden çizilmez.
 */
function Count({
  value,
  format,
  ready
}: {
  value: number
  format(value: number): string
  ready: boolean
}): React.JSX.Element {
  const node = useRef<HTMLSpanElement>(null)
  const still = useReducedMotion()

  useEffect(() => {
    const span = node.current
    if (!span) return
    if (still || !ready) {
      span.textContent = format(ready ? value : 0)
      return
    }
    const controls = animate(0, value, {
      duration: COUNT_DURATION,
      ease: COUNT_EASE,
      onUpdate: (current) => {
        span.textContent = format(current)
      }
    })
    return () => controls.stop()
  }, [value, ready, still, format])

  return <span ref={node} />
}

function Metric({
  index,
  icon: Icon,
  color,
  label,
  value,
  format,
  ready
}: {
  index: number
  icon: typeof Film
  color: string
  label: string
  value: number
  format(value: number): string
  ready: boolean
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 14, scale: 0.94, rotate: index % 2 ? 1.5 : -1.5 }}
      animate={{ opacity: 1, y: 0, scale: 1, rotate: 0 }}
      transition={{ ...spring, delay: step(index) }}
      whileHover={{ y: -3, rotate: index % 2 ? 0.8 : -0.8 }}
      className="group flex flex-col gap-1.5 rounded-[14px] border-2 border-ink bg-surf px-3.5 py-3 shadow-[3px_4px_0_var(--color-ink)]"
    >
      <div className="flex items-center gap-1.5 text-[11.5px] font-bold text-mute">
        <motion.span
          initial={{ rotate: -18, scale: 0.6 }}
          animate={{ rotate: 0, scale: 1 }}
          transition={{ ...spring, delay: step(index) + 0.08 }}
          className="flex"
        >
          <Icon size={13} color={color} />
        </motion.span>
        {label}
      </div>
      <div className="text-[22px] leading-none font-extrabold tabular-nums">
        <Count value={value} format={format} ready={ready} />
      </div>
      {/* Kartın altındaki ince renk şeridi, sayının tonunu tutar. */}
      <motion.span
        initial={{ scaleX: 0 }}
        animate={{ scaleX: 1 }}
        transition={{ ...spring, delay: step(index) + 0.12 }}
        style={{ background: color, transformOrigin: 'left' }}
        className="h-[3px] rounded-full opacity-45 transition-opacity group-hover:opacity-100"
      />
    </motion.div>
  )
}

function Panel({
  index,
  title,
  children
}: {
  index: number
  title: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: step(index) }}
      className="flex flex-col gap-3 rounded-[14px] border-[1.5px] border-line bg-surf/60 px-4 py-3.5"
    >
      <span className="text-[12px] font-bold text-dim">{title}</span>
      {children}
    </motion.div>
  )
}

function Bar({
  added,
  peak,
  index,
  last,
  label
}: {
  added: number
  peak: number
  index: number
  last: boolean
  label: string
}): React.JSX.Element {
  const [hover, setHover] = useState(false)
  return (
    <div
      onPointerEnter={() => setHover(true)}
      onPointerLeave={() => setHover(false)}
      className="flex min-w-0 grow flex-col items-center gap-1.5"
    >
      <motion.span
        animate={{ opacity: hover && added > 0 ? 1 : 0, y: hover ? 0 : 4 }}
        transition={{ duration: 0.14 }}
        className="font-mono text-[10px] font-bold text-text"
      >
        {added}
      </motion.span>
      <motion.div
        initial={{ height: 0 }}
        animate={{
          height: `${Math.max(3, (added / peak) * 72)}px`,
          scaleY: hover && added > 0 ? 1.04 : 1
        }}
        transition={{ ...spring, delay: 0.3 + index * 0.03 }}
        style={{ transformOrigin: 'bottom' }}
        className={`w-full rounded-t-[5px] border-[1.5px] border-ink ${
          added === 0
            ? 'bg-line'
            : last
              ? 'bg-sticker-green'
              : hover
                ? 'bg-sticker-orange'
                : 'bg-sticker-yellow'
        }`}
      />
      <span className={`truncate text-[10px] font-semibold ${last ? 'text-text' : 'text-dim'}`}>
        {label}
      </span>
    </div>
  )
}

function Empty({ text }: { text: string }): React.JSX.Element {
  return <div className="py-4 text-center text-[12.5px] text-dim">{text}</div>
}

/** İlk üç sıraya madalya rengi; gerisi sade kalır. */
const RANK_COLORS = ['var(--color-sticker-yellow)', '#cfd4dc', '#d8a26a']

function SentRow({ video, rank }: { video: Video; rank: number }): React.JSX.Element {
  const t = useT()
  const open = useStore((s) => s.openPlayer)
  const close = useStore((s) => s.setStatsOpen)
  return (
    <motion.button
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: 0.42 + rank * 0.05 }}
      whileHover={{ x: 3 }}
      whileTap={{ scale: 0.98 }}
      onClick={() => {
        close(false)
        open(video.id)
      }}
      className="group flex items-center gap-2.5 text-left"
    >
      <span
        style={{ color: RANK_COLORS[rank - 1] ?? 'var(--color-dim)' }}
        className="w-4 shrink-0 font-mono text-[11px] font-bold"
      >
        {rank}
      </span>
      <motion.div
        whileHover={{ rotate: -3, scale: 1.06 }}
        transition={spring}
        className="h-[30px] w-[48px] shrink-0 overflow-hidden rounded-[7px] border-[1.5px] border-ink bg-ink"
      >
        {video.mediaStatus === 'ready' && (
          <img
            src={window.api.thumbUrl(video)}
            alt=""
            draggable={false}
            className="size-full object-cover"
          />
        )}
      </motion.div>
      <span className="min-w-0 grow truncate text-[13px] font-semibold group-hover:text-sticker-yellow">
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
  peak,
  index
}: {
  tag: Tag
  count: number
  peak: number
  index: number
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, x: 8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ ...spring, delay: 0.46 + index * 0.05 }}
      className="flex items-center gap-2.5"
    >
      <div className="w-[108px] shrink-0">
        <TagSticker tag={tag} size="sm" tilt={0} />
      </div>
      <div className="h-[10px] grow overflow-hidden rounded-full border-[1.5px] border-ink bg-bg">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${(count / peak) * 100}%` }}
          transition={{ ...spring, delay: 0.52 + index * 0.05 }}
          style={{ background: tag.color }}
          className="h-full"
        />
      </div>
      <span className="w-6 shrink-0 text-right font-mono text-[11px] text-mute tabular-nums">
        <Count value={count} format={countFormat} ready />
      </span>
    </motion.div>
  )
}

function Fact({
  index,
  label,
  value,
  note
}: {
  index: number
  label: string
  value: string
  note: string
}): React.JSX.Element {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ ...spring, delay: step(index) }}
      whileHover={{ y: -2 }}
      className="flex flex-col gap-0.5 rounded-[14px] border-[1.5px] border-line px-3.5 py-2.5 hover:border-dim"
    >
      <span className="text-[11.5px] font-bold text-dim">{label}</span>
      <span className="truncate text-[13px] font-semibold" title={value}>
        {value}
      </span>
      {note && <span className="font-mono text-[11px] text-mute">{note}</span>}
    </motion.div>
  )
}

const countFormat = (value: number): string => String(Math.round(value))

/** Veri gelmeden önce grafiğin yüksekliği oturmuş olsun diye boş takvim. */
const PLACEHOLDER_MONTHS = Array.from({ length: 12 }, (_, index) => ({
  month: `p${index}`,
  added: 0
}))

/** "3 sa 12 dk" gibi uzun süre; bir saatin altında yalnızca dakika gösterilir. */
function longDuration(t: ReturnType<typeof useT>, ms: number): string {
  const minutes = Math.round(ms / 60000)
  const hours = Math.floor(minutes / 60)
  return hours > 0
    ? t('stats.durationHm', { hours, minutes: minutes % 60 })
    : t('stats.durationM', { minutes })
}

function monthLabel(month: string, language: string): string {
  if (month.startsWith('p')) return ''
  const [year, index] = month.split('-').map(Number)
  return new Intl.DateTimeFormat(language, { month: 'short' }).format(new Date(year, index - 1, 1))
}
