import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String} value
 * @property {String} color
 */

/** @type {Program<ProgramState>} */
export const TextEditorProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    value: "hello world",
    color: "inherit",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [textBox, stateVisualizer, reset, editor],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function textBox(state) {
  return h("textarea", {
    value: state.value,
    style: {
      backgroundColor: "transparent",
      border: "none",
      color: state.color,
      resize: "none",
      width: "100%",
      height: "100%",
      overflow: null,
    },
    oninput: (state, event) => ({
      ...state,
      value: /** @type {HTMLInputElement} */ (event.target).value,
    }),
  });
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function editor(state) {
  return h("div", {}, [
    h("input", {
      type: "text",
      value: state.color,
      oninput: (state, event) => ({
        ...state,
        color: /** @type {HTMLInputElement} */ (event.target).value,
      }),
    }),
    h("input", {
      type: "color",
      value: state.color,
      oninput: (state, event) => ({
        ...state,
        color: /** @type{HTMLInputElement}*/ (event.target).value,
      }),
    }),
    h("hr", {}),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
//TODO: make this generic in utils.js
function reset(state) {
  /**
   * @param {ProgramState} state
   * @returns {ProgramState}
   */
  function resetState(state) {
    return TextEditorProgram.initialState;
  }
  return h("button", { onclick: resetState }, text("reset"));
}
