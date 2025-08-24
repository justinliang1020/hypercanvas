import { h, text } from "../../packages/hyperapp/index.js";
import { ProgramBase, EditorBase } from "../../programBase.js";

/**
 * @typedef State
 * @property {string} text
 * @property {string} backgroundColor
 * @property {number} fontSize
 */

/**
 * @augments ProgramBase<State>
 */
export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      backgroundColor: "transparent",
      fontSize: 14,
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    // don't want to have to manually set an editor param in here
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   * */
  #main = (state) =>
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
          fontSize: `${state.fontSize}px`,
        },
        oninput: (state, event) => ({
          ...state,
          text: /** @type {HTMLInputElement}*/ (event.target).value,
        }),
      },
      text(state.text),
    );
}

/**
 * @typedef EditorState
 * @property {string} value
 * @property {number} fontSize
 */

/**
 * @augments EditorBase<State, EditorState>
 */
export class Editor extends EditorBase {
  /** @param {ProgramBase<State>} program */
  constructor(program) {
    super(program);
    /** @type {EditorState} */
    this.defaultState = {
      value: this.#getColor(),
      fontSize: this.#getFontSize(),
    };
    this.view = this.#main;
  }

  /**
   * @param {EditorState} state
   * @returns {import("hyperapp").ElementVNode<EditorState>}
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
   * @param {EditorState} state
   * @returns {void}
   */
  #changeBackground = (state) => {
    const textProgramInstance = this.program;
    if (!textProgramInstance) return;
    const textProgramState = textProgramInstance.getState();
    if (!textProgramState) return;
    textProgramInstance.modifyState({
      ...textProgramState,
      backgroundColor: state.value,
    });
  };

  /**
   * @param {EditorState} state
   * @returns {void}
   */
  #changeFontSize = (state) => {
    const textProgramInstance = this.program;
    if (!textProgramInstance) return;
    const textProgramState = textProgramInstance.getState();
    if (!textProgramState) return;
    textProgramInstance.modifyState({
      ...textProgramState,
      fontSize: state.fontSize,
    });
  };

  #getFontSize() {
    const defaultFontSize = 14;
    const textProgramInstance = this.program;
    if (!textProgramInstance) return defaultFontSize;
    const textProgramState = textProgramInstance.getState();
    if (!textProgramState) return defaultFontSize;
    return textProgramState.fontSize;
  }

  #getColor() {
    const defaultColor = "#000000";
    const textProgramInstance = this.program;
    if (!textProgramInstance) return defaultColor;
    const textProgramState = textProgramInstance.getState();
    if (!textProgramState) return defaultColor;
    return textProgramState.backgroundColor;
  }
}
