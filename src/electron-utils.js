/// <reference path="./electron.d.ts" />

/**
 * Utility functions for type-safe Electron API usage
 */

/**
 * Type guard to check if fileAPI is available
 * @returns {boolean}
 */
export function isFileAPIAvailable() {
  return typeof window !== 'undefined' && 
         window.fileAPI && 
         typeof window.fileAPI === 'object';
}

/**
 * Type guard to check if electronAPI is available
 * @returns {boolean}
 */
export function isElectronAPIAvailable() {
  return typeof window !== 'undefined' && 
         window.electronAPI && 
         typeof window.electronAPI === 'object';
}

/**
 * Safe wrapper for fileAPI operations with error handling
 * @template T
 * @param {() => Promise<T>} operation
 * @returns {Promise<{success: boolean, data?: T, error?: string}>}
 */
export async function safeFileOperation(operation) {
  if (!isFileAPIAvailable()) {
    return {
      success: false,
      error: 'File API not available - not running in Electron context'
    };
  }

  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    console.error('File operation failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

/**
 * Safe wrapper for reading files with fallback
 * @param {string} filename
 * @param {any} fallback
 * @returns {Promise<any>}
 */
export async function safeReadFile(filename, fallback = null) {
  const result = await safeFileOperation(() => window.fileAPI.readFile(filename));
  return result.success ? result.data : fallback;
}

/**
 * Safe wrapper for writing files
 * @param {string} filename
 * @param {string | object | Buffer} data
 * @returns {Promise<{success: boolean, path?: string, error?: string}>}
 */
export async function safeWriteFile(filename, data) {
  const result = await safeFileOperation(() => window.fileAPI.writeFile(filename, data));
  if (result.success && result.data) {
    return { success: true, path: result.data.path };
  }
  return { success: false, error: result.error };
}

/**
 * Safe wrapper for image upload with validation
 * @param {string} [mediaSavePath]
 * @returns {Promise<{success: boolean, image?: import('./electron.d.ts').ImageSelectResult, error?: string}>}
 */
export async function safeImageUpload(mediaSavePath) {
  const result = await safeFileOperation(() => 
    window.fileAPI.uploadImageFromDialog(mediaSavePath)
  );
  
  if (result.success && result.data) {
    if (result.data.canceled) {
      return { success: false, error: 'User canceled image selection' };
    }
    if (!result.data.success) {
      return { success: false, error: 'Image upload failed' };
    }
    return { success: true, image: result.data };
  }
  
  return { success: false, error: result.error };
}

/**
 * Safe wrapper for getting image dimensions
 * @param {string} imagePath
 * @returns {Promise<{width: number, height: number}>}
 */
export async function safeGetImageDimensions(imagePath) {
  const result = await safeFileOperation(() => 
    window.fileAPI.getImageDimensions(imagePath)
  );
  
  if (result.success && result.data?.success) {
    return { width: result.data.width, height: result.data.height };
  }
  
  // Return fallback dimensions
  return { width: 200, height: 200 };
}

/**
 * Setup theme change listener with cleanup
 * @param {(isDark: boolean) => void} callback
 * @returns {() => void} Cleanup function
 */
export function setupThemeListener(callback) {
  if (!isElectronAPIAvailable()) {
    console.warn('Electron API not available - theme changes will not be detected');
    return () => {};
  }

  const listener = window.electronAPI.onThemeChanged(callback);
  
  return () => {
    window.electronAPI.removeThemeListener(listener);
  };
}

/**
 * Get the current system theme safely
 * @returns {Promise<boolean>} true if dark theme
 */
export async function getSystemTheme() {
  const result = await safeFileOperation(() => window.fileAPI.getSystemTheme());
  return result.success ? Boolean(result.data) : false;
}