import { h, text } from "hyperapp";
/**
 * @param {State} state
 * @param {TextBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function textContent(state, block) {
  return h("div", { style: { padding: "5px" } }, text(block.value));
}
