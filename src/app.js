import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";
import { programRegistry } from "./programRegistry.js";

// -----------------------------
// ## Types
// -----------------------------

/**
 * @typedef {Object} Block
 * @property {number} id - Unique block identifier
 * @property {number} width - Block width in pixels
 * @property {number} height - Block height in pixels
 * @property {number} x - X position on canvas
 * @property {number} y - Y position on canvas
 * @property {number} zIndex - Stacking order (higher = front)
 * @property {ProgramData} programData - Associated program data
 */

/**
 * @typedef {Object} ProgramData - Data for Hyperapp Program
 * @property {string} name - Unique program name for mounting hyperapp program
 * @property {Object | null} state - State of hyperapp program instance, constantly synced.
 * If 'null', the program will be mounted with its default state.
 * This is state value only impacts the state of program on mount, i.e. it cannot be edited to edit the state of a program
 */

/**
 * @typedef {Object} BlockConnection
 * @property {string} name - Connection name/type
 * @property {number} sourceBlockId - ID of source block
 * @property {number} targetBlockId - ID of target block
 */

/**
 * @typedef {Object} Memento
 * @property {Block[]} blocks - Snapshot of blocks state
 * @property {number|null} selectedId - Selected block ID at time of snapshot
 * @property {number|null} editingId - Editing block ID at time of snapshot
 */

/**
 * @typedef {Object} MementoManager
 * @property {Memento[]} undoStack - Stack of previous states for undo
 * @property {Memento[]} redoStack - Stack of undone states for redo
 * @property {number} maxHistorySize - Maximum number of states to keep
 */

/**
 * @typedef {Object} ResizeState
 * @property {number} id - Block ID being resized
 * @property {string} handle - Resize handle (nw, ne, sw, se, n, s, e, w)
 */

/**
 * @typedef {Object} DragState
 * @property {number} id - Block ID being dragged
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 */

/**
 * @typedef {Object} ResizeStartState
 * @property {number} id - Block ID
 * @property {number} startWidth - Initial width
 * @property {number} startHeight - Initial height
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 */

/**
 * @typedef {Object} State
 * @property {Block[]} blocks - All blocks on the canvas
 * @property {BlockConnection[]} connections - Connections between blocks
 * @property {number} offsetX - Canvas X offset for panning
 * @property {number} offsetY - Canvas Y offset for panning
 * @property {number} lastX - Last mouse X position
 * @property {number} lastY - Last mouse Y position
 * @property {number} zoom - Current zoom level
 * @property {string} cursorStyle - Current cursor style
 * @property {boolean} isViewportDragging - Whether viewport is being dragged
 * @property {boolean} isBlockDragging - Whether a block is being dragged
 * @property {boolean} isShiftPressed - Whether shift key is currently pressed
 * @property {number|null} selectedId - ID of selected block
 * @property {number|null} editingId - ID of block in edit mode
 * @property {number|null} hoveringId - ID of hovered block
 * @property {number|null} connectingId - ID of block in connect mode (pending connection)
 * @property {ResizeState|null} resizing - Current resize operation
 * @property {DragState|null} dragStart - Drag operation start state
 * @property {ResizeStartState|null} resizeStart - Resize operation start state
 * @property {MementoManager} mementoManager - Undo/redo manager
 * @property {boolean} isDarkMode - Dark mode toggle
 * @property {boolean} sidebarVisible - Whether sidebar is visible
 * @property {number} sidebarWidth - Width of sidebar in pixels
 * @property {Block|null} clipboard - Copied block data
 * @property {string} programFilter - Filter text for program buttons
 */

/**
 * @typedef {(block: Block, e: {percentX: number, percentY: number}) => {width: number, height: number, x: number, y: number}} ResizeHandler
 */

// -----------------------------
// ## Constants
// -----------------------------

const MIN_SIZE = 20; // Minimum size in px
const STATE_SAVE_PATH = "user/state.json";
const MEDIA_SAVE_PATH = "user/media/";
const PASTE_OFFSET_X = 20;
const PASTE_OFFSET_Y = 20;

