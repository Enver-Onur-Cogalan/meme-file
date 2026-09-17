import { Tag as TagFallback, X } from 'lucide-react'
import { motion, type HTMLMotionProps } from 'motion/react'
import { createElement } from 'react'
import type { Tag } from '../../../shared/api'
import { LUCIDE_ICONS } from '../lib/icons'
import { AnimatedNumber } from './ui'

export function TagIcon({
  icon,
  size,
  color,
  strokeWidth = 2.25
}: {
  icon: string
  size: number
  color: string
  strokeWidth?: number
}): React.JSX.Element {
  if (icon.startsWith('custom:')) {
    return (
      <img
        src={window.api.iconUrl(icon.slice(7))}
        alt=""
        draggable={false}
        style={{ width: size, height: size }}
        className="shrink-0 object-contain"
      />
    )
  }
  return createElement(LUCIDE_ICONS.get(icon.slice(7)) ?? TagFallback, {
    size,
    color,
    strokeWidth,
    className: 'shrink-0'
  })
}

interface StickerProps extends Omit<HTMLMotionProps<'div'>, 'children'> {
  tag: Pick<Tag, 'name' | 'color' | 'icon'> & { count?: number }
  size?: 'sm' | 'md' | 'lg'
  count?: boolean
  onRemove?: () => void
  hotkey?: string
  off?: boolean
  tilt?: number
}

export function TagSticker({
  tag,
  size = 'sm',
  count = false,
  onRemove,
  hotkey,
  off = false,
  tilt = 0,
  className = '',
  ...rest
}: StickerProps): React.JSX.Element {
  const dims = {
    sm: { h: 24, font: 11.5, icon: 12, pl: 7 },
    md: { h: 30, font: 13, icon: 15, pl: 9 },
    lg: { h: 42, font: 18, icon: 20, pl: 13 }
  }[size]
  const trailing = count || onRemove || hotkey
  return (
    <motion.div
      style={{
        height: dims.h,
        paddingLeft: dims.pl,
        paddingRight: trailing ? 4 : dims.pl + 3,
        fontSize: dims.font,
        rotate: tilt,
        background: off ? 'transparent' : tag.color
      }}
      className={`flex max-w-full shrink-0 items-center gap-[5px] rounded-full border-[1.5px] font-bold whitespace-nowrap select-none ${
        off ? 'border-dashed border-dim text-mute' : 'border-ink text-ink'
      } ${className}`}
      {...rest}
    >
      {hotkey && (
        <span
          style={{ color: off ? undefined : tag.color }}
          className={`flex size-[18px] items-center justify-center rounded-[5px] font-mono text-[11px] ${off ? 'bg-surf' : 'bg-ink'}`}
        >
          {hotkey}
        </span>
      )}
      <TagIcon
        icon={tag.icon}
        size={dims.icon}
        color={off ? 'var(--color-mute)' : 'var(--color-ink)'}
      />
      <span className="truncate">{tag.name}</span>
      {count && tag.count !== undefined && (
        <span
          style={{ color: tag.color }}
          className="flex h-5 items-center rounded-full bg-ink px-1.5 font-mono text-[11px] font-medium"
        >
          <AnimatedNumber value={tag.count} />
        </span>
      )}
      {onRemove && (
        <button
          type="button"
          aria-label={`${tag.name} chip'ini kaldır`}
          onClick={(event) => {
            event.stopPropagation()
            onRemove()
          }}
          className="flex size-5 items-center justify-center rounded-full bg-ink transition-transform hover:scale-110"
        >
          <X size={11} strokeWidth={2.5} color={tag.color} />
        </button>
      )}
      {hotkey && !count && !onRemove && <span className="w-1.5" />}
    </motion.div>
  )
}
