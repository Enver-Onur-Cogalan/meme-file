/**
 * Ziyaret sayımı: Umami Cloud (çerezsiz, kişisel veri tutmaz, çerez bandı gerektirmez).
 * Yalnızca yayın derlemesinde ve VITE_UMAMI_ID verilmişse yüklenir; geliştirirken hiçbir şey gönderilmez.
 */

type EventData = Record<string, string | number>

declare global {
  interface Window {
    umami?: { track: (event: string, data?: EventData) => void }
  }
}

const WEBSITE_ID = import.meta.env.VITE_UMAMI_ID as string | undefined
const SCRIPT = (import.meta.env.VITE_UMAMI_SRC as string | undefined) ?? 'https://cloud.umami.is/script.js'
const DOMAINS = import.meta.env.VITE_UMAMI_DOMAINS as string | undefined

export const analyticsEnabled = import.meta.env.PROD && Boolean(WEBSITE_ID)

/** Olay gönderir; betik yüklenmemişse (geliştirme, reklam engelleyici) sessizce geçer. */
export function track(event: string, data?: EventData): void {
  try {
    window.umami?.track(event, data)
  } catch {
    /* sayım asla sayfayı bozmasın */
  }
}

/** Ziyaretçi bir bölümü ilk kez gördüğünde "section" olayı. Ne kadar aşağı inildiğini ve ziyaret süresini bu verir. */
function watchSections(): void {
  const seen = new Set<string>()
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const name = (entry.target as HTMLElement).dataset.track
        observer.unobserve(entry.target)
        if (!name || seen.has(name)) continue
        seen.add(name)
        track('section', { name })
      }
    },
    { threshold: 0.4 }
  )
  document.querySelectorAll<HTMLElement>('[data-track]').forEach((el) => observer.observe(el))
}

export function initAnalytics(): void {
  if (!analyticsEnabled || !WEBSITE_ID) return
  const script = document.createElement('script')
  script.defer = true
  script.src = SCRIPT
  script.dataset.websiteId = WEBSITE_ID
  // Tarayıcısında "beni izleme" açık olanları saymayız.
  script.dataset.doNotTrack = 'true'
  if (DOMAINS) script.dataset.domains = DOMAINS
  script.addEventListener('load', watchSections, { once: true })
  document.head.appendChild(script)
}
