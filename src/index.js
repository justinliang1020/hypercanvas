//@ts-nocheck
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("node:path");
const fs = require("fs").promises;

try {
  require("electron-reloader")(module);
} catch {}

// Handle creating/removing shortcuts on Windows when installing/uninstalling.
if (require("electron-squirrel-startup")) {
  app.quit();
}

const createWindow = () => {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Open the DevTools.
  // mainWindow.webContents.openDevTools();

  return mainWindow;
};

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  const mainWindow = createWindow();

  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  // Prevent quit and ask renderer to save state
  app.on("before-quit", (event) => {
    event.preventDefault();

    // Ask renderer to save state
    mainWindow.webContents.send("app-will-quit");
  });

  // Listen for renderer confirmation that state is saved
  ipcMain.on("state-saved", () => {
    app.exit(); // Force quit after state is saved
  });
});

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on("window-all-closed", () => {
  app.quit();
  // if (process.platform !== "darwin") {
  //   app.quit();
  // }
});

// Get the user data directory (AppData on Windows, equivalent on other platforms)
const userDataPath = app.getPath("userData");

// Helper function to get file path in user data directory
function getFilePath(filename) {
  return path.join(userDataPath, filename);
}

// Helper function to ensure directory exists
async function ensureDirectory(filePath) {
  const dir = path.dirname(filePath);
  try {
    await fs.access(dir);
  } catch (error) {
    await fs.mkdir(dir, { recursive: true });
  }
}

// Write file function
async function writeFile(filename, data) {
  try {
    const filePath = getFilePath(filename);
    await ensureDirectory(filePath);

    // Convert data to string if it's an object
    const content =
      typeof data === "object" ? JSON.stringify(data, null, 2) : data;

    await fs.writeFile(filePath, content, "utf8");
    console.log(`File written successfully: ${filePath}`);
    return { success: true, path: filePath };
  } catch (error) {
    console.error("Error writing file:", error);
    throw error;
  }
}

// Read file function
async function readFile(filename) {
  try {
    const filePath = getFilePath(filename);
    const data = await fs.readFile(filePath, "utf8");

    // Try to parse as JSON, return as string if parsing fails
    try {
      return JSON.parse(data);
    } catch (parseError) {
      return data;
    }
  } catch (error) {
    if (error.code === "ENOENT") {
      console.log(`File not found: ${filename}`);
      return null;
    }
    console.error("Error reading file:", error);
    throw error;
  }
}

// IPC handlers for renderer process communication
ipcMain.handle("file:write", async (event, filename, data) => {
  try {
    return await writeFile(filename, data);
  } catch (error) {
    throw error;
  }
});

ipcMain.handle("file:read", async (event, filename) => {
  try {
    return await readFile(filename);
  } catch (error) {
    throw error;
  }
});

// Export functions for use in other parts of main process
module.exports = {
  writeFile,
  readFile,
};
