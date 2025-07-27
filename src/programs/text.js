import { h, text } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

export class textProgram extends Program {
  /**
   * @param {HTMLElement} node
   * @returns {import("hyperapp").App<any>}
   **/
  appConfig(node) {
    const appConfig = {
      init: {
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
      view: (/** @type {any} */ state) =>
        h(
          "textarea",
          {
            style: {
              boxSizing: "border-box",
              width: "100%",
              height: "100%",
              padding: "10px",
              border: "0px",
              backgroundColor: "transparent",
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
    return appConfig;
  }
  /**
   * changes the text of the program
   * @param {string} text
   */
  changeText(text) {
    if (this.dispatch) {
      this.dispatch(() => ({ text: text }));
    }
  }
}
