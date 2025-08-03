// electron/preload.js (or public/preload.js)
const { contextBridge, ipcRenderer } = require('electron');

console.log("Preload script is running!");

contextBridge.exposeInMainWorld('electronAPI', {
  onUpdateLoading: (callback) => {
    console.log("Setting up update-loading listener");
    ipcRenderer.on('update-loading', (event, message) => {
      console.log("Preload received update-loading:", message);
      callback(event, message);
    });
  },
  onHideLoading: (callback) => {
    console.log("Setting up hide-loading listener");
    ipcRenderer.on('hide-loading', (event) => {
      console.log("Preload received hide-loading");
      callback(event);
    });
  },
  // Add a method to remove listeners
  removeAllListeners: (channel) => {
    console.log("Removing listeners for:", channel);
    ipcRenderer.removeAllListeners(channel);
  }
});

console.log("Preload script completed, electronAPI exposed");