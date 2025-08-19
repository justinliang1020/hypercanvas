import { h, text } from "./packages/hyperapp/index.js";
import {
  MIN_SIZE,
  PASTE_OFFSET_X,
  PASTE_OFFSET_Y,
  RESIZE_CURSORS,
} from "./constants.js";
import { saveMementoAndReturn } from "./memento.js";
import {
  addConnection,
  getConnectedBlockIds,
  isBlockConnectable,
} from "./connection.js";
import { getViewportCenterCoordinates } from "./viewport.js";
import { clearUserClipboardEffect } from "./utils.js";
import {
  getCurrentBlocks,
  updateCurrentPage,
  getCurrentViewport,
  getCurrentPage,
  getGlobalBlocks,
} from "./pages.js";
import {
  isBlockSelected,
  selectBlock,
  getSelectedBlockId,
  getSelectedBlocks,
  toggleBlockSelection,
} from "./selection.js";

/**
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @returns {(block: Block) => import("hyperapp").ElementVNode<State>} Block renderer function
 */

export function block(state) {
  return (block) => {
    const currentPage = getCurrentPage(state);
    if (!currentPage) return h("div", {});

    const isSelected = isBlockSelected(state, block.id);
    const selectedBlocks = getSelectedBlocks(state);
    const isMultiSelect = selectedBlocks.length > 1;
    const isEditing = currentPage.editingId === block.id;
    const isHovering = currentPage.hoveringId === block.id;
    const isConnecting = currentPage.connectingId === block.id;
    const isConnectable = isBlockConnectable(state, block.id);
    const isConnectedToHovered =
      currentPage.hoveringId !== null &&
      getConnectedBlockIds(state, currentPage.hoveringId).includes(block.id);

    // Having small borders, i.e. 1px, can cause rendering glitches to occur when CSS transform translations are applied such as zooming out
    // Scale outline thickness inversely with zoom to maintain consistent visual appearance
    const viewport = getCurrentViewport(state);
    const outline = (() => {
      if (isConnecting) {
        return `${4 / viewport.zoom}px solid orange`; // Orange for pending connection
      } else if (isConnectable && isHovering) {
        return `${4 / viewport.zoom}px solid #00ff00`; // Bright green for hovered connectable blocks
      } else if (isConnectable) {
        return `${3 / viewport.zoom}px solid #90ee90`; // Light green for connectable blocks
      } else if (isConnectedToHovered) {
        return `${3 / viewport.zoom}px solid purple`; // Purple for connected blocks when hovering source
      } else if (isEditing) {
        return `${4 / viewport.zoom}px solid skyblue`;
      } else if (isMultiSelect) {
        return ``;
      } else if (isSelected) {
        return `${4 / viewport.zoom}px solid blue`;
      } else if (isHovering) {
        return `${2 / viewport.zoom}px solid blue`;
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
          const currentPage = getCurrentPage(state);
          if (!currentPage) return state;

          if (
            getSelectedBlockId(state) !== null &&
            getSelectedBlockId(state) !== block.id &&
            currentPage.dragStart !== null
          )
            return state;

          // Don't change cursor if we're over a resize handle
          const target = /** @type {HTMLElement} */ (event.target);
          if (target.classList.contains("resize-handle")) {
            return updateCurrentPage(state, {
              hoveringId: block.id,
            });
          }

          // Set cursor based on current mode
          let cursorStyle;
          if (isMultiSelect) {
            cursorStyle = "default";
          } else if (currentPage.connectingId !== null) {
            // In connection mode, use default pointer cursor
            cursorStyle = "pointer";
          } else if (currentPage.editingId === block.id) {
            // In edit mode, use default cursor
            cursorStyle = "default";
          } else {
            // Normal mode, use move cursor
            cursorStyle = "move";
          }

          return updateCurrentPage(state, {
            hoveringId: block.id,
            cursorStyle: cursorStyle,
          });
        },
        onpointerleave: (state, event) => {
          event.stopPropagation();
          return updateCurrentPage(state, {
            hoveringId: null,
            cursorStyle: "default",
          });
        },
        onpointerdown: (state, event) => {
          const currentPage = getCurrentPage(state);
          if (!currentPage) return state;
          if (isMultiSelect) return state;

          event.stopPropagation();

          // Handle connection mode
          if (
            currentPage.connectingId !== null &&
            isBlockConnectable(state, block.id)
          ) {
            // Create connection and exit connect mode
            const newState = addConnection(
              state,
              "default",
              currentPage.connectingId,
              block.id,
            );
            return selectBlock(newState, block.id);
          }

          // If block is in edit mode, don't start dragging
          if (currentPage.editingId === block.id) {
            return selectBlock(state, block.id);
          }

          // Handle shift-click for multi-select
          if (event.shiftKey) {
            return toggleBlockSelection(state, block.id);
          }

          // Normal selection and drag start
          const selectedState = selectBlock(state, block.id);
          return updateCurrentPage(selectedState, {
            dragStart: {
              id: block.id,
              startX: block.x,
              startY: block.y,
            },
          });
        },
        ondblclick: (state, event) => {
          event.stopPropagation();

          // Double-click enters edit mode
          const selectedState = selectBlock(state, block.id);
          return updateCurrentPage(selectedState, {
            editingId: block.id,
            dragStart: null,
          });
        },
      },
      [
        h("program-component", {
          "data-id": block.id, // used for mounting program
          style: {
            pointerEvents: isEditing ? null : "none",
          },
        }),
        ...(isSelected && !isEditing && !isConnecting && !isMultiSelect
          ? Object.keys(RESIZE_HANDLERS).map((handle) =>
              ResizeHandle(handle, viewport.zoom),
            )
          : []),
        isSelected && !isEditing && !isMultiSelect && blockToolbar(),
      ],
    );
  };
}

