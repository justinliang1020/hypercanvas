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
    [
      searchBar(state),
      goButton(state),
      newBlockButton(state),
      backButton(state),
      forwardButton(state),
    ],
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

    return updateBlock(state, firstSelectedBlock.id, {
      content: value,
    });
  }

  return h("input", {
    type: "text",
    style: { width: "20em" },
    value: searchBarValue,
    disabled: !firstSelectedBlock,
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

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function backButton(state) {
  return navigationButton(state, "back", "<-");
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function forwardButton(state) {
  return navigationButton(state, "forward", "->");
}

/**
 * @param {State} state
 * @param {"back" | "forward"} direction
 * @param {string} display
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function navigationButton(state, direction, display) {
  const firstSelectedBlock = getSelectedBlocks(state)[0];

  const { enabled, webview: webviewElement } = (() => {
    if (!firstSelectedBlock || !firstSelectedBlock.domReady) {
      return { enabled: false, webview: undefined };
    }

    const blockKey = `block-${firstSelectedBlock.id}`;
    const webviewElement = /** @type {import("electron").WebviewTag} */ (
      document.getElementById(blockKey)
    );

    if (!webviewElement) {
      return { enabled: false, webview: undefined };
    }

    const enabled = (() => {
      switch (direction) {
        case "back":
          return webviewElement.canGoBack();
        case "forward":
          return webviewElement.canGoForward();
      }
    })();

    return {
      enabled: enabled,
      webview: webviewElement,
    };
  })();

  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state) {
    if (!webviewElement) return state;

    switch (direction) {
      case "back":
        webviewElement.goBack();
        break;
      case "forward":
        webviewElement.goForward();
        break;
    }

    return state;
  }

  return h("button", { disabled: !enabled, onclick }, text(display));
}
