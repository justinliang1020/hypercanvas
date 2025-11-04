import { h, text } from "hyperapp";
import { addTextBlock, updateBlock } from "../block.js";
import { DEFAULT_BLOCK_WIDTH, DEFAULT_BLOCK_HEIGHT } from "../constants.js";
import { getViewportCenterCoordinates } from "../viewport.js";
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

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function newTextBlock(state) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state, event) {
    const viewportCenter = getViewportCenterCoordinates(state);
    const x = viewportCenter.x - DEFAULT_BLOCK_WIDTH / 2; // Center the block
    const y = viewportCenter.y - DEFAULT_BLOCK_HEIGHT / 2; // Center the block
    return addTextBlock(
      state,
      { value: "hello" },
      x,
      y,
      DEFAULT_BLOCK_WIDTH,
      DEFAULT_BLOCK_HEIGHT,
    ).state;
  }
  return h("button", { onclick }, text("New text block"));
}
