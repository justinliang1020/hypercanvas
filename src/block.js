import { h, text } from "./packages/hyperapp/index.js";
import { MIN_SIZE, RESIZE_CURSORS } from "./constants.js";
import { saveMementoAndReturn } from "./memento.js";

/**
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @returns {(block: Block) => import("hyperapp").ElementVNode<State>} Block renderer function
 */

export function block(state) {
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
export function addConnection(state, name, sourceBlockId, targetBlockId) {
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

  return saveMementoAndReturn(currentState, newState);
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

  return saveMementoAndReturn(currentState, newState);
}

/**
 * Deletes a block from the state
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to delete
 * @returns {import("hyperapp").Dispatchable<State>} Updated state without the block
 */
export function deleteBlock(currentState, blockId) {
  const blockToDelete = currentState.blocks.find(
    (block) => block.id === blockId,
  );
  if (!blockToDelete) throw new Error(`Block ${blockId} not found`);

  const newState = {
    ...currentState,
    blocks: currentState.blocks.filter((block) => block.id !== blockId),
    selectedId: null,
  };

  return saveMementoAndReturn(currentState, newState);
}
