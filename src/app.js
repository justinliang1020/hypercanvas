import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";

// -----------------------------
// ## Types
// -----------------------------

/**
 * @typedef {Object} Block
 * @property {number} id
 * @property {number} width
 * @property {number} height
 * @property {number} x
 * @property {number} y
 * @property {Program} program
 */

/** @typedef {Object} Program
 * @property {string} name
 * @property {any} properties
 */

/**
 * @typedef {Object} Command
 * @property {() => State} execute
 * @property {() => State} undo
 * @property {string} description
 */

/**
 * @typedef {Object} CommandManager
 * @property {Command[]} undoStack
 * @property {Command[]} redoStack
 * @property {number} maxHistorySize
 */

/**
 * @typedef {Object} State
 * @property {Block[]} blocks
 * @property {number} offsetX
 * @property {number} offsetY
 * @property {number} lastX
 * @property {number} lastY
 * @property {number} zoom
 * @property {string} cursorStyle
 * @property {boolean} isViewportDragging
 * @property {boolean} isBlockDragging
 * @property {number|null} selectedId
 * @property {number|null} editingId
 * @property {{id: number, handle: string}|null} resizing
 * @property {{id: number, startX: number, startY: number}|null} dragStart
 * @property {{id: number, startWidth: number, startHeight: number, startX: number, startY: number}|null} resizeStart
 * @property {number} toolbarWidth
 * @property {CommandManager} commandManager
 * @property {boolean} isDarkMode
 */

/**
 * @typedef {(block: Block, e: {percentX: number, percentY: number}) => {width: number, height: number, x: number, y: number}} ResizeHandler
 */

// -----------------------------
// ## Constants
// -----------------------------

const MIN_SIZE = 20; // Minimum size in px
const INITIAL_RIGHT_TOOLBAR_WIDTH = 400;
const STATE_SAVE_PATH = "user/state.json";

/**
 * @type {Record<string, ResizeHandler>}>}
 */
const RESIZE_HANDLERS = {
  nw: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: block.y + block.height - e.percentY,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  ne: (block, e) => ({
    width: e.percentX - block.x,
    height: block.y + block.height - e.percentY,
    x: block.x,
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  sw: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: e.percentY - block.y,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: block.y,
  }),
  se: (block, e) => ({
    width: e.percentX - block.x,
    height: e.percentY - block.y,
    x: block.x,
    y: block.y,
  }),
  n: (block, e) => ({
    width: block.width,
    height: block.y + block.height - e.percentY,
    x: block.x,
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  s: (block, e) => ({
    width: block.width,
    height: e.percentY - block.y,
    x: block.x,
    y: block.y,
  }),
  w: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: block.height,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: block.y,
  }),
  e: (block, e) => ({
    width: e.percentX - block.x,
    height: block.height,
    x: block.x,
    y: block.y,
  }),
};

// -----------------------------
// ## Block Program Implementation
// -----------------------------

class ProgramComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  // // FIX: this causes a "double render"
  // static get observedAttributes() {
  //   return ["properties"];
  // }

  connectedCallback() {
    this.render();
  }

  /**
   * @param {string} name
   * @param {any} oldValue
   * @param {any} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "properties" && oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const name = this.getAttribute("name");
    if (!name) return;

    if (!this.shadowRoot) return;
    this.shadowRoot.innerHTML = "";
    const el = document.createElement("div");
    this.shadowRoot.appendChild(el);
    import(`./programs/${name}.js`).then((program) => {
      program.run(el);
    });
  }
}

customElements.define("program-component", ProgramComponent);

// -----------------------------
// ## Command Pattern Implementation
// -----------------------------

/**
 * Creates a new command manager
 * @returns {CommandManager}
 */
function createCommandManager() {
  return {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
  };
}

/**
 * Executes a command and adds it to the undo stack
 * @param {State} state
 * @param {Command} command
 * @returns {State}
 */
function executeCommand(state, command) {
  const newState = command.execute();

  const newCommandManager = {
    ...state.commandManager,
    undoStack: [...state.commandManager.undoStack, command].slice(
      -state.commandManager.maxHistorySize,
    ),
    redoStack: [],
  };

  return {
    ...newState,
    commandManager: newCommandManager,
  };
}

