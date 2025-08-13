import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";
import { programRegistry } from "./programRegistry.js";
import {
  STATE_SAVE_PATH,
  MEDIA_SAVE_PATH,
  PASTE_OFFSET_X,
  PASTE_OFFSET_Y,
} from "./constants.js";
import {
  createMementoManager,
  saveMementoAndReturn,
  undoState,
  redoState,
} from "./memento.js";
import { viewport } from "./viewport.js";

// -----------------------------
// ## Block Program Implementation
// -----------------------------

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

/**
 * Calculates viewport-relative coordinates for placing new blocks
 * @param {State} state - Current application state
 * @returns {{x: number, y: number}} Coordinates in the center of the current viewport
 */
function getViewportCenterCoordinates(state) {
  // Get viewport dimensions (assuming standard viewport, could be made more dynamic)
  const viewportWidth =
    window.innerWidth - (state.sidebarVisible ? state.sidebarWidth : 0);
  const viewportHeight = window.innerHeight;

  // Calculate center of viewport in screen coordinates
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  // Convert to canvas coordinates by accounting for zoom and offset
  const canvasX = (viewportCenterX - state.offsetX) / state.zoom;
  const canvasY = (viewportCenterY - state.offsetY) / state.zoom;

  return { x: canvasX, y: canvasY };
}

/**
 * Adds a new block to the state and renders its program
 * @param {State} state - Current application state
 * @param {string} programName - Name of program to instantiate
 * @param {Object|null} programState - Initial state for the program
 * @param {number | null} x - X position on canvas. If null, uses viewport's center X coordinate
 * @param {number | null} y - Y position on canvas. If null, uses viewport's center X coordinate
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with new block
 */
function addBlock(
  state,
  programName,
  programState = null,
  x = null,
  y = null,
  width = 200,
  height = 200,
) {
  // If no coordinates provided, use viewport center
  if (x === null || y === null) {
    const viewportCenter = getViewportCenterCoordinates(state);
    x = x ?? viewportCenter.x - width / 2; // Center the block
    y = y ?? viewportCenter.y - height / 2; // Center the block
  }
  /** @type {Block} */
  const newBlock = {
    id: Math.max(...state.blocks.map((block) => block.id), 0) + 1,
    width: width,
    height: height,
    x: x,
    y: y,
    zIndex: Math.max(...state.blocks.map((block) => block.zIndex), 0) + 1,
    programData: {
      name: programName,
      state: programState,
    },
  };

  const newState = {
    ...state,
    blocks: [...state.blocks, newBlock],
    selectedId: newBlock.id,
  };

  return saveMementoAndReturn(state, newState);
}

/**
 * Pastes a block from clipboard into the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with pasted block
 */
function pasteBlock(state) {
  const blockData = state.clipboard;
  if (blockData === null) {
    return state;
  }

  return addBlock(
    state,
    blockData.programData.name,
    blockData.programData.state,
    blockData.x + PASTE_OFFSET_X,
    blockData.y + PASTE_OFFSET_Y,
    blockData.width,
    blockData.height,
  );
}

// -----------------------------
// ## Utility
// -----------------------------

/**
 * Shows a notification message
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @param {string} message - Notification message to display
 */
function showNotification(dispatch, message) {
  dispatch((state) => ({
    ...state,
    notification: message,
    notificationVisible: true,
  }));

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    dispatch((state) => ({
      ...state,
      notificationVisible: false,
    }));
  }, 1500);
}

/**
 * Saves the application state to disk and shows success notification
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @param {State} state - Current application state to save
 * @returns {Promise<void>}
 */
export async function saveApplication(dispatch, state) {
  try {
    // Don't need to save mementoManager which is session undo/redo history
    const {
      mementoManager,
      notification,
      notificationVisible,
      ...serializableSaveState
    } = state;
    // Don't need to save session clipboard and notification state
    serializableSaveState.clipboard = null;

    // @ts-ignore
    await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);

    // Show success notification
    showNotification(dispatch, "State saved successfully!");
  } catch (error) {
    console.error("Failed to save application state:", error);
    showNotification(dispatch, "Failed to save state");
  }
}

/**
 * Copies the selected block to application clipboard
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with clipboard data
 */
