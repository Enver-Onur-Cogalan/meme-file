import { nativeImage, type NativeImage, type WebContents } from 'electron'
import { execFile } from 'node:child_process'
import dragIconPath from '../../../resources/icon.png?asset'

let dragIcon: NativeImage | undefined

/** İşletim sisteminin kendi sürükleme işlemini başlatır; Discord bunu Explorer'dan sürüklenen dosya gibi görür. */
export function startFileDrag(sender: WebContents, filePath: string): void {
  dragIcon ??= nativeImage.createFromPath(dragIconPath).resize({ width: 64, height: 64 })
  sender.startDrag({ file: filePath, icon: dragIcon })
}

/** Dosyanın kendisini panoya koyar; Discord'da Ctrl+V ile yüklenir. */
export function copyFileToClipboard(filePath: string): Promise<boolean> {
  // Electron'un pano API'si dosya listesi yazamıyor; işletim sisteminin kendi komutlarını kullanıyoruz.
  // Yol komut metnine gömülmez (ortam değişkeni / argüman), böylece tırnak ve özel karakter sorunu olmaz.
  if (process.platform === 'win32') {
    return run(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-Command',
        'Set-Clipboard -LiteralPath $env:MEME_FILE_PATH'
      ],
      { MEME_FILE_PATH: filePath }
    )
  }
  if (process.platform === 'darwin') {
    return run('osascript', [
      '-e',
      'on run argv',
      '-e',
      'set the clipboard to (POSIX file (item 1 of argv))',
      '-e',
      'end run',
      filePath
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
