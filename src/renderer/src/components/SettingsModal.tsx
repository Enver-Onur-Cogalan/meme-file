import { Download, Folder, Keyboard, RefreshCw, RotateCw, Settings, Upload } from 'lucide-react'
import { useState } from 'react'
import type { Settings as SettingsType, UpdateState } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { folderName } from '../lib/format'
import { useStore } from '../lib/store'
import { motion } from 'motion/react'
import { THEMES, type ThemePreview } from '../lib/themes'
import { spring } from '../lib/motion'
import { Button, DialogHeader, Kbd, Label, Modal, Segmented, Toggle } from './ui'
import { useT } from '../lib/i18n'
import type { MessageKey } from '../../../shared/i18n'

const MODIFIER_KEYS = ['Control', 'Shift', 'Alt', 'Meta']

/** Klavye olayını Electron'un kısayol biçimine çevirir (ör. "CommandOrControl+Shift+Space"). */
function toAccelerator(event: React.KeyboardEvent): string | null {
  if (MODIFIER_KEYS.includes(event.key)) return null
  const parts: string[] = []
  if (event.ctrlKey || event.metaKey) parts.push('CommandOrControl')
  if (event.altKey) parts.push('Alt')
  if (event.shiftKey) parts.push('Shift')
  if (parts.length === 0) return null
  const key =
    event.code === 'Space'
      ? 'Space'
      : /^Key[A-Z]$/.test(event.code)
        ? event.code.slice(3)
        : /^Digit\d$/.test(event.code)
          ? event.code.slice(5)
          : /^F\d{1,2}$/.test(event.key)
            ? event.key
            : null
  return key ? [...parts, key].join('+') : null
}

function prettyShortcut(accelerator: string): string {
  return accelerator.replace('CommandOrControl', 'Ctrl').replace(/\+/g, ' + ')
}

export function SettingsModal(): React.JSX.Element {
  const { settingsOpen, setSettingsOpen, settings, showToast, folders } = useStore()
  const t = useT()
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const close = (): void => {
    setRecording(false)
    setSettingsOpen(false)
  }

  const update = async (patch: Partial<SettingsType>): Promise<void> => {
    await useStore.getState().updateSettings(patch)
  }

  const run = async (task: () => Promise<void>): Promise<void> => {
    setBusy(true)
    try {
      await task()
    } catch (e) {
      showToast(errorMessage(e), 'error')
    } finally {
      setBusy(false)
    }
  }

  return (
    <Modal open={settingsOpen} onClose={close} width={560}>
      <DialogHeader icon={Settings} title={t('settings.title')} onClose={close} />
      {settings && (
        <div className="flex flex-col gap-6 overflow-y-auto px-[22px] py-5">
          <section className="flex flex-col gap-3">
            <Label>{t('settings.language')}</Label>
            <Segmented
              layoutId="settings-language"
              value={settings.language}
              onChange={(value) => void update({ language: value })}
              color="var(--color-pill)"
              activeText="var(--color-pill-ink)"
              options={[
                { value: 'system', label: t('settings.languageSystem') },
                { value: 'tr', label: 'Türkçe' },
                { value: 'en', label: 'English' }
              ]}
            />
          </section>

          <section className="flex flex-col gap-3">
            <Label>{t('settings.theme')}</Label>
            <div className="grid grid-cols-2 gap-2.5">
              {THEMES.map((theme) => (
                <ThemeCard
                  key={theme.id}
                  theme={theme}
                  active={settings.theme === theme.id}
                  onPick={() => void update({ theme: theme.id })}
                />
              ))}
            </div>
            <span className="text-[12px] text-dim">{t('settings.themeHint')}</span>
          </section>

          <section className="flex flex-col gap-3">
            <Label>{t('settings.shortcut')}</Label>
            <div className="flex items-center gap-3">
              <button
                onClick={() => setRecording(true)}
                onKeyDown={(event) => {
                  if (!recording) return
                  event.preventDefault()
                  if (event.key === 'Escape') return setRecording(false)
                  const accelerator = toAccelerator(event)
                  if (accelerator) {
                    setRecording(false)
                    void update({ quickSearchShortcut: accelerator })
                  }
                }}
                onBlur={() => setRecording(false)}
                className={`flex h-11 grow items-center gap-2.5 rounded-xl border-2 px-3.5 text-left text-sm font-semibold ${
                  recording ? 'border-accent' : 'border-line bg-surf'
                }`}
              >
                <Keyboard size={17} className="text-mute" />
                {recording ? (
                  <span className="text-accent">{t('settings.recording')}</span>
                ) : (
                  <Kbd>{prettyShortcut(settings.quickSearchShortcut)}</Kbd>
                )}
              </button>
            </div>
            <div className="text-xs text-dim">{t('settings.shortcutHint')}</div>
          </section>

          {folders.length > 1 && (
            <section className="flex flex-col gap-3">
              <Label>{t('settings.importFolder')}</Label>
              <div className="flex flex-wrap gap-2">
                {folders.map((folder) => {
                  const active = (settings.importFolderId ?? folders[0].id) === folder.id
                  return (
                    <button
                      key={folder.id}
                      onClick={() => void update({ importFolderId: folder.id })}
                      title={folder.path}
                      className={`flex h-9 items-center gap-2 rounded-full border-[1.5px] px-3.5 text-[13px] font-bold ${
                        active
                          ? 'border-ink bg-sticker-blue text-ink shadow-[2px_3px_0_var(--color-ink)]'
                          : 'border-line bg-surf text-mute hover:text-text'
                      }`}
                    >
                      <Folder size={15} />
                      {folderName(folder.path)}
                    </button>
                  )
                })}
              </div>
              <div className="text-xs text-dim">{t('settings.importFolderHint')}</div>
            </section>
          )}

          <section className="flex flex-col gap-3.5">
            <Label>{t('settings.app')}</Label>
            <Toggle
              checked={settings.closeToTray}
              onChange={(value) => void update({ closeToTray: value })}
              label={t('settings.closeToTray')}
            />
            <Toggle
              checked={settings.launchAtLogin}
              onChange={(value) => void update({ launchAtLogin: value })}
              label={t('settings.launchAtLogin')}
            />
          </section>

          <section className="flex flex-col gap-3">
            <Label>{t('settings.tagMode')}</Label>
            <Segmented
              layoutId="settings-tag-mode"
              value={settings.tagMode}
              onChange={(value) => void update({ tagMode: value })}
              options={[
                { value: 'and', label: t('settings.tagModeAnd') },
                { value: 'or', label: t('settings.tagModeOr') }
              ]}
            />
          </section>

          <UpdateSection />

          <section className="flex flex-col gap-3">
            <Label>{t('settings.library')}</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                icon={Download}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await window.api.exportBackup()
                    if (result)
                      showToast(
                        t('settings.backedUp', { tags: result.tags, videos: result.videos })
                      )
                  })
                }
              >
                {t('settings.backup')}
              </Button>
              <Button
                icon={Upload}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await window.api.importBackup()
                    if (result)
                      showToast(
                        t('settings.restored', { tags: result.tags, videos: result.videos })
                      )
                  })
                }
              >
                {t('settings.restore')}
              </Button>
              <Button
                icon={RefreshCw}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await window.api.rescan()
                    showToast(t('settings.rescanned'), 'info')
                  })
                }
              >
                {t('settings.rescan')}
              </Button>
            </div>
            <div className="text-xs text-dim">{t('settings.backupHint')}</div>
          </section>
        </div>
      )}
    </Modal>
  )
}

