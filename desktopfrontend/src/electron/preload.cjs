//initial code, added to handle deep link token in the renderer process.
/*
const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onDeepLinkToken: (callback) => {
    ipcRenderer.on('deep-link-token', (event, token) => callback(token))
  },
  removeDeepLinkToken: (callback) => {
    ipcRenderer.removeListener("deep-link-token", callback)
  },
})
*/

//new code, added to remove the listener when the component unmounts and to avoid memory leaks. 
// This is important because if the listener is not removed, it can lead to multiple listeners 
// being registered and can cause unexpected behavior in the application.

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  onDeepLinkToken: (callback) => {
    const listener = (event, token) => callback(token) 
    ipcRenderer.on('deep-link-token', listener)
    return () => ipcRenderer.removeListener('deep-link-token', listener)
  },
})


