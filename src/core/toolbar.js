import { h, text } from "hyperapp";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function toolbar(state) {
  return h(
    "div",
    {
      style: {
        position: "fixed",
        bottom: "3%",
        left: "50%",
        transform: "translateX(-50%)",
        margin: "0",
        padding: "10px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "row",
        width: "400px",
        gap: "5px",
        backgroundColor: "#FFFFFF",
      },
    },
    text("toolbar"),
  );
}
