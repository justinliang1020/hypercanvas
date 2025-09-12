import { h, text } from "./packages/hyperapp/index.js";
import { saveApplicationAndNotify } from "./utils.js";
import { addViewBlock } from "./block.js";
import { MEDIA_SAVE_PATH } from "./constants.js";
import {
  createPage,
  switchPage,
  deletePage,
  renamePage,
  getCurrentPage,
  resetPageState,
} from "./pages.js";
import { getFirstSelectedBlockId } from "./selection.js";
import { programRegistry } from "./program.js";

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
        "select",
        {
          value: state.selectedProgramName,
          onchange: (state, event) => {
            //@ts-ignore TODO: fix
            const programName = event.target.value;
            return {
              ...state,
              selectedProgramName: programName,
            };
          },
        },
        [
          ...Object.keys(programRegistry).map((programName) =>
            h("option", { value: programName }, text(programName)),
          ),
        ],
      ),
      h(
        "button",
        {
          class: "layers-panel-button",
          onclick: (state) => createPage(state, state.selectedProgramName),
        },
        text("+ New Page"),
      ),

      ...pageLabels(state),
    ],
  );
}

/**
 * Creates the layers panel on the left side
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]} Layers panel element
 */
function pageLabels(state) {
  return state.pages.map((page) =>
    h(
      "div",
      {
        key: page.id,
        class: {
          "page-item": true,
          active: page.id === state.currentPageId,
        },
        onclick: (state) => {
          const newState = switchPage(state, page.id);
          // Only clear editing state if we're not clicking on the currently editing page
          return state.editingPageId !== null && state.editingPageId !== page.id
            ? { ...newState, editingPageId: null }
            : newState;
        },
      },
      [
        state.editingPageId === page.id
          ? h("input", {
              type: "text",
              value: page.name,
              class: "page-name-base page-name-input",
              oninput: (state, event) => {
                const newName = /** @type {HTMLInputElement} */ (event.target)
                  .value;
                return renamePage(state, page.id, newName);
              },
              onkeydown: (state, event) => {
                const keyEvent = /** @type {KeyboardEvent} */ (event);
                if (keyEvent.key === "Enter" || keyEvent.key === "Escape") {
                  keyEvent.preventDefault();
                  return { ...state, editingPageId: null };
                }
                return state;
              },
              onblur: (state) => ({ ...state, editingPageId: null }),
              onpointerdown: (state, event) => {
                event.stopPropagation();
                return state;
              },
            })
          : h(
              "span",
              {
                class: "page-name-base page-name",
                ondblclick: (state) => ({
                  ...state,
                  editingPageId: page.id,
                }),
              },
              text(page.name),
            ),
        state.pages.length > 1
          ? h(
              "button",
              {
                class: "page-delete-button",
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
        overflowY: "auto",
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
          class: "programs-panel-toggle",
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
          onclick: (state) => [
            state,
            async (dispatch) => {
              try {
                const result =
                  // @ts-ignore
                  await window.fileAPI.uploadImageFromDialog(MEDIA_SAVE_PATH);
                if (!result.canceled && result.success) {
                  //TODO: should i delete image uploading
                  console.log(`Would upload image: ${result.filename}`);
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
      h(
        "button",
        {
          onclick: (state) => resetPageState(state, state.currentPageId),
        },
        text("reset page state"),
      ),
      h("hr", {}),
      editor(state),
      viewButtons(state),
    ],
  );
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function editor(state) {
  const firstSelectedBlockId = getFirstSelectedBlockId(state);
  return h("program-component", {
    "data-id": `editor-${firstSelectedBlockId}`,
  });
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function viewButtons(state) {
  const filterText = state.programFilter || "";
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {}, text("error"));
  const filteredViews = programRegistry[currentPage.programName].views.map(
    (f) => f.name,
  );

  return h("div", {}, [
    h("h2", {}, text(currentPage.programName)),
    h("input", {
      type: "text",
      placeholder: "Filter views...",
      value: filterText,
      class: "program-filter-input",
      oninput: (state, event) => ({
        ...state,
        programFilter: /** @type {HTMLInputElement} */ (event.target).value,
      }),
      onpointerdown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    }),
    ...filteredViews.map((viewName) =>
      h(
        "button",
        {
          onclick: (state) => addViewBlock(state, viewName),
        },
        text(viewName),
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
