import { Plus } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useMemo, useState } from 'react'
import type { Tag } from '../../../shared/api'
import { normalizeForSearch } from '../../../shared/search'
import { SWATCHES } from '../lib/tags'
import { TagSticker } from './TagSticker'
import { Kbd } from './ui'

/** Yazarak chip ekleme: var olanları önerir, yoksa aynı adla yeni chip oluşturur. */
export function TagInput({
  tags,
  exclude,
  onPick,
  autoFocus = false
}: {
  tags: Tag[]
  exclude: number[]
  onPick(tagId: number): void
  autoFocus?: boolean
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [active, setActive] = useState(0)

  const suggestions = useMemo(() => {
    const q = normalizeForSearch(query.trim())
    return tags
      .filter((tag) => !exclude.includes(tag.id))
      .filter((tag) => !q || normalizeForSearch(tag.name).includes(q))
      .slice(0, 5)
  }, [query, tags, exclude])
  const exact = tags.some(
    (tag) => normalizeForSearch(tag.name) === normalizeForSearch(query.trim())
  )
  const canCreate = query.trim().length > 0 && !exact
  const optionCount = suggestions.length + (canCreate ? 1 : 0)

  const create = async (): Promise<void> => {
    const name = query.trim()
    const color = SWATCHES[tags.length % SWATCHES.length]
    const tag = await window.api.createTag({ name, color, icon: 'lucide:Tag' })
    onPick(tag.id)
    setQuery('')
  }

  const choose = (index: number): void => {
    if (index < suggestions.length) {
      onPick(suggestions[index].id)
      setQuery('')
      setActive(0)
    } else if (canCreate) {
      void create()
    }
  }

  return (
    <div className="flex flex-col overflow-hidden rounded-[14px] border-[1.5px] border-line bg-surf focus-within:border-mute">
      <div className="flex h-[38px] items-center gap-2 px-3">
        <Plus size={15} className="shrink-0 text-mute" />
        <input
          autoFocus={autoFocus}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setActive(0)
          }}
          onKeyDown={(event) => {
            event.stopPropagation()
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setActive((i) => Math.min(i + 1, optionCount - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setActive((i) => Math.max(i - 1, 0))
            } else if (event.key === 'Enter' && optionCount > 0) {
              event.preventDefault()
              choose(active)
            } else if (event.key === 'Escape') {
              if (query) setQuery('')
              else event.currentTarget.blur()
            }
          }}
          placeholder="Chip ekle…"
          className="min-w-0 grow bg-transparent text-[13.5px] outline-none placeholder:text-dim"
        />
      </div>
      <AnimatePresence initial={false}>
        {query && optionCount > 0 && (
          <motion.div
            initial={{ height: 0 }}
            animate={{ height: 'auto' }}
            exit={{ height: 0 }}
            className="overflow-hidden border-t-[1.5px] border-line"
          >
            {suggestions.map((tag, index) => (
              <button
                key={tag.id}
                onMouseEnter={() => setActive(index)}
                onClick={() => choose(index)}
                className={`flex w-full items-center gap-2 px-2.5 py-2 ${index === active ? 'bg-bg' : ''}`}
              >
                <TagSticker tag={tag} />
                <span className="grow" />
                {index === active && <Kbd>Enter</Kbd>}
              </button>
            ))}
            {canCreate && (
              <button
                onMouseEnter={() => setActive(suggestions.length)}
                onClick={() => choose(suggestions.length)}
                className={`flex w-full items-center gap-2 px-3 py-2 text-left text-[13px] text-mute ${
                  active === suggestions.length ? 'bg-bg text-text' : ''
                }`}
              >
                <Plus size={13} />
                <span className="grow truncate">
                  &quot;{query.trim()}&quot; adında yeni chip oluştur
                </span>
                {active === suggestions.length && <Kbd>Enter</Kbd>}
              </button>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