/**
 * @type {Record<string, string>}
 */
const RESIZE_CURSORS = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
  n: "ns-resize",
  s: "ns-resize",
  w: "ew-resize",
  e: "ew-resize",
};

/**
 * Applies aspect ratio constraint to resize dimensions
 * @param {{width: number, height: number, x: number, y: number}} dimensions - Original dimensions from resize handler
 * @param {Block} originalBlock - Original block before resize
 * @param {string} handle - Resize handle being used
 * @returns {{width: number, height: number, x: number, y: number}} Constrained dimensions maintaining aspect ratio
 */
function applyAspectRatioConstraint(dimensions, originalBlock, handle) {
  const originalAspectRatio = originalBlock.width / originalBlock.height;

  // For corner handles, maintain aspect ratio
  if (["nw", "ne", "sw", "se"].includes(handle)) {
    // Calculate both possible constrained dimensions
    const constrainedByWidth = {
      width: dimensions.width,
      height: dimensions.width / originalAspectRatio,
      x: dimensions.x,
      y: dimensions.y,
    };

    const constrainedByHeight = {
      width: dimensions.height * originalAspectRatio,
      height: dimensions.height,
      x: dimensions.x,
      y: dimensions.y,
    };

    // Choose the constraint that results in the smaller overall size change
    // This prevents the block from growing too aggressively
    const widthArea = constrainedByWidth.width * constrainedByWidth.height;
    const heightArea = constrainedByHeight.width * constrainedByHeight.height;

    const useWidthConstraint = widthArea <= heightArea;
    let result = useWidthConstraint ? constrainedByWidth : constrainedByHeight;

    // Apply minimum size constraints
    result.width = Math.max(MIN_SIZE, result.width);
    result.height = Math.max(MIN_SIZE, result.height);

    // Adjust positions based on handle type and which constraint we're using
    if (useWidthConstraint) {
      // When constraining by width, adjust Y for north handles
      if (handle.includes("n")) {
        const heightDiff = result.height - dimensions.height;
        result.y = dimensions.y - heightDiff;
      }
    } else {
      // When constraining by height, adjust X for west handles
      if (handle.includes("w")) {
        const widthDiff = result.width - dimensions.width;
        result.x = dimensions.x - widthDiff;
      }
    }

    return result;
  }

  // For edge handles, maintain aspect ratio by adjusting the other dimension
  if (["n", "s"].includes(handle)) {
    // Height is changing, adjust width
    const newWidth = dimensions.height * originalAspectRatio;
    const widthDiff = newWidth - originalBlock.width;
    return {
      ...dimensions,
      width: Math.max(MIN_SIZE, newWidth),
      x: originalBlock.x - widthDiff / 2, // Center the width change
    };
  }

  if (["e", "w"].includes(handle)) {
    // Width is changing, adjust height
    const newHeight = dimensions.width / originalAspectRatio;
    const heightDiff = newHeight - originalBlock.height;
    return {
      ...dimensions,
      height: Math.max(MIN_SIZE, newHeight),
      y: originalBlock.y - heightDiff / 2, // Center the height change
    };
  }

  return dimensions;
}

/**
 * @type {Record<string, ResizeHandler>}
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

// -----------------------------
// ## Memento Pattern Implementation
// -----------------------------

/**
 * Creates a new memento manager
 * @returns {MementoManager}
 */
function createMementoManager() {
  return {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
  };
}

/**
 * Creates a memento from the current state for undo/redo
 * @param {State} state - Current application state
 * @returns {Memento} Snapshot of state for history
 */
function createMemento(state) {
  return {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    selectedId: state.selectedId,
    editingId: state.editingId,
  };
}

/**
 * Saves previous state in memento history and returns the new state
 * @param {State} prevState - Previous state to save in history
 * @param {State} newState - New state to return with updated history
 * @returns {State} New state with updated memento manager
 */
