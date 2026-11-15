import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react'
import { ArrowUp, Briefcase, Globe, Plus, ShieldCheck, X } from 'lucide-react'
import { useState } from 'react'
import { LINKS } from '../data'
import { useLang } from '../i18n'
import { analyticsEnabled, track } from '../analytics'
import { GithubMark, LinkedinMark, Pin } from './bits'
import { DownloadButton } from './Download'

export function Nav(): React.JSX.Element {
  const { t, toggle } = useLang()
  const { scrollY } = useScroll()
  const [hidden, setHidden] = useState(false)
  const [solid, setSolid] = useState(false)
  useMotionValueEvent(scrollY, 'change', (y) => {
    const previous = scrollY.getPrevious() ?? 0
    setHidden(y > previous && y > 240)
    setSolid(y > 12)
  })
  return (
    <motion.header
      className="nav"
      data-solid={solid || undefined}
      animate={{ y: hidden ? '-110%' : 0 }}
      transition={{ type: 'spring', stiffness: 400, damping: 40 }}
    >
      <a className="brand" href="#top">
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={30} height={30} />
        <span>meme file</span>
      </a>
      <nav className="nav-links" aria-label="Sayfa">
        <a href="#tour">{t.nav.tour}</a>
        <a href="#features">{t.nav.features}</a>
        <a href="#themes">{t.nav.themes}</a>
        <a href="#faq">{t.nav.faq}</a>
      </nav>
      <div className="nav-end">
        <button className="lang" onClick={() => {
            toggle()
            track('lang-switch')
          }}>
          <Globe size={15} aria-hidden /> {t.nav.langSwitch}
        </button>
        <a className="nav-download" href="#download">
          {t.nav.download}
        </a>
      </div>
    </motion.header>
  )
}

export function Safe(): React.JSX.Element {
  const { t } = useLang()
  return (
    <section data-track="safe" className="section safe">
      <div className="safe-badge" aria-hidden>
        <ShieldCheck size={40} strokeWidth={2} />
      </div>
      <div className="section-head">
        <h2>{t.safe.title}</h2>
        <p>{t.safe.lead}</p>
      </div>
      <ul className="safe-list">
        {t.safe.no.map((item, i) => (
          <motion.li
            key={item}
            initial={{ opacity: 0, x: -14 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, amount: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 26, delay: i * 0.07 }}
          >
            <span className="safe-x" aria-hidden>
              <X size={14} strokeWidth={3} />
            </span>
            {item}
          </motion.li>
        ))}
      </ul>
      <p className="safe-yes">{t.safe.yes}</p>
    </section>
  )
}

export function Faq(): React.JSX.Element {
  const { t } = useLang()
  const [open, setOpen] = useState<number | null>(0)
  return (
    <section data-track="faq" className="section faq" id="faq">
      <div className="section-head">
        <h2>{t.faq.title}</h2>
      </div>
      <div className="faq-list">
        {t.faq.items.map((item, i) => {
          const isOpen = open === i
          return (
            <div className="faq-item" key={item.q} data-open={isOpen || undefined}>
              <h3>
                <button
                  className="faq-q"
                  aria-expanded={isOpen}
                  aria-controls={`faq-${i}`}
                  onClick={() => {
                    if (!isOpen) track('faq-open', { question: i + 1 })
                    setOpen(isOpen ? null : i)
                  }}
                >
                  <span>{item.q}</span>
                  <motion.span
                    className="faq-icon"
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 24 }}
                    aria-hidden
                  >
                    <Plus size={20} strokeWidth={2.5} />
                  </motion.span>
                </button>
              </h3>
              <AnimatePresence initial={false}>
                {isOpen && (
                  <motion.div
                    id={`faq-${i}`}
                    className="faq-a"
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ type: 'spring', stiffness: 360, damping: 36 }}
                  >
                    <p>{item.a}</p>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export function Maker(): React.JSX.Element {
  const { t } = useLang()
  const links = [
    { id: 'portfolio', href: LINKS.portfolio, label: t.maker.portfolio, icon: ({ size }: { size: number }) => <Briefcase size={size} strokeWidth={2.4} aria-hidden />, color: '#f5c542' },
    { id: 'linkedin', href: LINKS.linkedin, label: t.maker.linkedin, icon: LinkedinMark, color: '#5cc3e8' },
    { id: 'github', href: LINKS.github, label: t.maker.github, icon: GithubMark, color: '#b69cf2' }
  ]
  return (
    <section data-track="maker" className="section maker">
      <motion.div
        className="maker-card"
        initial={{ rotate: 4, y: 40, opacity: 0 }}
        whileInView={{ rotate: 1.2, y: 0, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ type: 'spring', stiffness: 220, damping: 20 }}
      >
        <span className="maker-pin" aria-hidden>
          <Pin needle={false} />
        </span>
        <h2>{t.maker.title}</h2>
        <p>{t.maker.text}</p>
        <div className="maker-links">
          {links.map(({ id, href, label, icon: Icon, color }, i) => (
            <motion.a
              key={href}
              href={href}
              target="_blank"
              rel="noreferrer"
              className="sticker-link"
              onClick={() => track('maker-link', { to: id })}
              style={{ background: color }}
              initial={{ rotate: i % 2 ? 2 : -2 }}
              whileHover={{ rotate: 0, y: -3, scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              transition={{ type: 'spring', stiffness: 500, damping: 18 }}
            >
              <Icon size={17} /> {label}
            </motion.a>
          ))}
        </div>
      </motion.div>
    </section>
  )
}

export function Footer(): React.JSX.Element {
  const { t } = useLang()
  return (
    <footer className="footer">
      <div className="footer-cta">
        <DownloadButton place="footer" />
        <a href="#top" className="link-quiet">
          <ArrowUp size={16} aria-hidden /> {t.footer.top}
        </a>
      </div>
      <p>© 2026 Enver Onur Çoğalan. {t.footer.license}</p>
      <p>{t.footer.credit}</p>
      <p className="footer-privacy">
        {analyticsEnabled && <>{t.footer.privacy} </>}
        <a href="privacy.html">{t.footer.privacyLink}</a>
      </p>
    </footer>
  )
}