export function copySelectedBlock(state) {
  if (state.selectedId === null) return state;

  const selectedBlock = state.blocks.find(
    (block) => block.id === state.selectedId,
  );
  if (!selectedBlock) return state;

  // Create a copy of the block data for clipboard, capturing current state
  /** @type {Block} */
  const blockData = {
    ...selectedBlock,
    id: -1, // not a "real" block
  };

  return [
    {
      ...state,
      clipboard: blockData,
    },
    clearUserClipboardEffect,
  ];
}

/**
 * Clear clipboard effect that clears the system clipboard
 * @type {import("hyperapp").Effect<State>}
 */
const clearUserClipboardEffect = async () => {
  try {
    await navigator.clipboard.writeText("");
  } catch (error) {
    console.error("Failed to clear clipboard:", error);
  }
};

/**
 * Effect that handles pasting content from clipboard (images or text)
 * @param {import("hyperapp").Dispatch<State>} dispatch
 * @param {State} state
 */
export const pasteEffect = async (dispatch, state) => {
  try {
    const clipboardItems = await navigator.clipboard.read();

    if (clipboardItems.length === 0) {
      dispatch((state) => state);
      return;
    }

    const item = clipboardItems[0];

    const imageTypes = item.types.filter((type) => type.startsWith("image/"));
    if (imageTypes.length > 0) {
      // Handle image paste
      const imageType = imageTypes[0];
      const blob = await item.getType(imageType);
      const arrayBuffer = await blob.arrayBuffer();

      try {
        // @ts-ignore
        const result = await window.fileAPI.saveImageFromBuffer(
          arrayBuffer,
          imageType,
          MEDIA_SAVE_PATH,
        );
        if (result.success) {
          dispatch((state) =>
            addBlock(
              state,
              "system/image",
              { path: result.path },
              null, // x - use viewport center
              null, // y - use viewport center
              result.width,
              result.height,
            ),
          );
          return;
        }
      } catch (error) {
        console.error("Failed to paste image:", error);
      }

      dispatch((state) => state);
      return;
    }

    const text = await navigator.clipboard.readText();
    if (text.trim() === "") {
      dispatch(pasteBlock(state));
      return;
    } else {
      /** @type {import("./programs/system/text.js").State} */
      const textProgramState = {
        text: text,
        backgroundColor: "transparent",
      };
      dispatch(addBlock(state, "system/text", textProgramState));
      return;
    }
  } catch (error) {
    console.error("Failed to read clipboard:", error);
    dispatch((state) => state);
  }
};

/**
 * Creates a connection line component between two blocks
 * @param {State} state - Current application state
 * @param {BlockConnection} connection - Connection data
 * @returns {import("hyperapp").ElementVNode<State>} Connection line element
 */
