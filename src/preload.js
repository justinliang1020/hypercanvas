//@ts-nocheck
// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Expose file operations to renderer process
contextBridge.exposeInMainWorld("fileAPI", {
  writeFile: (filename, data) =>
    ipcRenderer.invoke("file:write", filename, data),
  readFile: (filename) => ipcRenderer.invoke("file:read", filename),
  showOpenDialog: (options) =>
    ipcRenderer.invoke("dialog:showOpenDialog", options),
  selectImageFromDialog: () => ipcRenderer.invoke("image:selectFromDialog"),
  saveImageFromBuffer: (imageBuffer, mimeType) =>
    ipcRenderer.invoke("image:saveFromBuffer", imageBuffer, mimeType),
});

contextBridge.exposeInMainWorld("electronAPI", {
  onAppWillQuit: (callback) => {
    ipcRenderer.on("app-will-quit", callback);
  },
  stateSaved: () => {
    ipcRenderer.send("state-saved");
  },
});
