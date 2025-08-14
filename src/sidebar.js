import { h, text } from "./packages/hyperapp/index.js";
import { saveApplication } from "./utils.js";
import { addBlock } from "./block.js";
import { MEDIA_SAVE_PATH } from "./constants.js";
import { undoState, redoState } from "./memento.js";
import { programRegistry } from "./programRegistry.js";

/**
 * Creates the sidebar container with both sidebar and floating toggle button
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]} Array of sidebar elements
 */
export function sidebarContainer(state) {
  return [
    sidebar(state),
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
  ];
}

/**
 * Creates the main application sidebar with action buttons
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Sidebar element
 */
function sidebar(state) {
  return h(
    "div",
    {
      id: "sidebar",
      class: {
        hidden: !state.sidebarVisible,
      },
      style: {
        pointerEvents: state.isBlockDragging ? "none" : "auto",
        width: `${state.sidebarWidth}px`,
      },
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    },
    [
      h(
        "button",
        {
          onclick: (state) => ({
            ...state,
            sidebarVisible: !state.sidebarVisible,
          }),
          title: "Toggle sidebar visibility",
        },
        text("◀"),
      ),
      h(
        "button",
        {
          onclick: undoState,
          disabled: state.mementoManager.undoStack.length === 0,
        },
        text("↶ Undo"),
      ),
      h(
        "button",
        {
          onclick: redoState,
          disabled: state.mementoManager.redoStack.length === 0,
        },
        text("↷ Redo"),
      ),
      h(
        "button",
        {
          onclick: (state) => [
            state,
            async (dispatch) => {
              try {
                const result =
                  // @ts-ignore
                  await window.fileAPI.uploadImageFromDialog(MEDIA_SAVE_PATH);
                if (!result.canceled && result.success) {
                  console.log(`Image uploaded: ${result.filename}`);
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
                }
              } catch (error) {
                console.error("Failed to upload image:", error);
                dispatch((state) => state);
              }
            },
          ],
        },
        text("upload image"),
      ),
      h(
        "button",
        {
          onclick: (state) => ({
            ...state,
            isDarkMode: !state.isDarkMode,
          }),
          title: "Toggle dark mode",
        },
        text(state.isDarkMode ? "☀️ Light" : "🌙 Dark"),
      ),
      h(
        "button",
        {
          onclick: (state) => [
            state,
            (dispatch) => saveApplication(dispatch, state),
          ],
        },
        text("save"),
      ),
      h("hr", {}),
      programButtons(state),
    ],
  );
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function programButtons(state) {
  const filterText = state.programFilter || "";
  const filteredPrograms = Object.keys(programRegistry).filter((programName) =>
    programName.toLowerCase().includes(filterText.toLowerCase()),
  );

  return h("div", {}, [
    h("h2", {}, text("add program")),
    h("input", {
      type: "text",
      placeholder: "Filter programs...",
      value: filterText,
      style: {
        width: "100%",
        marginBottom: "10px",
        padding: "8px",
        border: "1px solid #ccc",
        borderRadius: "4px",
      },
      oninput: (state, event) => ({
        ...state,
        programFilter: /** @type {HTMLInputElement} */ (event.target).value,
      }),
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    }),
    ...filteredPrograms.map((programName) =>
      h(
        "button",
        {
          onclick: (state) => addBlock(state, programName),
        },
        text(`${programName.replaceAll("/", " / ")}`),
      ),
    ),
  ]);
}
