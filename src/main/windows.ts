import {
  app,
  BrowserWindow,
  globalShortcut,
  Menu,
  nativeImage,
  screen,
  shell,
  Tray
} from 'electron'
import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import iconPath from '../../resources/icon.png?asset'

const BACKGROUND = '#1b1814'

function secureWebPreferences(): Electron.WebPreferences {
  return {
    preload: join(__dirname, '../preload/index.js'),
    sandbox: true,
    contextIsolation: true,
    nodeIntegration: false
  }
}

function loadRenderer(window: BrowserWindow, hash = ''): void {
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    void window.loadURL(`${process.env['ELECTRON_RENDERER_URL']}${hash ? `#${hash}` : ''}`)
  } else {
    void window.loadFile(join(__dirname, '../renderer/index.html'), hash ? { hash } : undefined)
  }
}

function denyNavigation(window: BrowserWindow): void {
  window.webContents.setWindowOpenHandler((details) => {
    if (/^https?:/.test(details.url)) void shell.openExternal(details.url)
    return { action: 'deny' }
  })
  window.webContents.on('will-navigate', (event) => event.preventDefault())
}

export class AppWindows {
  main: BrowserWindow | null = null
  quick: BrowserWindow | null = null
  private tray: Tray | null = null
  private quitting = false
  private registeredShortcut: string | null = null

  constructor(private getCloseToTray: () => boolean) {
    app.on('before-quit', () => {
      this.quitting = true
    })
  }

  /** Güncelleme kurulumu gibi durumlarda pencereler tepsiye gizlenmek yerine kapanabilsin. */
  prepareForQuit(): void {
    this.quitting = true
  }

  all(): BrowserWindow[] {
    return [this.main, this.quick].filter((w): w is BrowserWindow => !!w && !w.isDestroyed())
  }

  broadcast(channel: string, ...args: unknown[]): void {
    for (const window of this.all()) window.webContents.send(channel, ...args)
  }

  createMain(showOnReady: boolean): BrowserWindow {
    const window = new BrowserWindow({
      width: 1280,
      height: 800,
      minWidth: 960,
      minHeight: 600,
      show: false,
      backgroundColor: BACKGROUND,
      title: 'Meme File',
      icon: iconPath,
      titleBarStyle: 'hidden',
      // Windows'ta küçült/büyüt/kapat butonları native kalır, sadece renkleri temaya uyar.
      ...(process.platform === 'darwin'
        ? { trafficLightPosition: { x: 14, y: 11 } }
        : { titleBarOverlay: { color: '#15130f', symbolColor: '#a89d8a', height: 36 } }),
      webPreferences: secureWebPreferences()
    })
    denyNavigation(window)
    if (showOnReady) window.once('ready-to-show', () => window.show())

    window.on('close', (event) => {
      if (!this.quitting && this.getCloseToTray() && this.tray) {
        event.preventDefault()
        window.hide()
      }
    })
    window.on('closed', () => {
      this.main = null
    })

    loadRenderer(window)
    this.main = window
    return window
  }

  showMain(): BrowserWindow {
    const window = this.main ?? this.createMain(true)
    if (window.isMinimized()) window.restore()
    window.show()
    window.focus()
    return window
  }

  createQuick(): void {
    const window = new BrowserWindow({
      // Yuvarlak köşe ve çıkartma gölgesi için pencere saydam, kenarlarda gölge payı var.
      width: 692,
      height: 590,
      show: false,
      frame: false,
      transparent: true,
      hasShadow: false,
      resizable: false,
      maximizable: false,
      minimizable: false,
      fullscreenable: false,
      skipTaskbar: true,
      alwaysOnTop: true,
      backgroundColor: '#00000000',
      title: 'Meme File hızlı arama',
      webPreferences: secureWebPreferences()
    })
    denyNavigation(window)
    window.on('blur', () => {
      // Sürükleme sırasında pencere odağı kaybeder; sürükleme bitince kapanması için kısa bir gecikme.
      setTimeout(() => {
        if (!window.isDestroyed() && !window.isFocused()) window.hide()
      }, 150)
    })
    window.on('close', (event) => {
      if (!this.quitting) {
        event.preventDefault()
        window.hide()
      }
    })
    loadRenderer(window, 'quick')
    this.quick = window
  }

  toggleQuick(): void {
    const window = this.quick
    if (!window || window.isDestroyed()) return
    if (window.isVisible()) {
      window.hide()
      return
    }
    // İmlecin bulunduğu ekranın üst üçte birine yerleştir.
    const display = screen.getDisplayNearestPoint(screen.getCursorScreenPoint())
    const { x, y, width, height } = display.workArea
    const [w, h] = window.getSize()
    window.setPosition(Math.round(x + (width - w) / 2), Math.round(y + (height - h) / 3))
    window.show()
    window.focus()
    window.webContents.send('quick:shown')
  }

  hideQuick(): void {
    if (this.quick?.isVisible()) this.quick.hide()
  }

  /** Global kısayol Windows'un standart RegisterHotKey mekanizmasıyla kaydedilir (klavye kancası değil). */
  registerQuickShortcut(accelerator: string): boolean {
    if (this.registeredShortcut) globalShortcut.unregister(this.registeredShortcut)
    this.registeredShortcut = null
    try {
      if (globalShortcut.register(accelerator, () => this.toggleQuick())) {
        this.registeredShortcut = accelerator
        return true
      }
    } catch {
      // Geçersiz kısayol metni
    }
    return false
  }

  createTray(): void {
    const image = nativeImage
      .createFromPath(iconPath)
      .resize({ width: process.platform === 'darwin' ? 18 : 16 })
    this.tray = new Tray(image)
    this.tray.setToolTip('Meme File')
    this.tray.setContextMenu(
      Menu.buildFromTemplate([
        { label: "Meme File'ı aç", click: () => this.showMain() },
        { label: 'Hızlı arama', click: () => this.toggleQuick() },
        { type: 'separator' },
        { label: 'Çıkış', click: () => app.quit() }
      ])
    )
    this.tray.on('click', () => this.showMain())
  }
}
