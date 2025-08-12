import { h, text } from "../../packages/hyperapp/index.js";
import { AbstractProgram } from "../../abstractProgram.js";

/**
 * @typedef State
 * @property {string} text
 * @property {string} backgroundColor
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      backgroundColor: "transparent",
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   * */
  #main = (state) =>
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
        oninput: (state, event) => ({
          ...state,
          text: /** @type {HTMLInputElement}*/ (event.target).value,
        }),
      },
      text(state.text),
    );
}
