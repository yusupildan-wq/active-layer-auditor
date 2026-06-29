'use strict'

const { app, BrowserWindow, Tray, Menu, nativeImage, nativeTheme, shell, Notification, dialog } = require('electron')
const { autoUpdater } = require('electron-updater')
const path = require('path')
const net = require('net')
const fs = require('fs')

const PORT = 3001
const BACKEND_URL = `http://127.0.0.1:${PORT}`

let mainWindow = null
let tray = null
let updateReady = false
let updateChecking = false
let updateDownloadedVersion = null
let manualUpdateCheck = false

// Poll until the backend HTTP port accepts connections.
function waitForBackend(timeoutMs = 20000) {
  return new Promise((resolve, reject) => {
    const deadline = Date.now() + timeoutMs
    function attempt() {
      const socket = net.createConnection({ port: PORT, host: '127.0.0.1' })
      socket.once('connect', () => { socket.destroy(); resolve() })
      socket.once('error', () => {
        socket.destroy()
        if (Date.now() >= deadline) return reject(new Error(`Backend did not start within ${timeoutMs}ms`))
        setTimeout(attempt, 250)
      })
    }
    attempt()
  })
}

function startBackend() {
  const userData = app.getPath('userData')
  fs.mkdirSync(path.join(userData, 'data'), { recursive: true })

  // Tell the backend where to read/write user data and where to find bundled assets.
  process.env.NODE_ENV = 'production'
  process.env.HOST = '127.0.0.1'
  process.env.PORT = String(PORT)
  process.env.NO_OPEN_BROWSER = 'true'
  process.env.VANTAGE_DATA_DIR = path.join(userData, 'data')
  process.env.VANTAGE_ENV_PATH = path.join(userData, '.env')
  process.env.VANTAGE_CONFIG_DIR = app.isPackaged
    ? path.join(process.resourcesPath, 'config', 'clients')
    : path.resolve(__dirname, '../config/clients')
  process.env.VANTAGE_FRONTEND_PATH = app.isPackaged
    ? path.join(process.resourcesPath, 'public')
    : path.resolve(__dirname, '../frontend/dist')

  const entry = app.isPackaged
    ? path.join(process.resourcesPath, 'backend', 'dist', 'index.js')
    : path.resolve(__dirname, '../backend/dist/index.js')

  require(entry)
}

// ── Auto-update ───────────────────────────────────────────────────────────────

function setupAutoUpdater() {
  autoUpdater.autoDownload = true
  autoUpdater.autoInstallOnAppQuit = true

  autoUpdater.on('checking-for-update', () => {
    updateChecking = true
    rebuildTrayMenu()
  })

  autoUpdater.on('update-available', (info) => {
    manualUpdateCheck = false
    updateChecking = false
    rebuildTrayMenu()
    new Notification({
      title: 'Vantage update found',
      body: `Downloading version ${info.version}.`,
    }).show()
  })

  autoUpdater.on('update-not-available', () => {
    updateChecking = false
    rebuildTrayMenu()
    if (manualUpdateCheck) {
      manualUpdateCheck = false
      showWindow()
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'No update found',
        message: 'Vantage is already up to date.',
      }).catch(() => {})
    }
  })

  autoUpdater.on('download-progress', () => {
    updateChecking = false
    rebuildTrayMenu()
  })

  autoUpdater.on('update-downloaded', (info) => {
    manualUpdateCheck = false
    updateReady = true
    updateChecking = false
    updateDownloadedVersion = info.version
    rebuildTrayMenu()
    new Notification({
      title: 'Vantage update ready',
      body: `Version ${info.version} is ready. Restart Vantage to install it.`,
    }).show()
    promptRestartToUpdate(info.version)
  })

  autoUpdater.on('error', (err) => {
    const wasManual = manualUpdateCheck
    manualUpdateCheck = false
    updateChecking = false
    rebuildTrayMenu()
    console.error('[updater]', err.message)
    if (wasManual) {
      showWindow()
      dialog.showMessageBox(mainWindow, {
        type: 'error',
        title: 'Update check failed',
        message: err?.message ?? 'Could not reach update server.',
      }).catch(() => {})
    }
  })

  // Check on startup, then every 4 hours.
  checkForUpdates(false)
  setInterval(() => checkForUpdates(false), 4 * 60 * 60 * 1000)
}

