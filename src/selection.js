import { getCurrentPage, getCurrentBlocks, updateCurrentPage } from "./pages.js";

/**
 * Checks if a block is currently selected
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to check
 * @returns {boolean} True if block is selected
 */
export function isBlockSelected(state, blockId) {
  const currentPage = getCurrentPage(state);
  return currentPage?.selectedId === blockId;
}

/**
 * Gets all currently selected blocks
 * @param {State} state - Current application state
 * @returns {Block[]} Array of selected blocks
 */
export function getSelectedBlocks(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage || currentPage.selectedId === null) {
    return [];
  }
  
  const blocks = getCurrentBlocks(state);
  const selectedBlock = blocks.find(block => block.id === currentPage.selectedId);
  return selectedBlock ? [selectedBlock] : [];
}

/**
 * Gets the IDs of all currently selected blocks
 * @param {State} state - Current application state
 * @returns {number[]} Array of selected block IDs
 */
export function getSelectedBlockIds(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage || currentPage.selectedId === null) {
    return [];
  }
  return [currentPage.selectedId];
}

/**
 * Checks if any blocks are currently selected
 * @param {State} state - Current application state
 * @returns {boolean} True if any blocks are selected
 */
export function hasSelection(state) {
  const currentPage = getCurrentPage(state);
  return currentPage?.selectedId !== null;
}

/**
 * Selects a block (currently single selection only)
 * @param {State} state - Current application state
 * @param {number} blockId - ID of block to select
 * @returns {State} Updated state with block selected
 */
export function selectBlock(state, blockId) {
  return updateCurrentPage(state, {
    selectedId: blockId,
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
    selectedId: null,
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
  const currentPage = getCurrentPage(state);
  return currentPage?.selectedId ?? null;
}