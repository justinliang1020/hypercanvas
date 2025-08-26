import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {State | null} appState - JSON string representation of connected program state
 * @property {String} visualizationName
 */

/**
 * @extends ProgramBase<ProgramState>
 */
export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      //TODO: appState should default to the app state
      appState: null,
      visualizationName: "Current Page",
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    this.subscriptions = () => {
      return [this.onAppDispatch(this.#updateAppState)];
    };
  }

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #main = (state) => {
    /** @type {Record<string, import("hyperapp").ElementVNode<ProgramState>>} */
    const visualizations = {
      "Current Page": this.#currentPage(state),
      "Current Page Blocks": this.#currentPageBlocks(state),
      "Current Page Connections": this.#currentPageConnections(state),
    };
    const visualization =
      visualizations[state.visualizationName] ||
      h(
        "div",
        { style: { color: "#ff6b6b", padding: "10px" } },
        text(`Invalid visualization name: ${state.visualizationName}`),
      );
    return h(
      "section",
      { style: { padding: "10px", fontFamily: "monospace" } },
      [
        h(
          "select",
          {
            value: state.visualizationName,
            style: {
              marginBottom: "10px",
              padding: "5px",
              fontSize: "14px",
              border: "1px solid #ccc",
              borderRadius: "4px",
            },
            onchange: (
              /** @type {ProgramState} */ state,
              /** @type {Event} */ event,
            ) => ({
              ...state,
              visualizationName: /** @type {HTMLSelectElement} */ (event.target)
                .value,
            }),
          },
          Object.keys(visualizations).map((name) =>
            h("option", { value: name, key: name }, text(name)),
          ),
        ),
        visualization,
      ],
    );
  };

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #currentPage = (state) => {
    if (state.appState === null) {
      return h("div", {}, text("No app state"));
    }

    const currentPage = state.appState.pages.find(
      (page) => page.id === state.appState?.currentPageId,
    );

    if (!currentPage) {
      return h("div", {}, text("No current page found"));
    }

    /** @type {Record<string, number>} */
    const heightOverrides = {
      resizing: 8,
      dragStart: 5,
    };

    /** @type {Record<string, string>} */
    const valueOverrides = {
      blocks: "<See Block Table>",
      connections: "<See Connections Table>",
    };

    const properties = Object.keys(currentPage).map((key) => ({
      name: key,
      value: valueOverrides[key] || /** @type {any} */ (currentPage)[key],
      height: heightOverrides[key],
    }));

    return this.#table(properties);
  };

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #currentPageBlocks = (state) => {
    if (state.appState === null) {
      return h("div", {}, text("No app state"));
    }

    const currentPage = state.appState.pages.find(
      (page) => page.id === state.appState?.currentPageId,
    );

    if (!currentPage) {
      return h("div", {}, text("No current page found"));
    }

    const currentPageBlocks = currentPage.blocks;

    /** @type {Record<string, number>} */
    const heightOverrides = {};

    /** @type {Record<string, string>} */
    const valueOverrides = {};

    const properties = Object.keys(currentPageBlocks).map((key) => ({
      name: key,
      value: valueOverrides[key] || /** @type {any} */ (currentPageBlocks)[key],
      height: heightOverrides[key],
    }));

    return this.#table(properties);
  };

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #currentPageConnections = (state) => {
    if (state.appState === null) {
      return h("div", {}, text("No app state"));
    }

    const currentPage = state.appState.pages.find(
      (page) => page.id === state.appState?.currentPageId,
    );

    if (!currentPage) {
      return h("div", {}, text("No current page found"));
    }

    const object = currentPage.connections;

    /** @type {Record<string, number>} */
    const heightOverrides = {};

    /** @type {Record<string, string>} */
    const valueOverrides = {};

    const properties = Object.keys(object).map((key) => ({
      name: key,
      value: valueOverrides[key] || /** @type {any} */ (object)[key],
      height: heightOverrides[key],
    }));

    return this.#table(properties);
  };

  /**
   * @param {{name: String, value: any, height?: number}[]} properties
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #table(properties) {
    return h(
      "div",
      { style: { overflow: "auto" } },
      h("div", { style: { marginBottom: "20px" } }, [
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
                      width: "1%",
                      whiteSpace: "nowrap",
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
                        width: "1%",
                        whiteSpace: "nowrap",
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

                    this.#value(prop.value, prop.height),
                  ),
                ]),
              ),
            ),
          ],
        ),
      ]),
    );
  }

  /**
   * @param {any} value
   * @param {number} [height]
   */
  #value = (value, height) => {
    if (value instanceof Object) {
      let jsonString = JSON.stringify(value, null, 2);
      if (height && height > 1) {
        const currentLines = jsonString.split("\n").length;
        const extraLines = height - currentLines;
        if (extraLines > 0) {
          jsonString += "\n".repeat(extraLines);
        }
      }
      return h(
        "pre",
        { style: { margin: "0", fontSize: "11px" } },
        text(jsonString),
      );
    } else {
      let valueString = value === null ? "null" : String(value);
      if (height && height > 1) {
        valueString += "\n".repeat(height);
      }
      return h(
        "pre",
        { style: { margin: "0", fontSize: "11px" } },
        text(valueString),
      );
    }
  };

  /**
   * @param {ProgramState} state
   * @param {any} payload
   * @returns {ProgramState}
   */
  #updateAppState = (state, payload) => {
    return {
      ...state,
      appState: payload.state,
    };
  };
}