function checkForUpdates(manual = false) {
  if (!app.isPackaged) {
    if (manual) {
      dialog.showMessageBox(mainWindow, {
        type: 'info',
        title: 'Updates unavailable in development',
        message: 'Auto-updates only run in the installed Vantage desktop app.',
      }).catch(() => {})
    }
    return
  }

  if (updateReady) {
    promptRestartToUpdate(updateDownloadedVersion)
    return
  }

  // Manual checks always proceed — reset any stuck checking state
  if (manual) updateChecking = false
  if (updateChecking) return

  manualUpdateCheck = manual
  updateChecking = true
  autoUpdater.checkForUpdates()
    .catch((err) => {
      manualUpdateCheck = false
      updateChecking = false
      rebuildTrayMenu()
    })
}

function promptRestartToUpdate(version) {
  const detail = version
    ? `Version ${version} has been downloaded and will install after restart.`
    : 'An update has been downloaded and will install after restart.'

  dialog.showMessageBox(mainWindow, {
    type: 'info',
    buttons: ['Restart Now', 'Later'],
    defaultId: 0,
    cancelId: 1,
    title: 'Vantage update ready',
    message: 'Restart Vantage to install the update?',
    detail,
  }).then(({ response }) => {
    if (response === 0) {
      app.isQuitting = true
      autoUpdater.quitAndInstall()
    }
  }).catch(() => {})
}

// ── Tray ──────────────────────────────────────────────────────────────────────

function createTray() {
  const iconPath = app.isPackaged
    ? path.join(process.resourcesPath, 'assets', 'tray.png')
    : path.join(__dirname, 'assets', 'tray.png')

  let icon = nativeImage.createEmpty()
  if (fs.existsSync(iconPath)) {
    icon = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 })
  }

  try {
    tray = new Tray(icon)
  } catch {
    // No icon on disk yet — tray is optional; app still works without it.
    return
  }

  tray.setToolTip('Vantage')
  rebuildTrayMenu()
  tray.on('double-click', showWindow)
}

function rebuildTrayMenu() {
  if (!tray) return
  const launchAtLogin = app.getLoginItemSettings().openAtLogin
  const items = [
    { label: 'Open Vantage', click: showWindow },
    { type: 'separator' },
  ]

  if (updateReady) {
    items.push({
      label: '↻ Restart to Update',
      click: () => {
        promptRestartToUpdate(updateDownloadedVersion)
      },
    })
    items.push({ type: 'separator' })
  }

  items.push(
    {
      label: updateChecking ? 'Checking for Updates...' : 'Check for Updates',
      enabled: !updateChecking,
      click: () => checkForUpdates(true),
    },
    { type: 'separator' },
    {
      label: 'Launch at startup',
      type: 'checkbox',
      checked: launchAtLogin,
      click: (item) => {
        app.setLoginItemSettings({ openAtLogin: item.checked })
        rebuildTrayMenu()
      },
    },
    { type: 'separator' },
    {
      label: 'Quit',
      click: () => {
        app.isQuitting = true
        app.quit()
      },
    }
  )

  tray.setContextMenu(Menu.buildFromTemplate(items))
}

// ── Window ────────────────────────────────────────────────────────────────────

function showWindow() {
  if (!mainWindow) {
    createWindow()
    return
  }
  if (mainWindow.isMinimized() || !mainWindow.isVisible()) {
    mainWindow.show()
  }
  mainWindow.focus()
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 900,
    minHeight: 600,
    title: 'Vantage',
    backgroundColor: '#08080d',
    titleBarStyle: 'hidden',
    titleBarOverlay: {
      color: '#08080d',
      symbolColor: '#94a3b8',
      height: 36,
    },
    // Use a custom app icon if one is available.
    ...(fs.existsSync(path.join(__dirname, 'assets', 'icon.png')) && {
      icon: path.join(__dirname, 'assets', 'icon.png'),
    }),
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      // Block navigation away from the app.
      sandbox: true,
    },
  })

  mainWindow.loadURL(BACKEND_URL)

  // Prevent opening external links inside the app window.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  // Minimize to tray on close rather than quitting.
  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault()
      mainWindow.hide()
      if (tray) tray.setToolTip('Vantage is running in the background')
    }
  })

  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

// ── Lifecycle ─────────────────────────────────────────────────────────────────

app.on('before-quit', () => {
  app.isQuitting = true
})

app.whenReady().then(async () => {
  nativeTheme.themeSource = 'dark'
  Menu.setApplicationMenu(null)
  startBackend()
  createTray()

  try {
    await waitForBackend()
  } catch (err) {
    console.error('Backend start timeout:', err.message)
    // Open the window anyway — it'll show a connection error that auto-retries.
  }

  createWindow()

  // Check for updates only in the packaged app, not during development.
  if (app.isPackaged) {
    setupAutoUpdater()
  }
})

// Keep the process alive via the tray; never quit on window-all-closed.
app.on('window-all-closed', () => {})

// macOS: re-open window when clicking the dock icon.
app.on('activate', () => {
  showWindow()
})
