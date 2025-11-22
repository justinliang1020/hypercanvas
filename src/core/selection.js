import { h } from "hyperapp";
import {
  getCurrentPage,
  getCurrentBlocks,
  updateCurrentPage,
  getCurrentViewport,
} from "./pages.js";
import { RESIZE_HANDLERS, ResizeHandle } from "./resize.js";
import { saveMementoAndReturn } from "./memento.js";
import { Z_INDEX_TOP } from "./constants.js";
import { pipe, updateState } from "./utils.js";

/**
 * Checks if a block is in preview selection (during selection box drag)
 * @param {State} state - Current application state
 * @param {number} id - ID of block to check
 * @returns {boolean} True if block is in preview selection
 */
export function isPendingSelected(state, id) {
  const currentPage = getCurrentPage(state);
  return currentPage?.pendingSelectedIds?.includes(id) ?? false;
}

/**
 * Gets all currently selected blocks
 * @param {State} state - Current application state
 * @returns {Block[]} Array of selected blocks
 */
export function getSelectedBlocks(state) {
  const currentPage = getCurrentPage(state);
  if (
    !currentPage ||
    !currentPage.selectedIds ||
    currentPage.selectedIds.length === 0
  ) {
    return [];
  }

  const blocks = getCurrentBlocks(state);
  return blocks.filter((block) => currentPage.selectedIds.includes(block.id));
}

/**
 * Gets all currently selected blocks
 * @param {State} state - Current application state
 * @returns {Block | null} Array of selected blocks
 */
export function getHoveredBlock(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) {
    return null;
  }

  const blocks = getCurrentBlocks(state);
  return blocks.find((block) => block.id === currentPage.hoveringId) ?? null;
}

/**
 * Gets all currently selected blocks
 * @param {State} state - Current application state
 * @returns {Block | null} Array of selected blocks
 */
export function getEditingBlock(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) {
    return null;
  }

  const blocks = getCurrentBlocks(state);
  return blocks.find((block) => block.id === currentPage.editingId) ?? null;
}

/**
 * Gets the IDs of all currently selected blocks
 * @param {State} state - Current application state
 * @returns {number[]} Array of selected block IDs
 */
export function getSelectedBlockIds(state) {
  const currentPage = getCurrentPage(state);
  return currentPage?.selectedIds ?? [];
}

/**
 * Checks if any blocks are currently selected
 * @param {State} state - Current application state
 * @returns {boolean} True if any blocks are selected
 */
export function hasSelection(state) {
  const currentPage = getCurrentPage(state);
  return (currentPage?.selectedIds?.length ?? 0) > 0;
}

/**
 * Selects a block (replaces current selection for single-select behavior)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to select
 * @returns {State} Updated state with block selected
 */
export function selectBlock(state, blockId) {
  return updateCurrentPage(state, {
    selectedIds: [blockId],
    editingId: null, // Exit edit mode when selecting
  });
}

/**
 * Deselects all blocks
 * @param {State} state - Current application state
 * @returns {State} Updated state with no blocks selected
 */
export function deselectAllBlocks(state) {
  return updateCurrentPage(state, {
    selectedIds: [],
    editingId: null,
  });
}

/**
 * Gets the first selected block (for single-selection compatibility)
 * @param {State} state - Current application state
 * @returns {Block|null} The selected block or null if none selected
 */
export function getFirstSelectedBlock(state) {
  const selectedBlocks = getSelectedBlocks(state);
  return selectedBlocks.length > 0 ? selectedBlocks[0] : null;
}

/**
 * Gets the ID of the first selected block (for single-selection compatibility)
 * @param {State} state - Current application state
 * @returns {number|null} The selected block ID or null if none selected
 */
export function getFirstSelectedBlockId(state) {
  const selectedIds = getSelectedBlockIds(state);
  return selectedIds.length > 0 ? selectedIds[0] : null;
}

/**
 * Adds a block to the current selection (for multi-select)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to add to selection
 * @returns {State} Updated state with block added to selection
 */
export function addBlockToSelection(state, blockId) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const currentSelectedIds = currentPage.selectedIds || [];
  if (currentSelectedIds.includes(blockId)) {
    return state; // Already selected
  }

  return updateCurrentPage(state, {
    selectedIds: [...currentSelectedIds, blockId],
    editingId: null, // Exit edit mode when selecting
  });
}

/**
 * Removes a block from the current selection (for multi-select)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to remove from selection
 * @returns {State} Updated state with block removed from selection
 */
export function removeBlockFromSelection(state, blockId) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const currentSelectedIds = currentPage.selectedIds || [];
  const newSelectedIds = currentSelectedIds.filter((id) => id !== blockId);

  return updateCurrentPage(state, {
    selectedIds: newSelectedIds,
    editingId: null, // Exit edit mode when deselecting
  });
}

/**
 * Toggles a block's selection state (for shift-click behavior)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to toggle
 * @returns {State} Updated state with block selection toggled
 */
export function toggleBlockSelection(state, blockId) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) throw Error("No current page");
  if (currentPage.selectedIds.includes(blockId)) {
    return removeBlockFromSelection(state, blockId);
  } else {
    return addBlockToSelection(state, blockId);
  }
}

