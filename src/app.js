import { app, h, text } from "./packages/hyperapp/index.js";

// -----------------------------
// ## Types
// -----------------------------

/**
 * @typedef {Object} Block
 * @property {number} id
 * @property {number} width
 * @property {number} height
 * @property {number} left
 * @property {number} top
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
 * @property {{id: number, handle: string}|null} resizing
 * @property {{id: number, startLeft: number, startTop: number}|null} dragStart
 * @property {{id: number, startWidth: number, startHeight: number, startLeft: number, startTop: number}|null} resizeStart
 * @property {number} toolbarWidth
 * @property {CommandManager} commandManager
 * @property {boolean} isDarkMode
 */

/**
 * @typedef {(block: Block, e: {percentX: number, percentY: number}) => {width: number, height: number, left: number, top: number}} ResizeHandler
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
    width: block.left + block.width - e.percentX,
    height: block.top + block.height - e.percentY,
    left: Math.min(block.left + block.width - MIN_SIZE, e.percentX),
    top: Math.min(block.top + block.height - MIN_SIZE, e.percentY),
  }),
  ne: (block, e) => ({
    width: e.percentX - block.left,
    height: block.top + block.height - e.percentY,
    left: block.left,
    top: Math.min(block.top + block.height - MIN_SIZE, e.percentY),
  }),
  sw: (block, e) => ({
    width: block.left + block.width - e.percentX,
    height: e.percentY - block.top,
    left: Math.min(block.left + block.width - MIN_SIZE, e.percentX),
    top: block.top,
  }),
  se: (block, e) => ({
    width: e.percentX - block.left,
    height: e.percentY - block.top,
    left: block.left,
    top: block.top,
  }),
  n: (block, e) => ({
    width: block.width,
    height: block.top + block.height - e.percentY,
    left: block.left,
    top: Math.min(block.top + block.height - MIN_SIZE, e.percentY),
  }),
  s: (block, e) => ({
    width: block.width,
    height: e.percentY - block.top,
    left: block.left,
    top: block.top,
  }),
  w: (block, e) => ({
    width: block.left + block.width - e.percentX,
    height: block.height,
    left: Math.min(block.left + block.width - MIN_SIZE, e.percentX),
    top: block.top,
  }),
  e: (block, e) => ({
    width: e.percentX - block.left,
    height: block.height,
    left: block.left,
    top: block.top,
  }),
};

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
 * @returns {Command}
 */
function createAddBlockCommand(currentState) {
  const newBlock = {
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    width: 200,
    height: 200,
    left: 50,
    top: 50,
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
 * @param {number} newLeft
 * @param {number} newTop
 * @returns {Command}
 */
function createMoveBlockCommand(currentState, blockId, newLeft, newTop) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) throw new Error(`Block ${blockId} not found`);

  const oldLeft = block.left;
  const oldTop = block.top;

  return {
    execute: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId ? { ...b, left: newLeft, top: newTop } : b,
      ),
    }),
    undo: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId ? { ...b, left: oldLeft, top: oldTop } : b,
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
 * @param {number} newLeft
 * @param {number} newTop
 * @returns {Command}
 */
