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
function selectedBlockSection(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  if (!firstSelectedBlock) throw Error("nothing selected");

  return (() => {
    switch (firstSelectedBlock.type) {
      case "webview":
        return [searchBar(state), divider(state), navigationButtons(state)];
      case "text":
        return [fontSizeDropdown(state)];
      case "image":
        return [h("div", {}, text("image stuff todo"))];
    }
  })();
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
