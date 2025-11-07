import { h, text } from "hyperapp";
import { getSelectedBlocks } from "./selection.js";
import {
  newWebviewButton,
  searchBar,
  navigationButtons,
} from "./blockContents/webview.js";
import { fontSizeDropdown, newTextBlock } from "./blockContents/text.js";
import { newImageBlock } from "./blockContents/image.js";
import { getCurrentPage } from "./pages.js";

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
        top: "50%",
        left: "0%",
        transform: "translateY(-50%)",
        margin: "0",
        padding: "10px",
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        height: "100%",
        width: "250px",
        gap: "5px",
        backgroundColor: "#FFFFFF",
      },
    },
    [
      pageNav(state),
      hr(),
      treeSection(state),
      hr(),
      newBlocksSection(state),
      hr(),
      selectedBlockSection(state),
    ],
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function pageNav(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {}, [text("no current page")]);
  return h("div", {}, [text(currentPage.name)]);
}

/**
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function hr() {
  return h("hr", {
    style: {
      backgroundColor: "lightgrey",
      height: "2px",
      width: "100%",
      border: "none",
    },
  });
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function selectedBlockSection(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];
  if (!firstSelectedBlock) return h("div", {});
  /** @type {import("hyperapp").ElementVNode<State>[]} */
  const contents = (() => {
    switch (firstSelectedBlock.type) {
      case "webview":
        return [navigationButtons(state), searchBar(state)];
      case "text":
        return [fontSizeDropdown(state)];
      default:
        return [h("div", {}, text("image stuff todo"))];
    }
  })();
  return h("div", { display: "flex", flexDirection: "column", gap: "3px" }, [
    ...contents,
  ]);
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function newBlocksSection(state) {
  return h("div", {}, [
    newTextBlock(state),
    newImageBlock(state),
    newWebviewButton(state),
  ]);
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function treeSection(state) {
  return h("div", { style: { height: "400px" } }, text("tree section"));
}
