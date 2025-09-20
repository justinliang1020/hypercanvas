import { h, text } from "./packages/hyperapp/index.js";
import { saveApplicationAndNotify } from "./utils.js";
import { addBlock } from "./block.js";
import { MEDIA_SAVE_PATH } from "./constants.js";
import {
  createPage,
  switchPage,
  deletePage,
  renamePage,
  getCurrentPage,
  updateCurrentPage,
} from "./pages.js";
import { getHoveredBlock, getSelectedBlocks } from "./selection.js";
import "./ace-editor.js";

/**
 * Creates the panels container with both layers panel, programs panel and floating toggle button
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]} Array of panel elements
 */
export function panelsContainer(state) {
  return [
    rightPanel(state),
    // Only show floating toggle button when panels are hidden
    ...(state.panelsVisible ? [] : [panelsToggle(state)]),
  ];
}

/**
 * Creates the layers panel on the left side
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Layers panel element
 */
function pages(state) {
  return h(
    "div",
    {
      id: "layers-panel",
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
          class: "layers-panel-button",
          onclick: (state) => createPage(state),
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
function rightPanel(state) {
  return h(
    "div",
    {
      id: "right-panel",
      class: {
        hidden: !state.panelsVisible,
      },
      style: {
        width: `40%`,
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
      // h(
      //   "button",
      //   {
      //     onclick: (state) => [
      //       state,
      //       async (dispatch) => {
      //         try {
      //           const result =
      //             // @ts-ignore
      //             await window.fileAPI.uploadImageFromDialog(MEDIA_SAVE_PATH);
      //           if (!result.canceled && result.success) {
      //             //TODO: should i delete image uploading
      //             console.log(`Would upload image: ${result.filename}`);
      //           }
      //         } catch (error) {
      //           console.error("Failed to upload image:", error);
      //           dispatch((state) => state);
      //         }
      //       },
      //     ],
      //   },
      //   text("upload image"),
      // ),
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
      // h(
      //   "button",
      //   {
      //     onclick: (state) => [
      //       state,
      //       (dispatch) => saveApplicationAndNotify(dispatch, state),
      //     ],
      //   },
      //   text("save"),
      // ),
      h("hr", {}),
      programEditor(state),
      h("hr", {}),
      viewButtons(state),
      stateVisualizer(state),
      h("hr", {}),
      pages(state),
    ],
  );
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function stateVisualizer(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {}, text("no current page"));
  return h("textarea", {
    cols: "100",
    rows: "50",
    style: {
      fontFamily: "monospace",
      fontSize: "12px",
    },
    value: JSON.stringify(currentPage.state, null, "\t"),
    oninput: (state, event) => {
      event.stopPropagation();
      const currentPage = getCurrentPage(state);
      if (!currentPage) return state;

      const target = /** @type {HTMLTextAreaElement} */ (event.target);
      try {
        return updateCurrentPage(state, {
          state: JSON.parse(target.value),
        });
      } catch {
        return state;
      }
    },
    onfocus: (state, event) => {
      return updateCurrentPage(state, { isTextEditorFocused: true });
    },
    onfocusout: (state, event) => {
      return updateCurrentPage(state, { isTextEditorFocused: false });
    },
    onpointerdown: (state, event) => {
      event.stopPropagation();
      return state;
    },
  });
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function viewButtons(state) {
  const defaultProgram = `function view(state) {
  return h("p", {}, text("hello world"))
}
`;

  return h("div", {}, [
    h(
      "button",
      {
        onclick: (state) => addBlock(state, defaultProgram),
      },
      text("new program"),
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

/**
 * Toggles visibility of panels
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function programEditor(state) {
  const selectedBlock = getSelectedBlocks(state)[0];
  const hoveredBlock = getHoveredBlock(state);
  const block = selectedBlock ? selectedBlock : hoveredBlock;
  if (!block)
    return h("ace-editor", {
      //@ts-ignore key to ensure proper state isolation between different blocks.
      key: -1,
      value: "no block selected",
    });
  return h("ace-editor", {
    //@ts-ignore key to ensure proper state isolation between different blocks.
    key: block.id,
    value: block.program,
    /**
     * @param {State} state
     * @param {Event} event
     */
    onaceinput: (state, event) => {
      event.stopPropagation();
      const currentPage = getCurrentPage(state);
      if (!currentPage) return state;

      return updateCurrentPage(state, {
        blocks: currentPage.blocks.map((b) =>
          //@ts-ignore uses custom `value` added to the event
          b.id === block.id ? { ...b, program: event.value } : b,
        ),
      });
    },
    onfocus: (state, event) => {
      return updateCurrentPage(state, { isTextEditorFocused: true });
    },
    onfocusout: (state, event) => {
      return updateCurrentPage(state, { isTextEditorFocused: false });
    },
    onpointerdown: (state, event) => {
      event.stopPropagation();
      return state;
    },
  });
}
