import { h } from "hyperapp";
import {
  getCurrentBlocks,
  getCurrentPage,
  updateCurrentPage,
} from "./pages.js";

/**
 * @param {State} state
 * @return {(link: Link) => import("hyperapp").ElementVNode<State>}
 */
export function linkView(state) {
  return (link) => {
    const currentBlocks = getCurrentBlocks(state);
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

    return h(
      "div",
      {
        style: {
          position: "absolute",
          left: `${parentCenterX}px`,
          top: `${parentCenterY}px`,
          width: `${distance}px`,
          height: "2px",
          backgroundColor: "#888",
          transformOrigin: "0 50%",
          transform: `rotate(${angle}deg)`,
          pointerEvents: "none",
          zIndex: "0",
        },
        key: `${parentBlock.id}-${childBlock.id}`,
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
            borderBottom: `${arrowSize}px solid black`,
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

  return updateCurrentPage(state, {
    links: [...currentPage.links, { parentBlockId, childBlockId }],
  });
}
