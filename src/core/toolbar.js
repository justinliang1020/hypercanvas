import { h, text } from "hyperapp";
import { getSelectedBlocks } from "./selection.js";
import { fontSizeDropdown, newTextBlock } from "./blockContents/text.js";
import { newImageBlock } from "./blockContents/image.js";
import {
  navigationButtons,
  newWebviewButton,
  searchBar,
} from "./blockContents/webview.js";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function toolbar(state) {
  // const hoveredBlock = getHoveredBlock(state);
  const firstSelectedBlock = getSelectedBlocks(state)[0];

  const defaultContents = h("div", {}, [
    newTextBlock(state),
    newImageBlock(state),
    newWebviewButton(state),
  ]);

  const contents = firstSelectedBlock
    ? selectedBlockSection(state)
    : defaultContents;
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
        alignItems: "center",
        width: "400px",
        gap: "5px",
        backgroundColor: "#FFFFFF",
      },
    },
    contents,
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>[]}
 */
function selectedBlockSection(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  if (!firstSelectedBlock) throw Error("nothing selected");

  return (() => {
    switch (firstSelectedBlock.type) {
      case "webview":
        return [searchBar(state), navigationButtons(state)];
      case "text":
        return [fontSizeDropdown(state)];
      case "image":
        return [h("div", {}, text("image stuff todo"))];
    }
  })();
}