/**
 * Calculates the bounding box that encompasses all selected blocks
 * @param {State} state - Current application state
 * @returns {{x: number, y: number, width: number, height: number} | null} Bounding box or null if no selection
 */
export function getSelectionBoundingBox(state) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length === 0) {
    return null;
  }

  if (selectedBlocks.length === 1) {
    const block = selectedBlocks[0];
    return {
      x: block.x,
      y: block.y,
      width: block.width,
      height: block.height,
    };
  }

  // Calculate bounding box for multiple blocks
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  selectedBlocks.forEach((block) => {
    minX = Math.min(minX, block.x);
    minY = Math.min(minY, block.y);
    maxX = Math.max(maxX, block.x + block.width);
    maxY = Math.max(maxY, block.y + block.height);
  });

  return {
    x: minX,
    y: minY,
    width: maxX - minX,
    height: maxY - minY,
  };
}

/**
 * Creates a visual selection box component during drag
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State> | null} Selection box element or null
 */
export function selectionBoxComponent(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage || !currentPage.selectionBox) {
    return null;
  }

  const { startX, startY, currentX, currentY } = currentPage.selectionBox;

  // Calculate rectangle bounds
  const minX = Math.min(startX, currentX);
  const maxX = Math.max(startX, currentX);
  const minY = Math.min(startY, currentY);
  const maxY = Math.max(startY, currentY);

  const width = maxX - minX;
  const height = maxY - minY;

  const viewport = getCurrentViewport(state);
  const outlineWidth = 1 / viewport.zoom;

  return h("div", {
    key: "selection-box",
    style: {
      left: `${minX}px`,
      top: `${minY}px`,
      width: `${width}px`,
      height: `${height}px`,
      border: `${outlineWidth}px dashed #007acc`,
      backgroundColor: "rgba(0, 122, 204, 0.1)",
      position: "absolute",
      pointerEvents: "none",
    },
  });
}

/**
 * Handles completion of selection box drag operation
 * @param {State} state - Current application state
 * @param {SelectionBoxState} selectionBox - Selection box state
 * @param {boolean} isShiftPressed - Selection box state
 * @returns {State} Updated state with blocks selected
 */
export function handleSelectionBoxComplete(
  state,
  selectionBox,
  isShiftPressed,
) {
  const newSelectedIds = calculatePreviewSelection(
    state,
    selectionBox,
    isShiftPressed,
  );

  return updateCurrentPage(state, {
    selectedIds: newSelectedIds,
    pendingSelectedIds: [], // Clear preview after selection is finalized
  });
}

/**
 * Calculates which blocks would be selected by the current selection box
 * @param {State} state - Current application state
 * @param {SelectionBoxState} selectionBox - Selection box state
 * @param {boolean} isShiftPressed - Selection box state
 * @returns {number[]} Array of block IDs that would be selected
 */

export function calculatePreviewSelection(state, selectionBox, isShiftPressed) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return [];

  // Calculate selection rectangle bounds
  const minX = Math.min(selectionBox.startX, selectionBox.currentX);
  const maxX = Math.max(selectionBox.startX, selectionBox.currentX);
  const minY = Math.min(selectionBox.startY, selectionBox.currentY);
  const maxY = Math.max(selectionBox.startY, selectionBox.currentY);

  // Find blocks that intersect with selection rectangle
  const blocks = getCurrentBlocks(state);
  const intersectingBlockIds = blocks
    .filter((block) => {
      // Check if block intersects with selection rectangle
      const blockRight = block.x + block.width;
      const blockBottom = block.y + block.height;

      return !(
        block.x > maxX ||
        blockRight < minX ||
        block.y > maxY ||
        blockBottom < minY
      );
    })
    .map((block) => block.id);

  // Find links that intersect with selection rectangle
  const intersectingLinkIds = currentPage.links
    .filter((link) => {
      const parentBlock = blocks.find((b) => b.id === link.parentBlockId);
      const childBlock = blocks.find((b) => b.id === link.childBlockId);
      if (!parentBlock || !childBlock) return false;

      return lineIntersectsRect(
        parentBlock.x + parentBlock.width / 2,
        parentBlock.y + parentBlock.height / 2,
        childBlock.x + childBlock.width / 2,
        childBlock.y + childBlock.height / 2,
        minX,
        minY,
        maxX,
        maxY,
      );
    })
    .map((link) => link.id);

  // Combine both types of IDs
  const allIntersectingIds = [...intersectingBlockIds, ...intersectingLinkIds];

  // Return preview selection based on current selection and shift key
  const currentSelectedIds = currentPage.selectedIds || [];

  if (isShiftPressed) {
    // Shift+drag: add to existing selection
    return [...new Set([...currentSelectedIds, ...allIntersectingIds])];
  } else {
    // Regular drag: replace selection
    return allIntersectingIds;
  }
}

/**
 * Checks if a point is within the selection bounding box
 * @param {State} state - Current application state
 * @param {number} canvasX - X coordinate in canvas space
 * @param {number} canvasY - Y coordinate in canvas space
 * @returns {boolean} True if point is within selection bounds
 */
