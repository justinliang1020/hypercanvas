import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";
import { STATE_SAVE_PATH, MEDIA_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport } from "./viewport.js";
import { addBlock, pasteBlock } from "./block.js";
import { ProgramManager } from "./programManager.js";
import { sidebar } from "./sidebar.js";

// -----------------------------
// ## Utility
// -----------------------------

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
export async function saveApplication(dispatch, state) {
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

    // Show success notification
    showNotification(dispatch, "State saved successfully!");
  } catch (error) {
    console.error("Failed to save application state:", error);
    showNotification(dispatch, "Failed to save state");
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
          dispatch((state) =>
            addBlock(
              state,
              "system/image",
              { path: result.path },
              null, // x - use viewport center
              null, // y - use viewport center
              result.width,
              result.height,
            ),
          );
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
      dispatch(pasteBlock(state));
      return;
    } else {
      /** @type {import("./programs/system/text.js").State} */
      const textProgramState = {
        text: text,
        backgroundColor: "transparent",
      };
      dispatch(addBlock(state, "system/text", textProgramState));
      return;
    }
  } catch (error) {
    console.error("Failed to read clipboard:", error);
    dispatch((state) => state);
  }
};

/**
 * Creates a notification component that displays in the top middle
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>|null} Notification element or null if not visible
 */
function notification(state) {
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
 * Creates the main application component with keyboard handling
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Main application element
 */
function main(state) {
  return h(
    "main",
    {
      style: {
        cursor: state.cursorStyle,
      },
      class: {
        "dark-mode": state.isDarkMode,
      },
    },
    [
      viewport(state),
      sidebar(state),
      notification(state),
      // Only show floating toggle button when sidebar is hidden
      ...(state.sidebarVisible
        ? []
        : [
            h(
              "button",
              {
                id: "sidebar-toggle",
                onclick: (state) => ({
                  ...state,
                  sidebarVisible: !state.sidebarVisible,
                }),
                title: "Show sidebar",
              },
              text("▶"),
            ),
          ]),
    ],
  );
}

// -----------------------------
// ## Initialization
// -----------------------------

const programInstanceManager = new ProgramManager();
/**
 * Initializes the application with saved state and starts the Hyperapp
 * @returns {Promise<void>}
 */
async function initialize() {
  /** @type {State} */
  const initialState = {
    selectedId: null,
    editingId: null,
    hoveringId: null,
    connectingId: null,
    resizing: null,
    offsetX: 0,
    offsetY: 0,
    lastX: 0,
    lastY: 0,
    zoom: 1,
    cursorStyle: "pointer",
    isViewportDragging: false,
    isBlockDragging: false,
    isShiftPressed: false,
    dragStart: null,
    resizeStart: null,
    mementoManager: createMementoManager(),
    isDarkMode: false,
    sidebarVisible: true,
    sidebarWidth: 400,
    blocks: [],
    connections: [],
    clipboard: null,
    programFilter: "",
    notification: null,
    notificationVisible: false,
  };

  /**
   * Renders a program instance into its DOM element
   * @param {Block} block - Block containing the program to render
   * @returns {void}
   */
  function mountProgram(block) {
    const programComponent = document.querySelector(
      `program-component[data-id="${block.id}"]`,
    );
    const targetElement = /** @type {HTMLElement} */ (
      programComponent?.shadowRoot?.firstElementChild
    );
    const programInstance = programInstanceManager.get(block.id);

    if (
      targetElement &&
      targetElement.localName === "program-component-child"
    ) {
      if (programInstance) {
        try {
          programInstance.mount(targetElement, block.programData.state);
        } catch (error) {
          console.warn(`Failed to run program for block ${block.id}:`, error);
        }
      } else {
        targetElement.style.color = "red";
        targetElement.style.fontWeight = "bold";
        targetElement.innerText = `ERROR: program '${block.programData.name}' not initialized.`;
      }
    }
  }

  /** @type {State} */
  let state;
  try {
    // @ts-ignore
    state = await window.fileAPI.readFile(STATE_SAVE_PATH); // uncomment to have retained state
    if (!state) {
      state = initialState;
    }
    state.mementoManager = createMementoManager();
  } catch {
    state = initialState;
  }

  // Initialize dark mode based on system theme
  try {
    // @ts-ignore
    const systemIsDark = await window.fileAPI.getSystemTheme();
    state.isDarkMode = systemIsDark;
  } catch (error) {
    console.warn("Failed to get system theme, using default:", error);
  }

  let currentState = state;

  /**
   * Mutates state to remove inactive connections
   * @param {State} state
   */
  function deleteInactiveConnections(state) {
    const activeBlockIds = new Set(state.blocks.map((block) => block.id));
    const validConnections = state.connections.filter(
      (connection) =>
        activeBlockIds.has(connection.sourceBlockId) &&
        activeBlockIds.has(connection.targetBlockId),
    );
    state.connections = validConnections;
  }

  /**
   * Subscription that runs after DOM repaint to render programs and handle dark mode
   * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
   * @param {State} state
   * @returns {() => void} Cleanup function
   */
  function subscription(dispatch, state) {
    deleteInactiveConnections(state);
    programInstanceManager.syncPrograms(dispatch, state);

    // Schedule callback for after the current hyperapp paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        state.blocks.forEach((block) => {
          mountProgram(block);
        });
      });
    });

    // Store current state for save functionality
    currentState = state;

    // Return cleanup function (required for subscriptions)
    return () => {};
  }

  /**
   * Subscription that listens for system theme changes
   * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
   * @param {State} state
   * @returns {() => void} Cleanup function
   */
  function themeSubscription(dispatch, state) {
    /**
     * @param {boolean} isDark - Whether the system theme is dark
     */
    const handleThemeChange = (isDark) => {
      dispatch((state) => ({
        ...state,
        isDarkMode: isDark,
      }));
    };

    // @ts-ignore
    const listener = window.electronAPI.onThemeChanged(handleThemeChange);

    // Return cleanup function that removes the listener
    return () => {
      // @ts-ignore
      window.electronAPI.removeThemeListener(listener);
    };
  }

  /** @type {import("hyperapp").App<State>} */
  const appConfig = {
    init: state,
    view: (state) => main(state),
    node: /** @type {Node} */ (document.getElementById("app")),
    subscriptions: (state) => [
      [subscription, state],
      [themeSubscription, state],
    ],
  };

  // seems to be glitchy when having a lot of history
  const isUsingAppWithVisualizer = false;
  if (isUsingAppWithVisualizer) {
    appWithVisualizer(appConfig);
  } else {
    app(appConfig);
  }

  // Listen for quit signal from main process
  //@ts-ignore
  window.electronAPI.onAppWillQuit(() => {
    // Save your state here
    // @ts-ignore
    saveApplication(currentState);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });
}

initialize();
