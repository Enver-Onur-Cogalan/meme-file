import { MotionConfig } from 'motion/react'
import { DownloadSection } from './components/Download'
import { Find } from './components/Find'
import { Fit } from './components/Fit'
import { Hero } from './components/Hero'
import { Quick } from './components/Quick'
import { Faq, Footer, Maker, Nav, Safe } from './components/Sections'
import { Themes } from './components/Themes'
import { Tour } from './components/Tour'
import { LangProvider } from './i18n'

export function App(): React.JSX.Element {
  return (
    <LangProvider>
      {/* İşletim sisteminde "animasyonları azalt" açıksa hareketler sadeleşir. */}
      <MotionConfig reducedMotion="user">
        <Nav />
        <main className="page">
          <Hero />
          <Tour />
          <Find />
          <Fit />
          <Quick />
          <Themes />
          <Safe />
          <Faq />
          <DownloadSection />
          <Maker />
        </main>
        <Footer />
      </MotionConfig>
    </LangProvider>
  )
}
