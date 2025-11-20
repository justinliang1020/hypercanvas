import {
  addWebviewBlockToViewportCenter,
  copySelectedBlocks,
} from "./block.js";
import { redoState, undoState } from "./memento.js";
import { getCurrentPage, updateCurrentPage } from "./pages.js";
import {
  getFirstSelectedBlockId,
  deleteSelectedItems,
  hasSelection,
} from "./selection.js";
import { disableFullScreen } from "./toolbar.js";
import { pasteEffect, saveApplicationAndNotify, updateState } from "./utils.js";

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

  // Handle keyboard shortcuts
  switch (event.key) {
    case "Escape":
      if (currentPage.fullScreenState) {
        return disableFullScreen(state);
      }
      return updateCurrentPage(state, {
        editingId: null,
        selectedIds: [],
      });
    case "Delete":
    case "Backspace":
      // Only handle block deletion if not in input field, a block is selected, and not in edit mode
      const selectedBlockId = getFirstSelectedBlockId(state);
      if (selectedBlockId !== null && currentPage.editingId === null) {
        event.preventDefault();
        return deleteSelectedItems(state);
      }
      // Let browser handle regular text deletion
      return state;

    case "c":
      // Handle copy shortcut (Ctrl+C or Cmd+C)
      if (event.ctrlKey || event.metaKey) {
        // Only handle block copy if not in input field, no text is selected, and not in edit mode
        if (
          !hasTextSelection &&
          hasSelection(state) &&
          currentPage.editingId === null
        ) {
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
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
          event.preventDefault();
          return [state, [pasteEffect, state]];
        }
      }
      return state;

    case "z":
    case "Z":
      // Handle undo/redo shortcuts
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
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

    case "s":
      // Handle save shortcut (Ctrl+S or Cmd+S)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return [state, (dispatch) => saveApplicationAndNotify(dispatch, state)];
      }
      return state;

    case "y":
      // Handle redo shortcut (Ctrl+Y or Cmd+Y)
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
          event.preventDefault();
          return redoState(state);
        }
      }
      return state;

    case " ":
      if (currentPage.editingId === null) {
        return updateState(state, {
          contextMenu: { target: "viewport", x: state.mouseX, y: state.mouseY },
        });
      }

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
