import { Check, Layers, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useRef, useState } from 'react'
import { DISCORD_TARGET_BYTES, type Video } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { formatSize, stripExtension } from '../lib/format'
import { useT } from '../lib/i18n'
import { useStore } from '../lib/store'
import { Button, DialogHeader, Label, Modal, Segmented, Toggle } from './ui'

type BulkTarget = 'discord' | 'large' | 'gif'

const TARGETS: Record<BulkTarget, { bytes: number | null; format: 'mp4' | 'gif' }> = {
  discord: { bytes: DISCORD_TARGET_BYTES, format: 'mp4' },
  large: { bytes: 50 * 1024 * 1024, format: 'mp4' },
  gif: { bytes: null, format: 'gif' }
}

export function BulkClipDialog(): React.JSX.Element {
  const ids = useStore((s) => s.bulkClip)
  const videos = useStore((s) => s.videos)
  const close = useStore((s) => s.closeBulkClip)
  const selected = ids ? videos.filter((video) => ids.includes(video.id)) : []
  return (
    <Modal open={!!ids && selected.length > 0} onClose={close} width={560} closeOnBackdrop={false}>
      {ids && selected.length > 0 && (
        <BulkBody key={ids.join()} videos={selected} onClose={close} />
      )}
    </Modal>
  )
}

function BulkBody({ videos, onClose }: { videos: Video[]; onClose(): void }): React.JSX.Element {
  const t = useT()
  const showToast = useStore((s) => s.showToast)
  const [target, setTarget] = useState<BulkTarget>('discord')
  const [mute, setMute] = useState(false)
  const [running, setRunning] = useState(false)
  const [done, setDone] = useState(0)
  const [ratio, setRatio] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const cancelled = useRef(false)

  useEffect(() => window.api.onClipProgress((progress) => setRatio(progress.ratio)), [])

  const run = async (): Promise<void> => {
    setRunning(true)
    setError(null)
    cancelled.current = false
    const { bytes, format } = TARGETS[target]
    const createdIds: number[] = []
    let totalSize = 0

    for (const [index, video] of videos.entries()) {
      if (cancelled.current) break
      setDone(index)
      setRatio(0)
      try {
        const result = await window.api.createClip({
          videoId: video.id,
          startMs: 0,
          endMs: video.durationMs ?? 0,
          targetBytes: bytes,
          mute: format === 'gif' || mute,
          format,
          // GIF'te uzantı zaten değişiyor, ek gerekmiyor; diğerlerinde hedef adı ekler.
          outputName:
            stripExtension(video.name) +
            (format === 'gif' ? '' : target === 'large' ? '-50mb' : `-${t('clip.suffixDiscord')}`)
        })
        totalSize += result.size
        if (result.videoId) createdIds.push(result.videoId)
      } catch (e) {
        // İptal edilince kalan videolar atlanır; başka hatada kullanıcıya gösterilir.
        if (cancelled.current) break
        setError(errorMessage(e, t('clip.failed')))
        setRunning(false)
        return
      }
    }

    setDone(videos.length)
    const copied = createdIds.length > 0 ? await window.api.copyVideos(createdIds) : false
    setRunning(false)
    if (cancelled.current) {
      showToast(t('bulk.cancelled', { count: createdIds.length }), 'info')
    } else {
      showToast(
        copied
          ? t('bulk.doneCopied', { count: videos.length, size: formatSize(totalSize) })
          : t('bulk.done', { count: videos.length, size: formatSize(totalSize) })
      )
    }
    onClose()
  }

  const cancel = (): void => {
    cancelled.current = true
    window.api.cancelClip()
  }

  return (
    <>
      <DialogHeader
        icon={Layers}
        title={t('bulk.title', { count: videos.length })}
        subtitle={videos.map((video) => stripExtension(video.name)).join(' · ')}
        onClose={() => !running && onClose()}
      />
      <div className="flex flex-col gap-5 px-[22px] py-5">
        <div className="flex flex-col gap-2">
          <Label>{t('clip.targetSize')}</Label>
          <Segmented
            layoutId="bulk-target"
            value={target}
            onChange={setTarget}
            options={[
              { value: 'discord', label: t('clip.discord') },
              { value: 'large', label: '50 MB' },
              { value: 'gif', label: 'GIF' }
            ]}
          />
        </div>

        {target !== 'gif' && (
          <Toggle checked={mute} onChange={setMute} label={t('clip.removeSound')} />
        )}

        <div className="text-[12.5px] text-mute">{t('bulk.hint')}</div>

        <AnimatePresence>
          {running && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col gap-2 overflow-hidden"
            >
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-bold">
                  {t('bulk.progress', {
                    done: Math.min(done + 1, videos.length),
                    total: videos.length
                  })}
                </span>
                <span className="font-mono text-xs text-mute">{Math.round(ratio * 100)}%</span>
              </div>
              <div className="h-3.5 overflow-hidden rounded-full border-2 border-ink bg-surf">
                <motion.div
                  animate={{ width: `${((done + ratio) / videos.length) * 100}%` }}
                  transition={{ type: 'spring', stiffness: 140, damping: 22 }}
                  className="h-full bg-sticker-green"
                />
              </div>
            </motion.div>
          )}
          {error && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-xl border-[1.5px] border-sticker-red bg-sticker-red/10 px-3 py-2 text-[13px] font-semibold text-sticker-red"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="flex items-center justify-end gap-2.5 border-t-[1.5px] border-line px-[22px] py-4">
        {running ? (
          <Button icon={X} onClick={cancel}>
            {t('common.giveUp')}
          </Button>
        ) : (
          <>
            <Button onClick={onClose}>{t('common.cancel')}</Button>
            <Button
              variant="primary"
              icon={Check}
              color="var(--color-sticker-green)"
              onClick={() => void run()}
            >
              {t('clip.createAndCopy')}
            </Button>
          </>
        )}
      </div>
    </>
  )
}
