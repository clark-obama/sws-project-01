const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  saveData: (data) => ipcRenderer.invoke('save-data', data),
  loadData: () => ipcRenderer.invoke('load-data'),
  onRequestSave: (callback) => ipcRenderer.on('request-save', callback),
  onRequestLoad: (callback) => ipcRenderer.on('request-load', callback),
}); 