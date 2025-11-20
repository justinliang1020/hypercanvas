import { h, text } from "hyperapp";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State> | null} Block renderer function
 */
export function frameContextMenu(state) {
  if (!state.contextMenu) return null;
  return h(
    "div",
    {
      style: {
        position: "absolute",
        left: `${state.contextMenu.x}px`,
        top: `${state.contextMenu.y}px`,
      },
    },
    text("hello world"),
  );
}