function saveStateHistoryAndReturn(prevState, newState) {
  const memento = createMemento(prevState);

  const newMementoManager = {
    ...prevState.mementoManager,
    undoStack: [...prevState.mementoManager.undoStack, memento].slice(
      -prevState.mementoManager.maxHistorySize,
    ),
    redoStack: [],
  };

  return {
    ...newState,
    mementoManager: newMementoManager,
  };
}

/**
 * Undoes the last state change
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Previous state from undo stack
 */
function undoState(state) {
  if (state.mementoManager.undoStack.length === 0) return state;

  const memento =
    state.mementoManager.undoStack[state.mementoManager.undoStack.length - 1];
  const currentMemento = createMemento(state);

  const newMementoManager = {
    ...state.mementoManager,
    undoStack: state.mementoManager.undoStack.slice(0, -1),
    redoStack: [...state.mementoManager.redoStack, currentMemento],
  };

  return {
    ...state,
    blocks: memento.blocks,
    selectedId: memento.selectedId,
    editingId: memento.editingId,
    mementoManager: newMementoManager,
    // Reset interaction states to prevent stuck drag/resize modes
    isBlockDragging: false,
    isViewportDragging: false,
    resizing: null,
    dragStart: null,
    resizeStart: null,
    connectingId: null,
    cursorStyle: "default",
  };
}

/**
 * Redoes the last undone state change
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Next state from redo stack
 */
function redoState(state) {
  if (state.mementoManager.redoStack.length === 0) return state;

  const memento =
    state.mementoManager.redoStack[state.mementoManager.redoStack.length - 1];
  const currentMemento = createMemento(state);

  const newMementoManager = {
    ...state.mementoManager,
    undoStack: [...state.mementoManager.undoStack, currentMemento],
    redoStack: state.mementoManager.redoStack.slice(0, -1),
  };

  return {
    ...state,
    blocks: memento.blocks,
    selectedId: memento.selectedId,
    editingId: memento.editingId,
    mementoManager: newMementoManager,
    // Reset interaction states to prevent stuck drag/resize modes
    isBlockDragging: false,
    isViewportDragging: false,
    resizing: null,
    dragStart: null,
    resizeStart: null,
    connectingId: null,
    cursorStyle: "default",
  };
}

/**
 * Checks if a block can be connected to from the connecting block
 * @param {State} state - Current application state
 * @param {number} targetBlockId - ID of potential target block
 * @returns {boolean} True if block can be connected to
 */
function isBlockConnectable(state, targetBlockId) {
  if (state.connectingId === null) return false;
  if (state.connectingId === targetBlockId) return false; // Can't connect to self

  // For now, allow connection to any other block (simple 1-connection rule)
  // In the future, this could check program compatibility, existing connections, etc.
  return true;
}

/**
 * Gets connected block IDs for a given source block
 * @param {State} state - Current application state
 * @param {number} sourceBlockId - ID of source block
 * @returns {number[]} Array of connected block IDs
 */
function getConnectedBlockIds(state, sourceBlockId) {
  return state.connections
    .filter((conn) => conn.sourceBlockId === sourceBlockId)
    .map((conn) => conn.targetBlockId);
}

/**
 * Adds a connection between two blocks
 * @param {State} state - Current application state
 * @param {string} name - Connection name/type
 * @param {number} sourceBlockId - ID of source block
 * @param {number} targetBlockId - ID of target block
 * @returns {State} Updated state with new connection
 */
function addConnection(state, name, sourceBlockId, targetBlockId) {
  const connection = {
    name,
    sourceBlockId,
    targetBlockId,
  };
  // TODO: allowed connection logic
  // TODO: multiple connections per program

  return { ...state, connections: [...state.connections, connection] };
}

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

  return saveStateHistoryAndReturn(state, newState);
}

/**
 * Deletes a block from the state
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to delete
 * @returns {import("hyperapp").Dispatchable<State>} Updated state without the block
 */