/**
 * Undoes the last command
 * @param {State} state
 * @returns {State}
 */
function undoCommand(state) {
  if (state.commandManager.undoStack.length === 0) return state;

  const command =
    state.commandManager.undoStack[state.commandManager.undoStack.length - 1];
  const newState = command.undo();

  const newCommandManager = {
    ...state.commandManager,
    undoStack: state.commandManager.undoStack.slice(0, -1),
    redoStack: [...state.commandManager.redoStack, command],
  };

  return {
    ...newState,
    commandManager: newCommandManager,
    // Reset interaction states to prevent stuck drag/resize modes
    isBlockDragging: false,
    isViewportDragging: false,
    resizing: null,
    dragStart: null,
    resizeStart: null,
    cursorStyle: "default",
  };
}

/**
 * Redoes the last undone command
 * @param {State} state
 * @returns {State}
 */
function redoCommand(state) {
  if (state.commandManager.redoStack.length === 0) return state;

  const command =
    state.commandManager.redoStack[state.commandManager.redoStack.length - 1];
  const newState = command.execute();

  const newCommandManager = {
    ...state.commandManager,
    undoStack: [...state.commandManager.undoStack, command],
    redoStack: state.commandManager.redoStack.slice(0, -1),
  };

  return {
    ...newState,
    commandManager: newCommandManager,
    // Reset interaction states to prevent stuck drag/resize modes
    isBlockDragging: false,
    isViewportDragging: false,
    resizing: null,
    dragStart: null,
    resizeStart: null,
    cursorStyle: "default",
  };
}

/**
 * Creates a command to add a new block
 * @param {State} currentState
 * @param {string} programName
 * @returns {Command}
 */
function createAddBlockCommand(currentState, programName) {
  /** @type{Block} */
  const newBlock = {
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    width: 200,
    height: 200,
    x: 50,
    y: 50,
    program: { name: programName, properties: {} },
  };

  return {
    execute: () => ({
      ...currentState,
      blocks: [...currentState.blocks, newBlock],
      selectedId: newBlock.id,
    }),
    undo: () => ({
      ...currentState,
      blocks: currentState.blocks.filter((block) => block.id !== newBlock.id),
      selectedId: null,
    }),
    description: `Add block ${newBlock.id}`,
  };
}

/**
 * Creates a command to delete a block
 * @param {State} currentState
 * @param {number} blockId
 * @returns {Command}
 */
function createDeleteBlockCommand(currentState, blockId) {
  const blockToDelete = currentState.blocks.find(
    (block) => block.id === blockId,
  );
  if (!blockToDelete) throw new Error(`Block ${blockId} not found`);

  return {
    execute: () => ({
      ...currentState,
      blocks: currentState.blocks.filter((block) => block.id !== blockId),
      selectedId: null,
    }),
    undo: () => ({
      ...currentState,
      blocks: [...currentState.blocks, blockToDelete],
      selectedId: blockId,
    }),
    description: `Delete block ${blockId}`,
  };
}

/**
 * Creates a command to move a block
 * @param {State} currentState
 * @param {number} blockId
 * @param {number} newX
 * @param {number} newY
 * @returns {Command}
 */
function createMoveBlockCommand(currentState, blockId, newX, newY) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) throw new Error(`Block ${blockId} not found`);

  const oldX = block.x;
  const oldY = block.y;

  return {
    execute: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId ? { ...b, x: newX, y: newY } : b,
      ),
    }),
    undo: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId ? { ...b, x: oldX, y: oldY } : b,
      ),
    }),
    description: `Move block ${blockId}`,
  };
}

/**
 * Creates a command to resize a block
 * @param {State} currentState
 * @param {number} blockId
 * @param {number} newWidth
 * @param {number} newHeight
 * @param {number} newX
 * @param {number} newY
 * @returns {Command}
 */
