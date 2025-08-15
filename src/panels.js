import { h, text } from "./packages/hyperapp/index.js";
import { saveApplicationAndNotify } from "./utils.js";
import { addBlock } from "./block.js";
import { MEDIA_SAVE_PATH } from "./constants.js";
import { undoState, redoState } from "./memento.js";
import { programRegistry } from "./programRegistry.js";
import { createPage, switchPage, deletePage } from "./pages.js";

/**
 * Creates the panels container with both layers panel, programs panel and floating toggle button
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]} Array of panel elements
 */
export function panelsContainer(state) {
  return [
    layersPanel(state),
    programsPanel(state),
    // Only show floating toggle button when panels are hidden
    ...(state.panelsVisible ? [] : [panelsToggle(state)]),
  ];
}

/**
 * Creates the layers panel on the left side
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Layers panel element
 */
function layersPanel(state) {
  return h(
    "div",
    {
      id: "layers-panel",
      class: {
        hidden: !state.panelsVisible,
      },
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    },
    [
      h("h2", {}, text("Pages")),
      h(
        "button",
        {
          onclick: (state) => createPage(state),
          style: {
            width: "100%",
            padding: "8px 12px",
            marginBottom: "10px",
            backgroundColor: "#007acc",
            color: "white",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontSize: "12px",
          },
        },
        text("+ New Page"),
      ),
      ...state.pages.map((page) =>
        h(
          "div",
          {
            key: page.id,
            style: {
              display: "flex",
              alignItems: "center",
              marginBottom: "4px",
              padding: "8px",
              backgroundColor:
                page.id === state.currentPageId ? "#e3f2fd" : "transparent",
              borderRadius: "4px",
              cursor: "pointer",
            },
            onclick: (state) => switchPage(state, page.id),
          },
          [
            h(
              "span",
              {
                style: {
                  flex: "1",
                  fontSize: "12px",
                  textAlign: "left",
                },
              },
              text(page.name),
            ),
            state.pages.length > 1
              ? h(
                  "button",
                  {
                    style: {
                      padding: "2px 6px",
                      fontSize: "10px",
                      backgroundColor: "#ff6b6b",
                      color: "white",
                      border: "none",
                      borderRadius: "2px",
                      cursor: "pointer",
                      marginLeft: "8px",
                    },
                    onclick: (state, event) => {
                      event.stopPropagation();
                      return deletePage(state, page.id);
                    },
                  },
                  text("×"),
                )
              : null,
          ],
        ),
      ),
    ],
  );
}

/**
 * Creates the programs panel on the right side
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Programs panel element
 */
function programsPanel(state) {
  return h(
    "div",
    {
      id: "programs-panel",
      class: {
        hidden: !state.panelsVisible,
      },
      style: {
        width: `${state.programsPanelWidth}px`,
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
            panelsVisible: !state.panelsVisible,
          }),
          title: "Toggle panels visibility",
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
                      "system/image.js",
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
            (dispatch) => saveApplicationAndNotify(dispatch, state),
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

/**
 * Toggles visibility of panels
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function panelsToggle(state) {
  return h(
    "button",
    {
      id: "panels-toggle",
      onclick: (state) => ({
        ...state,
        panelsVisible: !state.panelsVisible,
      }),
      title: "Show panels",
    },
    text("▶"),
  );
}
