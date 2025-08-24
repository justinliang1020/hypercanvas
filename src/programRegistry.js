/**
 * Recursively loads programs from a directory
 * @param {ProgramRegistry} registry - Registry to populate
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
          registry[fullProgramName] = {};
          const module = await import(importPath);
          const ProgramClass = Object.values(module).find(
            /** @param {any} export_ */
            (export_) =>
              export_?.prototype &&
              export_.prototype.constructor.name === "Program",
          );
          registry[fullProgramName]["program"] = ProgramClass;
          const EditorClass = Object.values(module).find(
            /** @param {any} export_ */
            (export_) =>
              export_?.prototype &&
              export_.prototype.constructor.name === "Editor",
          );
          registry[fullProgramName]["editor"] = EditorClass || null;
        } catch (error) {
          console.error(`Failed to load program ${importPath}:`, error);
          registry[fullProgramName] = {};
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
 * @returns {Promise<ProgramRegistry>}
 */
async function loadPrograms() {
  /** @type {ProgramRegistry} */
  const registry = {};
  await loadFromDirectory(registry);
  return registry;
}

/** @type {ProgramRegistry} */
export const programRegistry = await loadPrograms();
