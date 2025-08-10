import { AbstractProgram } from "../abstractProgram.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} connectedState - JSON string representation of connected program state
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      connectedState: "{}",
    };
    /** @type {import("../abstractProgram.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: AbstractProgram,
      },
    ];
    this.view = this.#main;
    this.subscriptions = () => {
      return [
        this.onConnectionStateChange("default", this.#updateConnectedState),
      ];
    };
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h("section", { style: { padding: "10px", fontFamily: "monospace" } }, [
      h("h3", {}, text("Connected Program State")),
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
        text(state.connectedState),
      ),
    ]);

  /**
   * @param {State} state
   * @param {any} connectedState
   * @returns {State}
   */
  #updateConnectedState = (state, connectedState) => {
    return {
      ...state,
      connectedState: JSON.stringify(connectedState, null, 2),
    };
  };
}
