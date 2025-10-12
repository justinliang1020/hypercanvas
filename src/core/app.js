import { app, h } from "hyperapp";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport, onkeydown } from "./viewport.js";
import { panelsContainer } from "./panels.js";
import {
  notification,
  saveApplication,
  saveApplicationAndNotify,
} from "./utils.js";
import { defaultPage } from "./pages.js";

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
 * @param {import("hyperapp").Action<State>} action
 * @returns {import("hyperapp").Subscription<State>}
 */
const onKeyUp = (action) => {
  /**
   * @param {import("hyperapp").Dispatch<State>} dispatch
   * @param {any} options
   */
  function keyupSubscriber(dispatch, options) {
    /**
     * @param {KeyboardEvent} event
     */
    function handler(event) {
      dispatch(options.action, event);
    }
    addEventListener("keyup", handler);
    return () => removeEventListener("keyup", handler);
  }
  return [keyupSubscriber, { action }];
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
    case "Shift":
      return {
        ...state,
        isShiftPressed: true,
      };
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
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
const KeyUp = (state, event) => {
  switch (event.key) {
    case "Shift":
      return {
        ...state,
        isShiftPressed: false,
      };
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
    [viewport(state), ...panelsContainer(state), notification(state)],
  );
}

function initialState() {
  /** @type {State} */
  const state = {
    pages: [defaultPage],
    currentPageId: "",
    mementoManager: createMementoManager(),
    isDarkMode: false,
    panelsVisible: true,
    programsPanelWidth: 300,
    clipboard: null,
    programFilter: "",
    notification: null,
    notificationVisible: false,
    editingPageId: null,
    isShiftPressed: false,
    userPath: "",
    htmlRelativePaths: [],
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
 * Subscription that handles hyperapp
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @returns {() => void} Cleanup function
 */
function userFilesChangedSubscription(dispatch) {
  /**
   * @param {import("chokidar/handler.js").EventName} chokidarEvent,
   * @param {string} path,
   */
  const handleUserFilesChange = (chokidarEvent, path) => {
    console.log(chokidarEvent, path);
  };
  const listener = window.electronAPI.onUserFilesChanged(handleUserFilesChange);

  // Return cleanup function (required for subscriptions)
  return () => {
    // @ts-ignore
    window.electronAPI.removeThemeListener(listener);
  };
}

/**
 * @param {any} state
 */
function safeToEmitState(state) {
  return JSON.parse(
    JSON.stringify(state, (key, value) => {
      // Skip the problematic properties
      if (key === "state") return "<redacted>";
      return value;
    }),
  );
}

/** @type{import("hyperapp").Action<State> | null} */
let prevDispatchAction = null;
/** @type{any} */
let prevDispatchPayload = null;
/** @type{State | null} */
let prevState = null;

/**
 * For now, i won't think about effects or manual dispatch. Only actions and state
 * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
 */
const dispatchMiddleware = (dispatch) => (action, payload) => {
  // Action<S, P>
  if (typeof action === "function") {
    prevDispatchAction = action;
    prevDispatchPayload = payload;
  }
  if (Array.isArray(action) && typeof action[0] !== "function") {
    // [state: S, ...effects: MaybeEffect<S, P>[]]
  } else if (!Array.isArray(action) && typeof action !== "function") {
    // state
    const state = action;
    if (prevDispatchAction !== null && prevDispatchAction.name) {
      /** @type {AppDispatchEventDetail} */
      const detail = {
        state: safeToEmitState(state),
        action: prevDispatchAction,
        payload: prevDispatchPayload,
        prevState: safeToEmitState(prevState),
      };
      const event = new CustomEvent("appDispatch", {
        detail,
      });
      dispatchEvent(event);
    }
    prevDispatchAction = null;
    prevDispatchPayload = null;
    // @ts-ignore
    prevState = state;
  }
  dispatch(action, payload);
};

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

  state.userPath = await window.fileAPI.getUserPath();
  state.htmlRelativePaths = await window.fileAPI.getHtmlFileRelativePaths(
    state.userPath,
  );
  console.log("files", state.htmlRelativePaths);

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
      [userFilesChangedSubscription, {}],
      onKeyDown(KeyDown),
      onKeyUp(KeyUp),
    ],
    dispatch: dispatchMiddleware,
  });
}
