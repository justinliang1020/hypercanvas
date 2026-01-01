import { app, h } from "hyperapp";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport } from "./viewport.js";
import { keydownSubscription, keyupSubscription } from "./keyboard.js";
import { notification, saveApplication, updateState } from "./utils.js";
import { defaultPage } from "./pages.js";
import { dispatchMiddleware } from "../debugger/debugger.js";

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
        "--override-cursor": state.cursorStyleOverride,
      },
      class: {
        "dark-mode": state.isDarkMode,
        "cursor-style-override": state.cursorStyleOverride !== null,
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

/**
 * Initializes the application with saved state and starts the Hyperapp
 * @returns {Promise<void>}
 */
async function initialize() {
  /** @type {State} */
  let state;
  try {
    // @ts-ignore
    state = await window.fileAPI.readFile(STATE_SAVE_PATH);
    if (!state) {
      state = initialState();
    }
    state.mementoManager = createMementoManager();
  } catch {
    state = initialState();
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
