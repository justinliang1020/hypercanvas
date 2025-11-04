/// <reference path="./electron.d.ts" />

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Expose file operations to renderer process
/** @type {import('./electron.js').FileAPI} */
const fileAPI = {
  writeFile: (filename, data) =>
    ipcRenderer.invoke("file:write", filename, data),
  readFile: (filename) => ipcRenderer.invoke("file:read", filename),
  getUserPath: () => ipcRenderer.invoke("file:userPath"),
  showOpenDialog: (options) =>
    ipcRenderer.invoke("dialog:showOpenDialog", options),
  uploadImageFromDialog: (mediaSavePath = "user/media") =>
    ipcRenderer.invoke("image:selectFromDialog", mediaSavePath),
  saveImageFromBuffer: (imageBuffer, mimeType, mediaSavePath = "user/media") =>
    ipcRenderer.invoke(
      "image:saveFromBuffer",
      imageBuffer,
      mimeType,
      mediaSavePath,
    ),
  getImageDimensions: (imagePath) =>
    ipcRenderer.invoke("image:getDimensions", imagePath),
  getSystemTheme: () => ipcRenderer.invoke("theme:getSystemTheme"),
};

contextBridge.exposeInMainWorld("fileAPI", fileAPI);

/** @type {import('./electron.js').ElectronAPI} */
const electronAPI = {
  onAppWillQuit: (callback) => {
    ipcRenderer.on("app-will-quit", callback);
  },
  stateSaved: () => {
    ipcRenderer.send("state-saved");
  },
  onThemeChanged: (callback) => {
    const listener = (
      /** @type {import("electron").IpcRendererEvent} */ _event,
      /** @type {boolean} */ isDark,
    ) => callback(isDark);
    ipcRenderer.on("theme-changed", listener);
    return listener; // Return the listener so it can be removed later
  },
  onUserFilesChanged: (callback) => {
    const listener = (
      /** @type {import("electron").IpcRendererEvent} */ _event,
      /** @type {import("chokidar/handler.js").EventName} */ chokidarEvent,
      /** @type {string} */ path,
    ) => callback(chokidarEvent, path);
    ipcRenderer.on("file-changed", listener);
    return listener;
  },
  removeThemeListener: (listener) => {
    ipcRenderer.removeListener("theme-changed", listener);
  },
  removeUserFilesListener: (listener) => {
    ipcRenderer.removeListener("file-changed", listener);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
