import { AnimatePresence, motion } from 'motion/react'
import { Hash, RotateCcw } from 'lucide-react'
import { Fragment, useCallback, useEffect, useRef, useState } from 'react'
import { CLIPS, REPO, type Clip } from '../data'
import { useLang } from '../i18n'
import { track } from '../analytics'
import { ClipCover, GithubMark, useCoarsePointer } from './bits'
import { DownloadButton } from './Download'
import { PostIt } from './PostIt'

const WALL = ['smug', 'shocked', 'fail', 'wow'].map((slug) => CLIPS.find((clip) => clip.slug === slug)!)

interface Message {
  id: number
  who: string
  mine?: boolean
  text?: string
  clip?: Clip
}

const FRIENDS = ['Deniz', 'Kaan', 'Ece']
const AVATAR: Record<string, string> = { Deniz: '#5cc3e8', Kaan: '#f59a3d', Ece: '#ee7fb4', me: '#f5c542' }

let nextId = 10

export function Hero(): React.JSX.Element {
  const { t } = useLang()
  const coarse = useCoarsePointer()
  const [wall, setWall] = useState<Clip[]>(WALL)
  const [round, setRound] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [over, setOver] = useState(false)
  const [typing, setTyping] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const chatRef = useRef<HTMLDivElement>(null)
  const logRef = useRef<HTMLDivElement>(null)
  const replyIndex = useRef(0)
  const timers = useRef<number[]>([])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  // Sohbet hep en alttaki mesajı göstersin.
  useEffect(() => {
    const log = logRef.current
    if (log) log.scrollTo({ top: log.scrollHeight, behavior: 'smooth' })
  }, [messages, typing])

  const insideChat = useCallback((point: { x: number; y: number }): boolean => {
    const rect = chatRef.current?.getBoundingClientRect()
    if (!rect) return false
    return point.x >= rect.left && point.x <= rect.right && point.y >= rect.top && point.y <= rect.bottom
  }, [])

  const send = (clip: Clip): void => {
    track('meme-sent', { clip: clip.slug })
    setWall((cards) => cards.filter((card) => card.slug !== clip.slug))
    setMessages((list) => [...list, { id: nextId++, who: 'me', mine: true, clip }])
    const friend = FRIENDS[replyIndex.current % FRIENDS.length]
    const reply = t.hero.replies[replyIndex.current % t.hero.replies.length]
    replyIndex.current += 1
    timers.current.push(
      window.setTimeout(() => setTyping(friend), 650),
      window.setTimeout(() => {
        setTyping(null)
        setMessages((list) => [...list, { id: nextId++, who: friend, text: reply }])
      }, 1850)
    )
  }

  const refill = (): void => {
    setRound((r) => r + 1)
    setWall(WALL)
  }

  return (
    <section className="hero" id="top">
      <div className="hero-copy">
        <h1 className="hero-title">
          {t.hero.title.split(' ').map((word, i) => (
            <Fragment key={`${word}-${i}`}>
              {i > 0 && ' '}
              <span className="word-mask">
                <motion.span
                  className="word"
                  initial={{ y: '105%' }}
                  animate={{ y: 0 }}
                  transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.05 + i * 0.06 }}
                >
                  {word}
                </motion.span>
              </span>
            </Fragment>
          ))}
        </h1>
        <motion.p
          className="hero-lead"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.35, duration: 0.5 }}
        >
          {t.hero.lead}
        </motion.p>
        <motion.div
          className="hero-actions"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.45, duration: 0.5 }}
        >
          <DownloadButton place="hero" />
          <a className="link-quiet" href={REPO} target="_blank" rel="noreferrer">
            <GithubMark /> {t.hero.source}
          </a>
        </motion.div>
      </div>

      <div className="hero-wall">
        <div className="wall-cards">
          <AnimatePresence mode="popLayout">
            {wall.map((clip) => (
              <PostIt
                key={`${round}-${clip.slug}`}
                clip={clip}
                index={WALL.indexOf(clip)}
                enterDelay={round === 0 ? 0.55 + WALL.indexOf(clip) * 0.13 : WALL.indexOf(clip) * 0.08}
                draggable={!coarse}
                onDragMove={(point) => {
                  setDragging(true)
                  setOver(insideChat(point))
                }}
                onDrop={(point) => {
                  setDragging(false)
                  setOver(false)
                  if (!insideChat(point)) return false
                  // Kâğıt önce "bırakıldı" hâline geçsin, çıkış bir sonraki karede
                  // başlasın; aynı karede olunca çıkış animasyonu askıda kalıyordu.
                  requestAnimationFrame(() => send(clip))
                  return true
                }}
                onTap={() => {
                  if (coarse) send(clip)
                }}
              />
            ))}
          </AnimatePresence>
          <AnimatePresence>
            {wall.length === 0 && (
              <motion.div
                className="wall-empty"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ delay: 0.3 }}
              >
                <p>{t.hero.empty}</p>
                <button className="btn-ghost" onClick={refill}>
                  <RotateCcw size={16} aria-hidden /> {t.hero.refill}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {wall.length > 0 && <p className="hero-hint">{coarse ? t.hero.hintTap : t.hero.hintDrag}</p>}
      </div>

      <motion.div
        ref={chatRef}
        className="chat"
        data-dragging={dragging || undefined}
        data-over={over || undefined}
        initial={{ opacity: 0, x: 24 }}
        animate={{ opacity: 1, x: 0, scale: over ? 1.015 : 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 28, delay: over || dragging ? 0 : 0.4 }}
      >
        <header className="chat-head">
          <Hash size={18} aria-hidden />
          <span>{t.hero.channel}</span>
        </header>
        <div className="chat-log" ref={logRef} aria-live="polite">
          {t.hero.seed.map((message) => (
            <ChatLine key={message.who} who={message.who}>
              <p>{message.text}</p>
            </ChatLine>
          ))}
          <AnimatePresence initial={false}>
            {messages.map((message) => (
              <ChatLine key={message.id} who={message.who} label={message.mine ? t.hero.you : message.who} fresh>
                {message.clip ? (
                  <div className="chat-clip">
                    <ClipCover clip={message.clip} playing />
                  </div>
                ) : (
                  <p>{message.text}</p>
                )}
              </ChatLine>
            ))}
          </AnimatePresence>
        </div>
        <AnimatePresence>
          {typing && (
            <motion.p
              className="chat-typing"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
            >
              <span className="dots" aria-hidden>
                <i />
                <i />
                <i />
              </span>
              <b>{typing}</b> {t.hero.typing}
            </motion.p>
          )}
        </AnimatePresence>
        <div className="chat-composer">
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={dragging ? 'drop' : 'idle'}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.15 }}
            >
              {dragging ? t.hero.dropHere : t.hero.composer}
            </motion.span>
          </AnimatePresence>
        </div>
      </motion.div>
    </section>
  )
}

function ChatLine({
  who,
  label,
  fresh = false,
  children
}: {
  who: string
  label?: string
  fresh?: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <motion.div
      layout
      className="chat-line"
      initial={fresh ? { opacity: 0, scale: 0.7, y: 18 } : false}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 420, damping: 24 }}
      style={{ originX: 0, originY: 1 }}
    >
      <span className="avatar" style={{ background: AVATAR[who] ?? '#b69cf2' }} aria-hidden>
        {(label ?? who).slice(0, 1)}
      </span>
      <div>
        <b className="chat-who">{label ?? who}</b>
        {children}
      </div>
    </motion.div>
  )
}
