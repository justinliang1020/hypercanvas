import {
  getCurrentPage,
  getCurrentBlocks,
  updateCurrentPage,
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

