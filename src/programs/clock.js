import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {string} message
 * @property {number} counter
 * @property {boolean} isActive
 * @property {string} currentTime
 */

/** @type {Program<ProgramState>} */
export const TestSubscriptions = {
  initialState: {
    message: "Subscription Demo",
    counter: 0,
    isActive: true,
    currentTime: new Date().toLocaleTimeString(),
  },
  views: [
    {
      name: "Clock Display",
      viewNode: clockDisplay,
    },
    {
      name: "State Visualizer",
      viewNode: stateVisualizer,
    },
  ],
  subscriptions: (state) => [[clockSubscription, {}]], //BUG: app must be saved and restarted to activate subscription
};

/**
 * Subscription that updates current time every second
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function clockSubscription(dispatch, props) {
  const interval = setInterval(() => {
    dispatch((state) => ({
      ...state,
      currentTime: new Date().toLocaleTimeString(),
    }));
  }, 1000);

  return () => {
    clearInterval(interval);
  };
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>}
 */
function clockDisplay(state) {
  return h("div", { style: { padding: "10px", fontSize: "16px" } }, [
    text(`Current Time: ${state.currentTime}`),
  ]);
}
