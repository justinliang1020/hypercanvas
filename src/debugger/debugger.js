// `log` is a git-ignored function of signature below, found in ./debuggerScript.js
// write whatever functions needed to debug in the `log` function
// /**
//  * @param {State} state
//  */
// export function log(state) {
//   ...
// }
import { log } from "./debuggerScript.js";

// /**
//  * For now, i won't think about effects or manual dispatch. Only actions and state
//  * @type {(dispatch: import("hyperapp").Dispatch<State>) => import("hyperapp").Dispatch<State>}
//  */
// export function dispatchMiddleware(dispatch) {
//   return (action, payload) => {
//     if (!Array.isArray(action) && typeof action !== "function") {
//       const state = /** @type {State} */ (action);
//
//       updateHyperappDebuggerState(state);
//     }
//     dispatch(action, payload);
//   };
// }

/**
 * @param {State} state
 */
export function updateHyperappDebuggerState(state) {
  /** @type {any} */ (window).hd.state = state;
  log(state);
}

/** @type {any} */ (window).hd = {
  state: null,
};
