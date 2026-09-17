import { nativeImage, type NativeImage, type WebContents } from 'electron'
import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import appIconPath from '../../../resources/icon.png?asset'

let appIcon: NativeImage | undefined

/**
 * İşletim sisteminin kendi sürükleme işlemini başlatır; Discord bunu Explorer'dan sürüklenen dosya gibi görür.
 * Sürüklenen görsel olarak videonun kapak resmi kullanılır.
 */
export function startFileDrag(sender: WebContents, filePaths: string[], thumbPath?: string): void {
  if (filePaths.length === 0) return
  let icon: NativeImage | undefined
  if (thumbPath && existsSync(thumbPath)) {
    icon = nativeImage.createFromPath(thumbPath).resize({ width: 120 })
  }
  if (!icon || icon.isEmpty()) {
    appIcon ??= nativeImage.createFromPath(appIconPath).resize({ width: 64, height: 64 })
    icon = appIcon
  }
  sender.startDrag(
    filePaths.length === 1
      ? { file: filePaths[0], icon }
      : { file: filePaths[0], files: filePaths, icon }
  )
}

/** Dosyaların kendisini panoya koyar; Discord'da Ctrl+V ile yüklenir. */
export function copyFilesToClipboard(filePaths: string[]): Promise<boolean> {
  if (filePaths.length === 0) return Promise.resolve(false)
  // Electron'un pano API'si dosya listesi yazamıyor; işletim sisteminin kendi komutlarını kullanıyoruz.
  // Yollar komut metnine gömülmez (ortam değişkeni / argüman), böylece tırnak ve özel karakter sorunu olmaz.
  if (process.platform === 'win32') {
    return run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Set-Clipboard -LiteralPath ($env:MEME_FILE_PATHS -split "`n")'
      ],
      { MEME_FILE_PATHS: filePaths.join('\n') }
    )
  }
  if (process.platform === 'darwin') {
    // Geliştirme ortamı için: Mac'te tek dosya kopyalanır.
    return run('osascript', [
      '-e',
      'on run argv',
      '-e',
      'set the clipboard to (POSIX file (item 1 of argv))',
      '-e',
      'end run',
      filePaths[0]
    ])
  }
  return Promise.resolve(false)
}

function run(command: string, args: string[], env: Record<string, string> = {}): Promise<boolean> {
  return new Promise((resolve) => {
    execFile(
      command,
      args,
      { env: { ...process.env, ...env }, windowsHide: true, timeout: 10_000 },
      (error) => resolve(!error)
    )
  })
}
