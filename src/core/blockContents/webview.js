import { h, text } from "hyperapp";
import {
  addChildBlock,
  updateBlock,
  addWebviewBlockToViewportCenter,
} from "../block.js";
import {
  BLOCK_BORDER_RADIUS,
  BLOCK_CONTENTS_CLASS_NAME,
} from "../constants.js";
import {
  getCurrentBlocks,
  getCurrentPage,
  updateCurrentPage,
} from "../pages.js";
import { pipe } from "../utils.js";

/**
 * @param {number} blockId
 * @returns {string}
 */
function webviewDomId(blockId) {
  return `webview-${blockId}`;
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function webviewBlockContents(state, block) {
  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function enableEditingAndSelectedMode(state, event) {
    event.preventDefault();
    event.stopPropagation();

    return updateCurrentPage(state, {
      editingId: block.id,
      selectedIds: [block.id],
    });
  }

  return h(
    "div",
    {
      style: {
        height: "100%",
        borderRadius: `${BLOCK_BORDER_RADIUS}px`,
        overflow: "hidden",
        outline: "3px solid black",
        boxShadow: "0 0 20px 12px rgba(0, 0, 0, 0.25)",
      },
    },
    [
      toolbar(state, block),
      titleBar(state, block),
      h(
        "div",
        {
          style: {
            height: "100%",
            cursor: "default",
          },
          class: {
            "cursor-style-override": state.cursorStyleOverride !== null,
          },
          onpointerdown: enableEditingAndSelectedMode,
        },
        webview(state, block),
      ),
    ],
  );
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
function webview(state, block) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {});

  /** @type {import("hyperapp").StyleProp} */
  const previewStyles = {
    opacity: "0.6",
    pointerEvents: "none",
    outline: "2px dashed grey",
  };

  /**
   * @param {State} state
   * @param {Event} event
   * @return {State}
   */
  function handleIpcMessage(state, /** @type {any} */ event) {
    const channel = event.channel;
    const args = event.args || [];
    const parentBlockId = block.id;

    switch (channel) {
      case "keydown":
      case "keyup":
        // Forward keyboard events to main window
        if (args[0]) {
          window.dispatchEvent(
            new KeyboardEvent(channel, {
              key: args[0].key,
              code: args[0].code,
              ctrlKey: args[0].ctrlKey,
              metaKey: args[0].metaKey,
              shiftKey: args[0].shiftKey,
              altKey: args[0].altKey,
              bubbles: true,
            }),
          );
        }
        return state;

      case "anchor-hover":
        const hoverHref = args[0]?.href;
        const block = getCurrentBlocks(state).find(
          (b) => b.id === parentBlockId,
        );
        if (!block || block.type !== "webview" || !hoverHref) return state;
        const previewChildBlock = getCurrentBlocks(state).find(
          (b) => b.id === block.previewChildId,
        );

        if (previewChildBlock && previewChildBlock.type === "webview") {
          return updateBlock(state, previewChildBlock.id, {
            initialSrc: hoverHref,
          });
        }
        return addChildBlock(state, block.id, hoverHref, true);

      case "anchor-click":
        const clickHref = args[0]?.href;
        if (clickHref) {
          const block = getCurrentBlocks(state).find(
            (b) => b.id === parentBlockId,
          );
          if (block && block.type === "webview" && block.previewChildId) {
            const blockPreviewChildId = block.previewChildId;
            return pipe(
              state,
              (s) =>
                updateBlock(s, blockPreviewChildId, {
                  isPreview: false,
                }),
              (s) =>
                updateBlock(s, block.id, {
                  previewChildId: null,
                  realChildrenIds: [
                    ...block.realChildrenIds,
                    blockPreviewChildId,
                  ],
                }),
            );
          } else {
            return addChildBlock(state, parentBlockId, clickHref, false);
          }
        }
        return state;

      default:
        console.error("Unknown IPC channel:", channel);
        return state;
    }
  }

  /**
   * @param {State} state
   * @param {Event} event
   * @return {State}
   */
  function handleDomReady(state, event) {
    return updateBlock(state, block.id, { domReady: true });
  }

  /**
   * @param {State} state
   * @param {import("electron").DidNavigateEvent} event
   * @return {State}
   */
  function handleNavigationChange(state, event) {
    return updateBlock(state, block.id, { currentSrc: event.url });
  }

  const isEditing = currentPage.editingId === block.id;
  const isFullScreen =
    currentPage.fullScreenState && currentPage.fullScreenState.id === block.id;
  const isDragging = currentPage.dragStart !== null;

  return h("webview", {
    style: {
      // this prevents the main process from lagging when attempting to do CSS transformations on webviews without domReady
      display: block.domReady ? "" : "none",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      border: "none",
      backgroundColor: "white",
      boxShadow: isEditing ? "0 0px 10px 10px orange" : "",
      pointerEvents: `${(isEditing || isFullScreen) && !isDragging ? "" : "none"}`,
      ...(block.isPreview ? previewStyles : {}),
    },
    class: `${BLOCK_CONTENTS_CLASS_NAME} webview`,
    src: block.initialSrc,
    id: webviewDomId(block.id),
    preload: `./blockContents/webview-preload.js`,
    "ondid-navigate": (
      /** @type {State} */ state,
      /** @type {import("electron").DidNavigateEvent} */ event,
    ) => handleNavigationChange(state, event),
    "ondid-navigate-in-page": (
      /** @type {State} */ state,
      /** @type {import("electron").DidNavigateEvent} */ event,
    ) => handleNavigationChange(state, event),
    "ondom-ready": (/** @type {State} */ state, /** @type {Event} */ event) =>
      handleDomReady(state, event),
    "onipc-message": (/** @type {State} */ state, /** @type {Event} */ event) =>
      handleIpcMessage(state, event),
  });
}

