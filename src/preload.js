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
  uploadImageFromDialog: (mediaSavePath) =>
    ipcRenderer.invoke("image:selectFromDialog", mediaSavePath),
  saveImageFromBuffer: (imageBuffer, mimeType, mediaSavePath) =>
    ipcRenderer.invoke(
      "image:saveFromBuffer",
      imageBuffer,
      mimeType,
      mediaSavePath,
    ),
  getImageDimensions: (imagePath) =>
    ipcRenderer.invoke("image:getDimensions", imagePath),
  getSystemTheme: () => ipcRenderer.invoke("theme:getSystemTheme"),
  listDirectory: (dirPath) => ipcRenderer.invoke("file:listDirectory", dirPath),
});

contextBridge.exposeInMainWorld("electronAPI", {
  onAppWillQuit: (callback) => {
    ipcRenderer.on("app-will-quit", callback);
  },
  stateSaved: () => {
    ipcRenderer.send("state-saved");
  },
  onThemeChanged: (callback) => {
    const listener = (event, isDark) => callback(isDark);
    ipcRenderer.on("theme-changed", listener);
    return listener; // Return the listener so it can be removed later
  },
  removeThemeListener: (listener) => {
    ipcRenderer.removeListener("theme-changed", listener);
  },
});
