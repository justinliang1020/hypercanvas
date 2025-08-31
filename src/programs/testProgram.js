import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {number} n
 */

/**
 * Test subscription that increments the counter every second
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function timerSubscription(dispatch, props) {
  console.log('timerSubscription created');
  const interval = setInterval(() => {
    console.log('timerSubscription tick - incrementing');
    dispatch((state) => {
      console.log('timerSubscription: current state.n =', state.n);
      const newState = {
        ...state,
        n: state.n + 1,
      };
      console.log('timerSubscription: new state.n =', newState.n);
      return newState;
    });
  }, 200);

  return () => {
    console.log('timerSubscription cleaned up');
    clearInterval(interval);
  };
}

/**
 * Test subscription that increments the counter every second
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function timerSubscription2(dispatch, props) {
  console.log('timerSubscription2 created');
  const interval = setInterval(() => {
    console.log('timerSubscription2 tick - resetting to 0');
    dispatch((state) => {
      console.log('timerSubscription2: current state.n =', state.n);
      const newState = {
        ...state,
        n: 0,
      };
      console.log('timerSubscription2: new state.n =', newState.n);
      return newState;
    });
  }, 2000);

  return () => {
    console.log('timerSubscription2 cleaned up');
    clearInterval(interval);
  };
}

/** @type {Program<ProgramState>} */
export const TestProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    n: 1,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [counter, hello, count],
  // subscriptions for this program
  subscriptions: (state) => [
    [timerSubscription, {}],
    [timerSubscription2, {}],
  ],
};

/**
 * Effect that handles pasting content from clipboard (images or text)
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {ProgramState} state
 */
export const testEffect = (dispatch, state) => {
  console.log(state);
  // This now works - dispatch operates on program state only
  dispatch((state) => ({
    ...state,
    n: 10,
  }));
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
          return { ...state, n: state.n - 1 };
        },
      },
      text("-"),
    ),
    h(
      "button",
      {
        onclick: (state) => {
          return { ...state, n: state.n + 1 };
        },
      },
      text("+"),
    ),
    h(
      "button",
      {
        onclick: (state) => {
          return [state, [testEffect, state]];
        },
      },
      text("test"),
    ),
    h("p", {}, text(state.n)),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function hello(state) {
  return h("div", {}, text("hello world"));
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function count(state) {
  return h("div", {}, text(`n: ${state.n}`));
}
