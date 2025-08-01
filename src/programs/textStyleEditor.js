import { Program } from "./program.js";
import { TextProgram } from "./text.js";
import { h, text } from "../packages/hyperapp/index.js";

export class TextStyleProgram extends Program {
  /** @typedef State
   * @property {string} value
   */

  /**
   * @param {HTMLElement} node
   * @param {object | null} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  hyperapp(node, initialState) {
    /** @type{State} */
    const defaultState = {
      value: "transparent",
    };

    /**
     * @param {State} state
     */
    const changeBackground = (state) => {
      const textProgramInstance = this.getConnection("editor");
      if (!textProgramInstance) return state;
      const textProgramState = textProgramInstance.getState();
      textProgramInstance.modifyState({
        ...textProgramState,
        backgroundColor: state.value,
      });
      return state;
    };

    return {
      init: initialState ? /** @type{State} */ (initialState) : defaultState,
      view: (state) =>
        h("section", {}, [
          h("input", {
            type: "text",
            oninput: (state, event) => {
              return {
                ...state,
                value: /** @type{HTMLInputElement}*/ (event.target).value,
              };
            },
          }),
          h("button", { onclick: changeBackground }, text("submit")),
        ]),
      node: node,
    };
  }

  allowedConnections() {
    return [
      {
        name: "editor",
        program: TextProgram,
      },
    ];
  }
}
