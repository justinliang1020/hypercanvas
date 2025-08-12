import { AbstractProgram } from "../abstractProgram.js";
import { Program as TextProgram } from "./system/text.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} value
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      value: "#000000",
    };
    /** @type {AllowedConnection[]} */
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
   * @returns {void}
   */
  #changeBackground = (state) => {
    const textProgramInstance = this.getConnection("default");
    if (!textProgramInstance) return;
    const textProgramState = textProgramInstance.getState();
    textProgramInstance.modifyState({
      ...textProgramState,
      backgroundColor: state.value,
    });
  };
}
