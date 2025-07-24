import { h, text, app } from "../packages/hyperapp/index.js";

export class Program {
  /**
   * @param {HTMLElement} node
   */
  constructor(node) {
    this.dispatch = app({
      init: {
        text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      },
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
    });
  }

  /**
   * changes the text of the program
   * @param {string} text
   */
  changeText(text) {
    this.dispatch(() => ({ text: text }));
  }

  /**
   * returns the current state
   * @returns {object}
   */
  getCurrentState() {
    let currentState;
    this.dispatch((state) => {
      currentState = state;
      return state;
    });
    // @ts-ignore
    return currentState;
  }
}
