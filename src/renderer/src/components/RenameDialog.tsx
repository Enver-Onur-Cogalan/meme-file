import { PenLine } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useState } from 'react'
import type { Video } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { stripExtension } from '../lib/format'
import { useStore } from '../lib/store'
import { Button, DialogHeader, Modal } from './ui'
import { useT } from '../lib/i18n'

export function RenameDialog(): React.JSX.Element {
  const renameId = useStore((s) => s.renameId)
  const video = useStore((s) => s.videos.find((v) => v.id === s.renameId))
  const close = (): void => useStore.getState().openRename(null)
  return (
    <Modal open={renameId !== null && !!video} onClose={close} width={500}>
      {video && <RenameBody key={video.id} video={video} onClose={close} />}
    </Modal>
  )
}

function RenameBody({ video, onClose }: { video: Video; onClose(): void }): React.JSX.Element {
  const t = useT()
  const [name, setName] = useState(stripExtension(video.name))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const extension = video.name.slice(stripExtension(video.name).length)

  const save = async (): Promise<void> => {
    if (!name.trim() || saving) return
    setSaving(true)
    try {
      await window.api.renameVideo(video.id, name)
      useStore.getState().showToast(t('rename.done'))
      onClose()
    } catch (e) {
      setError(errorMessage(e, t('rename.failed')))
      setSaving(false)
    }
  }

  return (
    <>
      <DialogHeader icon={PenLine} title={t('rename.title')} onClose={onClose} />
      <div className="flex flex-col gap-3 px-[22px] py-5">
        <div className="flex h-11 items-center rounded-xl border-2 border-text bg-surf px-3.5 text-[15px] font-semibold">
          <input
            autoFocus
            onFocus={(event) => event.currentTarget.select()}
            value={name}
            onChange={(event) => {
              setName(event.target.value)
              setError(null)
            }}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void save()
            }}
            className="min-w-0 grow bg-transparent outline-none"
          />
          <span className="text-dim">{extension}</span>
        </div>
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0, x: -6 }}
              animate={{ opacity: 1, height: 'auto', x: [0, -6, 6, -3, 0] }}
              exit={{ opacity: 0, height: 0 }}
              className="text-[13px] font-semibold text-sticker-red"
            >
              {error}
            </motion.div>
          )}
        </AnimatePresence>
        <div className="text-xs text-dim">{t('rename.hint')}</div>
      </div>
      <div className="flex justify-end gap-2.5 border-t-[1.5px] border-line px-[22px] py-4">
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button variant="primary" disabled={!name.trim() || saving} onClick={() => void save()}>
          {t('common.save')}
        </Button>
      </div>
    </>
  )
}
