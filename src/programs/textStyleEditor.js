import { Program } from "./program.js";
import { TextProgram } from "./text.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} value
 */

export class TextStyleProgram extends Program {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      value: "transparent",
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: TextProgram,
      },
    ];
  }

  /**
   * @param {HTMLElement} node
   * @param {State} initialState
   * @returns {import("hyperapp").App<State>}
   **/
  hyperapp(node, initialState) {
    /**
     * @param {State} state
     */
    const changeBackground = (state) => {
      const textProgramInstance = this.getConnection("default");
      if (!textProgramInstance) return state;
      const textProgramState = textProgramInstance.getState();
      textProgramInstance.modifyState({
        ...textProgramState,
        backgroundColor: state.value,
      });
      return state;
    };

    return {
      init: initialState,
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
}
