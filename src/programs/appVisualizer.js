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
      ),
    ]);

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
