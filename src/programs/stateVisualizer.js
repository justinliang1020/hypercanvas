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
    this.view = (/** @type {State} */ state) =>
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
    this.subscriptions = () => {
      return [
        this.onConnectionStateChange("default", this.updateConnectedState),
      ];
    };
  }

  /**
   * @param {State} state
   * @param {any} connectedState
   */
  updateConnectedState = (state, connectedState) => {
    return {
      ...state,
      connectedState: JSON.stringify(connectedState, null, 2),
    };
  };
}