function createResizeBlockCommand(
  currentState,
  blockId,
  newWidth,
  newHeight,
  newX,
  newY,
) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) throw new Error(`Block ${blockId} not found`);

  const oldWidth = block.width;
  const oldHeight = block.height;
  const oldX = block.x;
  const oldY = block.y;

  return {
    execute: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              width: newWidth,
              height: newHeight,
              x: newX,
              y: newY,
            }
          : b,
      ),
    }),
    undo: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              width: oldWidth,
              height: oldHeight,
              x: oldX,
              y: oldY,
            }
          : b,
      ),
    }),
    description: `Resize block ${blockId}`,
  };
}

/**
 * Creates a command to paste a block
 * @param {State} currentState
 * @param {Block} blockData
 * @returns {Command}
 */
function createPasteBlockCommand(currentState, blockData) {
  /** @type{Block} */
  const newBlock = {
    ...blockData,
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    x: blockData.x + 20,
    y: blockData.y + 20,
  };

  return {
    execute: () => ({
      ...currentState,
      blocks: [...currentState.blocks, newBlock],
      selectedId: newBlock.id,
    }),
    undo: () => ({
      ...currentState,
      blocks: currentState.blocks.filter((block) => block.id !== newBlock.id),
      selectedId: currentState.selectedId,
    }),
    description: `Paste block ${newBlock.id}`,
  };
}

// -----------------------------
// ## Utility
// -----------------------------

/**
 * @param {State} state
 */
async function saveState(state) {
  // Functions in the commandManager cannot be serialized. Anyways we don't want to save that as state.
  const { commandManager, ...serializableSaveState } = state;
  // @ts-ignore
  await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);
}

/**
 * @param {State} state
 * @param {string} programName
 * @returns {State}
 */
function addNewBlock(state, programName) {
  const command = createAddBlockCommand(state, programName);
  return executeCommand(state, command);
}

/**
 * Copy the selected block to clipboard
 * @param {State} state
 * @returns {State}
 */
function copySelectedBlock(state) {
  if (state.selectedId === null) return state;

  const selectedBlock = state.blocks.find(
    (block) => block.id === state.selectedId,
  );
  if (!selectedBlock) return state;

  // Create a copy of the block data for clipboard
  /** @type {Block} */
  const blockData = {
    ...selectedBlock,
    id: -1, // not a "real" block
  };

  navigator.clipboard.writeText(JSON.stringify(blockData, null, 2));

  return {
    ...state,
  };
}

/**
 * Paste a block from clipboard
 * @param {State} state
 * @returns {Promise<State>}
 */
async function pasteBlock(state) {
  try {
    // Read from clipboard
    const clipboardText = await navigator.clipboard.readText();

    // Try to parse as JSON - if it fails, it's probably regular text
    let blockData;
    try {
      blockData = JSON.parse(clipboardText);
    } catch {
      // Not valid JSON, probably regular text - don't paste as block
      return state;
    }

    // Validate that it's a block object
    if (
      !blockData ||
      typeof blockData !== "object" ||
      typeof blockData.width !== "number" ||
      typeof blockData.height !== "number" ||
      typeof blockData.x !== "number" ||
      typeof blockData.y !== "number"
    ) {
      return state; // Invalid block data
    }

    const command = createPasteBlockCommand(state, blockData);
    return executeCommand(state, command);
  } catch (error) {
    // If clipboard doesn't contain valid JSON or we can't read it, just return current state
    console.warn("Failed to paste block from clipboard:", error);
    return state;
  }
}

// -----------------------------
// ## Components
// -----------------------------

/**
 * @param {string} handle
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function ResizeHandle(handle) {
  return h("div", {
    class: `resize-handle ${handle}`,
    "data-handle": handle,
    onpointerdown: (state, event) => {
      event.stopPropagation();
      const blockId = parseInt(
        /** @type {HTMLElement} */ (event.target)?.parentElement?.dataset?.id ||
          "",
      );
      const block = state.blocks.find((b) => b.id === blockId);
      if (!block) return state;
      return {
        ...state,
        resizing: {
          id: blockId,
          handle: /** @type {string} */ (
            /** @type {HTMLElement} */ (event.target).dataset.handle
          ),
        },
        selectedId: blockId,
        lastX: event.clientX,
        lastY: event.clientY,
        resizeStart: {
          id: blockId,
          startWidth: block.width,
          startHeight: block.height,
          startX: block.x,
          startY: block.y,
        },
      };
    },
  });
}

