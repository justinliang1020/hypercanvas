import { h, text } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

/**
 * @typedef State
 * @property {string} text
 * @property {string} backgroundColor
 */

export class TextProgram extends Program {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      backgroundColor: "transparent",
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [];
  }

  /**
   * @param {HTMLElement} node
   * @param {State} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  appConfig(node, initialState) {
    return {
      init: initialState,
      view: (state) =>
        h(
          "textarea",
          {
            style: {
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              padding: "10px",
              border: "0px",
              backgroundColor: state.backgroundColor,
              color: "inherit",
              resize: "none",
              overflow: "hidden",
              outline: "none",
            },
            //@ts-ignore
            oninput: (state, event) => ({ ...state, text: event.target.value }),
          },
          text(state.text),
        ),
      node: node,
    };
  }
}
