import { h, text } from "hyperapp";
import { getCurrentPage } from "./pages.js";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function sidebarWrapper(state) {
  const noSidebar = h(
    "div",
    {
      style: { position: "fixed", top: "0%", left: "0%", padding: "10px" },
    },
    toggleSidebarButton(state),
  );
  const content = state.isSidebarVisible ? sidebar(state) : noSidebar;
  //TODO: transition animation
  return h("div", {}, content);
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function sidebar(state) {
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
    [toggleSidebarButton(state), hr(), treeSection(state)],
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function toggleSidebarButton(state) {
  /**
   * @param {State} state
   * @returns {State}
   */
  function onclick(state) {
    return { ...state, isSidebarVisible: !state.isSidebarVisible };
  }

  const content = state.isSidebarVisible ? "hide" : "show";

  return h("button", { onclick, style: { width: "fit-content" } }, [
    text(content),
  ]);
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
