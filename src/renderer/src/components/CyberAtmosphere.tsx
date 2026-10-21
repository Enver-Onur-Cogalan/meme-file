import { useStore } from '../lib/store'

/**
 * Cyberpunk teması açıkken ekranın üstünde duran CRT katmanı: tarama
 * çizgileri, aşağı süzülen ışık bandı ve arada bir geçen sinyal bozulması.
 * Tamamen CSS; tıklamayı engellemez.
 */
export function CyberAtmosphere(): React.JSX.Element | null {
  const theme = useStore((s) => s.settings?.theme)
  if (theme !== 'cyber') return null
  return (
    <div className="cyber-atmosphere" aria-hidden="true">
      <div className="sweep" />
      <div className="tear" />
    </div>
  )
}
