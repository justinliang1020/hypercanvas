import { h, text } from "hyperapp";
import { Z_INDEX_TOP_2 } from "./constants.js";
import { focusEffect, pipe, stopPropagation, updateState } from "./utils.js";
import { getCanvasCoordinates } from "./viewport.js";
import { addWebviewBlockToViewportCenter } from "./block.js";

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

  const viewportWidth = window.innerWidth;
  const viewportHeight = window.innerHeight;

  const MENU_WIDTH = 150;
  const MENU_HEIGHT = 200;
  const PADDING = 50;

  const adjustedX = Math.min(
    state.contextMenu.x,
    viewportWidth - MENU_WIDTH - PADDING,
  );
  const adjustedY = Math.min(
    state.contextMenu.y,
    viewportHeight - MENU_HEIGHT - PADDING,
  );

  const contextMenuType = state.contextMenu.type;

  /** @type {import("hyperapp").ElementVNode<State>[]} */
  const contents = (() => {
    switch (contextMenuType) {
      case "viewport": {
        return viewportContextMenuContents(state);
      }
    }
  })();

  return h(
    "div",
    {
      id: "context-menu",
      tabindex: "-1",
      style: {
        transform: `translate(${adjustedX}px, ${adjustedY}px)`,
        width: `${MENU_WIDTH}px`,
        height: `${MENU_HEIGHT}px`,
        background: "white",
        zIndex: `${Z_INDEX_TOP_2}`,
        position: "absolute",
        outline: "none",
        overflow: "hidden",
      },
      onblur: disableContextMenu,
      onpointerdown: stopPropagation,
    },
    contents,
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>[]} Block renderer function
 */
function viewportContextMenuContents(state) {
  return [
    contextMenuButton(
      addWebviewBlockToViewportCenter(state, "https://www.google.com/", false),
      "add new block",
      "cmd + t",
    ),
  ];
}

/**
 * @param {import("hyperapp").Dispatchable<State>} dispatchable
 * @param {string} value
 * @param {string} [hint]
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
function contextMenuButton(dispatchable, value, hint) {
  //this can't be an actual <button> because clicking it would take away focus from the context menu div
  //thus we just use a regular div and pointerdown instead
  return h(
    "div",
    {
      onpointerdown: (state, event) => {
        return dispatchable;
      },
    },
    text(value),
  );
}

/**
 * @param {State} state
 * @param {PointerEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function enableViewportContextMenu(state, event) {
  return [
    updateState(state, {
      contextMenu: { x: event.clientX, y: event.clientY, type: "viewport" },
    }),
    [focusEffect, { id: "context-menu" }],
  ];
}
