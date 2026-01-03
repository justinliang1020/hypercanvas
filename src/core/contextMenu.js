import { h, text } from "hyperapp";
import { Z_INDEX_TOP_2 } from "./constants.js";
import {
  blurEffect,
  focusEffect,
  stopPropagation,
  updateState,
} from "./utils.js";
import { addWebviewBlockToViewportCenter } from "./block.js";
import { webviewGoBack, webviewGoForward } from "./blockContents/webview.js";

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

  //TODO: dynamic dimensions based on number of buttons
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
      case "webview": {
        //TODO: implement
        return webviewContextMenuContents(state, state.contextMenu.block);
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
        background: "#707070",
        zIndex: `${Z_INDEX_TOP_2}`,
        position: "absolute",
        outline: "none",
        overflow: "hidden",
        padding: "12px 9px",
        border: "2px solid #949494",
        boxShadow: "0 7px 6.2px 7px rgba(0, 0, 0, 0.25)",
        borderRadius: "20px",
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
      (state, event) =>
        addWebviewBlockToViewportCenter(
          state,
          "https://www.google.com/",
          false,
        ),
      "add new block",
      "cmd + t",
    ),
  ];
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>[]} Block renderer function
 */
function webviewContextMenuContents(state, block) {
  //TODO: add disabled
  return [
    contextMenuButton(
      (state, event) => webviewGoBack(state, block),
      "go back a page",
    ),
    contextMenuButton(
      (state, event) => webviewGoForward(state, block),
      "go forward a page",
    ),
  ];
}

/**
 * @param {(state: State, event: Event) => State} action - new state to transition to after button press. TODO: make this work with Dispatchable
 * @param {string} value
 * @param {string} [hint]
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
function contextMenuButton(action, value, hint) {
  //this can't be an actual <button> because clicking it would take away focus from the context menu div
  //thus we just use a regular div and pointerdown instead
  return h(
    "div",
    {
      style: {
        padding: "6px 9px",
        borderRadius: "11px",
        color: "#E5E5E5",
      },
      onpointerdown: (state, event) => {
        return [action(state, event), [blurEffect, { id: "context-menu" }]];
      },
      class: "context-menu-button",
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
  event.stopPropagation();
  return [
    updateState(state, {
      contextMenu: { x: event.clientX, y: event.clientY, type: "viewport" },
    }),
    [focusEffect, { id: "context-menu" }],
  ];
}

/**
 * @param {State} state
 * @param {PointerEvent} event
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function enableWebviewContextMenu(state, event, block) {
  event.stopPropagation();
  return [
    updateState(state, {
      contextMenu: {
        x: event.clientX,
        y: event.clientY,
        block: block,
        type: "webview",
      },
    }),
    [focusEffect, { id: "context-menu" }],
  ];
}

/**
 * @param {State} state
 * @param {number} x
 * @param {number} y
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").Dispatchable<State>}
 */
export function enableWebviewContextMenuManual(state, x, y, block) {
  return [
    updateState(state, {
      contextMenu: {
        x,
        y,
        block: block,
        type: "webview",
      },
    }),
    [focusEffect, { id: "context-menu" }],
  ];
}