function createResizeBlockCommand(
  currentState,
  blockId,
  newWidth,
  newHeight,
  newLeft,
  newTop,
) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) throw new Error(`Block ${blockId} not found`);

  const oldWidth = block.width;
  const oldHeight = block.height;
  const oldLeft = block.left;
  const oldTop = block.top;

  return {
    execute: () => ({
      ...currentState,
      blocks: currentState.blocks.map((b) =>
        b.id === blockId
          ? {
              ...b,
              width: newWidth,
              height: newHeight,
              left: newLeft,
              top: newTop,
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
              left: oldLeft,
              top: oldTop,
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
  const newBlock = {
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    width: blockData.width,
    height: blockData.height,
    left: blockData.left + 20,
    top: blockData.top + 20,
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
 * Clamps a value between a minimum and maximum range
 * @param {number} value - The value to clamp
 * @param {number} min - The minimum allowed value
 * @param {number} max - The maximum allowed value
 * @returns {number} The clamped value
 */
function clamp(value, min, max) {
  return Math.max(Math.min(value, max), min);
}

/**
 * @param {State} state
 * @returns {State}
 */
function addNewBlock(state) {
  const command = createAddBlockCommand(state);
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
    id: -1, // not a "real" block
    width: selectedBlock.width,
    height: selectedBlock.height,
    left: selectedBlock.left,
    top: selectedBlock.top,
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
      typeof blockData.left !== "number" ||
      typeof blockData.top !== "number"
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
          startLeft: block.left,
          startTop: block.top,
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

        // Regular click - deselect blocks
        return {
          ...state,
          selectedId: null,
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
        } else if (state.isBlockDragging) {
          // Adjust drag delta by zoom level - when zoomed in, smaller movements should result in smaller position changes
          const adjustedDx = dx / state.zoom;
          const adjustedDy = dy / state.zoom;

          return {
            ...state,
            blocks: state.blocks.map((block) => {
              if (block.id === state.selectedId) {
                return {
                  ...block,
                  left: block.left + adjustedDx,
                  top: block.top + adjustedDy,
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
            (block.left !== state.dragStart.startLeft ||
              block.top !== state.dragStart.startTop)
          ) {
            const command = createMoveBlockCommand(
              { ...state, dragStart: null, resizeStart: null },
              state.dragStart.id,
              block.left,
              block.top,
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
                        ? { ...b, left: block.left, top: block.top }
                        : b,
                    ),
                  }),
                  undo: () => ({
                    ...state,
                    blocks: state.blocks.map((b) =>
                      b.id === state.dragStart?.id
                        ? {
                            ...b,
                            left: state.dragStart?.startLeft || 0,
                            top: state.dragStart?.startTop || 0,
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
              block.left !== state.resizeStart.startLeft ||
              block.top !== state.resizeStart.startTop)
          ) {
            const command = createResizeBlockCommand(
              { ...state, dragStart: null, resizeStart: null },
              state.resizeStart.id,
              block.width,
              block.height,
              block.left,
              block.top,
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
                            left: block.left,
                            top: block.top,
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
                            left: state.resizeStart?.startLeft || 0,
                            top: state.resizeStart?.startTop || 0,
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
    return h(
      "div",
      {
        "data-id": block.id,
        style: {
          outline: isSelected ? "2px solid blue" : null,
          left: `${block.left}px`,
          top: `${block.top}px`,
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
          return {
            ...state,
            selectedId: id,
            lastX: event.clientX,
            lastY: event.clientY,
            isBlockDragging: true,
            dragStart: {
              id: id,
              startLeft: block.left,
              startTop: block.top,
            },
          };
        },
      },
      [
        // TODO: contents of block
        h("img", {
          src: "./assets/sun-cat.jpg",
          draggable: false,
          style: {
            height: "100%",
            width: "100%",
          },
        }),
        ...(isSelected ? Object.keys(RESIZE_HANDLERS).map(ResizeHandle) : []),
        isSelected && blockToolbar(),
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
      h("button", { onclick: addNewBlock }, text("add new block")),
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
        const isInputElement =
          //@ts-ignore
          event.target?.tagName === "INPUT" ||
          //@ts-ignore
          event.target?.tagName === "TEXTAREA" ||
          //@ts-ignore
          event.target?.isContentEditable;

        const hasTextSelection =
          (window.getSelection()?.toString() ?? "").length > 0;

        // Handle keyboard shortcuts
        switch (event.key) {
          case "Delete":
          case "Backspace":
            // Only handle block deletion if not in input field and a block is selected
            if (!isInputElement && state.selectedId !== null) {
              event.preventDefault();
              const command = createDeleteBlockCommand(state, state.selectedId);
              return executeCommand(state, command);
            }
            // Let browser handle regular text deletion
            return state;

          case "c":
            // Handle copy shortcut (Ctrl+C or Cmd+C)
            if (event.ctrlKey || event.metaKey) {
              // Only handle block copy if not in input field and no text is selected
              if (
                !isInputElement &&
                !hasTextSelection &&
                state.selectedId !== null
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
              // Only handle block paste if not in input field
              if (!isInputElement) {
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
              if (!isInputElement) {
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
              if (!isInputElement) {
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
        left: 50,
        top: 50,
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

  app({
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
  });

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
