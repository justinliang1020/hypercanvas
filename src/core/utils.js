import { pasteClipboardBlocks } from "./block.js";
import { MEDIA_SAVE_PATH, STATE_SAVE_PATH } from "./constants.js";
import { h, text } from "hyperapp";

/**
 * Creates a notification component that displays in the top middle
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>|null} Notification element or null if not visible
 */
export function notification(state) {
  if (!state.notificationVisible || !state.notification) {
    return null;
  }

  return h(
    "div",
    {
      id: "notification",
    },
    [h("span", {}, text(state.notification))],
  );
}

/**
 * Shows a notification message
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @param {string} message - Notification message to display
 */
function showNotification(dispatch, message) {
  dispatch((state) => ({
    ...state,
    notification: message,
    notificationVisible: true,
  }));

  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    dispatch((state) => ({
      ...state,
      notificationVisible: false,
    }));
  }, 1500);
}

/**
 * Saves the application state to disk and shows success notification
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @param {State} state - Current application state to save
 * @returns {Promise<void>}
 */
export async function saveApplicationAndNotify(dispatch, state) {
  try {
    await saveApplication(state);
    showNotification(dispatch, "State saved successfully!");
  } catch (error) {
    showNotification(dispatch, "Failed to save state");
  }
}

/**
 * Saves the application state to disk and shows success notification
 * @param {State} state - Current application state to save
 * @returns {Promise<void>}
 */
export async function saveApplication(state) {
  try {
    // Don't need to save mementoManager which is session undo/redo history
    const {
      mementoManager,
      notification,
      notificationVisible,
      ...serializableSaveState
    } = state;
    // Don't need to save session clipboard and notification state
    serializableSaveState.clipboard = null;

    // @ts-ignore
    await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);
  } catch (error) {
    console.error("Failed to save application state:", error);
  }
}

/**
 * Clear clipboard effect that clears the system clipboard
 * @type {import("hyperapp").Effect<State>}
 */
export const clearUserClipboardEffect = async () => {
  try {
    await navigator.clipboard.writeText("");
  } catch (error) {
    console.error("Failed to clear clipboard:", error);
  }
};

/**
 * Effect that handles pasting content from clipboard (images or text)
 * @param {import("hyperapp").Dispatch<State>} dispatch
 * @param {State} state
 */
export const pasteEffect = async (dispatch, state) => {
  try {
    const clipboardItems = await navigator.clipboard.read();

    if (clipboardItems.length === 0) {
      dispatch((state) => state);
      return;
    }

    const item = clipboardItems[0];

    const imageTypes = item.types.filter((type) => type.startsWith("image/"));
    if (imageTypes.length > 0) {
      // Handle image paste
      const imageType = imageTypes[0];
      const blob = await item.getType(imageType);
      const arrayBuffer = await blob.arrayBuffer();

      try {
        // @ts-ignore
        const result = await window.fileAPI.saveImageFromBuffer(
          arrayBuffer,
          imageType,
          MEDIA_SAVE_PATH,
        );
        if (result.success) {
          //TODO: should i remove image pasting
          console.log("Would paste image");
          return;
        }
      } catch (error) {
        console.error("Failed to paste image:", error);
      }

      dispatch((state) => state);
      return;
    }

    const text = await navigator.clipboard.readText();
    if (text.trim() === "") {
      dispatch((state) => pasteClipboardBlocks(state));
      return;
    } else {
      //TODO: should i remove text pasting
      console.log(`Would paste text: ${text}`);
      return;
    }
  } catch (error) {
    console.error("Failed to read clipboard:", error);
    dispatch((state) => state);
  }
};

/**
 * @template S
 * @param {(state: S) => S} fn
 * @returns {(dispatch: import("hyperapp").Dispatch<S>) => import("hyperapp").Dispatch<S>}
 */
export const wrapDispatch = (fn) => (dispatch) => (action, payload) => {
  if (Array.isArray(action) && typeof action[0] !== "function") {
    action = /** @type {import("hyperapp").Dispatchable<S>} */ ([
      fn(/** @type {S} */ (action[0])),
      ...action.slice(1),
    ]);
  } else if (!Array.isArray(action) && typeof action !== "function") {
    action = fn(/** @type {S} */ (action));
  }
  dispatch(action, payload);
};