/**
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function blockToolbar() {
  return h(
    "div",
    {
      class: "block-toolbar",
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    },
    [
      h(
        "button",
        {
          class: "block-toolbar-button",
          onclick: (state, event) => {
            event.stopPropagation();
            if (state.selectedId === null) return state;
            const command = createDeleteBlockCommand(state, state.selectedId);
            return executeCommand(state, command);
          },
        },
        text("❌"),
      ),
    ],
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function viewport(state) {
  return h(
    "div",
    {
      id: "viewport",
      onpointerdown: (state, event) => {
        // Only start dragging on middle mouse button or space+click
        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
          return {
            ...state,
            isViewportDragging: true,
            lastX: event.clientX,
            lastY: event.clientY,
            cursorStyle: "grabbing",
            selectedId: null,
          };
        }

        // Regular click - deselect blocks and exit edit mode
        return {
          ...state,
          selectedId: null,
          editingId: null,
        };
      },
      onpointermove: (state, event) => {
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;

        if (state.resizing) {
          // Handle resizing with zoom adjustment
          const canvasRect = /** @type {HTMLElement} */ (
            document.getElementById("canvas")
          ).getBoundingClientRect();

          // Calculate position relative to canvas accounting for zoom and offset
          const canvasX = (event.clientX - canvasRect.left) / state.zoom;
          const canvasY = (event.clientY - canvasRect.top) / state.zoom;

          const block = state.blocks.find((b) => b.id == state.resizing?.id);
          if (!block) return state;
          const handler = RESIZE_HANDLERS[state.resizing.handle];
          if (!handler) return state;

          const newDimensions = handler(block, {
            percentX: canvasX,
            percentY: canvasY,
          });

          // Ensure minimum size
          const finalWidth = Math.max(MIN_SIZE, newDimensions.width);
          const finalHeight = Math.max(MIN_SIZE, newDimensions.height);

          return {
            ...state,
            blocks: state.blocks.map((b) =>
              b.id == state.resizing?.id
                ? {
                    ...b,
                    ...newDimensions,
                    width: finalWidth,
                    height: finalHeight,
                  }
                : b,
            ),
            lastX: event.clientX,
            lastY: event.clientY,
          };
        } else if (state.isBlockDragging && state.editingId === null) {
          // Only allow dragging if no block is in edit mode
          // Adjust drag delta by zoom level - when zoomed in, smaller movements should result in smaller position changes
          const adjustedDx = dx / state.zoom;
          const adjustedDy = dy / state.zoom;

          return {
            ...state,
            blocks: state.blocks.map((block) => {
              if (block.id === state.selectedId) {
                return {
                  ...block,
                  x: block.x + adjustedDx,
                  y: block.y + adjustedDy,
                };
              } else {
                return block;
              }
            }),
            lastX: event.clientX,
            lastY: event.clientY,
          };
        } else if (state.isViewportDragging) {
          return {
            ...state,
            offsetX: state.offsetX + dx,
            offsetY: state.offsetY + dy,
            lastX: event.clientX,
            lastY: event.clientY,
          };
        }
        return state;
      },
      onpointerup: (state) => {
        let newState = {
          ...state,
          isViewportDragging: false,
          isBlockDragging: false,
          resizing: null,
          cursorStyle: "default",
        };

        // Create command for completed drag operation
        if (state.dragStart && state.isBlockDragging) {
          const block = state.blocks.find((b) => b.id === state.dragStart?.id);
          if (
            block &&
            state.dragStart &&
            (block.x !== state.dragStart.startX ||
              block.y !== state.dragStart.startY)
          ) {
            const command = createMoveBlockCommand(
              { ...state, dragStart: null, resizeStart: null },
              state.dragStart.id,
              block.x,
              block.y,
            );
            // We need to manually update the command manager since we're creating the command after the fact
            const newCommandManager = {
              ...state.commandManager,
              undoStack: [
                ...state.commandManager.undoStack,
                {
                  ...command,
                  execute: () => ({
                    ...state,
                    blocks: state.blocks.map((b) =>
                      b.id === state.dragStart?.id
                        ? { ...b, x: block.x, y: block.y }
                        : b,
                    ),
                  }),
                  undo: () => ({
                    ...state,
                    blocks: state.blocks.map((b) =>
                      b.id === state.dragStart?.id
                        ? {
                            ...b,
                            x: state.dragStart?.startX || 0,
                            y: state.dragStart?.startY || 0,
                          }
                        : b,
                    ),
                  }),
                },
              ].slice(-state.commandManager.maxHistorySize),
              redoStack: [],
            };
            newState = { ...newState, commandManager: newCommandManager };
          }
        }

        // Create command for completed resize operation
        if (state.resizeStart && state.resizing) {
          const block = state.blocks.find(
            (b) => b.id === state.resizeStart?.id,
          );
          if (
            block &&
            state.resizeStart &&
            (block.width !== state.resizeStart.startWidth ||
              block.height !== state.resizeStart.startHeight ||
              block.x !== state.resizeStart.startX ||
              block.y !== state.resizeStart.startY)
          ) {
            const command = createResizeBlockCommand(
              { ...state, dragStart: null, resizeStart: null },
              state.resizeStart.id,
              block.width,
              block.height,
              block.x,
              block.y,
            );
            // We need to manually update the command manager since we're creating the command after the fact
            const newCommandManager = {
              ...newState.commandManager,
              undoStack: [
                ...newState.commandManager.undoStack,
                {
                  ...command,
                  execute: () => ({
                    ...state,
                    blocks: state.blocks.map((b) =>
                      b.id === state.resizeStart?.id
                        ? {
                            ...b,
                            width: block.width,
                            height: block.height,
                            x: block.x,
                            y: block.y,
                          }
                        : b,
                    ),
                  }),
                  undo: () => ({
                    ...state,
                    blocks: state.blocks.map((b) =>
                      b.id === state.resizeStart?.id
                        ? {
                            ...b,
                            width: state.resizeStart?.startWidth || 0,
                            height: state.resizeStart?.startHeight || 0,
                            x: state.resizeStart?.startX || 0,
                            y: state.resizeStart?.startY || 0,
                          }
                        : b,
                    ),
                  }),
                },
              ].slice(-state.commandManager.maxHistorySize),
              redoStack: [],
            };
            newState = { ...newState, commandManager: newCommandManager };
          }
        }

        return {
          ...newState,
          dragStart: null,
          resizeStart: null,
        };
      },
      onwheel: (state, event) => {
        // Prevent default scrolling behavior
        event.preventDefault();

        // Check if this is a trackpad gesture (typically has smaller deltaY values and ctrlKey for zoom)
        const isTrackpad = Math.abs(event.deltaY) < 50 && !event.ctrlKey;

        if (isTrackpad) {
          // Trackpad pan gesture - use deltaX and deltaY directly
          // Invert the delta values to match Figma-like behavior
          return {
            ...state,
            offsetX: state.offsetX - event.deltaX,
            offsetY: state.offsetY - event.deltaY,
          };
        } else if (event.ctrlKey || event.metaKey) {
          // Zoom gesture (Ctrl/Cmd + scroll or trackpad pinch)
          const zoomDelta = -event.deltaY * 0.01;
          const newZoom = Math.max(0.1, Math.min(5, state.zoom + zoomDelta));

          // Get mouse position relative to viewport for zoom centering
          const rect = /** @type {HTMLElement} */ (
            event.currentTarget
          )?.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // Calculate zoom offset to keep mouse position fixed
          const zoomRatio = newZoom / state.zoom;
          const newOffsetX = mouseX - (mouseX - state.offsetX) * zoomRatio;
          const newOffsetY = mouseY - (mouseY - state.offsetY) * zoomRatio;

          return {
            ...state,
            zoom: newZoom,
            offsetX: newOffsetX,
            offsetY: newOffsetY,
          };
        }

        return state;
      },
      style: {
        touchAction: "none", // Prevent default touch behaviors
      },
    },
    [
      h(
        "div",
        {
          id: "canvas",
          style: {
            transform: `translate(${state.offsetX}px, ${state.offsetY}px) scale(${state.zoom})`,
          },
        },
        [...state.blocks.map(block(state))],
      ),
    ],
  );
}