export function connectionLine(state, connection) {
  const sourceBlock = state.blocks.find(
    (b) => b.id === connection.sourceBlockId,
  );
  const targetBlock = state.blocks.find(
    (b) => b.id === connection.targetBlockId,
  );

  if (!sourceBlock || !targetBlock) {
    return h("div", {}); // Return empty div if blocks not found
  }

  // Calculate center points of blocks
  const sourceX = sourceBlock.x + sourceBlock.width / 2;
  const sourceY = sourceBlock.y + sourceBlock.height / 2;
  const targetX = targetBlock.x + targetBlock.width / 2;
  const targetY = targetBlock.y + targetBlock.height / 2;

  // Calculate line properties
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Scale line thickness inversely with zoom to maintain consistent visual appearance
  const lineThickness = 3 / state.zoom;

  return h("div", {
    key: `connection-${connection.sourceBlockId}-${connection.targetBlockId}`,
    style: {
      position: "absolute",
      left: `${sourceX}px`,
      top: `${sourceY}px`,
      width: `${length}px`,
      height: `${lineThickness}px`,
      backgroundColor: "#666",
      transformOrigin: "0 50%",
      transform: `rotate(${angle}deg)`,
      pointerEvents: "none",
      zIndex: "-1", // Behind blocks
    },
  });
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function programButtons(state) {
  const filterText = state.programFilter || "";
  const filteredPrograms = Object.keys(programRegistry).filter((programName) =>
    programName.toLowerCase().includes(filterText.toLowerCase()),
  );

  return h("div", {}, [
    h("h2", {}, text("add program")),
    h("input", {
      type: "text",
      placeholder: "Filter programs...",
      value: filterText,
      style: {
        width: "100%",
        marginBottom: "10px",
        padding: "8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
      },
      oninput: (state, event) => ({
        ...state,
        programFilter: /** @type {HTMLInputElement} */ (event.target).value,
      }),
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    }),
    ...filteredPrograms.map((programName) =>
      h(
        "button",
        {
          onclick: (state) => addBlock(state, programName),
        },
        text(`${programName.replaceAll("/", " / ")}`),
      ),
    ),
  ]);
}

/**
 * Creates a notification component that displays in the top middle
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>|null} Notification element or null if not visible
 */
function notification(state) {
  if (!state.notificationVisible || !state.notification) {
    return null;
  }

  return h(
    "div",
    {
      id: "notification",
    },
    [h("span", {}, text(state.notification))],
  );
}

/**
 * Creates the main application sidebar with action buttons
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Sidebar element
 */
function sidebar(state) {
  return h(
    "div",
    {
      id: "sidebar",
      class: {
        hidden: !state.sidebarVisible,
      },
      style: {
        pointerEvents: state.isBlockDragging ? "none" : "auto",
        width: `${state.sidebarWidth}px`,
      },
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    },
    [
      h(
        "button",
        {
          onclick: (state) => ({
            ...state,
            sidebarVisible: !state.sidebarVisible,
          }),
          title: "Toggle sidebar visibility",
        },
        text("◀"),
      ),
      h(
        "button",
        {
          onclick: undoState,
          disabled: state.mementoManager.undoStack.length === 0,
        },
        text("↶ Undo"),
      ),
      h(
        "button",
        {
          onclick: redoState,
          disabled: state.mementoManager.redoStack.length === 0,
        },
        text("↷ Redo"),
      ),
      h(
        "button",
        {
          onclick: (state) => [
            state,
            async (dispatch) => {
              try {
                const result =
                  // @ts-ignore
                  await window.fileAPI.uploadImageFromDialog(MEDIA_SAVE_PATH);
                if (!result.canceled && result.success) {
                  console.log(`Image uploaded: ${result.filename}`);
                  dispatch((state) =>
                    addBlock(
                      state,
                      "system/image",
                      { path: result.path },
                      null, // x - use viewport center
                      null, // y - use viewport center
                      result.width,
                      result.height,
                    ),
                  );
                }
              } catch (error) {
                console.error("Failed to upload image:", error);
                dispatch((state) => state);
              }
            },
          ],
        },
        text("upload image"),
      ),
      h(
        "button",
        {
          onclick: (state) => ({
            ...state,
            isDarkMode: !state.isDarkMode,
          }),
          title: "Toggle dark mode",
        },
        text(state.isDarkMode ? "☀️ Light" : "🌙 Dark"),
      ),
      h(
        "button",
        {
          onclick: (state) => [
            state,
            (dispatch) => saveApplication(dispatch, state),
          ],
        },
        text("save"),
      ),
      h("hr", {}),
      programButtons(state),
    ],
  );
}

/**
 * Creates the main application component with keyboard handling
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Main application element
 */
function main(state) {
  return h(
    "main",
    {
      style: {
        cursor: state.cursorStyle,
      },
      class: {
        "dark-mode": state.isDarkMode,
      },
    },
    [
      viewport(state),
      sidebar(state),
      notification(state),
      // Only show floating toggle button when sidebar is hidden
      ...(state.sidebarVisible
        ? []
        : [
            h(
              "button",
              {
                id: "sidebar-toggle",
                onclick: (state) => ({
                  ...state,
                  sidebarVisible: !state.sidebarVisible,
                }),
                title: "Show sidebar",
              },
              text("▶"),
            ),
          ]),
    ],
  );
}

// -----------------------------
// ## Program Instance Manager
// -----------------------------

class ProgramInstanceManager {
  /** @type{Map<number,import("./program.js").AbstractProgram>}*/
  #programs;

  constructor() {
    this.#programs = new Map();
  }

  /** Get an instance of a program based on an ID
   * @param {Number} id
   * @returns {import("./program.js").AbstractProgram | undefined}
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
      const sourceProgram = programInstanceManager.get(
        connection.sourceBlockId,
      );
      const targetProgram = programInstanceManager.get(
        connection.targetBlockId,
      );

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

// -----------------------------
// ## Initialization
// -----------------------------

const programInstanceManager = new ProgramInstanceManager();
/**
 * Initializes the application with saved state and starts the Hyperapp
 * @returns {Promise<void>}
 */
async function initialize() {
  /** @type {State} */
  const initialState = {
    selectedId: null,
    editingId: null,
    hoveringId: null,
    connectingId: null,
    resizing: null,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    zoom: 1,
    cursorStyle: "pointer",
    isViewportDragging: false,
    isBlockDragging: false,
    isShiftPressed: false,
    dragStart: null,
    resizeStart: null,
    mementoManager: createMementoManager(),
    isDarkMode: false,
    sidebarVisible: true,
    sidebarWidth: 400,
    blocks: [],
    connections: [],
    clipboard: null,
    programFilter: "",
    notification: null,
    notificationVisible: false,
  };

  /**
   * Renders a program instance into its DOM element
   * @param {Block} block - Block containing the program to render
   * @returns {void}
   */
  function mountProgram(block) {
    const programComponent = document.querySelector(
      `program-component[data-id="${block.id}"]`,
    );
    const targetElement = /** @type {HTMLElement} */ (
      programComponent?.shadowRoot?.firstElementChild
    );
    const programInstance = programInstanceManager.get(block.id);

    if (
      targetElement &&
      targetElement.localName === "program-component-child"
    ) {
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

  /** @type {State} */
  let state;
  try {
    // @ts-ignore
    state = await window.fileAPI.readFile(STATE_SAVE_PATH); // uncomment to have retained state
    if (!state) {
      state = initialState;
    }
    state.mementoManager = createMementoManager();
  } catch {
    state = initialState;
  }

  // Initialize dark mode based on system theme
  try {
    // @ts-ignore
    const systemIsDark = await window.fileAPI.getSystemTheme();
    state.isDarkMode = systemIsDark;
  } catch (error) {
    console.warn("Failed to get system theme, using default:", error);
  }

  let currentState = state;

  /**
   * Mutates state to remove inactive connections
   * @param {State} state
   */
  function deleteInactiveConnections(state) {
    const activeBlockIds = new Set(state.blocks.map((block) => block.id));
    const validConnections = state.connections.filter(
      (connection) =>
        activeBlockIds.has(connection.sourceBlockId) &&
        activeBlockIds.has(connection.targetBlockId),
    );
    state.connections = validConnections;
  }

  /**
   * Subscription that runs after DOM repaint to render programs and handle dark mode
   * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
   * @param {State} state
   * @returns {() => void} Cleanup function
   */
  function subscription(dispatch, state) {
    deleteInactiveConnections(state);
    programInstanceManager.syncPrograms(dispatch, state);

    // Schedule callback for after the current hyperapp paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        state.blocks.forEach((block) => {
          mountProgram(block);
        });
      });
    });

    // Store current state for save functionality
    currentState = state;

    // Return cleanup function (required for subscriptions)
    return () => {};
  }

  /**
   * Subscription that listens for system theme changes
   * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
   * @param {State} state
   * @returns {() => void} Cleanup function
   */
  function themeSubscription(dispatch, state) {
    /**
     * @param {boolean} isDark - Whether the system theme is dark
     */
    const handleThemeChange = (isDark) => {
      dispatch((state) => ({
        ...state,
        isDarkMode: isDark,
      }));
    };

    // @ts-ignore
    const listener = window.electronAPI.onThemeChanged(handleThemeChange);

    // Return cleanup function that removes the listener
    return () => {
      // @ts-ignore
      window.electronAPI.removeThemeListener(listener);
    };
  }

  /** @type {import("hyperapp").App<State>} */
  const appConfig = {
    init: state,
    view: (state) => main(state),
    node: /** @type {Node} */ (document.getElementById("app")),
    subscriptions: (state) => [
      [subscription, state],
      [themeSubscription, state],
    ],
  };

  // seems to be glitchy when having a lot of history
  const isUsingAppWithVisualizer = false;
  if (isUsingAppWithVisualizer) {
    appWithVisualizer(appConfig);
  } else {
    app(appConfig);
  }

  // Listen for quit signal from main process
  //@ts-ignore
  window.electronAPI.onAppWillQuit(() => {
    // Save your state here
    // @ts-ignore
    saveApplication(currentState);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });
}

initialize();
