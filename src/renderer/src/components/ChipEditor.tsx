import { Check, Plus, Search, Trash2, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import { confirmDeleteTag, errorMessage } from '../lib/actions'
import { searchIcons } from '../lib/icons'
import { useStore } from '../lib/store'
import { SWATCHES } from '../lib/tags'
import { TagIcon, TagSticker } from './TagSticker'
import { Button, DialogHeader, Label, Modal, Segmented } from './ui'
import { bouncy, spring } from '../lib/motion'

export function ChipEditor(): React.JSX.Element {
  const editor = useStore((s) => s.chipEditor)
  const close = useStore((s) => s.closeChipEditor)
  return (
    <Modal open={!!editor} onClose={close} width={780}>
      {editor && <ChipEditorBody key={editor.tag?.id ?? 'new'} onClose={close} />}
    </Modal>
  )
}

function ChipEditorBody({ onClose }: { onClose(): void }): React.JSX.Element {
  const { chipEditor, tags, showToast } = useStore()
  const editing = chipEditor?.tag ?? null
  const [name, setName] = useState(editing?.name ?? '')
  const [color, setColor] = useState(editing?.color ?? SWATCHES[tags.length % SWATCHES.length])
  const [icon, setIcon] = useState(editing?.icon ?? 'lucide:Tag')
  const [tab, setTab] = useState<'lucide' | 'custom'>(
    icon.startsWith('custom:') ? 'custom' : 'lucide'
  )
  const [query, setQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const results = useMemo(() => searchIcons(query), [query])
  const customIcons = useMemo(() => {
    const set = new Set(tags.map((tag) => tag.icon).filter((i) => i.startsWith('custom:')))
    if (icon.startsWith('custom:')) set.add(icon)
    return [...set]
  }, [tags, icon])

  const duplicate = tags.some(
    (tag) =>
      tag.id !== editing?.id &&
      tag.name.toLocaleLowerCase('tr') === name.trim().toLocaleLowerCase('tr')
  )

  const save = async (): Promise<void> => {
    const input = { name: name.trim(), color, icon }
    try {
      const tag = editing
        ? await window.api.updateTag(editing.id, input)
        : await window.api.createTag(input)
      if (chipEditor?.assignTo?.length)
        await window.api.addTagToVideos(chipEditor.assignTo, tag.id, true)
      showToast(editing ? 'Chip güncellendi' : 'Chip oluşturuldu')
      onClose()
    } catch (e) {
      setError(errorMessage(e, 'Kaydedilemedi'))
    }
  }

  const upload = async (): Promise<void> => {
    try {
      const fileName = await window.api.importIcon()
      if (fileName) {
        setIcon(`custom:${fileName}`)
        setTab('custom')
      }
    } catch (e) {
      setError(errorMessage(e, 'İkon yüklenemedi'))
    }
  }

  return (
    <>
      <DialogHeader
        icon={editing ? Check : Plus}
        title={editing ? 'Chip düzenle' : 'Yeni chip'}
        onClose={onClose}
      />
      <div className="flex min-h-0">
        <div className="flex w-[260px] shrink-0 flex-col gap-[18px] border-r-[1.5px] border-line p-[22px]">
          <div className="notebook flex h-[150px] flex-col items-center justify-center gap-3 rounded-[14px] border-[1.5px] border-line">
            <motion.div
              // Renk ya da ikon değişince önizleme çıkartması zıplar.
              key={`${color}-${icon}`}
              initial={{ scale: 0.85, rotate: -10 }}
              animate={{ scale: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
            >
              <TagSticker
                tag={{ name: name.trim() || 'chip adı', color, icon, count: editing?.count ?? 0 }}
                size="lg"
                count
                className="shadow-[3px_4px_0_var(--color-ink)]"
              />
            </motion.div>
            <span className="text-xs text-dim">önizleme</span>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Ad</Label>
            <input
              autoFocus
              value={name}
              maxLength={40}
              onChange={(event) => {
                setName(event.target.value)
                setError(null)
              }}
              onKeyDown={(event) => {
                if (event.key === 'Enter' && name.trim() && !duplicate) void save()
              }}
              placeholder="ör. efsane"
              className="h-[42px] rounded-xl border-2 border-line bg-surf px-3.5 text-[15px] font-semibold outline-none focus:border-text"
            />
            <AnimatePresence>
              {(duplicate || error) && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="text-xs font-semibold text-sticker-red"
                >
                  {duplicate ? 'Bu adda bir chip zaten var' : error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-2">
            <Label>Renk</Label>
            <div className="flex flex-wrap gap-3">
              {SWATCHES.map((swatch) => (
                <motion.button
                  key={swatch}
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setColor(swatch)}
                  aria-label={swatch}
                  style={{ background: swatch }}
                  className={`flex size-9 items-center justify-center rounded-full border-2 border-ink ${
                    swatch === color ? 'shadow-[0_0_0_3px_var(--color-text)]' : ''
                  }`}
                >
                  <AnimatePresence>
                    {swatch === color && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0 }}
                        transition={bouncy}
                      >
                        <Check size={16} strokeWidth={3} color="var(--color-ink)" />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex min-w-0 grow flex-col gap-3.5 p-[22px]">
          <div className="flex items-center justify-between gap-3">
            <Label>İkon</Label>
            <div className="w-[260px]">
              <Segmented
                layoutId="icon-tab"
                value={tab}
                onChange={setTab}
                color="var(--color-text)"
                options={[
                  { value: 'lucide', label: 'Hazır ikonlar' },
                  { value: 'custom', label: 'Kendi ikonlarım' }
                ]}
              />
            </div>
          </div>
          {tab === 'lucide' ? (
            <>
              <label className="flex h-10 items-center gap-2.5 rounded-full border-[1.5px] border-line bg-surf px-3.5 focus-within:border-mute">
                <Search size={16} className="text-mute" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="İkon ara… (ateş, kedi, oyun)"
                  className="min-w-0 grow bg-transparent text-[13.5px] outline-none placeholder:text-dim"
                />
              </label>
              <div className="grid h-[244px] grid-cols-[repeat(8,minmax(0,1fr))] content-start gap-2 overflow-y-auto pr-1">
                {results.map((iconName) => (
                  <IconTile
                    key={iconName}
                    icon={`lucide:${iconName}`}
                    title={iconName}
                    selected={icon === `lucide:${iconName}`}
                    color={color}
                    onClick={() => setIcon(`lucide:${iconName}`)}
                  />
                ))}
                <UploadTile onClick={() => void upload()} />
                {results.length === 0 && (
                  <div className="col-span-7 self-center text-sm text-dim">
                    Bu isimde ikon bulunamadı
                  </div>
                )}
              </div>
              <div className="text-xs text-dim">
                2000+ ikon · kendi SVG veya PNG dosyanı da yükleyebilirsin
              </div>
            </>
          ) : (
            <div className="grid grid-cols-[repeat(8,minmax(0,1fr))] content-start gap-2">
              {customIcons.map((customIcon) => (
                <IconTile
                  key={customIcon}
                  icon={customIcon}
                  selected={icon === customIcon}
                  color={color}
                  onClick={() => setIcon(customIcon)}
                />
              ))}
              <UploadTile onClick={() => void upload()} />
              {customIcons.length === 0 && (
                <div className="col-span-7 self-center text-sm text-dim">
                  SVG, PNG veya WebP yükle (en fazla 1 MB). Kare görseller en iyi sonucu verir.
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2.5 border-t-[1.5px] border-line px-[22px] py-4">
        {editing && (
          <Button
            variant="ghost"
            icon={Trash2}
            className="text-sticker-red hover:text-sticker-red"
            onClick={() => void confirmDeleteTag(editing).then((deleted) => deleted && onClose())}
          >
            Sil
          </Button>
        )}
        <span className="grow" />
        <Button onClick={onClose}>İptal</Button>
        <Button
          variant="primary"
          icon={Check}
          disabled={!name.trim() || duplicate}
          onClick={() => void save()}
        >
          {editing ? 'Kaydet' : 'Chip oluştur'}
        </Button>
      </div>
    </>
  )
}

function IconTile({
  icon,
  selected,
  color,
  title,
  onClick
}: {
  icon: string
  selected: boolean
  color: string
  title?: string
  onClick(): void
}): React.JSX.Element {
  return (
    <motion.button
      title={title}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="relative flex aspect-square items-center justify-center rounded-xl bg-surf"
    >
      {selected && (
        <motion.span
          layoutId="icon-selected"
          transition={spring}
          style={{ background: color }}
          className="absolute inset-0 rounded-xl border-2 border-ink shadow-[2px_3px_0_var(--color-ink)]"
        />
      )}
      <span className="relative">
        <TagIcon
          icon={icon}
          size={20}
          color={selected ? 'var(--color-ink)' : 'var(--color-text)'}
          strokeWidth={selected ? 2.25 : 1.75}
        />
      </span>
    </motion.button>
  )
}

function UploadTile({ onClick }: { onClick(): void }): React.JSX.Element {
  return (
    <motion.button
      whileHover={{ scale: 1.08, rotate: -4 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed border-dim text-mute hover:text-text"
    >
      <Upload size={16} />
      <span className="text-[9.5px] font-bold">yükle</span>
    </motion.button>
  )
}
