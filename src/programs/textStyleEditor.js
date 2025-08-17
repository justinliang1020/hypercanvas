import { ProgramBase } from "../programBase.js";
import { Program as TextProgram } from "./system/text.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} value
 * @property {number} fontSize
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      value: "#000000",
      fontSize: 14,
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
      h("input", {
        type: "number",
        value: state.fontSize,
        min: "8",
        max: "72",
        oninput: (state, event) => {
          const newFontSize = parseInt(
            /** @type{HTMLInputElement}*/ (event.target).value,
          );
          const newState = {
            ...state,
            fontSize: newFontSize,
          };
          this.#changeFontSize(newState);
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

  /**
   * @param {State} state
   * @returns {void}
   */
  #changeFontSize = (state) => {
    const textProgramInstance = this.getConnection("default");
    if (!textProgramInstance) return;
    const textProgramState = textProgramInstance.getState();
    textProgramInstance.modifyState({
      ...textProgramState,
      fontSize: state.fontSize,
    });
  };
}
