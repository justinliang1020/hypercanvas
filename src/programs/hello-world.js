import { h, text } from "../packages/hyperapp/index.js";

/**
 * @template State
 * @typedef Program
 * @property {State} init
 * @property {((state: State) => import("hyperapp").ElementVNode<State>)[]} views
 * worry about subscriptions later, i don't really use them
 */

/**
 * @typedef ProgramState
 * @property {number} n
 */

/** @type {Program<ProgramState>} */
export const TestProgram = {
  // initial state that can be reset to in event of catastrophe
  init: {
    n: 0,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [helloWorld],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
export function helloWorld(state) {
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
