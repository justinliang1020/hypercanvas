import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {State} appState - JSON string representation of connected program state
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      connectedState: "{}",
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    this.subscriptions = () => {
      return [this.onAppStateChange(this.#updateAppState)];
    };
  }

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #main = (state) =>
    h("section", { style: { padding: "10px", fontFamily: "monospace" } }, [
      h("h3", {}, text("Connected Program State")),
      this.#pages(state),
    ]);

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #jsonPre = (state) =>
    h(
      "pre",
      {
        style: {
          padding: "10px",
          border: "3px solid #ccc", // border size needs to be 3px or greater to avoid visual artifact glitch when zooming out
          borderRadius: "4px",
          overflow: "auto",
          maxHeight: "400px",
        },
      },
      text(JSON.stringify(state.appState, null, 2)),
    );

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #pages = (state) => {
    const currentPage = state.appState.pages.find(
      (page) => page.id === state.appState.currentPageId,
    );

    if (!currentPage) {
      return h("div", {}, text("No current page found"));
    }

    return h("div", { style: { overflow: "auto" } }, [
      this.#pagePropertiesTable(currentPage),
    ]);
  };

  /**
   * @param {Page} page
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #pagePropertiesTable = (page) => {
    const properties = [
      { name: "offsetX", value: page.offsetX },
      { name: "offsetY", value: page.offsetY },
      { name: "zoom", value: page.zoom },
      { name: "lastX", value: page.lastX },
      { name: "lastY", value: page.lastY },
      { name: "cursorStyle", value: page.cursorStyle },
      {
        name: "isViewportDragging",
        value: page.isViewportDragging,
      },
      { name: "isBlockDragging", value: page.isBlockDragging },
      { name: "isShiftPressed", value: page.isShiftPressed },
      { name: "selectedId", value: page.selectedId },
      { name: "editingId", value: page.editingId },
      { name: "hoveringId", value: page.hoveringId },
      { name: "connectingId", value: page.connectingId },
      // { name: "resizing", value: page.resizing },
      // { name: "dragStart", value: page.dragStart },
      // { name: "resizeStart", value: page.resizeStart },
    ];

    return h("div", { style: { marginBottom: "20px" } }, [
      h("h4", {}, text("Page Properties")),
      h(
        "table",
        {
          style: {
            borderCollapse: "collapse",
            width: "100%",
            border: "1px solid #ccc",
            fontSize: "12px",
          },
        },
        [
          h("thead", {}, [
            h("tr", { style: { backgroundColor: "#f5f5f5" } }, [
              h(
                "th",
                {
                  style: {
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                  },
                },
                text("Property"),
              ),
              h(
                "th",
                {
                  style: {
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                    fontWeight: "bold",
                  },
                },
                text("Value"),
              ),
            ]),
          ]),
          h(
            "tbody",
            {},
            properties.map((prop) =>
              h("tr", { key: prop.name }, [
                h(
                  "td",
                  {
                    style: {
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "left",
                    },
                  },
                  text(prop.name),
                ),
                h(
                  "td",
                  {
                    style: {
                      border: "1px solid #ccc",
                      padding: "8px",
                      textAlign: "left",
                    },
                  },

                  this.#value(prop.value),
                ),
              ]),
            ),
          ),
        ],
      ),
    ]);
  };

  /**
   * @param {any} value
   */
  #value = (value) => {
    if (value instanceof Object) {
      return h(
        "pre",
        { style: { margin: "0", fontSize: "11px" } },
        text(JSON.stringify(value, null, 2)),
      );
    } else {
      return text(value === null ? "null" : String(value));
    }
  };

  /**
   * @param {ProgramState} state
   * @param {State} appState
   * @returns {ProgramState}
   */
  #updateAppState = (state, appState) => {
    return {
      ...state,
      appState: appState,
    };
  };
}