/**
 * @type {Record<string, ResizeHandler>}
 */

export const RESIZE_HANDLERS = {
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
}; // -----------------------------
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
      return updateCurrentPage(state, {
        cursorStyle: RESIZE_CURSORS[handle] || "default",
      });
    },
    onpointerleave: (state, event) => {
      event.stopPropagation();
      return updateCurrentPage(state, {
        cursorStyle: "default",
      });
    },
    onpointerdown: (state, event) => {
      event.stopPropagation();
      const blockId = parseInt(
        /** @type {HTMLElement} */ (event.target)?.parentElement?.dataset?.id ||
          "",
      );
      const blocks = getCurrentBlocks(state);
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return state;
      const selectedState = selectBlock(state, blockId);
      return updateCurrentPage(selectedState, {
        resizing: {
          id: blockId,
          handle: /** @type {string} */ (
            /** @type {HTMLElement} */ (event.target).dataset.handle
          ),
          startWidth: block.width,
          startHeight: block.height,
          startX: block.x,
          startY: block.y,
        },
        cursorStyle: RESIZE_CURSORS[handle] || "default",
      });
    },
  });
} /**
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
            const selectedBlockId = getSelectedBlockId(state);
            if (selectedBlockId === null) return state;
            return sendToBack(state, selectedBlockId);
          },
        },
        text("send to back"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            const selectedBlockId = getSelectedBlockId(state);
            if (selectedBlockId === null) return state;
            return sendToFront(state, selectedBlockId);
          },
        },
        text("send to front"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            const currentPage = getCurrentPage(state);
            const selectedBlockId = getSelectedBlockId(state);
            if (!currentPage || selectedBlockId === null) return state;

            // Toggle connect mode
            if (currentPage.connectingId === selectedBlockId) {
              // Exit connect mode
              return updateCurrentPage(state, {
                connectingId: null,
              });
            } else {
              // Enter connect mode
              return updateCurrentPage(state, {
                connectingId: selectedBlockId,
              });
            }
          },
        },
        text("connect"),
      ),
    ],
  );
}

/**
 * Sends a block to the front (highest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to bring to front
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
function sendToFront(currentState, blockId) {
  const blocks = getCurrentBlocks(currentState);
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the highest z-index among all blocks
  const maxZIndex = Math.max(...blocks.map((b) => b.zIndex));

  const newState = {
    ...updateCurrentPage(currentState, {
      blocks: blocks.map((b) =>
        b.id === blockId ? { ...b, zIndex: maxZIndex + 1 } : b,
      ),
    }),
  };

  return saveMementoAndReturn(currentState, newState);
}

/**
 * Sends a block to the back (lowest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to send to back
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
function sendToBack(currentState, blockId) {
  const blocks = getCurrentBlocks(currentState);
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the lowest z-index among all blocks
  const minZIndex = Math.min(...blocks.map((b) => b.zIndex));

  const newState = {
    ...updateCurrentPage(currentState, {
      blocks: blocks.map((b) =>
        b.id === blockId ? { ...b, zIndex: minZIndex - 1 } : b,
      ),
    }),
  };

  return saveMementoAndReturn(currentState, newState);
}

/**
 * Deletes a block from the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state without the block
 */
