import {
  addWebviewBlockToViewportCenter,
  copySelectedBlocks,
} from "./block.js";
import { redoState, undoState } from "./memento.js";
import { getCurrentPage, updateCurrentPage } from "./pages.js";
import { deleteSelectedItems, hasSelection } from "./selection.js";
import {
  getIsWebviewFocused,
  pasteEffect,
  saveApplicationAndNotify,
} from "./utils.js";

/**
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function onkeydown(state, event) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  // Check if user is interacting with an input field or has text selected
  const hasTextSelection = (window.getSelection()?.toString() ?? "").length > 0;
  const isWebviewFocused = getIsWebviewFocused();

  // Handle keyboard shortcuts
  switch (event.key) {
    case "Escape":
      return updateCurrentPage(state, {
        selectedIds: [],
      });
    case "Delete":
    case "Backspace":
      if (isWebviewFocused) return state;

      return deleteSelectedItems(state);

    case "c":
      if (isWebviewFocused) return state;

      // Handle copy shortcut (Ctrl+C or Cmd+C)
      if (event.ctrlKey || event.metaKey) {
        // Only handle block copy if not in input field, no text is selected, and not in edit mode
        if (!hasTextSelection && hasSelection(state)) {
          event.preventDefault();
          return copySelectedBlocks(state);
        } else {
          // Let browser handle regular text copy
          return {
            ...state,
            clipboard: null,
          };
        }
      }
      return state;

    case "t":
      if (event.metaKey) {
        return addWebviewBlockToViewportCenter(
          state,
          "https://google.com",
          false,
        );
      }

    case "v":
      // Handle paste shortcut (Ctrl+V or Cmd+V)
      if (isWebviewFocused) return state;
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return [state, [pasteEffect, state]];
      }
      return state;

    case "z":
    case "Z":
      // Handle undo/redo shortcuts
      if (isWebviewFocused) return state;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        if (event.shiftKey) {
          // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
          return redoState(state);
        } else {
          // Ctrl+Z or Cmd+Z = Undo
          return undoState(state);
        }
      }
      return state;

    case "s":
      // Handle save shortcut (Ctrl+S or Cmd+S)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return [state, (dispatch) => saveApplicationAndNotify(dispatch, state)];
      }
      return state;

    case "y":
      // Handle redo shortcut (Ctrl+Y or Cmd+Y)
      if (isWebviewFocused) return state;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return redoState(state);
      }
      return state;

    default:
      return state;
  }
}
/**
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function onkeyup(state, event) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  switch (event.key) {
    default:
      return state;
  }
}

/**
 * Subscription that handles hyperapp
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @returns {() => void} Cleanup function
 */
export function keydownSubscription(dispatch) {
  /**
   * @param {KeyboardEvent} event
   */
  function handler(event) {
    dispatch(onkeydown, event);
  }
  addEventListener("keydown", handler);
  return () => removeEventListener("keydown", handler);
}

/**
 * Subscription that handles hyperapp
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @returns {() => void} Cleanup function
 */
export function keyupSubscription(dispatch) {
  /**
   * @param {KeyboardEvent} event
   */
  function handler(event) {
    dispatch(onkeyup, event);
  }
  addEventListener("keyup", handler);
  return () => removeEventListener("keyup", handler);
}