/**
 * @param {State} state
 * @returns { (block:Block) => import("hyperapp").ElementVNode<State> }
 */
function block(state) {
  return (block) => {
    const isSelected = state.selectedId === block.id;
    const isEditing = state.editingId === block.id;
    return h(
      "div",
      {
        "data-id": block.id,
        style: {
          outline: isSelected ? "2px solid blue" : null,
          transform: `translate(${block.x}px, ${block.y}px)`,
          width: `${block.width}px`,
          height: `${block.height}px`,
        },
        class: "block",
        onpointerdown: (state, event) => {
          event.stopPropagation();
          const id = parseInt(
            /** @type {HTMLElement} */ (event.currentTarget).dataset.id || "",
          );
          if (isNaN(id)) return state;
          const block = state.blocks.find((b) => b.id === id);
          if (!block) return state;

          // If block is in edit mode, don't start dragging
          if (state.editingId === id) {
            return {
              ...state,
              selectedId: id,
            };
          }

          // Normal selection and drag start
          return {
            ...state,
            selectedId: id,
            editingId: null, // Exit edit mode when selecting any block (even the same one)
            lastX: event.clientX,
            lastY: event.clientY,
            isBlockDragging: true,
            dragStart: {
              id: id,
              startX: block.x,
              startY: block.y,
            },
          };
        },
        ondblclick: (state, event) => {
          event.stopPropagation();
          const id = parseInt(
            /** @type {HTMLElement} */ (event.currentTarget).dataset.id || "",
          );
          if (isNaN(id)) return state;

          // Double-click enters edit mode
          return {
            ...state,
            selectedId: id,
            editingId: id,
            isBlockDragging: false, // Cancel any drag that might have started
            dragStart: null,
          };
        },
      },
      [
        h("program-component", {
          name: block.program.name,
          properties: block.program.properties,
          style: {
            pointerEvents: isEditing ? null : "none",
          },
        }),
        ...(isSelected && !isEditing
          ? Object.keys(RESIZE_HANDLERS).map(ResizeHandle)
          : []),
        isSelected && !isEditing && blockToolbar(),
      ],
    );
  };
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function toolbar(state) {
  return h(
    "div",
    {
      id: "toolbar",
      style: {
        pointerEvents: state.isBlockDragging ? "none" : "auto",
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
          onclick: undoCommand,
          disabled: state.commandManager.undoStack.length === 0,
          title:
            state.commandManager.undoStack.length > 0
              ? `Undo: ${state.commandManager.undoStack[state.commandManager.undoStack.length - 1].description}`
              : "Nothing to undo",
        },
        text("↶ Undo"),
      ),
      h(
        "button",
        {
          onclick: redoCommand,
          disabled: state.commandManager.redoStack.length === 0,
          title:
            state.commandManager.redoStack.length > 0
              ? `Redo: ${state.commandManager.redoStack[state.commandManager.redoStack.length - 1].description}`
              : "Nothing to redo",
        },
        text("↷ Redo"),
      ),
      h(
        "button",
        { onclick: (state) => addNewBlock(state, "hello-world") },
        text("add new hello world block"),
      ),
      h(
        "button",
        { onclick: (state) => addNewBlock(state, "text") },
        text("add new text block"),
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
        "button", // TODO: remove after development. currently a temporary manual save button
        {
          onclick: (state) => [state, () => saveState(state)],
        },
        text("save"),
      ),
    ],
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function main(state) {
  return h(
    "main",
    {
      style: {
        cursor: state.cursorStyle,
      },
      onkeydown: (state, event) => {
        // Check if user is interacting with an input field or has text selected
        const hasTextSelection =
          (window.getSelection()?.toString() ?? "").length > 0;

        // Handle keyboard shortcuts
        switch (event.key) {
          case "Escape":
            // Exit edit mode
            if (state.editingId !== null) {
              event.preventDefault();
              return {
                ...state,
                editingId: null,
              };
            } else if (state.selectedId !== null) {
              event.preventDefault();
              return {
                ...state,
                selectedId: null,
              };
            }
            return state;
          case "Delete":
          case "Backspace":
            // Only handle block deletion if not in input field, a block is selected, and not in edit mode
            if (state.selectedId !== null && state.editingId === null) {
              event.preventDefault();
              const command = createDeleteBlockCommand(state, state.selectedId);
              return executeCommand(state, command);
            }
            // Let browser handle regular text deletion
            return state;

          case "c":
            // Handle copy shortcut (Ctrl+C or Cmd+C)
            if (event.ctrlKey || event.metaKey) {
              // Only handle block copy if not in input field, no text is selected, and not in edit mode
              if (
                !hasTextSelection &&
                state.selectedId !== null &&
                state.editingId === null
              ) {
                event.preventDefault();
                return copySelectedBlock(state);
              }
              // Let browser handle regular text copy
            }
            return state;

          case "v":
            // Handle paste shortcut (Ctrl+V or Cmd+V)
            if (event.ctrlKey || event.metaKey) {
              // Only handle block paste if not in input field and not in edit mode
              if (state.editingId === null) {
                event.preventDefault();
                return [
                  state,
                  async (dispatch) => {
                    const newState = await pasteBlock(state);
                    dispatch(newState);
                  },
                ];
              }
              // Let browser handle regular text paste
            }
            return state;

          case "z":
          case "Z":
            // Handle undo/redo shortcuts
            if (event.ctrlKey || event.metaKey) {
              if (state.editingId === null) {
                event.preventDefault();
                if (event.shiftKey) {
                  // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
                  return redoCommand(state);
                } else {
                  // Ctrl+Z or Cmd+Z = Undo
                  return undoCommand(state);
                }
              }
            }
            return state;

          case "y":
            // Handle redo shortcut (Ctrl+Y or Cmd+Y)
            if (event.ctrlKey || event.metaKey) {
              if (state.editingId === null) {
                event.preventDefault();
                return redoCommand(state);
              }
            }
            return state;

          default:
            return state;
        }
      },
      tabindex: 0, // Make the main element focusable for keyboard events
    },
    [viewport(state), toolbar(state)],
  );
}

// -----------------------------
// ## Initialization
// -----------------------------

async function initialize() {
  /** @type{State} */
  const initialState = {
    selectedId: null,
    editingId: null,
    resizing: null,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    zoom: 1,
    cursorStyle: "pointer",
    isViewportDragging: false,
    isBlockDragging: false,
    toolbarWidth: INITIAL_RIGHT_TOOLBAR_WIDTH,
    dragStart: null,
    resizeStart: null,
    commandManager: createCommandManager(),
    isDarkMode: false,
    blocks: [
      {
        id: 0,
        width: 200,
        height: 200,
        x: 50,
        y: 50,
        program: { name: "hello-world", properties: {} },
      },
    ],
  };

  let state;
  try {
    // @ts-ignore
    state = await window.fileAPI.readFile(STATE_SAVE_PATH); // uncomment to have retained state
    if (!state) {
      state = initialState;
    }
    state.commandManager = createCommandManager();
  } catch {
    state = initialState;
  }

  let currentState = state;

  /** @type{import("hyperapp").App<State>} */
  const appConfig = {
    init: state,
    view: (state) => main(state),
    // @ts-ignore
    node: document.getElementById("app"),
    subscriptions: (state) => {
      // Store current state for save functionality
      currentState = state;

      // Dispatch custom event with state data to notify inspector
      window.dispatchEvent(
        new CustomEvent("appStateUpdate", {
          detail: { appState: state },
        }),
      );

      // Apply dark mode class to body
      if (state.isDarkMode) {
        document.body.classList.add("dark-mode");
      } else {
        document.body.classList.remove("dark-mode");
      }
    },
  };

  const isUsingAppWithVisualizer = true;
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
    saveState(currentState);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });
}

initialize();
