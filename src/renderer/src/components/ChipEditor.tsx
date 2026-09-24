import { Check, Plus, Search, Trash2, Upload } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { confirmDeleteTag, errorMessage } from '../lib/actions'
import { ICON_TABS, iconsInCategory, searchIcons, type IconTab } from '../lib/icons'
import { useStore } from '../lib/store'
import { nextFreeSwatch, SWATCHES } from '../lib/tags'
import { TagIcon, TagSticker } from './TagSticker'
import { Button, DialogHeader, Label, Modal, Segmented } from './ui'
import { bouncy, spring } from '../lib/motion'
import { useT } from '../lib/i18n'

export function ChipEditor(): React.JSX.Element {
  const editor = useStore((s) => s.chipEditor)
  const close = useStore((s) => s.closeChipEditor)
  return (
    <Modal open={!!editor} onClose={close} width={860}>
      {editor && <ChipEditorBody key={editor.tag?.id ?? 'new'} onClose={close} />}
    </Modal>
  )
}

function ChipEditorBody({ onClose }: { onClose(): void }): React.JSX.Element {
  const { chipEditor, tags, showToast } = useStore()
  const editing = chipEditor?.tag ?? null
  const t = useT()
  const [name, setName] = useState(editing?.name ?? '')
  // Yeni chip kullanılmamış bir renkle açılır; eskiden sıradaki renk
  // veriliyordu ve silinen chip'lerden sonra aynı renk tekrar geliyordu.
  const [color, setColor] = useState(
    editing?.color ??
      nextFreeSwatch(
        tags.map((tag) => tag.color),
        tags.length
      )
  )
  const [icon, setIcon] = useState(editing?.icon ?? 'lucide:Tag')
  const [tab, setTab] = useState<'lucide' | 'custom'>(
    icon.startsWith('custom:') ? 'custom' : 'lucide'
  )
  const [query, setQuery] = useState('')
  const [category, setCategory] = useState<IconTab>('featured')
  const [error, setError] = useState<string | null>(null)

  const searching = query.trim().length > 0
  const results = useMemo(
    () => (searching ? searchIcons(query) : iconsInCategory(category)),
    [searching, query, category]
  )

  /*
    Bazı kategorilerde 500'den fazla ikon var ve hepsini birden basmak ilk
    açılışta gözle görülür bir takılma yapıyor. Izgara parça parça
    uzuyor: sona yaklaşınca bir sonraki küme ekleniyor.
  */
  const PAGE = 160
  const [visible, setVisible] = useState(PAGE)
  const sentinel = useRef<HTMLDivElement>(null)

  // Liste değişince baştan başla. Effect içinde setState çağırmak
  // zincirleme render tetikliyor; React'in önerdiği yol, önceki anahtarı
  // state'te tutup render sırasında karşılaştırmak.
  const listKey = searching ? `q:${query}` : `c:${category}`
  const [prevListKey, setPrevListKey] = useState(listKey)
  if (listKey !== prevListKey) {
    setPrevListKey(listKey)
    setVisible(PAGE)
  }

  useEffect(() => {
    const node = sentinel.current
    if (!node || visible >= results.length) return
    const observer = new IntersectionObserver(
      ([entry]) => entry.isIntersecting && setVisible((count) => count + PAGE),
      { rootMargin: '200px' }
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [visible, results.length])
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
      showToast(editing ? t('chipEditor.updated') : t('chipEditor.created'))
      onClose()
    } catch (e) {
      setError(errorMessage(e, t('chipEditor.saveFailed')))
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
      setError(errorMessage(e, t('chipEditor.iconFailed')))
    }
  }

  return (
    <>
      <DialogHeader
        icon={editing ? Check : Plus}
        title={editing ? t('chipEditor.editTitle') : t('chipEditor.newTitle')}
        onClose={onClose}
      />
      <div className="flex min-h-0">
        <div className="flex w-[300px] shrink-0 flex-col gap-[18px] border-r-[1.5px] border-line p-[22px]">
          <div className="notebook flex h-[150px] flex-col items-center justify-center gap-3 rounded-[14px] border-[1.5px] border-line">
            <motion.div
              // Renk ya da ikon değişince önizleme çıkartması zıplar.
              key={`${color}-${icon}`}
              initial={{ scale: 0.85, rotate: -10 }}
              animate={{ scale: 1, rotate: -4 }}
              transition={{ type: 'spring', stiffness: 600, damping: 12 }}
            >
              <TagSticker
                tag={{
                  name: name.trim() || t('chipEditor.previewName'),
                  color,
                  icon,
                  count: editing?.count ?? 0
                }}
                size="lg"
                count
                className="shadow-[3px_4px_0_var(--color-ink)]"
              />
            </motion.div>
            <span className="text-xs text-dim">{t('chipEditor.preview')}</span>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('chipEditor.name')}</Label>
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
              placeholder={t('chipEditor.namePlaceholder')}
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
                  {duplicate ? t('chipEditor.duplicate') : error}
                </motion.div>
              )}
            </AnimatePresence>
          </div>
          <div className="flex flex-col gap-2">
            <Label>{t('chipEditor.color')}</Label>
            {/* 8 hue × 3 ton; satırlar açık → temel → koyu sırasında. */}
            <div className="grid grid-cols-8 gap-1.5">
              {SWATCHES.map((swatch) => (
                <motion.button
                  key={swatch}
                  whileHover={{ scale: 1.15 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setColor(swatch)}
                  aria-label={swatch}
                  style={{ background: swatch }}
                  className={`flex size-[26px] items-center justify-center rounded-full border-2 border-ink ${
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
                        <Check size={13} strokeWidth={3} color="var(--color-ink)" />
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
            <Label>{t('chipEditor.icon')}</Label>
            <div className="w-[260px]">
              <Segmented
                layoutId="icon-tab"
                value={tab}
                onChange={setTab}
                color="var(--color-text)"
                options={[
                  { value: 'lucide', label: t('chipEditor.builtIn') },
                  { value: 'custom', label: t('chipEditor.custom') }
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
                  placeholder={t('chipEditor.iconSearch')}
                  className="min-w-0 grow bg-transparent text-[13.5px] outline-none placeholder:text-dim"
                />
              </label>
              {/* Kategoriler; arama yazılınca sonuçlar kategorinin önüne geçer. */}
              <div className="flex flex-wrap gap-1.5">
                {ICON_TABS.map((tab) => {
                  const active = !searching && tab === category
                  return (
                    <button
                      key={tab}
                      onClick={() => {
                        setQuery('')
                        setCategory(tab)
                      }}
                      className={`h-7 rounded-full border-[1.5px] px-2.5 text-xs font-semibold transition-colors ${
                        active
                          ? 'border-ink bg-text text-ink'
                          : 'border-line text-mute hover:border-mute hover:text-text'
                      }`}
                    >
                      {t(`chipEditor.cat.${tab}`)}
                    </button>
                  )
                })}
              </div>
              <div className="grid h-[244px] grid-cols-[repeat(8,minmax(0,1fr))] content-start gap-2 overflow-y-auto pr-1">
                {results.slice(0, visible).map((iconName) => (
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
                {visible < results.length && <div ref={sentinel} className="col-span-8 h-px" />}
                {results.length === 0 && (
                  <div className="col-span-7 self-center text-sm text-dim">
                    {t('chipEditor.iconNotFound')}
                  </div>
                )}
              </div>
              <div className="text-xs text-dim">{t('chipEditor.iconHint')}</div>
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
                  {t('chipEditor.customHint')}
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
            {t('common.delete')}
          </Button>
        )}
        <span className="grow" />
        <Button onClick={onClose}>{t('common.cancel')}</Button>
        <Button
          variant="primary"
          icon={Check}
          disabled={!name.trim() || duplicate}
          onClick={() => void save()}
        >
          {editing ? t('common.save') : t('chipEditor.create')}
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
  const t = useT()
  return (
    <motion.button
      whileHover={{ scale: 1.08, rotate: -4 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className="flex aspect-square flex-col items-center justify-center gap-0.5 rounded-xl border-[1.5px] border-dashed border-dim text-mute hover:text-text"
    >
      <Upload size={16} />
      <span className="text-[9.5px] font-bold">{t('chipEditor.upload')}</span>
    </motion.button>
  )
}
