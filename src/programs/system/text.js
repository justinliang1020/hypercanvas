import { h, text } from "../../packages/hyperapp/index.js";
import { ProgramBase, EditorBase } from "../../programBase.js";

/**
 * @typedef ProgramState
 * @property {string} text
 * @property {string} color
 * @property {string} backgroundColor
 * @property {number} fontSize
 */

/**
 * @extends ProgramBase<ProgramState>
 */
export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      text: "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
      color: "black",
      backgroundColor: "transparent",
      fontSize: 14,
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    // don't want to have to manually set an editor param in here
  }

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   * */
  #main = (state) =>
    h("textarea", {
      style: {
        boxSizing: "border-box",
        width: "100%",
        height: "100%",
        padding: "10px",
        border: "0px",
        backgroundColor: state.backgroundColor,
        color: state.color,
        resize: "none",
        overflow: "hidden",
        outline: "none",
        fontSize: `${state.fontSize}px`,
      },
      oninput: (state, event) => ({
        ...state,
        text: /** @type {HTMLInputElement}*/ (event.target).value,
      }),
      value: state.text,
    });
}

/**
 * @typedef EditorState
 * @property {string} color
 * @property {string} backgroundColor
 * @property {number} fontSize
 */

/**
 * @augments EditorBase<ProgramState, EditorState>
 */
export class Editor extends EditorBase {
  /** @param {ProgramBase<ProgramState>} program */
  constructor(program) {
    super(program);
    /** @type {EditorState} */
    this.defaultState = {
      color: this.#getColor(),
      backgroundColor: this.#getBackgroundColor(),
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
        value: state.color,
        oninput: (state, event) => {
          const newValue = /** @type{HTMLInputElement}*/ (event.target).value;
          /** @type {EditorState} */
          const newState = {
            ...state,
            color: newValue,
          };
          this.#changeColor(newState);
          return newState;
        },
      }),
      h("input", {
        type: "color",
        value: state.backgroundColor,
        oninput: (state, event) => {
          const newValue = /** @type{HTMLInputElement}*/ (event.target).value;
          /** @type {EditorState} */
          const newState = {
            ...state,
            backgroundColor: newValue,
          };
          this.#changeBackgroundColor(newState);
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
          /** @type {EditorState} */
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
  #changeBackgroundColor = (state) => {
    this.modifyProgramState({
      backgroundColor: state.backgroundColor,
    });
  };

  /**
   * @param {EditorState} state
   * @returns {void}
   */
  #changeColor = (state) => {
    this.modifyProgramState({
      color: state.color,
    });
  };

  /**
   * @param {EditorState} state
   * @returns {void}
   */
  #changeFontSize = (state) => {
    this.modifyProgramState({
      fontSize: state.fontSize,
    });
  };

  #getFontSize() {
    const defaultFontSize = 14;
    const textProgramState = this.getProgramState();
    if (!textProgramState) return defaultFontSize;
    return textProgramState.fontSize;
  }

  #getBackgroundColor() {
    const defaultBackgroundColor = "#000000";
    const textProgramState = this.getProgramState();
    if (!textProgramState) return defaultBackgroundColor;
    return textProgramState.backgroundColor;
  }

  #getColor() {
    const defaultColor = "#000000";
    const textProgramState = this.getProgramState();
    if (!textProgramState) return defaultColor;
    return textProgramState.color;
  }
}
