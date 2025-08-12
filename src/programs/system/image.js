import { h } from "../../packages/hyperapp/index.js";
import { AbstractProgram } from "../../abstractProgram.js";

/**
 * @typedef State
 * @property {string} path
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      path: "assets/sun-cat.jpg",
    };
    /** @type {AllowedConnection[]} */
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