const UPDATE_TEXT: Record<UpdateState, MessageKey> = {
  idle: 'update.idle',
  checking: 'update.checking',
  downloading: 'update.downloading',
  ready: 'update.ready',
  latest: 'update.latest',
  error: 'update.error',
  dev: 'update.dev'
}

function UpdateSection(): React.JSX.Element {
  const { update, appVersion } = useStore()
  const t = useT()
  return (
    <section className="flex flex-col gap-3">
      <Label>{t('settings.version')}</Label>
      <div className="flex items-center gap-3">
        <span className="rounded-full border-[1.5px] border-ink bg-accent px-2.5 py-0.5 font-mono text-xs font-medium text-ink">
          v{appVersion}
        </span>
        <span className="grow text-sm text-mute">
          {t(UPDATE_TEXT[update.state])}
          {update.state === 'downloading' && ` ${Math.round((update.percent ?? 0) * 100)}%`}
        </span>
        {update.state === 'ready' ? (
          <Button
            variant="primary"
            icon={RotateCw}
            color="var(--color-sticker-green)"
            onClick={() => window.api.installUpdate()}
          >
            {t('settings.restartFor', { version: update.version ?? '' })}
          </Button>
        ) : (
          <Button
            icon={RefreshCw}
            disabled={
              update.state === 'checking' ||
              update.state === 'downloading' ||
              update.state === 'dev'
            }
            onClick={() => void window.api.checkForUpdates()}
          >
            {t('settings.check')}
          </Button>
        )}
      </div>
    </section>
  )
}

/** Tema kartı: temanın kendi renkleriyle küçük bir önizleme çizer. */
function ThemeCard({
  theme,
  active,
  onPick
}: {
  theme: ThemePreview
  active: boolean
  onPick(): void
}): React.JSX.Element {
  const t = useT()
  return (
    <motion.button
      onClick={onPick}
      whileHover={{ y: -2 }}
      whileTap={{ scale: 0.98 }}
      transition={spring}
      className={`flex flex-col gap-2 rounded-[14px] border-2 p-2.5 text-left ${
        active ? 'border-accent shadow-[3px_4px_0_var(--color-ink)]' : 'border-line'
      }`}
    >
      <div
        style={{ background: theme.bg, borderColor: theme.ink }}
        className="flex h-[58px] flex-col justify-between overflow-hidden rounded-[9px] border-[1.5px] p-2"
      >
        <div className="flex gap-1">
          {theme.chips.map((color) => (
            <span
              key={color}
              style={{ background: color, borderColor: theme.ink }}
              className="h-[13px] w-[26px] rounded-full border-[1.5px]"
            />
          ))}
        </div>
        <div className="flex flex-col gap-[3px]">
          <span
            style={{ background: theme.text, opacity: 0.85 }}
            className="h-[3px] w-3/4 rounded-full"
          />
          <span style={{ background: theme.line }} className="h-[3px] w-1/2 rounded-full" />
        </div>
      </div>
      <div className="flex flex-col">
        <span className="text-[13px] font-bold">{t(theme.labelKey)}</span>
        <span className="text-[11.5px] text-dim">{t(theme.noteKey)}</span>
      </div>
    </motion.button>
  )
}
