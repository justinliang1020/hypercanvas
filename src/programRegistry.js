/**
 * Dynamically loads all program files from src/programs/
 * @returns {Promise<Object.<string, (typeof import("./abstractProgram.js").AbstractProgram | null)>>}
 */
async function loadPrograms() {
  /** @type {Object.<string, (typeof import("./abstractProgram.js").AbstractProgram | null)>} */
  const registry = {};

  try {
    // @ts-ignore - Use Electron's file API to list directory contents
    const files = await window.fileAPI.listDirectory("programs");

    for (const file of files) {
      const programName = file.replace(".js", "");
      try {
        const module = await import(`./programs/${file}`);
        // Find the exported Program class (assumes one Program class per file)
        const ProgramClass = Object.values(module).find(
          /** @param {any} export_ */
          (export_) =>
            export_?.prototype &&
            export_.prototype.constructor.name === "Program",
        );
        if (ProgramClass) {
          registry[programName] =
            /** @type {typeof import("./abstractProgram.js").AbstractProgram} */ (
              ProgramClass
            );
        }
      } catch (error) {
        console.error(`Failed to load program ${file}:`, error);
        registry[programName] = null;
      }
    }
  } catch (error) {
    console.error("Failed to load programs directory:", error);
  }

  return registry;
}

/** @type{Object.<string, (typeof import("./abstractProgram.js").AbstractProgram | null)>} */
export const programRegistry = await loadPrograms();
