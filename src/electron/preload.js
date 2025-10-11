/// <reference path="./electron.d.ts" />

// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

const { contextBridge, ipcRenderer } = require("electron");

// Expose file operations to renderer process
/** @type {import('./electron.js').FileAPI} */
const fileAPI = {
  writeFile: (
    /** @type {string} */ filename,
    /** @type {string | object | Buffer} */ data,
  ) => ipcRenderer.invoke("file:write", filename, data),
  readFile: (/** @type {string} */ filename) =>
    ipcRenderer.invoke("file:read", filename),
  showOpenDialog: (
    /** @type {import('./electron.js').DialogOptions} */ options,
  ) => ipcRenderer.invoke("dialog:showOpenDialog", options),
  uploadImageFromDialog: (/** @type {string} */ mediaSavePath = "user/media") =>
    ipcRenderer.invoke("image:selectFromDialog", mediaSavePath),
  saveImageFromBuffer: (
    /** @type {ArrayBuffer} */ imageBuffer,
    /** @type {string} */ mimeType,
    /** @type {string} */ mediaSavePath = "user/media",
  ) =>
    ipcRenderer.invoke(
      "image:saveFromBuffer",
      imageBuffer,
      mimeType,
      mediaSavePath,
    ),
  getImageDimensions: (/** @type {string} */ imagePath) =>
    ipcRenderer.invoke("image:getDimensions", imagePath),
  getSystemTheme: () => ipcRenderer.invoke("theme:getSystemTheme"),
  listDirectory: (/** @type {string} */ dirPath) =>
    ipcRenderer.invoke("file:listDirectory", dirPath),
};

contextBridge.exposeInMainWorld("fileAPI", fileAPI);

/** @type {import('./electron.js').ElectronAPI} */
const electronAPI = {
  onAppWillQuit: (/** @type {() => void} */ callback) => {
    ipcRenderer.on("app-will-quit", callback);
  },
  stateSaved: () => {
    ipcRenderer.send("state-saved");
  },
  onThemeChanged: (/** @type {(isDark: boolean) => void} */ callback) => {
    const listener = (
      /** @type {any} */ _event,
      /** @type {boolean} */ isDark,
    ) => callback(isDark);
    ipcRenderer.on("theme-changed", listener);
    return listener; // Return the listener so it can be removed later
  },
  removeThemeListener: (
    /** @type {(event: any, isDark: boolean) => void} */ listener,
  ) => {
    ipcRenderer.removeListener("theme-changed", listener);
  },
};

contextBridge.exposeInMainWorld("electronAPI", electronAPI);
