import { h, text } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

/** @typedef State
 * @property {string} text
 * @property {string} backgroundColor
 */
export class TextProgram extends Program {
  /**
   * @param {HTMLElement} node
   * @param {object | null} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  appConfig(node, initialState) {
    /** @type{State} */
    const defaultState = {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      backgroundColor: "transparent",
    };

    return {
      init: initialState ? /** @type{State} */ (initialState) : defaultState,
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