export function isPointInSelectionBounds(state, canvasX, canvasY) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length <= 1) return false;

  const boundingBox = getSelectionBoundingBox(state);
  if (!boundingBox) return false;

  return (
    canvasX >= boundingBox.x &&
    canvasX <= boundingBox.x + boundingBox.width &&
    canvasY >= boundingBox.y &&
    canvasY <= boundingBox.y + boundingBox.height
  );
}
/**
 * Creates a selection bounding box component for multi-select
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State> | null} Selection bounding box element or null
 */
export function selectionBoundingBox(state) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length <= 1) {
    return null; // No bounding box for single or no selection
  }

  const boundingBox = getSelectionBoundingBox(state);
  if (!boundingBox) {
    return null;
  }

  const viewport = getCurrentViewport(state);
  const outlineWidth = 4 / viewport.zoom;

  return h(
    "div",
    {
      key: "selection-bounding-box",
      class: "selection-bounding-box",
      style: {
        left: `${boundingBox.x}px`,
        top: `${boundingBox.y}px`,
        width: `${boundingBox.width}px`,
        height: `${boundingBox.height}px`,
        outline: `${outlineWidth}px solid blue`,
        position: "absolute",
        pointerEvents: "none",
        outlineOffset: "-2px",
        zIndex: `${Z_INDEX_TOP}`,
        boxSizing: "border-box",
      },
    },
    // Add resize handles for multi-select
    Object.keys(RESIZE_HANDLERS).map((handle) =>
      ResizeHandle({
        handle: /** @type{ResizeString} */ (handle),
        zoom: viewport.zoom,
        context: "multi",
      }),
    ),
  );
}

/**
 * Checks if a line segment intersects with a rectangle
 * @param {number} x1 - Line start X
 * @param {number} y1 - Line start Y
 * @param {number} x2 - Line end X
 * @param {number} y2 - Line end Y
 * @param {number} rectX - Rectangle left
 * @param {number} rectY - Rectangle top
 * @param {number} rectRight - Rectangle right
 * @param {number} rectBottom - Rectangle bottom
 * @returns {boolean} True if line intersects rectangle
 */
function lineIntersectsRect(
  x1,
  y1,
  x2,
  y2,
  rectX,
  rectY,
  rectRight,
  rectBottom,
) {
  // Check if either endpoint is inside rectangle
  if (
    (x1 >= rectX && x1 <= rectRight && y1 >= rectY && y1 <= rectBottom) ||
    (x2 >= rectX && x2 <= rectRight && y2 >= rectY && y2 <= rectBottom)
  ) {
    return true;
  }

  // Check intersection with rectangle edges
  return (
    lineSegmentsIntersect(x1, y1, x2, y2, rectX, rectY, rectRight, rectY) || // Top edge
    lineSegmentsIntersect(
      x1,
      y1,
      x2,
      y2,
      rectRight,
      rectY,
      rectRight,
      rectBottom,
    ) || // Right edge
    lineSegmentsIntersect(
      x1,
      y1,
      x2,
      y2,
      rectRight,
      rectBottom,
      rectX,
      rectBottom,
    ) || // Bottom edge
    lineSegmentsIntersect(x1, y1, x2, y2, rectX, rectBottom, rectX, rectY) // Left edge
  );
}

/**
 * Checks if two line segments intersect
 * @param {number} x1 - First line start X
 * @param {number} y1 - First line start Y
 * @param {number} x2 - First line end X
 * @param {number} y2 - First line end Y
 * @param {number} x3 - Second line start X
 * @param {number} y3 - Second line start Y
 * @param {number} x4 - Second line end X
 * @param {number} y4 - Second line end Y
 * @returns {boolean} True if line segments intersect
 */
function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (denom === 0) return false;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  return t >= 0 && t <= 1 && u >= 0 && u <= 1;
}

/**
 * Deletes a block from the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state without the block
 */

export function deleteSelectedItems(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const selectedIds = currentPage.selectedIds;
  if (selectedIds.length === 0) return state;

  // Separate blocks and links for deletion
  const selectedBlockIds = selectedIds.filter((id) =>
    currentPage.blocks.some((block) => block.id === id),
  );
  const selectedLinkIds = selectedIds.filter((id) =>
    currentPage.links.some((link) => link.id === id),
  );

  const newState = pipe(
    state,
    (s) =>
      updateCurrentPage(s, {
        // Remove selected blocks
        blocks: currentPage.blocks.filter(
          (block) => !selectedBlockIds.includes(block.id),
        ),
        // Remove selected links + links connected to deleted blocks
        links: currentPage.links.filter(
          (link) =>
            !selectedLinkIds.includes(link.id) &&
            !selectedBlockIds.includes(link.parentBlockId) &&
            !selectedBlockIds.includes(link.childBlockId),
        ),
        selectedIds: [],
        // deleting a block while hovered over it doesn't trigger the block's "onpointerleave" event,
        // so we must manually change the cursor style
      }),
    (s) => updateState(s, { cursorStyle: "default" }),
  );

  return saveMementoAndReturn(state, newState);
}
