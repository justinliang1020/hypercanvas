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
export function sidebar(state) {
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
      selectedBlockSection(state),
      hr(),
      treeSection(state),
      newBlocksSection(state),
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
  return h(
    "div",
    {
      style: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        ...heightStyle,
      },
    },
    [...contents],
  );
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
  const currentPage = getCurrentPage(state);
  if (!currentPage) throw Error("no current page");
  const childBlockIds = new Set(
    currentPage.links.map((link) => link.childBlockId),
  );
  const rootBlockIds = currentPage.blocks
    .filter((block) => !childBlockIds.has(block.id))
    .map((block) => block.id);

  return h(
    "div",
    { style: { height: "400px" } },
    rootBlockIds.map((blockId) => blockNodeDisplay(state, blockId, 0)),
  );
}

/**
 * @param {State} state - Current application state
 * @param {number} blockId
 * @param {number} level
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function blockNodeDisplay(state, blockId, level) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) throw Error("no current page");
  const block = currentPage.blocks.find((b) => b.id === blockId);
  if (!block) throw Error(`couldn't find block of id ${blockId}`);

  const contents = (() => {
    switch (block.type) {
      case "webview":
        return block.currentSrc.slice(0, 30);
      case "text":
        return `text: ${block.value}`;
      case "image":
        return `image: ${block.src}`;
    }
  })();

  const spacing = "..".repeat(level);
  const display = h("div", {}, text(`${spacing}${contents}`));

  const childrenIds = currentPage.links
    .filter((link) => link.parentBlockId === blockId)
    .map((link) => link.childBlockId);
  const childrenNodeDisplays = childrenIds.map((id) =>
    blockNodeDisplay(state, id, level + 1),
  );

  return h("div", {}, [display, ...childrenNodeDisplays]);
}
