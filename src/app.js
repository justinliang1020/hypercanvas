import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";
import * as programs from "./programs/index.js";

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
 * @typedef {Object} Memento
 * @property {Block[]} blocks
 * @property {number|null} selectedId
 * @property {number|null} editingId
 */

/**
 * @typedef {Object} MementoManager
 * @property {Memento[]} undoStack
 * @property {Memento[]} redoStack
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
 * @property {number|null} hoveringId
 * @property {{id: number, handle: string}|null} resizing
 * @property {{id: number, startX: number, startY: number}|null} dragStart
 * @property {{id: number, startWidth: number, startHeight: number, startX: number, startY: number}|null} resizeStart
 * @property {number} toolbarWidth
 * @property {MementoManager} mementoManager
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
 * @type {Record<string, string>}
 */
const RESIZE_CURSORS = {
  nw: "nw-resize",
  ne: "ne-resize",
  sw: "sw-resize",
  se: "se-resize",
  n: "n-resize",
  s: "s-resize",
  w: "w-resize",
  e: "e-resize",
};

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
    const program = new programs.textProgram(el);
    program.changeText("meoww");
    console.log("current state", program.getCurrentState());
  }
}

customElements.define("program-component", ProgramComponent);

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
 * Creates a memento from the current state
 * @param {State} state
 * @returns {Memento}
 */
function createMemento(state) {
  return {
    blocks: JSON.parse(JSON.stringify(state.blocks)),
    selectedId: state.selectedId,
    editingId: state.editingId,
  };
}

/**
 * Saves prev state in memento history and returns the new state
 * @param {State} prevState
 * @param {State} newState
 * @returns {State}
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
 * @param {State} state
 * @returns {State}
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
    cursorStyle: "default",
  };
}

/**
 * Redoes the last undone state change
 * @param {State} state
 * @returns {State}
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
    cursorStyle: "default",
  };
}

/**
 * Adds a new block to the state
 * @param {State} currentState
 * @param {string} programName
 * @returns {State}
 */
function addBlock(currentState, programName) {
  /** @type{Block} */
  const newBlock = {
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    width: 200,
    height: 200,
    x: 50,
    y: 50,
    program: { name: programName, properties: {} },
  };

  const newState = {
    ...currentState,
    blocks: [...currentState.blocks, newBlock],
    selectedId: newBlock.id,
  };

  return saveStateHistoryAndReturn(currentState, newState);
}

/**
 * Deletes a block from the state
 * @param {State} currentState
 * @param {number} blockId
 * @returns {State}
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
 * Pastes a block into the state
 * @param {State} currentState
 * @param {Block} blockData
 * @returns {State}
 */
function pasteBlock(currentState, blockData) {
  /** @type{Block} */
  const newBlock = {
    ...blockData,
    id: Math.max(...currentState.blocks.map((block) => block.id), 0) + 1,
    x: blockData.x + 20,
    y: blockData.y + 20,
  };

  const newState = {
    ...currentState,
    blocks: [...currentState.blocks, newBlock],
    selectedId: newBlock.id,
  };

  return saveStateHistoryAndReturn(currentState, newState);
}

// -----------------------------
// ## Utility
// -----------------------------

/**
 * @param {State} state
 */
async function saveApplication(state) {
  // Don't need to save mementoManager since it just stores undo/redo session history
  const { mementoManager, ...serializableSaveState } = state;
  // @ts-ignore
  await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);
}

/**
 * @param {State} state
 * @param {string} programName
 * @returns {State}
 */
function addNewBlock(state, programName) {
  return addBlock(state, programName);
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
async function pasteBlockFromClipboard(state) {
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

    return pasteBlock(state, blockData);
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
 * @param {number} zoom
 * @returns {import("hyperapp").ElementVNode<State>}
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
            return deleteBlock(state, state.selectedId);
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
    const isHovering = state.hoveringId === block.id;

    // Having small borders, i.e. 1px, can cause rendering glitches to occur when CSS transform translations are applied such as zooming out
    // Scale outline thickness inversely with zoom to maintain consistent visual appearance
    const outline = (() => {
      if (isSelected) {
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
        "data-id": block.id,
        style: {
          outline: outline,
          transform: `translate(${block.x}px, ${block.y}px)`,
          width: `${block.width}px`,
          height: `${block.height}px`,
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

          return {
            ...state,
            hoveringId: block.id,
            cursorStyle: state.editingId === block.id ? "default" : "move",
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
          name: block.program.name,
          properties: block.program.properties,
          style: {
            pointerEvents: isEditing ? null : "none",
          },
        }),
        ...(isSelected && !isEditing
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
      // h(
      //   "button",
      //   { onclick: (state) => addNewBlock(state, "hello-world") },
      //   text("add new hello world block"),
      // ),
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
          onclick: (state) => [state, () => saveApplication(state)],
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
                    const newState = await pasteBlockFromClipboard(state);
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
    hoveringId: null,
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
    mementoManager: createMementoManager(),
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
    state.mementoManager = createMementoManager();
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
    saveApplication(currentState);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });
}

initialize();
