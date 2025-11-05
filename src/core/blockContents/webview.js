import { h, text } from "hyperapp";
import {
  addChildBlock,
  updateBlock,
  addBlockToViewportCenter,
} from "../block.js";
import {
  BLOCK_BORDER_RADIUS,
  BLOCK_CONTENTS_CLASS_NAME,
} from "../constants.js";
import { getCurrentBlocks, getCurrentPage } from "../pages.js";
import { getSelectedBlocks } from "../selection.js";

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function webviewBlockContents(state, block) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {});
  const isEditing = currentPage.editingId === block.id;

  /** @type {import("hyperapp").StyleProp} */
  const previewStyles = {
    opacity: "0.6",
    pointerEvents: "none",
    outline: "2px dashed grey",
  };

  // Set up IPC message handling using a global dispatch reference
  // This approach works around Hyperapp's limitation with custom webview events
  if (!(/** @type {any} */ (window).hypercanvasDispatch)) {
    // We'll need to set this from the main app
    console.warn("Global dispatch not available for webview IPC");
  }

  const blockKey = `block-${block.id}`;
  const blockId = block.id;

  /**
   * @param {State} state
   * @param {Event} event
   * @return {State}
   */
  function handleIpcMessage(state, /** @type {any} */ event) {
    console.log("IPC message received:", event.channel, event.args);
    const channel = event.channel;
    const args = event.args || [];

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
        console.log("Processing anchor hover:", args[0]?.href);
        const hoverHref = args[0]?.href;
        const block = getCurrentBlocks(state).find((b) => b.id === blockId);
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
        console.log("Processing anchor click:", args[0]?.href);
        const clickHref = args[0]?.href;
        if (clickHref) {
          const block = getCurrentBlocks(state).find((b) => b.id === blockId);
          if (block && block.type === "webview" && block.previewChildId) {
            let newState = updateBlock(state, block.previewChildId, {
              isPreview: false,
            });
            newState = updateBlock(newState, block.id, {
              previewChildId: null,
              realChildrenIds: [...block.realChildrenIds, block.previewChildId],
            });
            return newState;
          }
          return state;
        }
        return state;

      default:
        console.log("Unknown IPC channel:", channel);
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
    console.log("Navigation detected:", event.url);
    return updateBlock(state, block.id, { currentSrc: event.url });
  }

  return h("webview", {
    style: {
      // this prevents the main process from lagging when attempting to do CSS transformations on webviews without domReady
      display: block.domReady ? "" : "none",
      pointerEvents: isEditing || state.isInteractMode ? null : "none",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      border: "none",
      borderRadius: `${BLOCK_BORDER_RADIUS}px`,
      ...(block.isPreview ? previewStyles : {}),
    },
    class: BLOCK_CONTENTS_CLASS_NAME,
    src: block.initialSrc,
    id: blockKey,
    key: `${block.id}`,
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
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function backButton(state) {
  return navigationButton(state, "back", "<-");
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function forwardButton(state) {
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
    if (
      !firstSelectedBlock ||
      firstSelectedBlock.type !== "webview" ||
      !firstSelectedBlock.domReady
    ) {
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
    return addBlockToViewportCenter(state, "https://example.com", false);
  }
  return h("button", { onclick }, text("New webview block"));
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
