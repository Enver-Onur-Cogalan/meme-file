import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface MenuItem {
  label: string
  icon: LucideIcon
  onSelect(): void
  hint?: string
  danger?: boolean
  separatorBefore?: boolean
}

export interface MenuState {
  x: number
  y: number
  items: MenuItem[]
}

export function ContextMenu({
  menu,
  onClose
}: {
  menu: MenuState | null
  onClose(): void
}): React.JSX.Element {
  const ref = useRef<HTMLDivElement>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })

  useLayoutEffect(() => {
    if (!menu || !ref.current) return
    const { width, height } = ref.current.getBoundingClientRect()
    setPosition({
      x: Math.min(menu.x, window.innerWidth - width - 8),
      y: Math.min(menu.y, window.innerHeight - height - 8)
    })
  }, [menu])

  useEffect(() => {
    if (!menu) return
    const close = (): void => onClose()
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('mousedown', close)
    window.addEventListener('blur', close)
    window.addEventListener('keydown', onKey)
    return () => {
      window.removeEventListener('mousedown', close)
      window.removeEventListener('blur', close)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu, onClose])

  return (
    <AnimatePresence>
      {menu && (
        <motion.div
          ref={ref}
          role="menu"
          initial={{ opacity: 0, scale: 0.9, rotate: -2 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          exit={{ opacity: 0, scale: 0.95, transition: { duration: 0.1 } }}
          transition={{ type: 'spring', stiffness: 600, damping: 32 }}
          style={{ left: position.x, top: position.y, transformOrigin: 'top left' }}
          onMouseDown={(event) => event.stopPropagation()}
          className="fixed z-[70] flex min-w-[210px] flex-col rounded-[14px] border-2 border-text bg-bg p-1.5 shadow-[5px_6px_0_var(--color-ink)]"
        >
          {menu.items.map((item) => (
            <div key={item.label}>
              {item.separatorBefore && <div className="mx-2 my-1 h-px bg-line" />}
              <button
                role="menuitem"
                onClick={() => {
                  onClose()
                  item.onSelect()
                }}
                className={`flex h-9 w-full items-center gap-2.5 rounded-[9px] px-2.5 text-left text-[13.5px] font-semibold hover:bg-surf ${
                  item.danger ? 'text-sticker-red' : 'text-text'
                }`}
              >
                <item.icon size={15} />
                <span className="grow">{item.label}</span>
                {item.hint && <span className="font-mono text-[11px] text-dim">{item.hint}</span>}
              </button>
            </div>
          ))}
        </motion.div>
      )}
    </AnimatePresence>
  )
}