export function deleteSelectedBlocks(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const newState = updateCurrentPage(state, {
    blocks: currentPage.blocks.filter(
      (block) => !currentPage.selectedIds.includes(block.id),
    ),
    selectedIds: [],
  });

  return saveMementoAndReturn(state, newState);
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
 * @returns {State} Updated state with new block */
export function addBlock(
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
  const globalBlocks = getGlobalBlocks(state);
  /** @type {Block} */
  const newBlock = {
    id: Math.max(...globalBlocks.map((block) => block.id), 0) + 1,
    width: width,
    height: height,
    x: x,
    y: y,
    zIndex: Math.max(...globalBlocks.map((block) => block.zIndex), 0) + 1,
    programData: {
      name: programName,
      state: programState,
    },
  };

  const currentBlocks = getCurrentBlocks(state);
  const newState = updateCurrentPage(state, {
    blocks: [...currentBlocks, newBlock],
  });

  const selectedState = selectBlock(newState, newBlock.id);

  return saveMementoAndReturn(state, selectedState);
}

/**
 * Adds multiple blocks to the state
 * @param {State} state - Current application state
 * @param {Array<{programName: string, programState?: Object|null, x?: number|null, y?: number|null, width?: number, height?: number}>} blockConfigs - Array of block configurations
 * @returns {{state: State, blockIds: number[]}} Updated state with new blocks and array of new block IDs
 */
function addBlocks(state, blockConfigs) {
  if (!Array.isArray(blockConfigs) || blockConfigs.length === 0) {
    return { state, blockIds: [] };
  }

  let currentState = state;
  const newBlockIds = [];

  // Add each block sequentially
  for (const config of blockConfigs) {
    const {
      programName,
      programState = null,
      x = null,
      y = null,
      width = 200,
      height = 200,
    } = config;

    currentState = addBlock(
      currentState,
      programName,
      programState,
      x,
      y,
      width,
      height,
    );

    // Get the ID of the newly added block
    const currentBlocks = getCurrentBlocks(currentState);
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    if (lastBlock) {
      newBlockIds.push(lastBlock.id);
    }
  }

  return { state: currentState, blockIds: newBlockIds };
}

/**
 * Pastes blocks from clipboard into the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with pasted blocks
 */
export function pasteBlocks(state) {
  const clipboardData = state.clipboard;
  if (clipboardData === null) {
    return state;
  }

  // Transform clipboard data into block configurations for addBlocks
  const blockConfigs = clipboardData.map((blockData) => ({
    programName: blockData.programData.name,
    programState: blockData.programData.state,
    x: blockData.x + PASTE_OFFSET_X,
    y: blockData.y + PASTE_OFFSET_Y,
    width: blockData.width,
    height: blockData.height,
  }));

  const { state: newState, blockIds } = addBlocks(state, blockConfigs);

  // Select all pasted blocks
  if (blockIds.length > 0) {
    return updateCurrentPage(newState, {
      selectedIds: blockIds,
    });
  }

  return newState;
}

/**
 * Copies the selected blocks to application clipboard
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with clipboard data
 */
export function copySelectedBlocks(state) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length === 0) return state;

  // Create copies of the block data for clipboard, capturing current state
  /** @type {Block[]} */
  const blocksData = selectedBlocks.map((block) => ({
    ...block,
    id: -1, // not a "real" block
  }));

  return [
    {
      ...state,
      clipboard: blocksData,
    },
    clearUserClipboardEffect,
  ];
}
