import { motion } from 'motion/react'

/** Uygulama ikonunun (build/icon.png) küçük vektör hâli. */
export function AppLogo({ size = 20 }: { size?: number }): React.JSX.Element {
  return (
    <motion.svg
      width={size}
      height={size}
      viewBox="0 0 1024 1024"
      whileHover={{ rotate: -12, scale: 1.1 }}
      transition={{ type: 'spring', stiffness: 500, damping: 12 }}
      aria-hidden
    >
      <g transform="rotate(10 512 512)">
        <rect
          x="212"
          y="130"
          width="620"
          height="620"
          rx="150"
          fill="#5cc3e8"
          stroke="#15130f"
          strokeWidth="60"
        />
      </g>
      <g transform="rotate(-8 512 512)">
        <rect
          x="138"
          y="208"
          width="640"
          height="640"
          rx="160"
          fill="#f5c542"
          stroke="#15130f"
          strokeWidth="60"
        />
        <path
          d="M 378 398 L 378 658 Q 378 700 414 680 L 626 562 Q 660 528 626 494 L 414 376 Q 378 356 378 398 Z"
          fill="#15130f"
        />
      </g>
    </motion.svg>
  )
}
