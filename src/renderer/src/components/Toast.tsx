import { Check, X } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'

export interface ToastMessage {
  id: number
  text: string
  ok: boolean
}

export function Toast({ message }: { message: ToastMessage | null }): React.JSX.Element {
  return (
    <div className="pointer-events-none absolute bottom-6 left-1/2 z-50 -translate-x-1/2">
      <AnimatePresence mode="popLayout">
        {message && (
          <motion.div
            key={message.id}
            // Çıkartma gibi "yapışma" hissi: büyükten küçüğe, hafif dönerek oturur.
            initial={{ opacity: 0, scale: 1.6, rotate: -12, y: -10 }}
            animate={{ opacity: 1, scale: 1, rotate: -2, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 520, damping: 22 }}
            className={`flex h-11 items-center gap-2 rounded-full border-2 border-ink px-5 text-[15px] font-extrabold text-ink shadow-[3px_4px_0_var(--color-ink)] ${
              message.ok ? 'bg-sticker-green' : 'bg-sticker-red'
            }`}
          >
            {message.ok ? <Check size={18} strokeWidth={3} /> : <X size={18} strokeWidth={3} />}
            <span>{message.text}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
