import { getSelectedBlocks } from "../core/selection.js";

/**
 * For now, i won't think about effects or manual dispatch. Only actions and state
 * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
 */
export function dispatchMiddleware(dispatch) {
  return (action, payload) => {
    if (!Array.isArray(action) && typeof action !== "function") {
      const state = /** @type {State} */ (action);

      updateHyperappDebuggerState(state);
    }
    dispatch(action, payload);
  };
}

/**
 * @param {State} state
 */
function updateHyperappDebuggerState(state) {
  /** @type {any} */ (window).hd.state = state;
}

function getFirstSelectedBlock() {
  /** @type {State} */
  const state = /** @type {any} */ (window).hd.state;

  const selectedBlocks = getSelectedBlocks(state);
  console.table(selectedBlocks[0]);
  return selectedBlocks[0];
}

/** @type {any} */ (window).hd = {
  state: null,
  logFirstSelectedBlock: getFirstSelectedBlock,
};
