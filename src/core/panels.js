import { h, text } from "hyperapp";
import { addBlockToViewportCenter, sendToBack, sendToFront } from "./block.js";
import {
  createPage,
  switchPage,
  deletePage,
  renamePage,
} from "./pages.js";
import {  getSelectedBlocks } from "./selection.js";

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
      miscButtons(state),
      orderButtons(state),
      h("hr", {}),
      htmls(state),
      h("hr", {}),
      pages(state),
      h("hr", {}),
    ],
  );
}

/**
 * Creates a program buttons component with filter functionality
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function orderButtons(state) {
  const selectedBlock = getSelectedBlocks(state)[0];
  if (!selectedBlock) return h("div", {});

  return h("div", {}, [
    h("div", {}, [
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            return sendToBack(state, selectedBlock.id);
          },
        },
        text("send to back"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            event.stopPropagation();
            return sendToFront(state, selectedBlock.id);
          },
        },
        text("send to front"),
      ),
    ]),
  ]);
}

/**
 * Collection of buttons
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
 */
function miscButtons(state) {
  /**
   * Collection of buttons
   * @param {State} state - Current application state
   * @returns {import("hyperapp").ElementVNode<State>} Program buttons element
   */
  const interactButton = (state) => {
    const isInteractMode = state.isInteractMode;

    return h(
      "button",
      {
        class: {
          active: isInteractMode,
        },
        onclick: (state) => ({
          ...state,
          isInteractMode: !state.isInteractMode,
        }),
      },
      text("interact mode"),
    );
  };

  return h("div", {}, [interactButton(state)]);
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
function htmls(state) {
  /**
   * @param {string} htmlRelativePath
   */
  const htmlView = (htmlRelativePath) =>
    h(
      "div",
      {
        onpointerdown: () =>
          addBlockToViewportCenter(state, htmlRelativePath, "real"),
        id: "htmlPanelPreview",
      },
      [
        h("h4", {}, text(htmlRelativePath)),
        h("iframe", {
          src: `${state.userPath}/${htmlRelativePath}`,
          style: {
            pointerEvents: "none",
            width: "100%",
            border: "1px solid black",
          },
        }),
      ],
    );
  return h("div", {}, state.htmlRelativePaths.map(htmlView));
}
