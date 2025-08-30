import { h, text } from "../packages/hyperapp/index.js";

/**
 * @template State
 * @typedef App
 * @property {State} init
 * @property {((state: State) => import("hyperapp").ElementVNode<State>)[]} views
 * worry about subscriptions later, i don't really use them
 */

/**
 * @typedef AppState
 * @property {number} n
 */

/** @type {App<AppState>} */
export const TestApp = {
  // initial state that can be reset to in event of catastrophe
  init: {
    n: 0,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [helloWorld],
};

/**
 * @param {AppState} state
 * @returns {import("hyperapp").ElementVNode<AppState>} Block renderer function
 */
export function helloWorld(state) {
  try {
    return h("div", {}, [
      h(
        "button",
        {
          onclick: (state, event) => {
            console.log(state);
            return { ...state, n: state.n - 1 };
          },
        },
        text("-"),
      ),
      h(
        "button",
        {
          onclick: (state, event) => {
            console.log(state);
            return { ...state, n: state.n + 1 };
          },
        },
        text("+"),
      ),
      h("p", {}, text(state.n)),
    ]);
  } catch {
    return h("p", {}, text("error"));
  }
}
