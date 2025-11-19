/**
 * @typedef HyperappDebugger
 * @property {State} state
 */

/**
 * For now, i won't think about effects or manual dispatch. Only actions and state
 * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
 */
export function dispatchMiddleware(dispatch) {
  return (action, payload) => {
    if (!Array.isArray(action) && typeof action !== "function") {
      const state = /** @type {State} */ (action);

      updateHyperappDebuggerVariable({ state: state });
    }
    dispatch(action, payload);
  };
}

/**
 * @param {HyperappDebugger} hyperappDebugger
 */
function updateHyperappDebuggerVariable(hyperappDebugger) {
  /** @type {any} */ (window).hyperappDebugger = hyperappDebugger;
}
