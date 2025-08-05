import { Program } from "./program.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} connectedState - JSON string representation of connected program state
 */

export class StateVisualizerProgram extends Program {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      connectedState: "{}",
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: Program,
      },
    ];
  }

  /**
   * @param {HTMLElement} node
   * @param {State} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  appConfig(node, initialState) {
    /**
     * @param {State} state
     * @param {any} connectedState
     */
    const updateConnectedState = (state, connectedState) => {
      return {
        ...state,
        connectedState: JSON.stringify(connectedState, null, 2),
      };
    };
    return {
      init: initialState,
      view: (state) =>
        h("section", { style: { padding: "10px", fontFamily: "monospace" } }, [
          h("h3", {}, text("Connected Program State")),
          h(
            "pre",
            {
              style: {
                padding: "10px",
                border: "1px solid #ccc",
                borderRadius: "4px",
                overflow: "auto",
                maxHeight: "400px",
              },
            },
            text(state.connectedState),
          ),
        ]),
      subscriptions: () => {
        return [this.onConnectionStateChange("default", updateConnectedState)];
      },
      node: node,
    };
  }
}
