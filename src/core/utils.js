import { addImageBlock, pasteClipboardBlocks, updateBlock } from "./block.js";
import { MEDIA_SAVE_PATH, STATE_SAVE_PATH } from "./constants.js";
import { h, text } from "hyperapp";
import { getViewportCenterCoordinates } from "./viewport.js";
import { getCurrentPage, updateCurrentPage } from "./pages.js";

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
      style: {
        position: "fixed",
        top: "20px",
        left: "50%",
        transform: "translateX(-50%)",
        backgroundColor: "#4caf50",
        color: "#ffffff",
        padding: "12px 24px",
        borderRadius: "8px",
        boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)",
        zIndex: "10000",
        fontSize: "14px",
        fontWeight: "500",
        animation: "slideDown 0.3s ease-out",
        pointerEvents: "auto",
        display: "flex",
        alignItems: "center",
        gap: "12px",
      },
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
    state = setBlocksDomReadyFalse(state);
    state = syncBlocksSrc(state);
    const {
      mementoManager,
      notification,
      notificationVisible,
      clipboard,
      ...serializableSaveState
    } = state;

    await window.fileAPI.writeFile(STATE_SAVE_PATH, serializableSaveState);
  } catch (error) {
    console.error("Failed to save application state:", error);
  }
}

/**
 * Set the `domReady` property of all webview blocks to false. This is needed since on app load, none of the webviews have domReady loaded.
 * @param {State} state
 * @returns {State}
 */
function setBlocksDomReadyFalse(state) {
  return {
    ...state,
    pages: state.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => {
        if (block.type === "webview") {
          return { ...block, domReady: false };
        }
        return block;
      }),
    })),
  };
}

/**
 * Set the value of `initialSrc` to be `currentSrc` for webview blocks so the user retains page src when saving state
 * @param {State} state
 * @returns {State}
 */
function syncBlocksSrc(state) {
  return {
    ...state,
    pages: state.pages.map((page) => ({
      ...page,
      blocks: page.blocks.map((block) => {
        if (block.type === "webview") {
          return { ...block, initialSrc: block.currentSrc };
        }
        return block;
      }),
    })),
  };
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
        const result = await window.fileAPI.saveImageFromBuffer(
          arrayBuffer,
          imageType,
          MEDIA_SAVE_PATH,
        );
        if (result.success) {
          const src = result.path;
          const width = result.width;
          const height = result.height;
          const viewportCenter = getViewportCenterCoordinates(state);
          const x = viewportCenter.x - width / 2; // Center the block
          const y = viewportCenter.y - height / 2; // Center the block
          dispatch(
            (state) => addImageBlock(state, { src }, x, y, width, height).state,
          );

          return;
        }
      } catch (error) {
        console.error("Failed to paste image:", error);
      }

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

/**
 * @param {State} state
 * @param {Block} block
 * @returns {State}
 */
export function enableFullScreen(state, block) {
  const currentPage = getCurrentPage(state);
  if (!block || !currentPage) {
    return state;
  }
  //TODO: fix magic number
  const offsetX = 30;
  const offsetY = 80;
  const viewportRect = /** @type {HTMLElement} */ (
    document.getElementById("viewport")
  ).getBoundingClientRect();
  let newState = state;
  newState = updateCurrentPage(newState, {
    fullScreenState: {
      id: block.id,
      width: block.width,
      height: block.height,
      offsetX: currentPage.offsetX,
      offsetY: currentPage.offsetY,
      zoom: currentPage.zoom,
    },
    offsetX: -block.x + offsetX / 2,
    offsetY: -block.y + 10,
    zoom: 1,
  });
  newState = updateBlock(newState, block.id, {
    width: viewportRect.width - offsetX,
    height: viewportRect.height - offsetY,
  });
  return newState;
}

/**
 * Updates the current page with new data
 * @param {State} state - Current application state
 * @param {Partial<State>} newState - Data to update on current page
 * @returns {State} Updated state
 */
export function updateState(state, newState) {
  return {
    ...state,
    ...newState,
  };
}

/**
 * Creates a throttled version of a function that executes at most once per specified time period
 * @template {(...args: any[]) => any} T
 * @param {T} func - The function to throttle (can be async)
 * @param {number} limit - The minimum time in milliseconds between executions
 * @returns {(...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>>} The throttled async function
 * @example
 * const throttledSave = throttle(saveApplication, 2000);
 * await throttledSave(state); // Will execute immediately, then at most once every 2 seconds
 */
export function throttle(func, limit) {
  /** @type {number | null} */
  let lastRun = null;
  /** @type {number | null} */
  let timeoutId = null;

  return async function (...args) {
    const now = Date.now();

    if (lastRun === null || now - lastRun >= limit) {
      // Execute immediately if enough time has passed
      lastRun = now;
      return await func(...args);
    } else {
      // Schedule execution for when the time limit is reached
      return new Promise((resolve, reject) => {
        if (timeoutId) {
          clearTimeout(timeoutId);
        }
        timeoutId = window.setTimeout(
          async () => {
            lastRun = Date.now();
            try {
              const result = await func(...args);
              resolve(result);
            } catch (error) {
              reject(error);
            }
            timeoutId = null;
          },
          //@ts-ignore  BUG: idk fix this
          limit - (now - lastRun),
        );
      });
    }
  };
}

/**
 * https://x.com/stevekrouse/status/1988257237442171071/photo/1
 * @template T
 * @param {T} value - Initial value to pipe through functions
 * @param {...(value: T) => T} fns - Functions to apply in sequence
 * @returns {T} Final transformed value
 */
export function pipe(value, ...fns) {
  for (const fn of fns) {
    value = fn(value);
  }
  return value;
}

export function getIsWebviewFocused() {
  return (
    document.activeElement?.tagName === "WEBVIEW" ||
    document.activeElement?.tagName === "IFRAME"
  );
}

/**
 * Extracts the domain name from a URL, removing protocol and www subdomain
 * @param {string} urlString - The URL to extract domain from
 * @returns {string} The domain name (e.g., "https://www.example.com/" -> "example.com")
 * @example
 * getDomainFromUrl("https://www.example.com/") // returns "example.com"
 * getDomainFromUrl("https://api.example.com/path") // returns "api.example.com"
 * getDomainFromUrl("http://localhost:8080/") // returns "localhost:8080"
 */
export function getDomainFromUrl(urlString) {
  try {
    const url = new URL(urlString);
    let domain = url.host; // host includes port if present

    // Remove 'www.' prefix if present
    if (domain.startsWith("www.")) {
      domain = domain.substring(4);
    }

    return domain;
  } catch (error) {
    console.error("Invalid URL:", urlString, error);
    return urlString;
  }
}

/**
 * Effect to focus an element
 * @param {Function} dispatch
 * @param {{id: string}} props
 */
export function focusEffect(dispatch, props) {
  requestAnimationFrame(() => {
    const element = document.getElementById(props.id);
    if (element) {
      element.focus();
    }
  });
}

/**
 * Effect to focus an element
 * @param {Function} dispatch
 * @param {{id: string}} props
 */
export function blurEffect(dispatch, props) {
  requestAnimationFrame(() => {
    const element = document.getElementById(props.id);
    if (element) {
      element.blur();
    }
  });
}

/**
 * @param {State} state
 * @param {Event} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function stopPropagation(state, event) {
  event.stopPropagation();
  return state;
}
