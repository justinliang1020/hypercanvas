import { h, text } from "hyperapp";
import {
  removePreviewChildBlock,
  addChildBlock,
  updateBlock,
  addBlockToViewportCenter,
} from "../block.js";
import {
  BLOCK_BORDER_RADIUS,
  BLOCK_CONTENTS_CLASS_NAME,
} from "../constants.js";
import { getCurrentPage } from "../pages.js";
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

  // Store the block ID and handler globally so we can access it from the webview
  if (!(/** @type {any} */ (window).hypercanvasWebviewHandlers)) {
    /** @type {any} */ (window).hypercanvasWebviewHandlers = {};
  }

  const blockKey = `block-${block.id}`;
  /** @type {any} */ (window).hypercanvasWebviewHandlers[blockKey] = (
    /** @type {any} */ event,
  ) => {
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
        break;

      case "anchor-hover":
        console.log("Processing anchor hover:", args[0]?.href);
        const hoverHref = args[0]?.href;
        if (hoverHref && /** @type {any} */ (window).hypercanvasDispatch) {
          /** @type {any} */ (window).hypercanvasDispatch(
            (/** @type {State} */ state) => {
              let newState = removePreviewChildBlock(state, block.id);
              newState = addChildBlock(newState, block.id, hoverHref, true);
              return newState;
            },
          );
        }
        break;

      case "anchor-click":
        console.log("Processing anchor click:", args[0]?.href);
        const clickHref = args[0]?.href;
        if (clickHref && /** @type {any} */ (window).hypercanvasDispatch) {
          /** @type {any} */ (window).hypercanvasDispatch(
            (/** @type {State} */ state) => {
              let newState = removePreviewChildBlock(state, block.id);
              newState = addChildBlock(newState, block.id, clickHref, false);
              return newState;
            },
          );
        }
        break;

      default:
        console.log("Unknown IPC channel:", channel);
        break;
    }
  };

  // Set up the event listener after the DOM updates
  setTimeout(() => {
    const webview = /** @type {import("electron").WebviewTag} */ (
      document.getElementById(blockKey)
    );
    if (webview && !webview.dataset.hypercanvasIpcSetup) {
      console.log(`Setting up IPC listener for ${blockKey}`);

      const handler = /** @type {any} */ (window).hypercanvasWebviewHandlers[
        blockKey
      ];
      if (handler) {
        webview.addEventListener("ipc-message", handler);
        webview.dataset.hypercanvasIpcSetup = "true";
        console.log(`IPC listener added for ${blockKey}`);
      }

      /**
       * @param {import("electron").DidNavigateEvent } event
       */
      function handleNavigationChange(event) {
        console.log("Navigation detected:", event.url);
        //@ts-ignore
        if (window.hypercanvasDispatch) {
          //@ts-ignore
          window.hypercanvasDispatch((state) => {
            return updateBlock(state, block.id, { src: event.url });
          });
        }
      }

      function handleDidLoad() {
        //@ts-ignore
        if (window.hypercanvasDispatch) {
          //@ts-ignore
          window.hypercanvasDispatch((state) => {
            return updateBlock(state, block.id, { domReady: true });
          });
        }
      }

      webview.addEventListener("dom-ready", handleDidLoad);
      webview.addEventListener("did-navigate", handleNavigationChange);
      webview.addEventListener("did-navigate-in-page", handleNavigationChange);
    }
  }, 0);

  return h("webview", {
    style: {
      pointerEvents: isEditing || state.isInteractMode ? null : "none",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      border: "none",
      borderRadius: `${BLOCK_BORDER_RADIUS}px`,
      ...(block.isPreview ? previewStyles : {}),
    },
    class: BLOCK_CONTENTS_CLASS_NAME,
    src: block.src,
    id: blockKey,
    key: `${block.id}`,
    preload: `./blockContents/webview-preload.js`,
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
