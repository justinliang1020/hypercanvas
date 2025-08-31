import { getCurrentPage } from "../pages.js";
import { h, text } from "../packages/hyperapp/index.js";
import { table } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {State | null} appState
 */
/** @type {Program<ProgramState>} */
export const AppVisualizerProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    appState: null,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [show, currentPage],
  // subscriptions for this program
  subscriptions: (state) => [[syncAppState, {}]],
};

/**
 * Test subscription that increments the counter every second
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function syncAppState(dispatch, props) {
  /**
   * @param {Event} ev
   */
  function handler(ev) {
    const customEvent = /** @type {CustomEvent<{state: any}>} */ (ev);
    // breaks without requestAnimationFrame, unsure why
    requestAnimationFrame(() =>
      dispatch((state) => {
        const newState = {
          ...state,
          appState: customEvent.detail.state,
        };
        return newState;
      }),
    );
  }
  addEventListener("appDispatch", handler);
  return () => removeEventListener("appDispatch", handler);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function show(state) {
  return h("div", {}, text(JSON.stringify(state.appState)));
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function currentPage(state) {
  if (!state.appState) return h("div", {}, text("null"));
  const currentPage = getCurrentPage(state.appState);
  if (!currentPage) return h("div", {}, text("no page"));

  return table(currentPage);
}
