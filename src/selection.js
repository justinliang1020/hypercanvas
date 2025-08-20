import { h } from "./packages/hyperapp/index.js";
import {
  getCurrentPage,
  getCurrentBlocks,
  updateCurrentPage,
  getCurrentViewport,
} from "./pages.js";

/**
 * Checks if a block is currently selected
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to check
 * @returns {boolean} True if block is selected
 */
export function isBlockSelected(state, blockId) {
  const currentPage = getCurrentPage(state);
  return currentPage?.selectedIds?.includes(blockId) ?? false;
}

/**
 * Checks if a block is in preview selection (during selection box drag)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to check
 * @returns {boolean} True if block is in preview selection
 */
export function isBlockPreviewSelected(state, blockId) {
  const currentPage = getCurrentPage(state);
  return currentPage?.previewSelectedIds?.includes(blockId) ?? false;
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
    connectingId: null, // Exit connect mode when selecting
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
    connectingId: null,
  });
}

/**
 * Gets the first selected block (for single-selection compatibility)
 * @param {State} state - Current application state
 * @returns {Block|null} The selected block or null if none selected
 */
export function getSelectedBlock(state) {
  const selectedBlocks = getSelectedBlocks(state);
  return selectedBlocks.length > 0 ? selectedBlocks[0] : null;
}

/**
 * Gets the ID of the first selected block (for single-selection compatibility)
 * @param {State} state - Current application state
 * @returns {number|null} The selected block ID or null if none selected
 */
export function getSelectedBlockId(state) {
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
    connectingId: null, // Exit connect mode when selecting
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
    connectingId: null, // Exit connect mode when deselecting
  });
}

/**
 * Toggles a block's selection state (for shift-click behavior)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to toggle
 * @returns {State} Updated state with block selection toggled
 */
export function toggleBlockSelection(state, blockId) {
  if (isBlockSelected(state, blockId)) {
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
 * @returns {State} Updated state with blocks selected
 */
export function handleSelectionBoxComplete(state, selectionBox) {
  const newSelectedIds = calculatePreviewSelection(state, selectionBox);

  return updateCurrentPage(state, {
    selectedIds: newSelectedIds,
    previewSelectedIds: [], // Clear preview after selection is finalized
  });
}

/**
 * Calculates which blocks would be selected by the current selection box
 * @param {State} state - Current application state
 * @param {SelectionBoxState} selectionBox - Selection box state
 * @returns {number[]} Array of block IDs that would be selected
 */

export function calculatePreviewSelection(state, selectionBox) {
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

  // Return preview selection based on current selection and shift key
  const currentSelectedIds = currentPage.selectedIds || [];

  if (currentPage.isShiftPressed) {
    // Shift+drag: add to existing selection
    return [...new Set([...currentSelectedIds, ...intersectingBlockIds])];
  } else {
    // Regular drag: replace selection
    return intersectingBlockIds;
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