function deleteBlock(currentState, blockId) {
  const blockToDelete = currentState.blocks.find(
    (block) => block.id === blockId,
  );
  if (!blockToDelete) throw new Error(`Block ${blockId} not found`);

  const newState = {
    ...currentState,
    blocks: currentState.blocks.filter((block) => block.id !== blockId),
    selectedId: null,
  };

  return saveStateHistoryAndReturn(currentState, newState);
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
 * Saves the application state to disk
 * @param {State} state - Current application state to save
 * @returns {Promise<void>}
 */
async function saveApplication(state) {
  // Don't need to save mementoManager which is session undo/redo history
  const { mementoManager, ...serializableSaveState } = state;
  // Don't need to save session clipboard
  serializableSaveState.clipboard = null;

  // @ts-ignore
  await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);
}

/**
 * Copies the selected block to application clipboard
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with clipboard data
 */
function copySelectedBlock(state) {
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
 * Sends a block to the front (highest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to bring to front
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
function sendToFront(currentState, blockId) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the highest z-index among all blocks
  const maxZIndex = Math.max(...currentState.blocks.map((b) => b.zIndex));

  const newState = {
    ...currentState,
    blocks: currentState.blocks.map((b) =>
      b.id === blockId ? { ...b, zIndex: maxZIndex + 1 } : b,
    ),
  };

  return saveStateHistoryAndReturn(currentState, newState);
}

/**
 * Sends a block to the back (lowest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to send to back
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
function sendToBack(currentState, blockId) {
  const block = currentState.blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the lowest z-index among all blocks
  const minZIndex = Math.min(...currentState.blocks.map((b) => b.zIndex));

  const newState = {
    ...currentState,
    blocks: currentState.blocks.map((b) =>
      b.id === blockId ? { ...b, zIndex: minZIndex - 1 } : b,
    ),
  };

  return saveStateHistoryAndReturn(currentState, newState);
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
const pasteEffect = async (dispatch, state) => {
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

// -----------------------------
// ## Components
// -----------------------------

/**
 * Creates a resize handle component for block resizing
 * @param {string} handle - Handle position (nw, ne, sw, se, n, s, e, w)
 * @param {number} zoom - Current zoom level for scaling
 * @returns {import("hyperapp").ElementVNode<State>} Resize handle element
 */
function ResizeHandle(handle, zoom) {
  // Scale handle sizes inversely with zoom to maintain consistent visual appearance
  const handleSize = 10 / zoom;
  const handleOffset = 5 / zoom;
  const borderWidth = 1 / zoom;

  // Determine if this is a corner handle
  const isCorner = ["nw", "ne", "sw", "se"].includes(handle);
  const isEdge = ["n", "s", "e", "w"].includes(handle);

  /** @type {import("hyperapp").StyleProp} */
  const style = {
    position: "absolute",
    backgroundColor: isCorner ? "white" : "transparent",
    border: isCorner ? `${borderWidth}px solid blue` : "none",
    width: isEdge && ["n", "s"].includes(handle) ? "auto" : `${handleSize}px`,
    height: isEdge && ["e", "w"].includes(handle) ? "auto" : `${handleSize}px`,
  };

  // Add positioning based on handle type
  if (handle.includes("n")) style.top = `-${handleOffset}px`;
  if (handle.includes("s")) style.bottom = `-${handleOffset}px`;
  if (handle.includes("e")) style.right = `-${handleOffset}px`;
  if (handle.includes("w")) style.left = `-${handleOffset}px`;

  // Edge handle positioning
  if (["n", "s"].includes(handle)) {
    style.left = `${handleSize}px`;
    style.right = `${handleSize}px`;
  }
  if (["e", "w"].includes(handle)) {
    style.top = `${handleSize}px`;
    style.bottom = `${handleSize}px`;
  }

  return h("div", {
    class: `resize-handle ${handle}`,
    "data-handle": handle,
    style: style,
    onpointerenter: (state, event) => {
      event.stopPropagation();
      return {
        ...state,
        cursorStyle: RESIZE_CURSORS[handle] || "default",
      };
    },
    onpointerleave: (state, event) => {
      event.stopPropagation();
      return {
        ...state,
        cursorStyle: "default",
      };
    },
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
        cursorStyle: RESIZE_CURSORS[handle] || "default",
      };
    },
  });
}

