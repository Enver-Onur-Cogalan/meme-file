import { FolderPlus } from 'lucide-react'
import { AnimatePresence, MotionConfig, motion } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import type { LibraryFolder, VideoFile } from '../../shared/api'
import { PlayerModal } from './components/PlayerModal'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Toast, type ToastMessage } from './components/Toast'
import { VideoCard } from './components/VideoCard'

function App(): React.JSX.Element {
  const [folders, setFolders] = useState<LibraryFolder[]>([])
  const [folderId, setFolderId] = useState<number | null>(null)
  const [videos, setVideos] = useState<VideoFile[]>([])
  const [selectedPath, setSelectedPath] = useState<string | null>(null)
  const [openVideo, setOpenVideo] = useState<VideoFile | null>(null)
  const [toast, setToast] = useState<ToastMessage | null>(null)
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(() => {
    window.api.listFolders().then((list) => {
      setFolders(list)
      if (list.length > 0) setFolderId(list[0].id)
    })
  }, [])

  useEffect(() => {
    if (folderId === null) return
    let cancelled = false
    window.api.scanFolder(folderId).then((list) => {
      if (!cancelled) setVideos(list)
    })
    return () => {
      cancelled = true
    }
  }, [folderId])

  const showToast = useCallback((text: string, ok: boolean) => {
    clearTimeout(toastTimer.current)
    setToast({ id: Date.now(), text, ok })
    toastTimer.current = setTimeout(() => setToast(null), 1600)
  }, [])

  const copy = useCallback(
    async (path: string) => {
      const ok = await window.api.copyFile(path)
      showToast(ok ? 'Kopyalandı!' : 'Kopyalanamadı', ok)
    },
    [showToast]
  )

  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'c') {
        const path = openVideo?.path ?? selectedPath
        if (path) {
          event.preventDefault()
          copy(path)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [copy, openVideo, selectedPath])

  const addFolder = async (): Promise<void> => {
    const folder = await window.api.addFolder()
    if (!folder) return
    setFolders((list) => (list.some((f) => f.id === folder.id) ? list : [...list, folder]))
    setFolderId(folder.id)
  }

  return (
    <MotionConfig reducedMotion="user">
      <div className="relative flex h-full flex-col">
        <TitleBar />
        <div className="flex min-h-0 grow">
          <Sidebar
            folders={folders}
            selectedId={folderId}
            onSelect={setFolderId}
            onAddFolder={addFolder}
          />

          <main className="notebook flex min-w-0 grow flex-col overflow-y-auto px-[26px] pt-[18px] pb-5 pl-[38px]">
            <div className="flex items-center gap-3.5 pb-4">
              <h1 className="m-0 text-[30px] leading-none font-extrabold tracking-[-0.02em]">
                Kütüphane
              </h1>
              <span className="grow" />
              <span className="text-[13px] text-mute">
                <span className="font-extrabold text-text">{videos.length}</span> meme bulundu
              </span>
            </div>

            {folders.length === 0 ? (
              <EmptyState onAddFolder={addFolder} />
            ) : (
              <div className="grid grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-[18px]">
                {videos.map((video, index) => (
                  <VideoCard
                    key={video.path}
                    video={video}
                    index={index}
                    selected={video.path === selectedPath}
                    onSelect={() => setSelectedPath(video.path)}
                    onOpen={() => setOpenVideo(video)}
                  />
                ))}
              </div>
            )}
          </main>
        </div>

        <AnimatePresence>
          {openVideo && (
            <PlayerModal
              video={openVideo}
              onClose={() => setOpenVideo(null)}
              onCopy={() => copy(openVideo.path)}
            />
          )}
        </AnimatePresence>
        <Toast message={toast} />
      </div>
    </MotionConfig>
  )
}

function EmptyState({ onAddFolder }: { onAddFolder(): void }): React.JSX.Element {
  return (
    <div className="flex grow flex-col items-center justify-center gap-5">
      <motion.div
        initial={{ scale: 0.6, rotate: -20, opacity: 0 }}
        animate={{ scale: 1, rotate: -6, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 300, damping: 14 }}
        className="flex size-20 items-center justify-center rounded-3xl border-2 border-ink bg-sticker-yellow text-ink shadow-[4px_5px_0_var(--color-ink)]"
      >
        <FolderPlus size={38} strokeWidth={2.25} />
      </motion.div>
      <div className="text-center">
        <div className="text-2xl font-extrabold">Memelerin nerede?</div>
        <div className="mt-1 text-sm text-mute">Video klasörünü ekle, gerisini biz hallederiz.</div>
      </div>
      <motion.button
        onClick={onAddFolder}
        whileHover={{ y: -2, rotate: -1 }}
        whileTap={{ y: 2 }}
        className="flex h-11 items-center gap-2 rounded-full border-2 border-ink bg-text px-5 text-[15px] font-extrabold text-ink shadow-[3px_4px_0_var(--color-ink)]"
      >
        <FolderPlus size={18} strokeWidth={2.25} />
        Klasör ekle
      </motion.button>
    </div>
  )
}

export default App
