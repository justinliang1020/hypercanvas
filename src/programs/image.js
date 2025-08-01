import { h } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

/**
 * @typedef State
 * @property {string} path
 */

export class ImageProgram extends Program {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      path: "assets/sun-cat.jpg",
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [];
  }

  /**
   * @param {HTMLElement} node
   * @param {State} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  hyperapp(node, initialState) {
    return {
      init: initialState,
      view: (state) =>
        h("img", {
          src: state.path,
          style: {
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
          },
        }),
      node: node,
    };
  }
}
