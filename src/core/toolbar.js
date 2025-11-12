import { h, text } from "hyperapp";
import { getEditingBlock, getHoveredBlock } from "./selection.js";
import { fontSizeDropdown, newTextBlock } from "./blockContents/text.js";
import { newImageBlock } from "./blockContents/image.js";
import {
  backButton,
  forwardButton,
  newWebviewButton,
  searchBar,
} from "./blockContents/webview.js";
import { getCurrentPage, updateCurrentPage } from "./pages.js";
import { updateBlock } from "./block.js";
import { enableFullScreen } from "./utils.js";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function toolbar(state) {
  const editingBlock = getEditingBlock(state);
  const hoveredBlock = getHoveredBlock(state);
  const contents = (() => {
    const activeBlock = editingBlock || hoveredBlock;
    if (!activeBlock) {
      return defaultToolbarContents(state);
    }
    switch (activeBlock.type) {
      case "webview":
        return [
          searchBar(state),
          divider(state),
          backButton(state),
          forwardButton(state),
          fullScreenButton(state),
        ];
      case "text":
        return [fontSizeDropdown(state)];
      case "image":
        return [fullScreenButton(state)];
    }
  })();

  return h(
    "div",
    {
      style: {
        position: "fixed",
        bottom: "2%",
        left: "50%",
        transform: "translateX(-50%)",
        margin: "0",
        boxSizing: "border-box",
        height: "35px",
        display: "flex",
        flexDirection: "row",
        alignItems: "center",
        padding: "0 10px",
        width: "600px",
        gap: "5px",
        backgroundColor: "white",
        borderRadius: "10px",
        border: "1px solid lightgrey",
        boxShadow: "0 3px 4px 0 rgba(0, 0, 0, 0.25)",
      },
    },
    contents,
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]}
 */
function defaultToolbarContents(state) {
  return [newTextBlock(state), newImageBlock(state), newWebviewButton(state)];
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function divider(state) {
  return h("div", {
    style: { height: "100%", width: "1px", backgroundColor: "#AEAEAE" },
  });
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function fullScreenButton(state) {
  const editingBlock = getEditingBlock(state);
  const enabled = Boolean(editingBlock);
  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state) {
    const currentPage = getCurrentPage(state);
    if (!currentPage) return state;
    if (currentPage?.fullScreenState || !editingBlock) {
      return disableFullScreen(state);
    } else {
      return enableFullScreen(state, editingBlock);
    }
  }
  return h("button", { disabled: !enabled, onclick }, text("⛶"));
}

/**
 * @param {State} state
 * @returns {State}
 */
export function disableFullScreen(state) {
  const editingBlock = getEditingBlock(state);
  const currentPage = getCurrentPage(state);
  if (!editingBlock || !currentPage || currentPage.fullScreenState === null) {
    return state;
  }

  let newState = state;
  newState = updateCurrentPage(newState, {
    fullScreenState: null,
    offsetX: currentPage.fullScreenState.offsetX,
    offsetY: currentPage.fullScreenState.offsetY,
    zoom: currentPage.fullScreenState.zoom,
  });
  newState = updateBlock(newState, editingBlock.id, {
    width: currentPage.fullScreenState.width,
    height: currentPage.fullScreenState.height,
  });
  return newState;
}
