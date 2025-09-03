import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String} value
 */

/** @type {Program<ProgramState>} */
export const TextEditorProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    value: "",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [textBox, stateVisualizer],
  // subscriptions for this program
  subscriptions: (state) => [],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function textBox(state) {
  return h("textarea", {
    value: state.value,
    oninput: (state, event) => ({
      ...state,
      value: /** @type {HTMLInputElement} */ (event.target).value,
    }),
  });
}
