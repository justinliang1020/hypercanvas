import { h, text } from "hyperapp";
import { getViewportCenterCoordinates } from "../viewport.js";
import { DEFAULT_BLOCK_WIDTH, DEFAULT_BLOCK_HEIGHT } from "../constants.js";
import { addImageBlock } from "../block.js";

/**
 * @param {State} state
 * @param {ImageBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function imageContent(state, block) {
  return h("img", {
    style: {
      width: "100%",
      height: "100%",
    },
    src: block.src,
  });
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function newImageBlock(state) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state, event) {
    const viewportCenter = getViewportCenterCoordinates(state);
    const x = viewportCenter.x - DEFAULT_BLOCK_WIDTH / 2; // Center the block
    const y = viewportCenter.y - DEFAULT_BLOCK_HEIGHT / 2; // Center the block
    return addImageBlock(
      state,
      { src: "./gir.jpg" },
      x,
      y,
      DEFAULT_BLOCK_WIDTH,
      DEFAULT_BLOCK_HEIGHT,
    ).state;
  }
  return h("button", { onclick }, text("New image block"));
}
