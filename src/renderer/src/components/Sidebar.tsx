import { Folder, FolderPlus, LayoutGrid } from 'lucide-react'
import { motion } from 'motion/react'
import type { LibraryFolder } from '../../../shared/api'

interface Props {
  folders: LibraryFolder[]
  selectedId: number | null
  onSelect(id: number): void
  onAddFolder(): void
}

export function Sidebar({ folders, selectedId, onSelect, onAddFolder }: Props): React.JSX.Element {
  return (
    <aside className="flex w-60 shrink-0 flex-col gap-5 bg-side px-3 py-4">
      <div className="flex h-9 items-center gap-2.5 rounded-[10px] bg-text px-3 text-sm font-semibold text-ink">
        <LayoutGrid size={17} />
        <span>Kütüphane</span>
      </div>

      <div className="flex flex-col gap-0.5">
        <div className="px-3 pb-1 text-xs font-bold text-dim">Klasörler</div>
        {folders.map((folder) => {
          const active = folder.id === selectedId
          return (
            <button
              key={folder.id}
              onClick={() => onSelect(folder.id)}
              title={folder.path}
              className={`relative flex h-9 items-center gap-2.5 rounded-[10px] px-3 text-left text-sm font-semibold transition-colors ${
                active ? 'text-text' : 'text-mute hover:text-text'
              }`}
            >
              {active && (
                <motion.div
                  layoutId="folder-active"
                  className="absolute inset-0 rounded-[10px] bg-surf"
                  transition={{ type: 'spring', stiffness: 500, damping: 38 }}
                />
              )}
              <Folder size={17} className="relative shrink-0" />
              <span className="relative truncate">{folder.path.split(/[\\/]/).pop()}</span>
            </button>
          )
        })}
        <motion.button
          onClick={onAddFolder}
          whileHover={{ rotate: -1.5, scale: 1.02 }}
          whileTap={{ scale: 0.96 }}
          className="mt-1 flex h-9 items-center gap-2 rounded-full border-[1.5px] border-dashed border-dim px-3 text-[13px] font-semibold text-mute hover:text-text"
        >
          <FolderPlus size={15} />
          <span>Klasör ekle</span>
        </motion.button>
      </div>
    </aside>
  )
}
