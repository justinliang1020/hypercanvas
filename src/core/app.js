import { app, h } from "hyperapp";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport } from "./viewport.js";
import { keydownSubscription, keyupSubscription } from "./keyboard.js";
import {
  throttle,
  notification,
  saveApplication,
  updateState,
} from "./utils.js";
import { defaultPage } from "./pages.js";
import { updateHyperappDebuggerState } from "../debugger/debugger.js";

initialize();

/**
 * Creates the main application component
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Main application element
 */
function main(state) {
  return h(
    "main",
    {
      style: {
        //@ts-ignore
        "--override-cursor": state.cursorStyleOverride, // the --override-cursor variable is propagated to all children elements, so it only needs to be applied here
      },
      class: {
        "dark-mode": state.isDarkMode,
        "cursor-style-override": state.cursorStyleOverride !== null, // apply this line to any elements you want to override cursor styles on
      },
      onpointermove: (state, event) => {
        // should be "global" to always track mouse state
        // even better to add this on document if possible
        return updateState(state, {
          mouseX: event.clientX,
          mouseY: event.clientY,
        });
      },
    },
    [viewport(state), notification(state)],
  );
}

function initialState() {
  /** @type {State} */
  const state = {
    pages: [defaultPage],
    mouseX: 0,
    mouseY: 0,
    currentPageId: "",
    cursorStyleOverride: "default",
    mementoManager: createMementoManager(),
    isDarkMode: false,
    isSidebarVisible: true,
    programsPanelWidth: 300,
    clipboard: null,
    notification: null,
    notificationVisible: false,
  };

  // Set currentPageId to the first page
  state.currentPageId = state.pages[0].id;
  return state;
}

/**
 * Subscription that handles hyperapp
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @returns {() => void} Cleanup function
 */
function themeChangeSubscription(dispatch) {
  /**
   * @param {boolean} isDark - Whether the system theme is dark
   */
  const handleThemeChange = (isDark) => {
    dispatch((state) => ({
      ...state,
      isDarkMode: isDark,
    }));
  };
  const listener = window.electronAPI.onThemeChanged(handleThemeChange);

  // Return cleanup function (required for subscriptions)
  return () => {
    // @ts-ignore
    window.electronAPI.removeThemeListener(listener);
  };
}

// Create throttled save function once at module level - saves at most once every 2 seconds
const throttledSave = throttle(saveApplication, 2000);

/**
 * For now, i won't think about effects or manual dispatch. Only actions and state
 * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
 */
function dispatchMiddleware(dispatch) {
  return (action, payload) => {
    if (!Array.isArray(action) && typeof action !== "function") {
      const state = /** @type {State} */ (action);

      updateHyperappDebuggerState(state);
      throttledSave(state);
    }
    dispatch(action, payload);
  };
}

/**
 * Initializes the application with saved state and starts the Hyperapp
 * @returns {Promise<void>}
 */
async function initialize() {
  /** @type {State} */
  let state;
  try {
    // @ts-ignore
    const stateString = await window.fileAPI.readFile(STATE_SAVE_PATH);
    if (stateString === null) {
      state = initialState();
    } else {
      state = JSON.parse(stateString);
    }
    state.mementoManager = createMementoManager();
  } catch (error) {
    alert(
      "State file could not be safely loaded. Please restart the application",
    );
    throw error;
  }

  // Initialize dark mode based on system theme
  try {
    // @ts-ignore
    const systemIsDark = await window.fileAPI.getSystemTheme();
    state.isDarkMode = systemIsDark;
  } catch (error) {
    console.warn("Failed to get system theme, using default:", error);
  }

  // Listen for quit signal from main process
  //@ts-ignore
  window.electronAPI.onAppWillQuit(async () => {
    await saveApplication(state);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });

  app({
    init: state,
    view: (state) => main(state),
    node: /** @type {Node} */ (document.getElementById("app")),
    subscriptions: (state) => [
      [themeChangeSubscription, {}],
      [keydownSubscription, {}],
      [keyupSubscription, {}],
    ],
    dispatch: dispatchMiddleware,
  });
}
