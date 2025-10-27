import { h, text } from "hyperapp";
import { getHoveredBlock, getSelectedBlocks } from "./selection.js";
import { updateBlock } from "./block.js";

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
        bottom: "0",
        left: "50%",
        transform: "translateX(-50%)",
        margin: "0",
        paddingBottom: "10px",
        display: "flex",
        gap: "5px",
        alignItems: "center",
        justifyContent: "center",
      },
    },
    [searchBar(state), goButton(state), newBlockButton(state)],
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function searchBar(state) {
  let searchBarValue = "";

  const firstSelectedBlock = getSelectedBlocks(state)[0];
  const hoveredBlock = getHoveredBlock(state);

  if (firstSelectedBlock) {
    searchBarValue = firstSelectedBlock.content;
  } else if (hoveredBlock) {
    searchBarValue = hoveredBlock.content;
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
    console.log(value);

    return updateBlock(state, firstSelectedBlock, {
      content: value,
    });
  }

  return h("input", {
    type: "text",
    style: { width: "20em" },
    value: searchBarValue,
    disabled: !firstSelectedBlock,
    // stop keyboard shortcuts from triggering
    oninput,
    // stop keyboard shortcuts from triggering
    onkeydown: (state, event) => {
      event.stopPropagation();
      return state;
    },
  });
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function goButton(state) {
  return h("button", {}, text("Go"));
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function newBlockButton(state) {
  return h("button", {}, text("New block"));
}
