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
      value: "#000000",
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: TextProgram,
      },
    ];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h("section", {}, [
      h("h3", {}, text("Text Style Editor")),
      h("input", {
        type: "color",
        value: state.value,
        oninput: (state, event) => {
          const newValue = /** @type{HTMLInputElement}*/ (event.target).value;
          const newState = {
            ...state,
            value: newValue,
          };
          this.#changeBackground(newState);
          return newState;
        },
      }),
    ]);

  /**
   * @param {State} state
   * @returns {State}
   */
  #changeBackground = (state) => {
    const textProgramInstance = this.getConnection("default");
    if (!textProgramInstance) return state;
    const textProgramState = textProgramInstance.getState();
    textProgramInstance.modifyState({
      ...textProgramState,
      backgroundColor: state.value,
    });
    return state;
  };
}
