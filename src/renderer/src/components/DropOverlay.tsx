import { FolderPlus, Download } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useT } from '../lib/i18n'
import { bouncy } from '../lib/motion'
import { useStore } from '../lib/store'
import { folderName } from '../lib/format'
import { Button } from './ui'

/** Pencereye video sürüklenince çıkan kaplama. */
export function DropOverlay({
  visible,
  onAddFolder
}: {
  visible: boolean
  onAddFolder(): void
}): React.JSX.Element {
  const t = useT()
  const folders = useStore((s) => s.folders)
  const settings = useStore((s) => s.settings)
  const target =
    folders.find((folder) => folder.id === settings?.importFolderId) ?? folders[0] ?? null

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="pointer-events-none absolute inset-0 z-[55] flex items-center justify-center bg-veil p-10"
        >
          <motion.div
            initial={{ scale: 0.9, rotate: -2, y: 16 }}
            animate={{ scale: 1, rotate: 0, y: 0 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={bouncy}
            className="flex w-full max-w-[620px] flex-col items-center gap-4 rounded-[24px] border-[3px] border-dashed border-accent bg-bg/60 px-10 py-12 text-center"
          >
            <motion.div
              animate={{ y: [0, -8, 0] }}
              transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
              className="flex size-20 items-center justify-center rounded-3xl border-2 border-ink bg-accent text-ink shadow-[4px_5px_0_var(--color-ink)]"
            >
              {target ? (
                <Download size={38} strokeWidth={2.25} />
              ) : (
                <FolderPlus size={38} strokeWidth={2.25} />
              )}
            </motion.div>
            {target ? (
              <>
                <div className="text-2xl font-extrabold">{t('import.dropTitle')}</div>
                <div className="text-sm text-mute">
                  {t('import.dropSubtitle', { folder: folderName(target.path) })}
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-extrabold">{t('import.noFolderTitle')}</div>
                <div className="text-sm text-mute">{t('import.noFolderText')}</div>
                <div className="pointer-events-auto">
                  <Button variant="primary" icon={FolderPlus} onClick={onAddFolder}>
                    {t('nav.addFolder')}
                  </Button>
                </div>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
