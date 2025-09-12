import { saveMementoAndReturn } from "./memento.js";
import { programRegistry } from "./program.js";

/**
 * Gets the current page from state
 * @param {State} state - Current application state
 * @returns {Page|undefined} Current page or undefined if not found
 */
export function getCurrentPage(state) {
  return state.pages.find((page) => page.id === state.currentPageId);
}

/**
 * Gets blocks for the current page
 * @param {State} state - Current application state
 * @returns {Block[]} Blocks on current page
 */
export function getCurrentBlocks(state) {
  const currentPage = getCurrentPage(state);
  return currentPage ? currentPage.blocks : [];
}

/**
 * Gets blocks for the current page
 * @param {State} state - Current application state
 * @returns {Block[]} Blocks on current page
 */
export function getGlobalBlocks(state) {
  return state.pages.flatMap((page) => page.blocks);
}

/**
 * Gets viewport data for the current page
 * @param {State} state - Current application state
 * @returns {{offsetX: number, offsetY: number, zoom: number}} Viewport data
 */
export function getCurrentViewport(state) {
  const currentPage = getCurrentPage(state);
  return currentPage
    ? {
        offsetX: currentPage.offsetX,
        offsetY: currentPage.offsetY,
        zoom: currentPage.zoom,
      }
    : { offsetX: 0, offsetY: 0, zoom: 1 };
}

/** @type {Page} */
export const defaultPage = {
  id: crypto.randomUUID(),
  name: "New Page",
  blocks: [],
  offsetX: 0,
  offsetY: 0,
  zoom: 1,
  mouseX: 0,
  mouseY: 0,
  cursorStyle: "pointer",
  isViewportDragging: false,
  isShiftPressed: false,
  isAltPressed: false,
  selectedIds: [],
  editingId: null,
  hoveringId: null,
  resizing: null,
  dragStart: null,
  previewSelectedIds: [],
  selectionBox: null,
  state: { n: 0 },
  programName: "text",
};

/**
 * Creates a new page
 * @param {State} state - Current application state
 * @param {string} programName - program for the new page
 * @param {string} [name] - Name for the new page
 * @returns {State} Updated state with new page
 */
export function createPage(state, programName, name) {
  if (!name) name = `new ${programName}`;

  /** @type {Page} */
  const newPage = {
    ...defaultPage,
    id: crypto.randomUUID(),
    name,
    programName,
    state: programRegistry[programName].initialState,
  };

  const newState = {
    ...state,
    pages: [...state.pages, newPage],
    currentPageId: newPage.id,
  };

  return saveMementoAndReturn(state, newState);
}

/**
 * Switches to a different page
 * @param {State} state - Current application state
 * @param {string} pageId - ID of page to switch to
 * @returns {State} Updated state with new current page
 */
export function switchPage(state, pageId) {
  if (!state.pages.find((page) => page.id === pageId)) {
    return state;
  }

  return {
    ...state,
    currentPageId: pageId,
  };
}

/**
 * Deletes a page
 * @param {State} state - Current application state
 * @param {string} pageId - ID of page to delete
 * @returns {State} Updated state with page removed
 */
export function deletePage(state, pageId) {
  if (state.pages.length <= 1) {
    return state; // Don't delete the last page
  }

  const updatedPages = state.pages.filter((page) => page.id !== pageId);
  let newCurrentPageId = state.currentPageId;

  // If we're deleting the current page, switch to the first remaining page
  if (state.currentPageId === pageId) {
    newCurrentPageId = updatedPages[0].id;
  }

  const newState = {
    ...state,
    pages: updatedPages,
    currentPageId: newCurrentPageId,
  };

  return saveMementoAndReturn(state, newState);
}

/**
 * Renames a page
 * @param {State} state - Current application state
 * @param {string} pageId - ID of page to rename
 * @param {string} newName - New name for the page
 * @returns {State} Updated state with renamed page
 */
export function renamePage(state, pageId, newName) {
  const newState = {
    ...state,
    pages: state.pages.map((page) =>
      page.id === pageId ? { ...page, name: newName } : page,
    ),
  };

  return saveMementoAndReturn(state, newState);
}

/**
 * Updates the current page with new data
 * @param {State} state - Current application state
 * @param {Partial<Page>} pageData - Data to update on current page
 * @returns {State} Updated state
 */
export function updateCurrentPage(state, pageData) {
  return {
    ...state,
    pages: state.pages.map((page) =>
      page.id === state.currentPageId ? { ...page, ...pageData } : page,
    ),
  };
}

/**
 * Renames a page
 * @param {State} state - Current application state
 * @param {string} pageId - ID of page to rename
 * @returns {State} Updated state with renamed page
 */
export function resetPageState(state, pageId) {
  const programName = state.pages.find(
    (page) => page.id === pageId,
  )?.programName;
  if (!programName) return state;
  const program = programRegistry[programName];
  const newState = {
    ...state,
    pages: state.pages.map((page) =>
      page.id === pageId ? { ...page, state: program.initialState } : page,
    ),
  };
  return saveMementoAndReturn(state, newState);
}
