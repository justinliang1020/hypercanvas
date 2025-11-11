import { h } from "hyperapp";
import { getCurrentPage } from "./pages.js";
/**
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @param {Block} block - Current application state
 * @param {CardinalDirection} direction
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function framePart(state, block, direction) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) throw Error("no current page");
  const isSelected = currentPage.selectedIds.includes(block.id);
  const isHovering = currentPage.hoveringId === block.id;
  const isMultiSelect =
    currentPage.selectionBox !== null || currentPage.selectedIds.length > 1;

  return h("div", {
    style: {
      backgroundColor:
        (isHovering || isSelected) && !isMultiSelect
          ? "#a9ad974d"
          : "transparent",
    },
  });
}
