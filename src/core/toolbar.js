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
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function selectedBlockSection(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  /** @type {import("hyperapp").StyleProp} */
  const heightStyle = { height: "3em" };
  if (!firstSelectedBlock)
    return h("div", { style: heightStyle }, text("nothing selected"));
  /** @type {import("hyperapp").ElementVNode<State>[]} */
  const contents = (() => {
    switch (firstSelectedBlock.type) {
      case "webview":
        return [navigationButtons(state), searchBar(state)];
      case "text":
        return [fontSizeDropdown(state)];
      case "image":
        return [h("div", {}, text("image stuff todo"))];
    }
  })();
  return h("div", {}, contents);
}
