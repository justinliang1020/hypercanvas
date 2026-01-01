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
import { getEditingBlock, getHoveredBlock } from "../selection.js";
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

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function enableEditingMode(state, event) {
    event.preventDefault();
    event.stopPropagation();

    return updateCurrentPage(state, { editingId: block.id });
  }

  const buttons = h("div", { style: { position: "absolute", top: "-50px" } }, [
    h("div", { style: { background: "white" } }, text("hello world")),
  ]);

  const webview = h("webview", {
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

  return h(
    "div",
    {
      style: {
        height: "100%",
        borderRadius: `${BLOCK_BORDER_RADIUS}px`,
        overflow: "hidden",
        outline: "3px solid black",
      },
    },
    [
      buttons,
      titleBar(state, block),
      h(
        "div",
        {
          style: { height: "100%" },
          onpointerdown: enableEditingMode,
        },
        webview,
      ),
    ],
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
        borderBottom: "1px solid black",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
      },
    },
    [
      h("div", { style: { fontSize: "2em" } }, text(block.currentSrc)),
      h("div", { style: { fontSize: "2em" } }, text("title")),
    ],
  );
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function backButton(state) {
  return navigationButton(state, "back", "←");
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function forwardButton(state) {
  return navigationButton(state, "forward", "→");
}

/**
 * @param {State} state
 * @param {"back" | "forward"} direction
 * @param {string} display
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function navigationButton(state, direction, display) {
  const editingBlock = getEditingBlock(state);

  const { enabled, webview: webviewElement } = (() => {
    if (
      !editingBlock ||
      editingBlock.type !== "webview" ||
      !editingBlock.domReady
    ) {
      return { enabled: false, webview: undefined };
    }

    const webviewElement = /** @type {import("electron").WebviewTag} */ (
      document.getElementById(webviewDomId(editingBlock.id))
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
      style: { whiteSpace: "nowrap" },
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
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function searchBar(state) {
  let searchBarValue = "";

  const editingBlock = getEditingBlock(state);
  const hoveredBlock = getHoveredBlock(state);

  if (editingBlock && editingBlock.type === "webview" && editingBlock) {
    searchBarValue = editingBlock.currentSrc;
  } else if (hoveredBlock && hoveredBlock.type === "webview") {
    searchBarValue = hoveredBlock.currentSrc;
  }

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function oninput(state, event) {
    if (!editingBlock) return state;
    if (!event.target) return state;
    const value = /** @type {HTMLInputElement} */ (event.target).value;

    return updateBlock(state, editingBlock.id, {
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
    const editingBlock = getEditingBlock(state);
    if (editingBlock && editingBlock.type === "webview") {
      return updateBlock(state, editingBlock.id, {
        initialSrc: editingBlock.currentSrc,
      });
    }
    return state;
  }

  return h(
    "form",
    {
      onsubmit,
      style: {
        width: "100%",
      },
    },
    h("input", {
      type: "text",
      value: searchBarValue,
      disabled: !editingBlock,
      style: {
        width: "100%",
        boxSizing: "border-box",
        backgroundColor: "transparent",
        border: "none",
        outline: "none", // disable orange editing border
      },
      oninput,
      // stop keyboard shortcuts from triggering
      onkeydown: (state, event) => {
        event.stopPropagation();
        return state;
      },
    }),
  );
}
