import { MotionConfig } from 'motion/react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { ChipEditor } from './components/ChipEditor'
import { ClipDialog } from './components/ClipDialog'
import { ConfirmDialog } from './components/ConfirmDialog'
import { ContextMenu, type MenuState } from './components/ContextMenu'
import { PlayerModal } from './components/PlayerModal'
import { RenameDialog } from './components/RenameDialog'
import { SettingsModal } from './components/SettingsModal'
import { Sidebar } from './components/Sidebar'
import { TitleBar } from './components/TitleBar'
import { Toast } from './components/Toast'
import { copyVideos, errorMessage, toggleFavorite, trashVideos } from './lib/actions'
import { useStore } from './lib/store'
import { InboxView } from './views/InboxView'
import { LibraryView } from './views/LibraryView'
import { QuickSearch } from './views/QuickSearch'

function App(): React.JSX.Element {
  return (
    <MotionConfig reducedMotion="user">
      {window.api.isQuickWindow ? <QuickSearch /> : <MainWindow />}
    </MotionConfig>
  )
}

function MainWindow(): React.JSX.Element {
  const store = useStore()
  const { refresh, view, folderId, text, tagIds, sort, settings } = store
  const [menu, setMenu] = useState<MenuState | null>(null)
  const searchRef = useRef<HTMLInputElement>(null)
  const closeMenu = useCallback(() => setMenu(null), [])

  // Filtre değişince yeniden sorgula; yazarken her tuşta değil, kısa bir duraksamayla.
  useEffect(() => {
    const timer = setTimeout(() => void refresh(), text ? 120 : 0)
    return () => clearTimeout(timer)
  }, [refresh, view, folderId, text, tagIds, sort, settings?.tagMode])

  useEffect(() => window.api.onLibraryChanged(() => void refresh()), [refresh])

  useEffect(
    () =>
      window.api.onConvertProgress(({ videoId, ratio }) =>
        useStore.setState((state) => ({
          convertProgress: { ...state.convertProgress, [videoId]: ratio }
        }))
      ),
    []
  )

  useEffect(
    () =>
      window.api.onOpenVideo((videoId) => {
        const state = useStore.getState()
        state.setView('library')
        state.clearFilters()
        void state.refresh().then(() => useStore.getState().openPlayer(videoId))
      }),
    []
  )

  const addFolder = useCallback(async () => {
    try {
      const folder = await window.api.addFolder()
      if (folder) {
        useStore.getState().setView('library', folder.id)
        useStore.getState().showToast(`${folder.videoCount} video eklendi`)
      }
    } catch (e) {
      useStore.getState().showToast(errorMessage(e), 'error')
    }
  }, [])

  // Kütüphane kısayolları; açık bir pencere/diyalog varsa onlar kendi kısayollarını yönetir.
  useEffect(() => {
    const onKey = (event: KeyboardEvent): void => {
      const state = useStore.getState()
      if (
        state.playerId !== null ||
        state.chipEditor ||
        state.clip ||
        state.settingsOpen ||
        state.renameId !== null ||
        state.confirmRequest
      ) {
        return
      }
      const inInput = event.target instanceof HTMLInputElement
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      const selected = state.videos.filter((video) => state.selection.includes(video.id))

      if (mod && key === 'f') {
        event.preventDefault()
        searchRef.current?.focus()
        searchRef.current?.select()
      } else if (inInput || state.view === 'inbox') {
        return
      } else if (mod && key === 'c' && selected.length > 0) {
        event.preventDefault()
        void copyVideos(selected.map((video) => video.id))
      } else if (mod && key === 'a') {
        event.preventDefault()
        state.select(state.videos.map((video) => video.id))
      } else if (key === 'escape') {
        if (state.selection.length) state.select([])
        else state.clearFilters()
      } else if (key === 'enter' && selected.length === 1) {
        state.openPlayer(selected[0].id)
      } else if (key === 'f2' && selected.length === 1) {
        state.openRename(selected[0].id)
      } else if (key === 'delete' && selected.length > 0) {
        void trashVideos(selected)
      } else if (key === 'f' && !mod && selected.length > 0) {
        void toggleFavorite(selected)
      } else if (/^arrow(left|right)$/.test(key) && state.videos.length > 0) {
        event.preventDefault()
        const index = state.videos.findIndex((video) => video.id === state.anchorId)
        const next = Math.min(
          Math.max(index + (key === 'arrowright' ? 1 : -1), 0),
          state.videos.length - 1
        )
        state.select([state.videos[next].id], state.videos[next].id)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const playerVideo = store.videos.find((video) => video.id === store.playerId)

  return (
    <div className="relative flex h-full flex-col">
      <TitleBar />
      <div className="flex min-h-0 grow">
        <Sidebar onAddFolder={() => void addFolder()} onMenu={setMenu} />
        {view === 'inbox' && folderId === null ? (
          <InboxView />
        ) : (
          <LibraryView
            onAddFolder={() => void addFolder()}
            onMenu={setMenu}
            searchRef={searchRef}
          />
        )}
      </div>
      <PlayerModal video={playerVideo} />
      <ChipEditor />
      <ClipDialog />
      <SettingsModal />
      <RenameDialog />
      <ConfirmDialog />
      <ContextMenu menu={menu} onClose={closeMenu} />
      <Toast />
    </div>
  )
}

export default App
