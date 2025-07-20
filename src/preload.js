//@ts-nocheck
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Expose file operations to renderer process
contextBridge.exposeInMainWorld("fileAPI", {
  writeFile: (filename, data) =>
    ipcRenderer.invoke("file:write", filename, data),
  readFile: (filename) => ipcRenderer.invoke("file:read", filename),
});

contextBridge.exposeInMainWorld("electronAPI", {
  onAppWillQuit: (callback) => {
    ipcRenderer.on("app-will-quit", callback);
  },
  stateSaved: () => {
    ipcRenderer.send("state-saved");
  },
});
