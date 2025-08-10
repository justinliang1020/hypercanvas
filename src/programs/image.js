import { h } from "../packages/hyperapp/index.js";
import { Program } from "../program.js";

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
    /** @type {import("../program.js").AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   * */
  #main = (/** @type {State} */ state) =>
    h("img", {
      src: state.path,
      style: {
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
      },
    });
}
