/**
 * Recursively loads programs from a directory
 * @param {Object.<string, any>} registry - Registry to populate
 * @param {string} dirPath - Directory path relative to programs/
 * @param {string} namespace - Namespace prefix for program names
 */
async function loadFromDirectory(registry, dirPath = "", namespace = "") {
  try {
    // @ts-ignore - Use Electron's file API to list directory contents
    const items = await window.fileAPI.listDirectory(
      `programs${dirPath ? "/" + dirPath : ""}`,
    );

    for (const item of items) {
      if (item.endsWith(".js")) {
        // Load JavaScript file
        const fullProgramName = namespace ? `${namespace}/${item}` : item;
        const importPath = `./programs${dirPath ? "/" + dirPath : ""}/${item}`;

        try {
          const module = await import(importPath);
          const ProgramClass = Object.values(module).find(
            /** @param {any} export_ */
            (export_) =>
              export_?.prototype &&
              export_.prototype.constructor.name === "Program",
          );
          registry[fullProgramName] = ProgramClass || null;
        } catch (error) {
          console.error(`Failed to load program ${importPath}:`, error);
          registry[fullProgramName] = null;
        }
      } else {
        // Recurse into subdirectory
        const subDirPath = dirPath ? `${dirPath}/${item}` : item;
        const subNamespace = namespace ? `${namespace}/${item}` : item;
        await loadFromDirectory(registry, subDirPath, subNamespace);
      }
    }
  } catch (error) {
    console.error(`Failed to load programs from directory ${dirPath}:`, error);
  }
}

/**
 * Dynamically loads all program files from src/programs/ including subdirectories
 * @returns {Promise<Object.<string, (typeof import("./program.js").AbstractProgram | null)>>}
 */
async function loadPrograms() {
  /** @type {Object.<string, (typeof import("./program.js").AbstractProgram | null)>} */
  const registry = {};
  await loadFromDirectory(registry);
  return registry;
}

/** @type{Object.<string, (typeof import("./program.js").AbstractProgram | null)>} */
export const programRegistry = await loadPrograms();
/**
 * Example of what programRegistry looks like:
 * {
 *   "history": HistoryProgram,
 *   "paint": PaintProgram,
 *   "stateEditor": StateEditorProgram,
 *   "stateVisualizer": StateVisualizerProgram,
 *   "textStyleEditor": TextStyleEditorProgram,
 *   "system/image": ImageProgram,
 *   "system/text": TextProgram
 * }
 */
