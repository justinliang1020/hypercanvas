import { h } from "hyperapp";
import { updateBlock } from "../block.js";
/**
 * @param {State} state
 * @param {TextBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function textContent(state, block) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function oninput(state, event) {
    return updateBlock(state, block.id, {
      value: /** @type {HTMLInputElement} */ (event.target).value,
    });
  }

  return h("textarea", {
    oninput,
    style: {
      outline: "none", // disable orange editing border
      padding: "5px",
      background: "transparent",
      border: "none",
      resize: "none", // disable resize handler
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
    },
    value: block.value,
  });
}
