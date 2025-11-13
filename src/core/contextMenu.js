import { h, text } from "hyperapp";
import { Z_INDEX_TOP } from "./constants.js";
/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function frameContextMenu(state) {
  if (!state.contextMenu) throw Error("no context menu");
  return h(
    "div",
    {
      style: {
        position: "absolute",
        transform: `translate(${state.contextMenu.x}px, ${state.contextMenu.y}px)`,
        zIndex: `${Z_INDEX_TOP}`,
      },
    },
    text("hello world"),
  );
}
