import { AlertTriangle } from 'lucide-react'
import { motion } from 'motion/react'
import { useStore } from '../lib/store'
import { Button, Modal } from './ui'
import { useT } from '../lib/i18n'

export function ConfirmDialog(): React.JSX.Element {
  const request = useStore((s) => s.confirmRequest)
  const resolve = useStore((s) => s.resolveConfirm)
  const t = useT()
  return (
    <Modal open={!!request} onClose={() => resolve(false)} width={440}>
      {request && (
        <div
          className="flex flex-col gap-5 p-6"
          onKeyDown={(event) => {
            if (event.key === 'Enter') resolve(true)
          }}
        >
          <div className="flex items-start gap-4">
            <motion.div
              initial={{ rotate: -30, scale: 0.5 }}
              animate={{ rotate: -6, scale: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 12 }}
              className={`flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink text-ink ${
                request.danger ? 'bg-sticker-red' : 'bg-sticker-yellow'
              }`}
            >
              <AlertTriangle size={22} strokeWidth={2.25} />
            </motion.div>
            <div className="flex flex-col gap-1.5">
              <div className="text-lg leading-tight font-extrabold">{request.title}</div>
              <div className="text-sm whitespace-pre-line text-mute">{request.text}</div>
            </div>
          </div>
          <div className="flex justify-end gap-2.5">
            <Button onClick={() => resolve(false)}>{t('common.giveUp')}</Button>
            <Button
              autoFocus
              variant="primary"
              color={request.danger ? 'var(--color-sticker-red)' : undefined}
              onClick={() => resolve(true)}
            >
              {request.confirmLabel}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
