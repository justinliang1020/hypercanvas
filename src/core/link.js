import { h } from "hyperapp";
import { getCurrentPage, updateCurrentPage } from "./pages.js";
import { isPendingSelected, selectBlock } from "./selection.js";

/**
 * @param {State} state
 * @return {(link: Link) => import("hyperapp").ElementVNode<State>}
 */
export function linkView(state) {
  return (link) => {
    const currentPage = getCurrentPage(state);
    if (!currentPage) throw Error("No current page");
    const currentBlocks = currentPage.blocks;
    const parentBlock = currentBlocks.find((b) => b.id === link.parentBlockId);
    const childBlock = currentBlocks.find((b) => b.id === link.childBlockId);
    if (!parentBlock || !childBlock) throw Error(`invalid link: ${link}`);
    const parentCenterX = parentBlock.x + parentBlock.width / 2;
    const parentCenterY = parentBlock.y + parentBlock.height / 2;
    const childCenterX = childBlock.x + childBlock.width / 2;
    const childCenterY = childBlock.y + childBlock.height / 2;

    const dx = childCenterX - parentCenterX;
    const dy = childCenterY - parentCenterY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const angle = Math.atan2(dy, dx) * (180 / Math.PI);

    const arrowSize = 16;
    const arrowX = distance / 2 - arrowSize / 2;
    const arrowY = -(arrowSize / 3) - 2; //TODO: do a better formula

    const isLinkSelected = currentPage.selectedIds.includes(link.id);
    const isLinkPendingSelected = isPendingSelected(state, link.id);

    let backgroundColor = "#888";
    let arrowColor = "black";
    if (isLinkSelected) {
      backgroundColor = "#007acc";
      arrowColor = "#007acc";
    } else if (isLinkPendingSelected) {
      backgroundColor = "rgba(0, 122, 204, 0.6)";
      arrowColor = "rgba(0, 122, 204, 0.6)";
    }

    return h(
      "div",
      {
        style: {
          position: "absolute",
          left: `${parentCenterX}px`,
          top: `${parentCenterY}px`,
          width: `${distance}px`,
          height: "2px",
          backgroundColor,
          transformOrigin: "0 50%",
          transform: `rotate(${angle}deg)`,
          pointerEvents: "auto",
          cursor: "pointer",
        },
        key: `link-${link.id}`,
        onpointerdown: (state, event) => {
          event.stopPropagation();
          return selectBlock(state, link.id);
        },
      },
      [
        h("div", {
          style: {
            position: "absolute",
            left: `${arrowX}px`,
            top: `${arrowY}px`,
            width: "0",
            height: "0",
            borderLeft: `${arrowSize / 2}px solid transparent`,
            borderRight: `${arrowSize / 2}px solid transparent`,
            borderBottom: `${arrowSize}px solid ${arrowColor}`,
            transform: "rotate(90deg)",
          },
        }),
      ],
    );
  };
}

/**
 * @param {State} state
 * @param {number} parentBlockId
 * @param {number} childBlockId
 * @returns {State}
 */
export function addLink(state, parentBlockId, childBlockId) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const newLink = {
    id: currentPage.idCounter,
    parentBlockId,
    childBlockId,
  };

  return updateCurrentPage(state, {
    links: [...currentPage.links, newLink],
    idCounter: currentPage.idCounter + 1,
  });
}

/**
 * Utility to check if an ID belongs to a link
 * @param {State} state
 * @param {number} id
 * @returns {boolean}
 */
export function isIdLink(state, id) {
  const currentPage = getCurrentPage(state);
  return currentPage?.links?.some((link) => link.id === id) ?? false;
}

/**
 * Utility to get link by ID
 * @param {State} state
 * @param {number} id
 * @returns {Link | null}
 */
export function getLinkById(state, id) {
  const currentPage = getCurrentPage(state);
  return currentPage?.links?.find((link) => link.id === id) ?? null;
}
