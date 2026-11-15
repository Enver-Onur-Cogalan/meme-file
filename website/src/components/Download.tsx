import { motion } from 'motion/react'
import { Download as DownloadIcon } from 'lucide-react'
import { useEffect, useState } from 'react'
import { LATEST } from '../data'
import { useLang } from '../i18n'
import { track } from '../analytics'
import { Pin } from './bits'

interface Release {
  version: string
  url: string
  size: number
  notes: string
}

const API = 'https://api.github.com/repos/Enver-Onur-Cogalan/meme-file/releases/latest'
let pending: Promise<Release | null> | null = null

/** Son sürüm GitHub'dan okunur; okunamazsa düğme sürüm sayfasına gider. */
function fetchRelease(): Promise<Release | null> {
  if (pending) return pending
  pending = (async () => {
    try {
      const cached = sessionStorage.getItem('mf-release')
      if (cached) return JSON.parse(cached) as Release
    } catch {
      /* depolama kapalı */
    }
    try {
      const response = await fetch(API, { headers: { Accept: 'application/vnd.github+json' } })
      if (!response.ok) return null
      const data = await response.json()
      const asset = (data.assets as { name: string; browser_download_url: string; size: number }[]).find((a) =>
        a.name.endsWith('-setup.exe')
      )
      if (!asset) return null
      const release: Release = {
        version: String(data.tag_name).replace(/^v/, ''),
        url: asset.browser_download_url,
        size: asset.size,
        notes: data.html_url
      }
      try {
        sessionStorage.setItem('mf-release', JSON.stringify(release))
      } catch {
        /* yok say */
      }
      return release
    } catch {
      return null
    }
  })()
  return pending
}

export function useRelease(): Release | null {
  const [release, setRelease] = useState<Release | null>(null)
  useEffect(() => {
    let alive = true
    fetchRelease().then((value) => alive && setRelease(value))
    return () => {
      alive = false
    }
  }, [])
  return release
}

const formatSize = (bytes: number): string => `${(bytes / 1024 / 1024).toFixed(0)} MB`

export function DownloadButton({ big = false, place }: { big?: boolean; place: string }): React.JSX.Element {
  const { t } = useLang()
  const release = useRelease()
  return (
    <motion.a
      className={`btn-primary${big ? ' btn-big' : ''}`}
      href={release?.url ?? LATEST}
      onClick={() => track('download', { place, version: release?.version ?? '?' })}
      whileHover={{ y: -2, rotate: -1 }}
      whileTap={{ y: 3, rotate: 0, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 500, damping: 22 }}
    >
      <DownloadIcon size={big ? 24 : 19} strokeWidth={2.5} aria-hidden />
      {t.download.button}
      {release && !big && <span className="btn-version">{release.version}</span>}
    </motion.a>
  )
}

export function DownloadSection(): React.JSX.Element {
  const { t } = useLang()
  const release = useRelease()
  return (
    <section data-track="download" className="section download" id="download">
      <motion.div
        className="download-card"
        initial={{ rotate: -5, y: 60, opacity: 0 }}
        whileInView={{ rotate: -1.5, y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <motion.span
          className="download-pin"
          aria-hidden
          initial={{ y: -30, scale: 1.8, opacity: 0 }}
          whileInView={{ y: 0, scale: 1, opacity: 1 }}
          viewport={{ once: true, amount: 0.5 }}
          transition={{ type: 'spring', stiffness: 620, damping: 18, delay: 0.35 }}
        >
          <Pin needle={false} accent />
        </motion.span>
        <img className="download-icon" src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={88} height={88} />
        <h2>{t.download.title}</h2>
        <p className="download-lead">{t.download.lead}</p>
        <DownloadButton big place="section" />
        <p className="download-meta">
          {release ? t.download.meta(release.version, formatSize(release.size)) : t.download.metaFallback}
          {release && (
            <>
              {' '}
              <a href={release.notes} target="_blank" rel="noreferrer">
                {t.download.notes}
              </a>
            </>
          )}
        </p>
        <ol className="download-steps">
          {t.download.steps.map((step) => (
            <li key={step}>{step}</li>
          ))}
        </ol>
      </motion.div>
    </section>
  )
}
