import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {String[]} appActions - JSON string representation of connected program state
 * @property {String} visualizationName
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      //TODO: appState should default to the app state
      appActions: [],
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
    const display = state.appActions
      .slice(state.appActions.length - 15, state.appActions.length)
      .join("\n");
    return h("div", {}, text(display));
  };

  /**
   * @param {ProgramState} state
   * @param {AppDispatchEventDetail} payload
   * @returns {ProgramState}
   */
  #updateAppState = (state, payload) => {
    return {
      ...state,
      appActions: [...state.appActions, payload.action.name],
    };
  };
}
