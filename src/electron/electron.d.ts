/**
 * TypeScript declarations for Electron API exposed through preload script
 */

export interface FileWriteResult {
  success: boolean;
  path: string;
}

export interface ImageSelectResult {
  success?: boolean;
  canceled?: boolean;
  filename?: string;
  path?: string;
  width?: number;
  height?: number;
}

export interface ImageDimensionsResult {
  success: boolean;
  width: number;
  height: number;
}

export interface DialogResult {
  canceled: boolean;
  filePaths: string[];
}

export interface DialogOptions {
  properties?: string[];
  filters?: Array<{
    name: string;
    extensions: string[];
  }>;
  defaultPath?: string;
  title?: string;
}

export interface FileAPI {
  /**
   * Write data to a file in the user data directory
   * @param filename - Relative path from user data directory
   * @param data - Data to write (string, object, or Buffer)
   * @returns Promise with write result
   */
  writeFile(
    filename: string,
    data: string | object | Buffer,
  ): Promise<FileWriteResult>;

  /**
   * Read data from a file in the user data directory
   * @param filename - Relative path from user data directory
   * @returns Promise with file contents (parsed as JSON if possible, otherwise string)
   */
  readFile(filename: string): Promise<any>;

  /**
   * Get absolute path of a file in the user data directory
   * @returns Promise with absolute file path
   * */
  getUserPath(): Promise<string>;

  /**
   * Show native file open dialog
   * @param options - Dialog configuration options
   * @returns Promise with dialog result
   */
  showOpenDialog(options: DialogOptions): Promise<DialogResult>;

  /**
   * Select and upload an image from dialog, saving to media directory
   * @param mediaSavePath - Relative path to save images (default: "user/media")
   * @returns Promise with image upload result
   */
  uploadImageFromDialog(mediaSavePath?: string): Promise<ImageSelectResult>;

  /**
   * Save image from buffer data to media directory
   * @param imageBuffer - Image data as ArrayBuffer
   * @param mimeType - MIME type of the image
   * @param mediaSavePath - Relative path to save images (default: "user/media")
   * @returns Promise with image save result
   */
  saveImageFromBuffer(
    imageBuffer: ArrayBuffer,
    mimeType: string,
    mediaSavePath?: string,
  ): Promise<ImageSelectResult>;

  /**
   * Get dimensions of an image file
   * @param imagePath - Path to image file (absolute or relative to app directory)
   * @returns Promise with image dimensions
   */
  getImageDimensions(imagePath: string): Promise<ImageDimensionsResult>;

  /**
   * Get system theme preference
   * @returns Promise with boolean indicating if dark theme is preferred
   */
  getSystemTheme(): Promise<boolean>;

  /**
   * List contents of a directory
   * @param dirPath - Directory path (absolute or relative to app directory)
   * @returns Promise with array of file/directory names
   */
  listDirectory(dirPath: string): Promise<string[]>;
}

export interface ElectronAPI {
  /**
   * Listen for app quit event to save state
   * @param callback - Function to call when app is about to quit
   */
  onAppWillQuit(callback: () => void): void;

  /**
   * Notify main process that state has been saved
   */
  stateSaved(): void;

  /**
   * Listen for system theme changes
   * @param callback - Function to call when theme changes (receives isDark boolean)
   * @returns The listener function for removal
   */
  onThemeChanged(
    callback: (isDark: boolean) => void,
  ): (event: any, isDark: boolean) => void;

  /**
   * Remove theme change listener
   * @param listener - The listener function returned by onThemeChanged
   */
  removeThemeListener(listener: (event: any, isDark: boolean) => void): void;
}

declare global {
  interface Window {
    fileAPI: FileAPI;
    electronAPI: ElectronAPI;
  }
}
