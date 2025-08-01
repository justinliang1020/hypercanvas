import { h } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

export class ImageProgram extends Program {
  /** @typedef State
   * @property {string} path
   */

  /**
   * @param {HTMLElement} node
   * @param {object | null} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  hyperapp(node, initialState) {
    /** @type{State} */
    const defaultState = {
      path: "assets/sun-cat.jpg",
    };

    return {
      init: initialState ? /** @type{State} */ (initialState) : defaultState,
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
