'use strict'
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('vantage', {
  onUpdateStatus: (cb) => ipcRenderer.on('update-status', (_, d) => cb(d)),
  installUpdate: () => ipcRenderer.send('install-update'),
})
