import { h, text } from "hyperapp";
import {
  addChildBlock,
  deleteBlock,
  sendToBack,
  sendToFront,
  updateBlock,
} from "../block.js";
import { BLOCK_CONTENTS_CLASS_NAME } from "../constants.js";
import {
  getCurrentBlocks,
  getCurrentPage,
  updateCurrentPage,
} from "../pages.js";
import { getDomainFromUrl, pipe } from "../utils.js";

/**
 * @param {number} blockId
 * @returns {string}
 */
function webviewDomId(blockId) {
  return `webview-${blockId}`;
}

/**
 * @param {number} blockId
 * @returns {string}
 */
function webviewUrlBarId(blockId) {
  return `webview-urlbar-${blockId}`;
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function webviewBlockContents(state, block) {
  const currentPage = getCurrentPage(state);
  const isSelected = currentPage.selectedIds.includes(block.id);
  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function webviewWrapperOnPointerDown(state, event) {
    event.preventDefault();
    event.stopPropagation();

    return pipe(
      state,
      (state) =>
        updateCurrentPage(state, {
          selectedIds: [block.id],
        }),
      (state) => updateBlock(state, block.id, { isPreview: false }),
    );
  }

  return h(
    "div",
    {
      style: {
        height: "100%",
        borderRadius: "15px",
        overflow: "hidden",
        boxSizing: "border-box",
        borderWidth: "2px",
        borderStyle: "solid",
        borderColor: isSelected ? "#7F7F7F" : "#9A9A9A",
        boxShadow: isSelected
          ? "rgb(36 152 187 / 30%) 0px 0px 42px 12px"
          : "rgb(0 0 0 / 25%) 0px 0px 20px 6px",
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
            cursor: block.isPreview ? "pointer" : "auto",
          },
          class: {
            "cursor-style-override": state.cursorStyleOverride !== null,
          },
          onpointerdown: webviewWrapperOnPointerDown,
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
   * @param {import("electron").PageTitleUpdatedEvent} event
   * @return {State}
   */
  function handlePageTitleUpdated(state, event) {
    return updateBlock(state, block.id, { pageTitle: event.title });
  }

  /**
   * @param {State} state
   * @param {import("electron").PageFaviconUpdatedEvent} event
   * @return {State}
   */
  function handlePageFaviconUpdated(state, event) {
    const firstFaviconUrl = event.favicons.at(0);
    return updateBlock(state, block.id, {
      faviconUrl: firstFaviconUrl ?? null,
    });
  }

  /**
   * @param {State} state
   * @param {import("electron").DidNavigateEvent} event
   * @return {State}
   */
  function handleNavigationChange(state, event) {
    const webviewElement = getWebviewElementIfDomReady(block);

    if (!webviewElement) {
      return updateBlock(state, block.id, { currentSrc: event.url });
    }

    return updateBlock(state, block.id, {
      currentSrc: event.url,
      canGoBack: webviewElement.canGoBack(),
      canGoForward: webviewElement.canGoForward(),
    });
  }

  const isSelected = currentPage.selectedIds.includes(block.id);
  const isResizing = Boolean(currentPage.resizing);
  const isDragging = Boolean(currentPage.dragStart);

  return h("webview", {
    style: {
      display: block.domReady ? "" : "none", // this prevents the main process from lagging when attempting to do CSS transformations on webviews without domReady
      willChange: "transform", // improves performance of rendered blocks. for now only put this on webview blocks to see if performance improves
      width: "100%",
      height: "100%",
      overflow: "hidden",
      border: "none",
      backgroundColor: "white",
      pointerEvents: `${isSelected && !isResizing && !isDragging ? "" : "none"}`,
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
    "onpage-title-updated": handlePageTitleUpdated,
    "onpage-favicon-updated": handlePageFaviconUpdated,
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
  const divider = h("div", {
    style: {
      width: "2px",
      background: "black",
      height: "50px",
      margin: "0 5px",
    },
  });
  return h(
    "div",
    {
      style: {
        position: "absolute",
        top: "-90px",
        left: "50%",
        transform: "translate(-50%, 0)",
        display: isSelected ? "flex" : "none",
        backdropFilter: "blur(5px)",
        flexDirection: "row",
        background:
          "linear-gradient(90deg,  rgba(195, 194, 194, 0.25) 0%, rgba(222, 222, 222, 0.25) 100%)",
        padding: "10px 45px",
        borderRadius: "25px",
        border: "2px solid grey",
        gap: "5px",
      },
      // Allow toolbar to be draggable
      // onpointerdown: stopPropagation,
      // onpointerover: stopPropagation,
      // onpointerleave: stopPropagation,
    },
    [
      backButton(state, block),
      forwardButton(state, block),
      deleteButton(block),
      divider,
      sendToBackButton(block),
      sendToFrontButton(block),
    ],
  );
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
function titleBar(state, block) {
  const currentPage = getCurrentPage(state);
  const isSelected = currentPage.selectedIds.includes(block.id);

  return h(
    "div",
    {
      style: {
        height: "50px",
        // make sure the right side which contains title text without a background is readable.
        // since the text is black, that means the bc should be more opaque and white
        background: isSelected
          ? "linear-gradient(90deg, rgb(102 102 102 / 25%) 0%, rgb(245 245 245 / 80%) 100%)"
          : "linear-gradient(90deg, rgb(214 214 214 / 25%) 0%, rgb(255 255 255 / 60%) 100%)",
        backdropFilter: "blur(5px)",
        padding: "6px 15px",
        borderBottomWidth: "2px",
        borderBottomStyle: "solid",
        borderBottomColor: isSelected ? "#7F7F7F" : "#9A9A9A",
        display: "flex",
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
      },
    },
    [
      urlBar(state, block),
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "row",
            gap: "10px",
            alignItems: "center",
          },
        },
        [
          h(
            "div",
            { style: { fontSize: "28px", whiteSpace: "nowrap" } },
            text(block.pageTitle),
          ),
          h("img", {
            src: block.faviconUrl,
            style: {
              height: "100%",
              pointerEvents: "none",
              borderRadius: "3px",
            },
          }),
        ],
      ),
      ,
    ],
  );
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function backButton(state, block) {
  return navigationButton(block, "back", "←");
}

/**
 * @param {State} state
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function forwardButton(state, block) {
  return navigationButton(block, "forward", "→");
}

/**
 * @param {WebviewBlock} block
 * @param {"back" | "forward"} direction
 * @param {string} display
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function navigationButton(block, direction, display) {
  /** @type {Boolean} */
  const enabled = (() => {
    switch (direction) {
      case "back":
        return block.canGoBack;
      case "forward":
        return block.canGoForward;
    }
  })();

  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onclick(state) {
    const webviewElement = getWebviewElementIfDomReady(block);

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

  return button(display, onclick, enabled);
}

/**
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function deleteButton(block) {
  return button("X", (state) => deleteBlock(state, block.id), true);
}

/**
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function sendToFrontButton(block) {
  return button("↑", (state) => sendToFront(state, block.id), true);
}

/**
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function sendToBackButton(block) {
  return button("↓", (state) => sendToBack(state, block.id), true);
}

/**
 * @param {string} content
 * @param {(arg0: State) => import("hyperapp").Dispatchable<State>} onclick
 * @param {boolean} enabled
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function button(content, onclick, enabled) {
  return h(
    "button",
    {
      disabled: !enabled,
      onclick,
      style: {
        whiteSpace: "nowrap",
        backgroundColor: enabled
          ? "rgba(245, 245, 245, 0.8)"
          : "rgba(220, 220, 220, 0.4)",
        border: enabled ? "2px solid black" : "2px solid grey",
        borderRadius: "20px",
        width: "60px",
        height: "50px",
        fontSize: "2em",
        color: enabled ? "black" : "grey",
        cursor: enabled ? "pointer" : "",
      },
      class: {
        "toolbar-button-enabled": enabled,
      },
    },
    text(content),
  );
}

/** @type {BlockConfig<WebviewBlock>} */
export const DEFAULT_WEBVIEW_BLOCK_CONFIG = {
  isPreview: false,
  initialSrc: "https://example.com",
  currentSrc: "https://example.com",
  previewChildId: null,
  realChildrenIds: [],
  domReady: false,
  pageTitle: "",
  canGoBack: false,
  canGoForward: false,
  faviconUrl: null,
  isUrlBarExpanded: false,
};

/**
 * @param {State} state - Current application state
 * @param {WebviewBlock} block
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function urlBar(state, block) {
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

  /**
   * Effect to select text in the URL bar input
   * @param {Function} dispatch
   * @param {number} blockId
   */
  function selectUrlBarTextEffect(dispatch, blockId) {
    // requestAnimationFrame in order to wait for the new input value to change before selecting it
    requestAnimationFrame(() => {
      const input = /** @type {HTMLInputElement | null} */ (
        document.getElementById(webviewUrlBarId(blockId))
      );
      if (input) {
        input.select();
      }
    });
  }

  /**
   * @param {State} state
   * @param {Event} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function expandUrlBar(state, event) {
    event.stopPropagation();

    if (block.isUrlBarExpanded) return state;

    event.preventDefault();

    return [
      pipe(
        state,
        (state) =>
          updateBlock(state, block.id, {
            isUrlBarExpanded: true,
          }),
        (state) => updateCurrentPage(state, { selectedIds: [block.id] }),
      ),
      [selectUrlBarTextEffect, block.id],
    ];
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function unexpandUrlBar(state) {
    return updateBlock(state, block.id, {
      isUrlBarExpanded: false,
    });
  }

  return h(
    "form",
    {
      onsubmit,
      onkeydown: stopPropagation, // stop keyboard shortcuts from triggering
      style: {
        width: block.isUrlBarExpanded ? "60%" : "250px",
      },
    },
    h("input", {
      type: "text",
      id: webviewUrlBarId(block.id),
      value: block.isUrlBarExpanded
        ? block.currentSrc
        : getDomainFromUrl(block.currentSrc),
      style: {
        width: "100%",
        boxSizing: "border-box",
        borderRadius: "10px",
        backgroundColor: "rgb(250,250,250)",
        border: block.isUrlBarExpanded
          ? "1px solid black"
          : "1px solid #B6B6B6",
        fontSize: "28px",
        cursor: block.isUrlBarExpanded ? "auto" : "text",
        outline: "none", // disable orange editing border
        padding: "5px 8px",
      },
      onsubmit,
      oninput,
      onpointerdown: expandUrlBar,
      onblur: unexpandUrlBar,
    }),
  );
}

/**
 * Returns the webview element of a block if the DOM is ready.
 * If the DOM is not ready, it returns null
 * @param {WebviewBlock} block
 * @returns {import("electron").WebviewTag | null}
 */
function getWebviewElementIfDomReady(block) {
  const webviewElement = /** @type {import("electron").WebviewTag} */ (
    document.getElementById(webviewDomId(block.id))
  );

  if (!webviewElement || !block.domReady) {
    return null;
  }

  return webviewElement;
}
