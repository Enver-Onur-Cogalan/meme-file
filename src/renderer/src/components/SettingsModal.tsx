import { Download, Keyboard, RefreshCw, Settings, Upload } from 'lucide-react'
import { useState } from 'react'
import type { Settings as SettingsType } from '../../../shared/api'
import { errorMessage } from '../lib/actions'
import { useStore } from '../lib/store'
import { Button, DialogHeader, Kbd, Label, Modal, Segmented, Toggle } from './ui'

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
  const { settingsOpen, setSettingsOpen, settings, setSettings, showToast } = useStore()
  const [recording, setRecording] = useState(false)
  const [busy, setBusy] = useState(false)
  const close = (): void => {
    setRecording(false)
    setSettingsOpen(false)
  }

  const update = async (patch: Partial<SettingsType>): Promise<void> => {
    setSettings(await window.api.updateSettings(patch))
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
      <DialogHeader icon={Settings} title="Ayarlar" onClose={close} />
      {settings && (
        <div className="flex flex-col gap-6 overflow-y-auto px-[22px] py-5">
          <section className="flex flex-col gap-3">
            <Label>Hızlı arama kısayolu</Label>
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
                  recording ? 'border-sticker-yellow' : 'border-line bg-surf'
                }`}
              >
                <Keyboard size={17} className="text-mute" />
                {recording ? (
                  <span className="text-sticker-yellow">Tuş kombinasyonuna bas… (Esc: vazgeç)</span>
                ) : (
                  <Kbd>{prettyShortcut(settings.quickSearchShortcut)}</Kbd>
                )}
              </button>
            </div>
            <div className="text-xs text-dim">
              Oyundayken bile açılır. Windows&apos;un standart kısayol sistemini kullanır; oyunlara
              ya da hile korumalarına dokunmaz.
            </div>
          </section>

          <section className="flex flex-col gap-3.5">
            <Label>Uygulama</Label>
            <Toggle
              checked={settings.closeToTray}
              onChange={(value) => void update({ closeToTray: value })}
              label="Kapatınca sistem tepsisinde çalışmaya devam et"
            />
            <Toggle
              checked={settings.launchAtLogin}
              onChange={(value) => void update({ launchAtLogin: value })}
              label="Windows açılınca arka planda başlat"
            />
          </section>

          <section className="flex flex-col gap-3">
            <Label>Birden fazla chip seçilince</Label>
            <Segmented
              layoutId="settings-tag-mode"
              value={settings.tagMode}
              onChange={(value) => void update({ tagMode: value })}
              options={[
                { value: 'and', label: 'Hepsini içerenler (VE)' },
                { value: 'or', label: 'Herhangi birini (VEYA)' }
              ]}
            />
          </section>

          <section className="flex flex-col gap-3">
            <Label>Kütüphane</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                icon={Download}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await window.api.exportBackup()
                    if (result) showToast(`Yedeklendi: ${result.tags} chip, ${result.videos} video`)
                  })
                }
              >
                Yedekle
              </Button>
              <Button
                icon={Upload}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    const result = await window.api.importBackup()
                    if (result)
                      showToast(`Yüklendi: ${result.tags} chip, ${result.videos} video eşleşti`)
                  })
                }
              >
                Yedekten yükle
              </Button>
              <Button
                icon={RefreshCw}
                disabled={busy}
                onClick={() =>
                  void run(async () => {
                    await window.api.rescan()
                    showToast('Klasörler yeniden tarandı', 'info')
                  })
                }
              >
                Yeniden tara
              </Button>
            </div>
            <div className="text-xs text-dim">
              Yedek; chip&apos;leri, özel ikonları, favorileri ve hangi videoda hangi chip olduğunu
              içerir. Videoların kendisi yedeğe girmez.
            </div>
          </section>
        </div>
      )}
    </Modal>
  )
}
