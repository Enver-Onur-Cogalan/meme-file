import { X } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import { AnimatePresence, motion, type HTMLMotionProps } from 'motion/react'
import { useEffect, type ReactNode } from 'react'
import { bouncy, spring } from '../lib/motion'
import { t } from '../lib/i18n'

interface ButtonProps extends HTMLMotionProps<'button'> {
  icon?: LucideIcon
  variant?: 'primary' | 'secondary' | 'ghost'
  color?: string
  size?: 'md' | 'lg'
}

export function Button({
  icon: Icon,
  variant = 'secondary',
  color = 'var(--color-sticker-yellow)',
  size = 'md',
  className = '',
  children,
  disabled,
  style,
  ...rest
}: ButtonProps): React.JSX.Element {
  const height = size === 'lg' ? 'h-11' : 'h-10'
  if (variant === 'primary') {
    return (
      <motion.button
        whileHover={disabled ? undefined : { y: -1 }}
        whileTap={disabled ? undefined : { y: 2, boxShadow: '1px 1px 0 var(--color-ink)' }}
        disabled={disabled}
        style={{ background: color, ...style }}
        className={`flex ${height} shrink-0 items-center justify-center gap-2 rounded-full border-2 border-ink px-[18px] text-sm font-extrabold whitespace-nowrap text-ink shadow-[3px_4px_0_var(--color-ink)] disabled:opacity-50 ${className}`}
        {...rest}
      >
        {Icon && <Icon size={16} strokeWidth={2.25} />}
        {children as ReactNode}
      </motion.button>
    )
  }
  return (
    <motion.button
      whileTap={disabled ? undefined : { scale: 0.96 }}
      disabled={disabled}
      style={style}
      className={`flex ${height} shrink-0 items-center justify-center gap-2 rounded-full px-3.5 text-[13.5px] font-bold whitespace-nowrap transition-colors disabled:opacity-40 ${
        variant === 'ghost'
          ? 'text-mute hover:bg-surf hover:text-text'
          : 'border-[1.5px] border-line bg-surf text-text hover:border-mute'
      } ${className}`}
      {...rest}
    >
      {Icon && <Icon size={16} />}
      {children as ReactNode}
    </motion.button>
  )
}

export function IconButton({
  icon: Icon,
  label,
  active = false,
  size = 34,
  className = '',
  ...rest
}: HTMLMotionProps<'button'> & {
  icon: LucideIcon
  label: string
  active?: boolean
  size?: number
}): React.JSX.Element {
  return (
    <motion.button
      whileTap={{ scale: 0.9 }}
      title={label}
      aria-label={label}
      style={{ width: size, height: size }}
      className={`flex shrink-0 items-center justify-center rounded-full transition-colors ${
        active ? 'bg-surf text-sticker-yellow' : 'bg-surf text-mute hover:text-text'
      } ${className}`}
      {...rest}
    >
      <Icon size={Math.round(size * 0.46)} strokeWidth={2.25} />
    </motion.button>
  )
}

export function Kbd({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <span className="flex h-5 items-center rounded-[5px] border border-b-2 border-line px-1.5 font-mono text-[11px] whitespace-nowrap text-mute">
      {children}
    </span>
  )
}

export function Label({ children }: { children: ReactNode }): React.JSX.Element {
  return <div className="text-xs font-bold text-dim">{children}</div>
}

export function Toggle({
  checked,
  onChange,
  label
}: {
  checked: boolean
  onChange(checked: boolean): void
  label: ReactNode
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex items-center gap-3 text-left"
    >
      <span
        className={`relative flex h-6 w-[42px] shrink-0 items-center rounded-full border-[1.5px] transition-colors ${
          checked ? 'border-ink bg-sticker-green' : 'border-line bg-surf'
        }`}
      >
        <motion.span
          layout
          transition={bouncy}
          className={`absolute size-[15px] rounded-full ${checked ? 'right-[3px] bg-ink' : 'left-[3px] bg-mute'}`}
        />
      </span>
      <span className="text-sm font-semibold">{label}</span>
    </button>
  )
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  color = 'var(--color-sticker-blue)',
  layoutId
}: {
  value: T
  options: { value: NoInfer<T>; label: ReactNode }[]
  onChange(value: NoInfer<T>): void
  color?: string
  layoutId: string
}): React.JSX.Element {
  return (
    <div className="flex gap-1 rounded-full bg-surf p-1">
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            onClick={() => onChange(option.value)}
            className={`relative flex h-9 grow items-center justify-center rounded-full px-3 text-[13px] font-bold whitespace-nowrap ${
              active ? 'text-ink' : 'text-mute hover:text-text'
            }`}
          >
            {active && (
              <motion.span
                layoutId={layoutId}
                transition={spring}
                style={{ background: color }}
                className="absolute inset-0 rounded-full border-2 border-ink shadow-[2px_3px_0_var(--color-ink)]"
              />
            )}
            <span className="relative">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export function Modal({
  open,
  onClose,
  children,
  width,
  closeOnBackdrop = true
}: {
  open: boolean
  onClose(): void
  children: ReactNode
  width: number
  closeOnBackdrop?: boolean
}): React.JSX.Element {
  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.stopPropagation()
        onClose()
      }
    }
    window.addEventListener('keydown', onKey, true)
    return () => window.removeEventListener('keydown', onKey, true)
  }, [open, onClose])

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="absolute inset-0 z-40 flex items-center justify-center bg-[rgba(12,10,8,0.74)] p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          onMouseDown={(event) => {
            if (closeOnBackdrop && event.target === event.currentTarget) onClose()
          }}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, scale: 0.92, rotate: -2, y: 24 }}
            animate={{ opacity: 1, scale: 1, rotate: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, rotate: 1, y: 12 }}
            transition={{ type: 'spring', stiffness: 420, damping: 30 }}
            style={{ width, maxWidth: '100%' }}
            className="flex max-h-full flex-col overflow-hidden rounded-[20px] border-2 border-text bg-bg shadow-[8px_10px_0_var(--color-ink)]"
          >
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export function DialogHeader({
  icon: Icon,
  title,
  subtitle,
  onClose
}: {
  icon: LucideIcon
  title: string
  subtitle?: string
  onClose(): void
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3 border-b-[1.5px] border-line px-[22px] py-[18px]">
      <motion.div
        initial={{ rotate: -30, scale: 0.6 }}
        animate={{ rotate: -6, scale: 1 }}
        transition={bouncy}
        className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border-[1.5px] border-ink bg-sticker-yellow text-ink"
      >
        <Icon size={18} strokeWidth={2.25} />
      </motion.div>
      <div className="flex min-w-0 grow flex-col gap-0.5">
        <div className="text-xl font-extrabold tracking-[-0.01em]">{title}</div>
        {subtitle && <div className="truncate text-[12.5px] text-mute">{subtitle}</div>}
      </div>
      <IconButton icon={X} label={t('common.close')} onClick={onClose} />
    </div>
  )
}

/** Sayı değişince eski rakam yukarı kayıp yenisi aşağıdan gelir. */
export function AnimatedNumber({
  value,
  className = ''
}: {
  value: number
  className?: string
}): React.JSX.Element {
  return (
    <span className={`relative inline-flex overflow-hidden ${className}`}>
      <AnimatePresence mode="popLayout" initial={false}>
        <motion.span
          key={value}
          initial={{ y: '-100%', opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: '100%', opacity: 0 }}
          transition={spring}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
