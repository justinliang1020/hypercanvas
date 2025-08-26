import { h } from "../../packages/hyperapp/index.js";
import { ProgramBase } from "../../programBase.js";

/**
 * @typedef State
 * @property {string} path
 */

/**
 * @extends ProgramBase<State>
 */
export class Program extends ProgramBase {
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