/**
 * @param {State} state
 * @param {Event} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function stopPropagation(state, event) {
  event.stopPropagation();
  return state;
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
function toolbar(state, block) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {});
  const isSelected = currentPage.selectedIds.includes(block.id);
  return h(
    "div",
    {
      style: {
        position: "absolute",
        top: "-80px",
        left: "50%",
        display: isSelected ? "flex" : "none",
        flexDirection: "row",
        background: "white",
        padding: "10px 10px",
        borderRadius: "25px",
        border: "2px solid black",
        gap: "5px",
        cursor: "default",
      },
      onpointerdown: stopPropagation,
      onpointerover: stopPropagation,
      onpointerleave: stopPropagation,
    },
    [backButton(state, block), forwardButton(state, block)],
  );
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
function titleBar(state, block) {
  return h(
    "div",
    {
      style: {
        height: "50px",
        background: "white",
        padding: "6px 10px",
        borderBottom: "2px solid black",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
    },
    [
      urlBar(state, block),
      h("div", { style: { fontSize: "2em" } }, text("title")),
    ],
  );
}

/**
 * @param {State} state
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function backButton(state, block) {
  return navigationButton(state, block, "back", "←");
}

/**
 * @param {State} state
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function forwardButton(state, block) {
  return navigationButton(state, block, "forward", "→");
}

/**
 * @param {State} state
 * @param {Block} block
 * @param {"back" | "forward"} direction
 * @param {string} display
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function navigationButton(state, block, direction, display) {
  const { enabled, webview: webviewElement } = (() => {
    const webviewElement = /** @type {import("electron").WebviewTag} */ (
      document.getElementById(webviewDomId(block.id))
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

  return h(
    "button",
    {
      disabled: !enabled,
      onclick,
      style: {
        whiteSpace: "nowrap",
        backgroundColor: enabled ? "white" : "#f0f0f0",
        border: "2px solid black",
        borderRadius: "20px",
        width: "34px",
        height: "25px",
        fontSize: "20px",
        color: enabled ? "black" : "#999",
        cursor: enabled ? "pointer" : "",
      },
    },
    text(display),
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function newWebviewButton(state) {
  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state, event) {
    return addWebviewBlockToViewportCenter(state, "https://google.com", false);
  }
  return h("button", { onclick }, text("🌐"));
}

/** @type {BlockConfig<WebviewBlock>} */
export const DEFAULT_WEBVIEW_BLOCK_CONFIG = {
  isPreview: false,
  initialSrc: "https://example.com",
  currentSrc: "https://example.com",
  previewChildId: null,
  realChildrenIds: [],
  domReady: false,
};

/**
 * @param {State} state - Current application state
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function urlBar(state, block) {
  let searchBarValue = block.currentSrc;

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function oninput(state, event) {
    if (!event.target) return state;
    const value = /** @type {HTMLInputElement} */ (event.target).value;

    return updateBlock(state, block.id, {
      currentSrc: value,
    });
  }

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onsubmit(state, event) {
    event.preventDefault();
    return updateBlock(state, block.id, {
      initialSrc: block.currentSrc,
    });
  }

  return h(
    "form",
    {
      onsubmit,

      // stop keyboard shortcuts from triggering
      onkeydown: stopPropagation,
      style: {
        width: "100%",
      },
    },
    h("input", {
      type: "text",
      value: searchBarValue,
      style: {
        width: "30%",
        boxSizing: "border-box",
        borderRadius: "10px",
        backgroundColor: "#F0F0F0",
        border: "1px solid black",
        fontSize: "2em",
        outline: "none", // disable orange editing border
      },
      onsubmit,
      oninput,
      onpointerdown: stopPropagation,
    }),
  );
}
