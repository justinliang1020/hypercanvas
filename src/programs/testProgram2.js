import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {number} n
 */

/** @type {Program<ProgramState>} */
export const TestProgram2 = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    n: 0,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [counter, hello2, count],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function counter(state) {
  return h("div", {}, [
    h(
      "button",
      {
        onclick: (state) => {
          console.log(state);
          return { ...state, n: state.n - 1 };
        },
      },
      text("-"),
    ),
    h(
      "button",
      {
        onclick: (state) => {
          console.log(state);
          return { ...state, n: state.n + 1 };
        },
      },
      text("+"),
    ),
    h("p", {}, text(state.n)),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function hello2(state) {
  return h("div", {}, text("hello world"));
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function count(state) {
  return h("div", {}, text(`n: ${state.n}`));
}
