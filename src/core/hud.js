import { h, text } from "hyperapp";
import { getHoveredBlock, getSelectedBlocks } from "./selection.js";
import { updateBlock } from "./block.js";
import {
  forwardButton,
  backButton,
  newWebviewButton,
} from "./blockContents/webview.js";
import { fontSizeDropdown, newTextBlock } from "./blockContents/text.js";
import { newImageBlock } from "./blockContents/image.js";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function hud(state) {
  return h(
    "div",
    {
      style: {
        position: "fixed",
        top: "0",
        left: "50%",
        transform: "translateX(-50%)",
        margin: "0",
        paddingTop: "10px",
        display: "flex",
        gap: "5px",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    [
      searchBar(state),
      goToUrlButton(state),
      newTextBlock(state),
      newImageBlock(state),
      newWebviewButton(state),
      text("---"),
      ...selectedBlockButtons(state),
    ],
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]}
 */
function selectedBlockButtons(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  if (!firstSelectedBlock) return [];
  switch (firstSelectedBlock.type) {
    case "webview":
      return [backButton(state), forwardButton(state)];
    case "text":
      return [fontSizeDropdown(state)];
    default:
      return [];
  }
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function goToUrlButton(state) {
  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state) {
    const selectedBlock = getSelectedBlocks(state)[0];
    if (selectedBlock && selectedBlock.type === "webview") {
      return updateBlock(state, selectedBlock.id, {
        initialSrc: selectedBlock.currentSrc,
      });
    }
    return state;
  }

  return h("button", { onclick }, text("go"));
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function searchBar(state) {
  let searchBarValue = "";

  const firstSelectedBlock = getSelectedBlocks(state)[0];
  const hoveredBlock = getHoveredBlock(state);

  if (
    firstSelectedBlock &&
    firstSelectedBlock.type === "webview" &&
    firstSelectedBlock
  ) {
    searchBarValue = firstSelectedBlock.currentSrc;
  } else if (hoveredBlock && hoveredBlock.type === "webview") {
    searchBarValue = hoveredBlock.currentSrc;
  }

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function oninput(state, event) {
    if (!firstSelectedBlock) return state;
    if (!event.target) return state;
    const value = /** @type {HTMLInputElement} */ (event.target).value;

    return updateBlock(state, firstSelectedBlock.id, {
      currentSrc: value,
    });
  }

  return h("input", {
    type: "text",
    style: { width: "20em" },
    value: searchBarValue,
    disabled: !firstSelectedBlock,
    oninput,
    // stop keyboard shortcuts from triggering
    onkeydown: (state, event) => {
      event.stopPropagation();
      return state;
    },
  });
}
