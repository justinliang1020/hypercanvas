import { app, h } from "./packages/hyperapp/index.js";
import { STATE_SAVE_PATH } from "./constants.js";
import { createMementoManager } from "./memento.js";
import { viewport } from "./viewport.js";
import { mountProgram, ProgramManager } from "./programManager.js";
import { panelsContainer } from "./panels.js";
import { notification, saveApplication, wrapDispatch } from "./utils.js";
import { getCurrentBlocks } from "./pages.js";

initialize();

/**
 * Creates the main application component with keyboard handling
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
    pages: [
      {
        id: crypto.randomUUID(),
        name: "Page 1",
        blocks: [],
        connections: [],
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
        mouseX: 0,
        mouseY: 0,
        cursorStyle: "pointer",
        isViewportDragging: false,
        isShiftPressed: false,
        selectedIds: [],
        editingId: null,
        hoveringId: null,
        connectingId: null,
        resizing: null,
        dragStart: null,
        previewSelectedIds: [],
        selectionBox: null,
      },
    ],
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
  };

  // Set currentPageId to the first page
  state.currentPageId = state.pages[0].id;
  return state;
}

/**
 * Subscription that handles hyperapp
 * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
 * @param {{state: State, programManager: ProgramManager}} props
 * @returns {() => void} Cleanup function
 */
function subscription(dispatch, props) {
  const state = props.state;
  const programManager = props.programManager;

  programManager.syncPrograms(dispatch, state);

  // Schedule callback for after the current hyperapp paint cycle
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      getCurrentBlocks(state).forEach((block) => {
        mountProgram(block, programManager);
      });
    });
  });

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

  // Return cleanup function (required for subscriptions)
  return () => {
    // @ts-ignore
    window.electronAPI.removeThemeListener(listener);
  };
}

/**
 * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
 */
const dispatchMiddleware = wrapDispatch((state) => {
  const safeToEmitState = JSON.parse(
    JSON.stringify(state, (key, value) => {
      // Skip the problematic properties
      // if (key === "mementoManager") return undefined;
      if (key === "state" && typeof value === "object" && value !== null)
        return undefined;
      return value;
    }),
  );

  const event = new CustomEvent("appStateChange", {
    detail: { state: safeToEmitState },
  });
  dispatchEvent(event);

  return state;
});

/**
 * Initializes the application with saved state and starts the Hyperapp
 * @returns {Promise<void>}
 */
async function initialize() {
  const programManager = new ProgramManager();

  /** @type {State} */
  let state;
  try {
    // @ts-ignore
    state = await window.fileAPI.readFile(STATE_SAVE_PATH); // uncomment to have retained state
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
  window.electronAPI.onAppWillQuit(() => {
    saveApplication(state);

    // Tell main process we're done
    //@ts-ignore
    window.electronAPI.stateSaved();
  });

  app({
    init: state,
    view: (state) => main(state),
    node: /** @type {Node} */ (document.getElementById("app")),
    subscriptions: (state) => [
      [subscription, { state: state, programManager: programManager }],
    ],
    dispatch: dispatchMiddleware,
  });
}
