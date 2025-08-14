import { app, h, text } from "./packages/hyperapp/index.js";
import { appWithVisualizer } from "../../hyperapp-visualizer/visualizer.js";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport } from "./viewport.js";
import { mountProgram, ProgramManager } from "./programManager.js";
import { sidebar } from "./sidebar.js";
import { notification, saveApplication } from "./utils.js";

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

const programManager = new ProgramManager();
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
   * Action to remove inactive connections
   * @param {State} state
   * @returns {State}
   */
  function deleteInactiveConnections(state) {
    const activeBlockIds = new Set(state.blocks.map((block) => block.id));
    const validConnections = state.connections.filter(
      (connection) =>
        activeBlockIds.has(connection.sourceBlockId) &&
        activeBlockIds.has(connection.targetBlockId),
    );

    // Only return new state if connections actually changed
    if (validConnections.length !== state.connections.length) {
      return {
        ...state,
        connections: validConnections,
      };
    }

    return state;
  }

  /**
   * Subscription that runs after DOM repaint to render programs and handle dark mode
   * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
   * @param {State} state
   * @returns {() => void} Cleanup function
   */
  function subscription(dispatch, state) {
    dispatch(deleteInactiveConnections);
    programManager.syncPrograms(dispatch, state);

    // Schedule callback for after the current hyperapp paint cycle
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        state.blocks.forEach((block) => {
          mountProgram(block, programManager);
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
