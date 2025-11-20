import { app, h } from "hyperapp";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport, onkeydown } from "./viewport.js";
import {
  notification,
  saveApplication,
  saveApplicationAndNotify,
} from "./utils.js";
import { defaultPage } from "./pages.js";
import { toolbar } from "./toolbar.js";
import { dispatchMiddleware } from "../debugger/debugger.js";

initialize();

/**
 * @param {import("hyperapp").Action<State>} action
 * @returns {import("hyperapp").Subscription<State>}
 */
const onKeyDown = (action) => {
  /**
   * @param {import("hyperapp").Dispatch<State>} dispatch
   * @param {any} options
   */
  function keydownSubscriber(dispatch, options) {
    /**
     * @param {KeyboardEvent} event
     */
    function handler(event) {
      dispatch(options.action, event);
    }
    addEventListener("keydown", handler);
    return () => removeEventListener("keydown", handler);
  }
  return [keydownSubscriber, { action }];
};

/**
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
const KeyDown = (state, event) => {
  // First try viewport keyboard handling
  const viewportResult = onkeydown(state, event);
  if (viewportResult !== state) {
    return viewportResult;
  }

  switch (event.key) {
    case "s":
      // Handle save shortcut (Ctrl+S or Cmd+S)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return [state, (dispatch) => saveApplicationAndNotify(dispatch, state)];
      }
      return state;
    default:
      return state;
  }
};

/**
 * Creates the main application component
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Main application element
 */
function main(state) {
  const currentPage = state.pages.find((p) => p.id === state.currentPageId);
  return h(
    "main",
    {
      style: {
        cursor: currentPage?.cursorStyle || "default",
      },
      class: {
        "dark-mode": state.isDarkMode,
      },
    },
    [
      viewport(state),
      // sidebarWrapper(state),
      toolbar(state),
      notification(state),
    ],
  );
}

function initialState() {
  /** @type {State} */
  const state = {
    pages: [defaultPage],
    mouseX: 0,
    mouseY: 0,
    currentPageId: "",
    mementoManager: createMementoManager(),
    isDarkMode: false,
    isSidebarVisible: true,
    programsPanelWidth: 300,
    clipboard: null,
    notification: null,
    notificationVisible: false,
    contextMenu: null,
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
      onKeyDown(KeyDown),
    ],
    dispatch: dispatchMiddleware,
  });
}
