import { h, text } from "hyperapp";
import { addTextBlock, updateBlock } from "../block.js";
import {
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  FONT_SIZES,
} from "../constants.js";
import { getViewportCenterCoordinates } from "../viewport.js";
import { getSelectedBlocks } from "../selection.js";
/**
 * @param {State} state
 * @param {TextBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function textContent(state, block) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function oninput(state, event) {
    return updateBlock(state, block.id, {
      value: /** @type {HTMLInputElement} */ (event.target).value,
    });
  }

  return h("textarea", {
    oninput,
    style: {
      outline: "none", // disable orange editing border
      padding: "5px",
      background: "transparent",
      border: "none",
      resize: "none", // disable resize handler
      width: "100%",
      height: "100%",
      boxSizing: "border-box",
      // config types
      fontSize: `${block.fontSize}px`,
    },
    value: block.value,
  });
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function newTextBlock(state) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state, event) {
    const viewportCenter = getViewportCenterCoordinates(state);
    const x = viewportCenter.x - DEFAULT_BLOCK_WIDTH / 2; // Center the block
    const y = viewportCenter.y - DEFAULT_BLOCK_HEIGHT / 2; // Center the block
    return addTextBlock(
      state,
      { value: "hello" },
      x,
      y,
      DEFAULT_BLOCK_WIDTH,
      DEFAULT_BLOCK_HEIGHT,
    ).state;
  }
  return h("button", { onclick }, text("New text block"));
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function fontSizeDropdown(state) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];

  const enabled = firstSelectedBlock && firstSelectedBlock.type === "text";
  const currentFontSize = enabled
    ? /** @type {TextBlock} */ (firstSelectedBlock).fontSize
    : 14;

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onchange(state, event) {
    if (!enabled) return state;

    const selectedBlock = /** @type {TextBlock} */ (firstSelectedBlock);
    const newFontSize = parseInt(
      /** @type {HTMLSelectElement} */ (event.target).value,
    );

    return updateBlock(state, selectedBlock.id, {
      fontSize: newFontSize,
    });
  }

  return h(
    "select",
    {
      disabled: !enabled,
      onchange,
      value: `${currentFontSize}`,
      style: {
        marginRight: "8px",
      },
    },
    [
      ...FONT_SIZES.map((size) =>
        h(
          "option",
          {
            value: size.toString(),
            key: size.toString(),
          },
          text(`${size}px`),
        ),
      ),
    ],
  );
}
