import { programRegistry } from "./programRegistry.js";

export class ProgramManager {
  /** @type{Map<number,import("./programBase.js").ProgramBase>}*/
  #programs;

  constructor() {
    this.#programs = new Map();
  }

  /** Get an instance of a program based on an ID
   * @param {Number} id
   * @returns {import("./programBase.js").ProgramBase | undefined}
   */
  get(id) {
    return this.#programs.get(id);
  }

  /**
   * Synchronizes program instances with current block state
   * - Initializes programs for new blocks
   * - Cleans up programs for deleted blocks
   * - Updates block state from mounted programs
   * @param {import("hyperapp").Dispatch<State>} dispatch
   * @param {State} state
   */
  syncPrograms(dispatch, state) {
    this.#initializePrograms(state.blocks);
    this.#cleanupDeletedPrograms(state.blocks);
    this.#syncProgramStates(state.blocks);
    this.#initializeConnections(state.connections);
  }

  /**
   * @param {Number} id
   * @param {String} name
   */
  #initializeProgram(id, name) {
    const Program = programRegistry[name];
    if (Program) {
      const programInstance = new Program();
      programInstance.setId(id);
      this.#programs.set(id, programInstance);
    }
  }

  /**
   * Removes program instances for blocks that no longer exist
   * @param {Block[]} blocks - Current blocks array
   */
  #initializePrograms(blocks) {
    for (const block of blocks) {
      if (!this.#programs.has(block.id)) {
        this.#initializeProgram(block.id, block.programData.name);
      }
    }
  }

  /**
   * Removes program instances for blocks that no longer exist
   * @param {Block[]} blocks - Current blocks array
   */
  #cleanupDeletedPrograms(blocks) {
    const activeBlockIds = new Set(blocks.map((block) => block.id));

    for (const programId of this.#programs.keys()) {
      if (!activeBlockIds.has(programId)) {
        this.#programs.delete(programId);
      }
    }
  }

  /**
   * Updates block program state from mounted program instances
   * Writes directly to the new state of the block
   * @param {Block[]} blocks - Current blocks array
   */
  #syncProgramStates(blocks) {
    for (const block of blocks) {
      const program = this.#programs.get(block.id);
      if (program?.isMounted()) {
        block.programData.state = program.getState();
      }
    }
  }

  /**
   * Initialzie connections for programs
   * @param {BlockConnection[]} connections - Current blocks array
   */
  #initializeConnections(connections) {
    for (const connection of connections) {
      const sourceProgram = this.get(connection.sourceBlockId);
      const targetProgram = this.get(connection.targetBlockId);

      if (
        sourceProgram &&
        targetProgram &&
        !sourceProgram.getConnection(connection.name)
      ) {
        sourceProgram.setConnection(connection.name, targetProgram);
      }
    }
  }
}

/**
 * Renders a program instance into its DOM element
 * @param {Block} block - Block containing the program to render
 * @param {import("./programManager.js").ProgramManager} programManager
 * @returns {void}
 */
export function mountProgram(block, programManager) {
  const programComponent = document.querySelector(
    `program-component[data-id="${block.id}"]`,
  );
  const targetElement = /** @type {HTMLElement} */ (
    programComponent?.shadowRoot?.firstElementChild
  );
  const programInstance = programManager.get(block.id);

  if (targetElement && targetElement.localName === "program-component-child") {
    if (programInstance) {
      try {
        programInstance.mount(targetElement, block.programData.state);
      } catch (error) {
        console.warn(`Failed to run program for block ${block.id}:`, error);
      }
    } else {
      targetElement.style.color = "red";
      targetElement.style.fontWeight = "bold";
      targetElement.innerText = `ERROR: program '${block.programData.name}' not initialized.`;
    }
  }
}

/**
 * Custom element that wraps program instances with shadow DOM
 */
class ProgramComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = "";
    const el = document.createElement("program-component-child");
    this.shadowRoot.appendChild(el);
  }
}

/**
 * Child element that serves as the target for program rendering
 */
class ProgramComponentChild extends HTMLElement {
  constructor() {
    super();
  }
}

customElements.define("program-component", ProgramComponent);
customElements.define("program-component-child", ProgramComponentChild);
