//@ts-nocheck
const {
  app,
  BrowserWindow,
  ipcMain,
  dialog,
  nativeTheme,
} = require("electron");
const path = require("node:path");
const fs = require("fs").promises;
const reloader = require("electron-reloader");
const chokidar = require("chokidar");

reloader(module, { ignore: "**/local/**" });

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
      webviewTag: true, // for some reason, turning this on automatically makes iframes into webviews which are able to access cross-origin sites
    },
  });

  mainWindow.maximize();

  // and load the index.html of the app.
  mainWindow.loadFile(path.join(__dirname, "../core/index.html"));

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

  // Send initial theme state to renderer
  mainWindow.webContents.once("did-finish-load", () => {
    mainWindow.webContents.send(
      "theme-changed",
      nativeTheme.shouldUseDarkColors,
    );
  });

  // Listen for system theme changes
  nativeTheme.on("updated", () => {
    mainWindow.webContents.send(
      "theme-changed",
      nativeTheme.shouldUseDarkColors,
    );
  });

  chokidar.watch(userPath).on("all", (event, path) => {
    mainWindow.webContents.send("file-changed", event, path);
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

const arg = process.argv[2];
const cwd = process.cwd();
const userPath = `${cwd}/${arg}`;

chokidar.watch(userPath).on("all", (event, path) => {
  console.log(event, path);
});

// -----------------------------
// ## File Processing
// -----------------------------

// Helper function to get file path in user data directory
function getFilePath(filename) {
  return path.join(userPath, filename);
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

// Helper function to generate unique filename with auto-incrementing suffix
async function getUniqueFilename(basePath, filename) {
  const ext = path.extname(filename);
  const nameWithoutExt = path.basename(filename, ext);

  let counter = 0;
  let finalFilename = filename;
  let finalPath = path.join(basePath, finalFilename);

  // Check if file exists and increment counter until we find a unique name
  while (true) {
    try {
      await fs.access(getFilePath(path.join(basePath, finalFilename)));
      // File exists, increment counter
      counter++;
      finalFilename = `${nameWithoutExt}(${counter})${ext}`;
    } catch (error) {
      // File doesn't exist, we can use this name
      break;
    }
  }

  return finalFilename;
}

// Helper function to get image dimensions from buffer
async function getImageDimensions(buffer) {
  // Simple image dimension detection for common formats
  // This is a basic implementation - for production, consider using a library like 'image-size'

  if (buffer.length < 24) {
    return { width: 200, height: 200 }; // fallback
  }

  // PNG detection
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47
  ) {
    const width = buffer.readUInt32BE(16);
    const height = buffer.readUInt32BE(20);
    return { width, height };
  }

  // JPEG detection
  if (buffer[0] === 0xff && buffer[1] === 0xd8) {
    let offset = 2;
    while (offset < buffer.length - 8) {
      if (buffer[offset] === 0xff) {
        const marker = buffer[offset + 1];
        if (marker >= 0xc0 && marker <= 0xc3) {
          const height = buffer.readUInt16BE(offset + 5);
          const width = buffer.readUInt16BE(offset + 7);
          return { width, height };
        }
        const segmentLength = buffer.readUInt16BE(offset + 2);
        offset += 2 + segmentLength;
      } else {
        offset++;
      }
    }
  }

  // GIF detection
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    const width = buffer.readUInt16LE(6);
    const height = buffer.readUInt16LE(8);
    return { width, height };
  }

  // BMP detection
  if (buffer[0] === 0x42 && buffer[1] === 0x4d) {
    const width = buffer.readUInt32LE(18);
    const height = buffer.readUInt32LE(22);
    return { width, height };
  }

  // WebP detection
  if (
    buffer[0] === 0x52 &&
    buffer[1] === 0x49 &&
    buffer[2] === 0x46 &&
    buffer[3] === 0x46 &&
    buffer[8] === 0x57 &&
    buffer[9] === 0x45 &&
    buffer[10] === 0x42 &&
    buffer[11] === 0x50
  ) {
    // Simple WebP VP8 format
    if (buffer[12] === 0x56 && buffer[13] === 0x50 && buffer[14] === 0x38) {
      const width =
        ((buffer[26] | (buffer[27] << 8) | (buffer[28] << 16)) & 0x3fff) + 1;
      const height =
        (((buffer[28] >> 2) | (buffer[29] << 6) | (buffer[30] << 14)) &
          0x3fff) +
        1;
      return { width, height };
    }
  }

  // Fallback dimensions
  return { width: 200, height: 200 };
}

// Write file function
async function writeFile(filename, data) {
  try {
    const filePath = getFilePath(filename);
    await ensureDirectory(filePath);

    let content, encoding;

    if (Buffer.isBuffer(data)) {
      // Binary data (images, etc.)
      content = data;
      encoding = null;
    } else if (typeof data === "object") {
      // JSON objects
      content = JSON.stringify(data, null, 2);
      encoding = "utf8";
    } else {
      // Text data
      content = data;
      encoding = "utf8";
    }

    await fs.writeFile(filePath, content, encoding);
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

ipcMain.handle("file:userPath", async (event) => {
  return userPath;
});

// Dialog handler for file selection
ipcMain.handle("dialog:showOpenDialog", async (event, options) => {
  try {
    const result = await dialog.showOpenDialog(options);
    return result;
  } catch (error) {
    throw error;
  }
});

// Select image from dialog handler
ipcMain.handle(
  "image:selectFromDialog",
  async (event, mediaSavePath = "user/media") => {
    try {
      // Show file dialog for image selection
      const result = await dialog.showOpenDialog({
        properties: ["openFile"],
        filters: [
          {
            name: "Images",
            extensions: ["jpg", "jpeg", "png", "gif", "bmp", "webp"],
          },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const sourcePath = result.filePaths[0];
      const originalFilename = path.basename(sourcePath);

      // Generate unique filename in media directory
      const uniqueFilename = await getUniqueFilename(
        mediaSavePath,
        originalFilename,
      );
      const targetPath = path.join(mediaSavePath, uniqueFilename);

      // Read source file
      const imageData = await fs.readFile(sourcePath);

      // Get image dimensions
      const dimensions = await getImageDimensions(imageData);

      // Write to media directory
      await writeFile(targetPath, imageData);

      return {
        success: true,
        filename: uniqueFilename,
        path: getFilePath(targetPath),
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      console.error("Error selecting image from dialog:", error);
      throw error;
    }
  },
);

// Save image from buffer handler
ipcMain.handle(
  "image:saveFromBuffer",
  async (event, imageBuffer, mimeType, mediaSavePath = "user/media") => {
    try {
      // Determine file extension from MIME type
      const extensionMap = {
        "image/png": "png",
        "image/jpeg": "jpg",
        "image/jpg": "jpg",
        "image/gif": "gif",
        "image/bmp": "bmp",
        "image/webp": "webp",
      };

      const extension = extensionMap[mimeType] || "png";
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const originalFilename = `pasted-image-${timestamp}.${extension}`;

      // Generate unique filename in media directory
      const uniqueFilename = await getUniqueFilename(
        mediaSavePath,
        originalFilename,
      );
      const targetPath = path.join(mediaSavePath, uniqueFilename);

      // Convert ArrayBuffer to Buffer and get dimensions
      const buffer = Buffer.from(imageBuffer);
      const dimensions = await getImageDimensions(buffer);

      // Write image buffer to media directory
      await writeFile(targetPath, buffer);

      return {
        success: true,
        filename: uniqueFilename,
        path: getFilePath(targetPath),
        width: dimensions.width,
        height: dimensions.height,
      };
    } catch (error) {
      console.error("Error saving image from buffer:", error);
      throw error;
    }
  },
);

// Get image dimensions handler
ipcMain.handle("image:getDimensions", async (event, imagePath) => {
  try {
    // Handle both absolute paths and relative paths from assets
    let fullPath;
    if (path.isAbsolute(imagePath)) {
      fullPath = imagePath;
    } else {
      // For relative paths like "assets/sun-cat.jpg", resolve from app directory
      fullPath = path.join(__dirname, imagePath);
    }

    const imageData = await fs.readFile(fullPath);
    const dimensions = await getImageDimensions(imageData);

    return {
      success: true,
      width: dimensions.width,
      height: dimensions.height,
    };
  } catch (error) {
    console.error("Error getting image dimensions:", error);
    return {
      success: false,
      width: 200,
      height: 200,
    };
  }
});

// Get system theme handler
ipcMain.handle("theme:getSystemTheme", () => {
  return nativeTheme.shouldUseDarkColors;
});

/**
 * @param {String} dirPath - path to recursively search for files in directory. If this is a relative path, it assumes it is within userPath
 * @return {Promise<String[]>} - list of relative paths of HTML files based on userPath
 */
async function getHtmlFileRelativePaths(dirPath) {
  try {
    // Resolve relative paths from the app directory
    const fullPath = path.join(userPath, dirPath);
    const items = await fs.readdir(fullPath, { withFileTypes: true });

    const htmlFilePaths = [];
    for (const item of items) {
      const itemRelativePath = path.join(dirPath, item.name);
      if (item.isDirectory()) {
        const itemHtmlFilePaths =
          await getHtmlFileRelativePaths(itemRelativePath);
        htmlFilePaths.push(...itemHtmlFilePaths);
      } else if (item.isFile() && path.extname(item.name) === ".html") {
        htmlFilePaths.push(itemRelativePath);
      }
    }
    return htmlFilePaths;
  } catch (error) {
    console.error("Error listing directory:", error);
    return [];
  }
}

// List directory contents handler
ipcMain.handle("file:getHtmlFileRelativePaths", async (event, dirPath) => {
  return await getHtmlFileRelativePaths("");
});
