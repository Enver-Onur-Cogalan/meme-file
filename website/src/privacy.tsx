import { StrictMode, useEffect } from 'react'
import { createRoot } from 'react-dom/client'
import { motion, MotionConfig } from 'motion/react'
import { ArrowLeft, Globe } from 'lucide-react'
import '@fontsource-variable/bricolage-grotesque/index.css'
import '@fontsource/dm-mono/400.css'
import '@fontsource/dm-mono/500.css'
import './styles.css'
import { initAnalytics } from './analytics'
import { GithubMark, Pin } from './components/bits'
import { REPO } from './data'
import { LangProvider, useLang } from './i18n'
import { PRIVACY } from './privacy-content'

function PrivacyPage(): React.JSX.Element {
  const { lang, t, toggle } = useLang()
  const doc = PRIVACY[lang]
  useEffect(() => {
    document.title = doc.pageTitle
  }, [doc.pageTitle])
  return (
    <>
      <header className="nav legal-nav" data-solid>
        <a className="brand" href="./">
          <img src={`${import.meta.env.BASE_URL}icon.png`} alt="" width={30} height={30} />
          <span>meme file</span>
        </a>
        <div className="nav-end">
          <button className="lang" onClick={toggle}>
            <Globe size={15} aria-hidden /> {t.nav.langSwitch}
          </button>
        </div>
      </header>
      <main className="page legal">
        <motion.article
          className="legal-sheet"
          initial={{ rotate: 1.5, y: 24, opacity: 0 }}
          animate={{ rotate: -0.4, y: 0, opacity: 1 }}
          transition={{ type: 'spring', stiffness: 220, damping: 22 }}
        >
          <span className="download-pin" aria-hidden>
            <Pin needle={false} accent />
          </span>
          <h1>{doc.title}</h1>
          <p className="legal-updated">{doc.updated}</p>
          <p className="legal-intro">{doc.intro}</p>
          {doc.sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body.map((paragraph) => (
                <p key={paragraph.slice(0, 32)}>{paragraph}</p>
              ))}
            </section>
          ))}
          <div className="legal-actions">
            <a className="sticker-link" style={{ background: 'var(--yellow)' }} href="./">
              <ArrowLeft size={17} strokeWidth={2.5} aria-hidden /> {doc.back}
            </a>
            <a className="sticker-link" style={{ background: 'var(--purple)' }} href={`${REPO}/issues`} target="_blank" rel="noreferrer">
              <GithubMark size={17} /> {doc.contact}
            </a>
          </div>
        </motion.article>
      </main>
    </>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LangProvider>
      <MotionConfig reducedMotion="user">
        <PrivacyPage />
      </MotionConfig>
    </LangProvider>
  </StrictMode>
)

initAnalytics()
