import { h, text } from "hyperapp";
import { Z_INDEX_TOP_2 } from "./constants.js";
import { focusEffect, updateState } from "./utils.js";
import { getCanvasCoordinates } from "./viewport.js";

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State> | null} Block renderer function
 */
export function contextMenuView(state) {
  if (!state.contextMenu) return null;
  /**
   * @param {State} state
   */
  function disableContextMenu(state) {
    return updateState(state, { contextMenu: null });
  }
  return h(
    "form",
    {
      id: "context-menu",
      tabindex: "-1",
      style: {
        transform: `translate(${state.contextMenu.x}px, ${state.contextMenu.y}px)`,
        width: "200px",
        height: "400px",
        background: "white",
        zIndex: `${Z_INDEX_TOP_2}`,
        position: "absolute",
        outline: "none",
      },
      onblur: disableContextMenu,
      // oncreate: [focusEffect, { id: "context-menu" }],
    },
    text("hello world"),
  );
}

/**
 * @param {State} state
 * @param {PointerEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function enableContextMenu(state, event) {
  const { canvasX, canvasY } = getCanvasCoordinates(
    event.clientX,
    event.clientY,
    state,
  );

  return [
    updateState(state, {
      contextMenu: { x: canvasX, y: canvasY },
    }),
    [focusEffect, { id: "context-menu" }],
  ];
}
