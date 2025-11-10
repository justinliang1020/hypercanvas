import { h, text } from "hyperapp";
import { getHoveredBlock, getSelectedBlocks } from "./selection.js";
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

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function toolbar(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  const hoveredBlock = getHoveredBlock(state);
  const activeBlock = firstSelectedBlock || hoveredBlock;
  const contents = (() => {
    if (!firstSelectedBlock && !hoveredBlock) {
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
        return [h("div", {}, text("image stuff todo"))];
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
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  const enabled = Boolean(firstSelectedBlock);
  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state) {
    return fullScreenMode(state);
  }
  return h("button", { disabled: !enabled, onclick }, text("⛶"));
}

/**
 * @param {State} state
 * @returns {State}
 */
function fullScreenMode(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  const currentPage = getCurrentPage(state);
  if (!firstSelectedBlock || !currentPage) {
    return state;
  }
  if (currentPage.fullScreenState !== null) {
    let newState = state;
    newState = updateCurrentPage(newState, {
      fullScreenState: null,
      offsetX: currentPage.fullScreenState.offsetX,
      offsetY: currentPage.fullScreenState.offsetY,
      zoom: currentPage.fullScreenState.zoom,
    });
    newState = updateBlock(newState, firstSelectedBlock.id, {
      width: currentPage.fullScreenState.width,
      height: currentPage.fullScreenState.height,
    });
    return newState;
  }
  const offsetX = 30;
  const offsetY = 80;
  const viewportRect = /** @type {HTMLElement} */ (
    document.getElementById("viewport")
  ).getBoundingClientRect();
  let newState = state;
  newState = updateCurrentPage(newState, {
    fullScreenState: {
      id: firstSelectedBlock.id,
      width: firstSelectedBlock.width,
      height: firstSelectedBlock.height,
      offsetX: currentPage.offsetX,
      offsetY: currentPage.offsetY,
      zoom: currentPage.zoom,
    },
    offsetX: -firstSelectedBlock.x + offsetX / 2,
    offsetY: -firstSelectedBlock.y + 10,
    zoom: 1,
  });
  newState = updateBlock(newState, firstSelectedBlock.id, {
    width: viewportRect.width - offsetX,
    height: viewportRect.height - offsetY,
  });
  return newState;
}
