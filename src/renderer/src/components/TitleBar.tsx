import { Download, RotateCw } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useStore } from '../lib/store'
import { AppLogo } from './AppLogo'

export function TitleBar(): React.JSX.Element {
  const isMac = window.api.platform === 'darwin'
  const update = useStore((s) => s.update)
  return (
    <div className="drag-region flex h-9 shrink-0 items-center bg-side">
      <div
        className={`flex items-center gap-2 text-[13px] font-extrabold ${isMac ? 'pl-20' : 'pl-3.5'}`}
      >
        <AppLogo size={20} />
        <span>meme file</span>
      </div>
      <span className="grow" />
      {/* Windows'ta sağdaki pencere butonları için boşluk bırakılır. */}
      <div className={`no-drag flex items-center ${isMac ? 'pr-3' : 'pr-[150px]'}`}>
        <AnimatePresence>
          {update.state === 'downloading' && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex h-6 items-center gap-1.5 text-xs font-semibold text-mute"
              title={`Sürüm ${update.version} indiriliyor`}
            >
              <Download size={13} />
              Güncelleme indiriliyor %{Math.round((update.percent ?? 0) * 100)}
            </motion.div>
          )}
          {update.state === 'ready' && (
            <motion.button
              initial={{ opacity: 0, scale: 0.5, rotate: -12 }}
              animate={{ opacity: 1, scale: 1, rotate: -2 }}
              exit={{ opacity: 0, scale: 0.8 }}
              whileHover={{ rotate: 0, y: -1 }}
              whileTap={{ scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 500, damping: 16 }}
              onClick={() => window.api.installUpdate()}
              className="flex h-[26px] items-center gap-1.5 rounded-full border-[1.5px] border-ink bg-sticker-green px-3 text-xs font-extrabold text-ink shadow-[2px_2px_0_var(--color-ink)]"
            >
              <RotateCw size={13} strokeWidth={2.5} />
              {update.version} hazır · Yeniden başlat
            </motion.button>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