/**
 * Creates a connection line component between two blocks
 * @param {State} state - Current application state
 * @param {BlockConnection} connection - Connection data
 * @returns {import("hyperapp").ElementVNode<State>} Connection line element
 */
function connectionLine(state, connection) {
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
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @returns {(block: Block) => import("hyperapp").ElementVNode<State>} Block renderer function
 */
function block(state) {
  return (block) => {
    const isSelected = state.selectedId === block.id;
    const isEditing = state.editingId === block.id;
    const isHovering = state.hoveringId === block.id;
    const isConnecting = state.connectingId === block.id;
    const isConnectable = isBlockConnectable(state, block.id);
    const isConnectedToHovered =
      state.hoveringId !== null &&
      getConnectedBlockIds(state, state.hoveringId).includes(block.id);

    // Having small borders, i.e. 1px, can cause rendering glitches to occur when CSS transform translations are applied such as zooming out
    // Scale outline thickness inversely with zoom to maintain consistent visual appearance
    const outline = (() => {
      if (isConnecting) {
        return `${4 / state.zoom}px solid orange`; // Orange for pending connection
      } else if (isConnectable && isHovering) {
        return `${4 / state.zoom}px solid #00ff00`; // Bright green for hovered connectable blocks
      } else if (isConnectable) {
        return `${3 / state.zoom}px solid #90ee90`; // Light green for connectable blocks
      } else if (isConnectedToHovered) {
        return `${3 / state.zoom}px solid purple`; // Purple for connected blocks when hovering source
      } else if (isSelected) {
        return `${4 / state.zoom}px solid blue`;
      } else if (isHovering) {
        return `${2 / state.zoom}px solid blue`;
      } else {
        return null;
      }
    })();

    return h(
      "div",
      {
        // Key ensures Hyperapp's virtual DOM can properly track each block element during list updates,
        // preventing DOM node reuse bugs when blocks are deleted (fixes positioning issues)
        key: `block-${block.id}`,
        "data-id": block.id,
        style: {
          outline: outline,
          transform: `translate(${block.x}px, ${block.y}px)`,
          width: `${block.width}px`,
          height: `${block.height}px`,
          zIndex: `${block.zIndex}`,
        },
        class: { block: true, hovered: isHovering },
        onpointerover: (state, event) => {
          event.stopPropagation();
          if (
            state.selectedId !== null &&
            state.selectedId !== block.id &&
            state.isBlockDragging
          )
            return state;

          // Don't change cursor if we're over a resize handle
          const target = /** @type {HTMLElement} */ (event.target);
          if (target.classList.contains("resize-handle")) {
            return {
              ...state,
              hoveringId: block.id,
            };
          }

          // Set cursor based on current mode
          let cursorStyle = "default";
          if (state.connectingId !== null) {
            // In connection mode, use default pointer cursor
            cursorStyle = "pointer";
          } else if (state.editingId === block.id) {
            // In edit mode, use default cursor
            cursorStyle = "default";
          } else {
            // Normal mode, use move cursor
            cursorStyle = "move";
          }

          return {
            ...state,
            hoveringId: block.id,
            cursorStyle: cursorStyle,
          };
        },
        onpointerleave: (state, event) => {
          event.stopPropagation();
          return {
            ...state,
            hoveringId: null,
            cursorStyle: "default",
          };
        },
        onpointerdown: (state, event) => {
          event.stopPropagation();

          // Handle connection mode
          if (
            state.connectingId !== null &&
            isBlockConnectable(state, block.id)
          ) {
            // Create connection and exit connect mode
            const newState = addConnection(
              state,
              "default",
              state.connectingId,
              block.id,
            );
            return {
              ...newState,
              connectingId: null,
              selectedId: block.id,
            };
          }

          // If block is in edit mode, don't start dragging
          if (state.editingId === block.id) {
            return {
              ...state,
              selectedId: block.id,
            };
          }

          // Normal selection and drag start
          return {
            ...state,
            selectedId: block.id,
            editingId: null, // Exit edit mode when selecting any block (even the same one)
            connectingId: null, // Exit connect mode when selecting any block
            lastX: event.clientX,
            lastY: event.clientY,
            isBlockDragging: true,
            dragStart: {
              id: block.id,
              startX: block.x,
              startY: block.y,
            },
          };
        },
        ondblclick: (state, event) => {
          event.stopPropagation();

          // Double-click enters edit mode
          return {
            ...state,
            selectedId: block.id,
            editingId: block.id,
            isBlockDragging: false, // Cancel any drag that might have started
            dragStart: null,
          };
        },
      },
      [
        h("program-component", {
          "data-id": block.id, // used for mounting program
          style: {
            pointerEvents: isEditing ? null : "none",
          },
        }),
        ...(isSelected && !isEditing && !isConnecting
          ? Object.keys(RESIZE_HANDLERS).map((handle) =>
              ResizeHandle(handle, state.zoom),
            )
          : []),
        isSelected && !isEditing && blockToolbar(),
      ],
    );
  };
}

/**
 * Creates a toolbar for selected blocks with action buttons
 * @returns {import("hyperapp").ElementVNode<State>} Block toolbar element
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
          onclick: (state, event) => {
            event.stopPropagation();
            if (state.selectedId === null) return state;
            return deleteBlock(state, state.selectedId);
          },
        },
        text("❌"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            if (state.selectedId === null) return state;
            return sendToBack(state, state.selectedId);
          },
        },
        text("send to back"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            if (state.selectedId === null) return state;
            return sendToFront(state, state.selectedId);
          },
        },
        text("send to front"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            if (state.selectedId === null) return state;

            // Toggle connect mode
            if (state.connectingId === state.selectedId) {
              // Exit connect mode
              return {
                ...state,
                connectingId: null,
              };
            } else {
              // Enter connect mode
              return {
                ...state,
                connectingId: state.selectedId,
              };
            }
          },
        },
        text("connect"),
      ),
    ],
  );
}

/**
 * Creates the main viewport component for the canvas
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Viewport element
 */
function viewport(state) {
  return h(
    "div",
    {
      id: "viewport",
      class: {
        "sidebar-hidden": !state.sidebarVisible,
      },
      style: {
        paddingRight: state.sidebarVisible ? `${state.sidebarWidth}px` : "0",
        touchAction: "none", // Prevent default touch behaviors
      },
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

        // Regular click - deselect blocks, exit edit mode, and exit connect mode
        return {
          ...state,
          selectedId: null,
          editingId: null,
          connectingId: null,
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

          let newDimensions = handler(block, {
            percentX: canvasX,
            percentY: canvasY,
          });

          // Apply aspect ratio constraint if shift is pressed
          if (state.isShiftPressed && state.resizeStart) {
            const originalBlock = {
              ...block,
              width: state.resizeStart.startWidth,
              height: state.resizeStart.startHeight,
              x: state.resizeStart.startX,
              y: state.resizeStart.startY,
            };
            newDimensions = applyAspectRatioConstraint(
              newDimensions,
              originalBlock,
              state.resizing.handle,
            );
          }

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
            cursorStyle: RESIZE_CURSORS[state.resizing.handle] || "default",
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
        const newState = {
          ...state,
          isViewportDragging: false,
          isBlockDragging: false,
          resizing: null,
          dragStart: null,
          resizeStart: null,
          cursorStyle: "default",
        };

        // Save state for completed drag operation
        if (state.dragStart && state.isBlockDragging) {
          const draggedBlock = state.blocks.find(
            (b) => b.id === state.dragStart?.id,
          );
          if (
            draggedBlock &&
            state.dragStart &&
            (draggedBlock.x !== state.dragStart.startX ||
              draggedBlock.y !== state.dragStart.startY)
          ) {
            // Create memento from the state before the drag started
            const beforeDragState = {
              ...state,
              blocks: state.blocks.map((b) =>
                b.id === draggedBlock.id
                  ? {
                      ...b,
                      x: state.dragStart?.startX || 0,
                      y: state.dragStart?.startY || 0,
                    }
                  : b,
              ),
            };
            return saveStateHistoryAndReturn(beforeDragState, newState);
          }
        }

        // Save state for completed resize operation
        if (state.resizeStart && state.resizing) {
          const resizedBlock = state.blocks.find(
            (b) => b.id === state.resizeStart?.id,
          );
          if (
            resizedBlock &&
            state.resizeStart &&
            (resizedBlock.width !== state.resizeStart.startWidth ||
              resizedBlock.height !== state.resizeStart.startHeight ||
              resizedBlock.x !== state.resizeStart.startX ||
              resizedBlock.y !== state.resizeStart.startY)
          ) {
            // Create memento from the state before the resize started
            const beforeResizeState = {
              ...state,
              blocks: state.blocks.map((b) =>
                b.id === resizedBlock.id
                  ? {
                      ...b,
                      width: state.resizeStart?.startWidth || 0,
                      height: state.resizeStart?.startHeight || 0,
                      x: state.resizeStart?.startX || 0,
                      y: state.resizeStart?.startY || 0,
                    }
                  : b,
              ),
            };
            return saveStateHistoryAndReturn(beforeResizeState, newState);
          }
        }

        return newState;
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
        [
          // Render connection lines first (behind blocks)
          ...state.connections.map((connection) =>
            connectionLine(state, connection),
          ),
          // Then render blocks on top
          ...state.blocks.map(block(state)),
        ],
      ),
    ],
  );
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
          onclick: (state) => [state, () => saveApplication(state)],
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
      onkeydown: (state, event) => {
        // Track shift key state
        if (event.key === "Shift") {
          return {
            ...state,
            isShiftPressed: true,
          };
        }

        // Check if user is interacting with an input field or has text selected
        const hasTextSelection =
          (window.getSelection()?.toString() ?? "").length > 0;

        // Handle keyboard shortcuts
        switch (event.key) {
          case "Escape":
            // Exit connect mode, edit mode, or deselect
            if (state.connectingId !== null) {
              event.preventDefault();
              return {
                ...state,
                connectingId: null,
              };
            } else if (state.editingId !== null) {
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
              return deleteBlock(state, state.selectedId);
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
              } else {
                // Let browser handle regular text copy
                return {
                  ...state,
                  clipboard: null,
                };
              }
            }
            return state;

          case "v":
            // Handle paste shortcut (Ctrl+V or Cmd+V)
            if (event.ctrlKey || event.metaKey) {
              if (state.editingId === null) {
                event.preventDefault();
                return [state, [pasteEffect, state]];
              }
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
                  return redoState(state);
                } else {
                  // Ctrl+Z or Cmd+Z = Undo
                  return undoState(state);
                }
              }
            }
            return state;

          case "y":
            // Handle redo shortcut (Ctrl+Y or Cmd+Y)
            if (event.ctrlKey || event.metaKey) {
              if (state.editingId === null) {
                event.preventDefault();
                return redoState(state);
              }
            }
            return state;

          case "s":
            // Handle save shortcut (Ctrl+S or Cmd+S)
            if (event.ctrlKey || event.metaKey) {
              event.preventDefault();
              return [state, () => saveApplication(state)];
            }
            return state;

          default:
            return state;
        }
      },
      onkeyup: (state, event) => {
        // Track shift key release
        if (event.key === "Shift") {
          return {
            ...state,
            isShiftPressed: false,
          };
        }
        return state;
      },
      tabindex: 0, // Make the main element focusable for keyboard events
    },
    [
      viewport(state),
      sidebar(state),
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
  /** @type{Map<number,import("./abstractProgram.js").AbstractProgram>}*/
  #programs;

  constructor() {
    this.#programs = new Map();
  }

  /** Get an instance of a program based on an ID
   * @param {Number} id
   * @returns {import("./abstractProgram.js").AbstractProgram | undefined}
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
