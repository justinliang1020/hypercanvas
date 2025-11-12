import { h } from "hyperapp";
import {
  PASTE_OFFSET_X,
  PASTE_OFFSET_Y,
  OUTLINE_COLORS,
  OUTLINE_WIDTHS,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
  Z_INDEX_TOP,
} from "./constants.js";
import { saveMementoAndReturn } from "./memento.js";
import { RESIZE_HANDLERS, ResizeHandle } from "./resize.js";
import { getViewportCenterCoordinates } from "./viewport.js";
import { clearUserClipboardEffect, enableFullScreen } from "./utils.js";
import {
  getCurrentBlocks,
  updateCurrentPage,
  getCurrentPage,
} from "./pages.js";
import {
  isPendingSelected,
  getSelectedBlocks,
  toggleBlockSelection,
} from "./selection.js";
import {
  DEFAULT_WEBVIEW_BLOCK_CONFIG,
  webviewBlockContents,
} from "./blockContents/webview.js";
import {
  DEFAULT_TEXT_BLOCK_CONFIG,
  textContent,
} from "./blockContents/text.js";
import { imageContent } from "./blockContents/image.js";
import { addLink } from "./link.js";

/**
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function blockView(state, block) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {});

  const isResizing = currentPage.resizing?.id === block.id;
  const isHovering = currentPage.hoveringId === block.id;
  const isDraggingAnything = currentPage.dragStart !== null;
  const isMultiSelect =
    currentPage.selectionBox !== null || currentPage.selectedIds.length > 1;
  const isFullScreen =
    currentPage.fullScreenState && currentPage.fullScreenState.id === block.id;
  const outline = getBlockOutline(state, block.id);

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onpointerover(state, event) {
    event.stopPropagation();
    const currentPage = getCurrentPage(state);
    if (!currentPage || isDraggingAnything) return state;

    const cursorStyle = (() => {
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.classList.contains("resize-handle")) {
        return currentPage.cursorStyle;
      } else if (isMultiSelect || currentPage.editingId === block.id) {
        return "default";
      }
      return "move";
    })();

    return updateCurrentPage(state, {
      hoveringId: block.id,
      cursorStyle: cursorStyle,
    });
  }

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onpointerleave(state, event) {
    event.stopPropagation();
    if (isDraggingAnything) return state;
    return updateCurrentPage(state, {
      hoveringId: null,
      cursorStyle: "default",
    });
  }

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onpointerdown(state, event) {
    // we must check for multi-select before stopping event propagation
    if (isMultiSelect) return state;

    event.stopPropagation();

    const currentPage = getCurrentPage(state);
    if (!currentPage) {
      return state;
    }

    if (event.shiftKey) {
      return toggleBlockSelection(state, block.id);
    }

    return updateCurrentPage(state, {
      dragStart: {
        id: block.id,
        startX: block.x,
        startY: block.y,
      },
      selectedIds: [block.id],
      editingId: null, // Exit edit mode when selecting
    });
  }

  /**
   * @param {State} state
   * @param {MouseEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function ondblclick(state, event) {
    event.stopPropagation();

    return enableFullScreen(state, block);
  }

  const contents = (() => {
    switch (block.type) {
      case "webview":
        return webviewBlockContents(state, block);
      case "text":
        return textContent(state, block);
      case "image":
        return imageContent(state, block);
    }
  })();

  const resizeHandles = Object.keys(RESIZE_HANDLERS).map((handle) =>
    ResizeHandle({
      handle: /** @type{ResizeString} */ (handle),
      zoom: currentPage.zoom,
      context: "block",
    }),
  );

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function wrapperOnpointerdown(state, event) {
    event.preventDefault();
    event.stopPropagation();

    console.log("contents");

    return updateCurrentPage(state, { editingId: block.id });
  }

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function wrapperOnpointerover(state, event) {
    event.stopPropagation();
    if (isDraggingAnything) return state;
    return updateCurrentPage(state, { cursorStyle: "default" });
  }

  return h(
    "div",
    {
      // Key ensures Hyperapp's virtual DOM can properly track each block element during list updates,
      // preventing DOM node reuse bugs when blocks are deleted (fixes positioning issues)
      key: `block-${block.id}`,
      "data-id": block.id,
      style: {
        // outline hides the background when in full screen mode
        outline: isFullScreen ? "100px solid black" : outline, //TODO: fix magic number
        willChange: "transform", // improves performance of rendered blocks
        transform: `translate(${block.x}px, ${block.y}px)`,
        width: `${block.width}px`,
        height: `${block.height}px`,
        zIndex: isFullScreen ? `${Z_INDEX_TOP}` : `${block.zIndex}`,
        position: "absolute",
        userSelect: "none",
        boxSizing: "border-box",
        touchAction: "none",
        transformOrigin: "top left",
        padding: isFullScreen ? "" : "100px",
        backgroundColor:
          (isHovering || isResizing) && !isMultiSelect
            ? "#a9ad974d"
            : "transparent",
      },
      class: { block: true },
      onpointerover: isFullScreen ? undefined : onpointerover,
      onpointerleave: isFullScreen ? undefined : onpointerleave,
      onpointerdown: isFullScreen ? undefined : onpointerdown,
      ondblclick: isFullScreen ? undefined : ondblclick,
    },
    [
      h(
        "div",
        {
          style: {
            height: "100%",
          },
          onpointerdown: wrapperOnpointerdown,
          onpointerover: wrapperOnpointerover,
        },
        contents,
      ),
      ...(!isFullScreen && (isHovering || isResizing) && !isMultiSelect
        ? resizeHandles
        : []),
    ],
  );
}

/**
 * Creates a CSS outline string with zoom-adjusted width
 * @param {number} width - Base width in pixels
 * @param {string} color - CSS color value
 * @param {number} zoom - Current zoom level
 * @returns {string} CSS outline property value
 */
function createOutline(width, color, zoom) {
  return `${width / zoom}px solid ${color}`;
}

/**
 * Determines the outline style for a block based on its current state
 * Having small borders, i.e. 1px, can cause rendering glitches to occur when CSS transform translations are applied such as zooming out
 * Scale outline thickness inversely with zoom to maintain consistent visual appearance
 * @param {State} state - Application state
 * @param {number} blockId - Application state
 * @returns {string|null} CSS outline property value
 */
function getBlockOutline(state, blockId) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return null;
  const selectedBlocks = getSelectedBlocks(state);
  const isMultiSelect = selectedBlocks.length > 1;
  const isHovering = currentPage.hoveringId === blockId;
  const isResizing = currentPage.resizing?.id === blockId;
  const isPreviewSelected = isPendingSelected(state, blockId);

  if (isMultiSelect) {
    return null; // No outline for multi-select
  }

  // if (isSelected) {
  //   return createOutline(
  //     OUTLINE_WIDTHS.THICK,
  //     OUTLINE_COLORS.SELECTED,
  //     currentPage.zoom,
  //   );
  // }

  if (isPreviewSelected) {
    return createOutline(
      OUTLINE_WIDTHS.MEDIUM,
      OUTLINE_COLORS.PREVIEW_SELECTED,
      currentPage.zoom,
    );
  }

  if (isHovering || isResizing) {
    return createOutline(
      OUTLINE_WIDTHS.THIN,
      OUTLINE_COLORS.HOVERING,
      currentPage.zoom,
    );
  }

  return null; // Default: no outline
}

// -----------------------------
// ## Components
// -----------------------------

/**
 * Sends a block to the front (highest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to bring to front
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
export function sendToFront(currentState, blockId) {
  const blocks = getCurrentBlocks(currentState);
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the highest z-index among all blocks
  const maxZIndex = Math.max(...blocks.map((b) => b.zIndex));

  const newState = {
    ...updateCurrentPage(currentState, {
      blocks: blocks.map((b) =>
        b.id === blockId ? { ...b, zIndex: maxZIndex + 1 } : b,
      ),
    }),
  };

  return saveMementoAndReturn(currentState, newState);
}

/**
 * Sends a block to the back (lowest z-index)
 * @param {State} currentState - Current application state
 * @param {number} blockId - ID of block to send to back
 * @returns {import("hyperapp").Dispatchable<State>} Updated state
 */
export function sendToBack(currentState, blockId) {
  const blocks = getCurrentBlocks(currentState);
  const block = blocks.find((b) => b.id === blockId);
  if (!block) return currentState;

  // Find the lowest z-index among all blocks
  const minZIndex = Math.min(...blocks.map((b) => b.zIndex));

  const newState = {
    ...updateCurrentPage(currentState, {
      blocks: blocks.map((b) =>
        b.id === blockId ? { ...b, zIndex: minZIndex - 1 } : b,
      ),
    }),
  };

  return saveMementoAndReturn(currentState, newState);
}

/**
 * Adds a new block to the state and renders its program
 * @param {State} state - Current application state
 * @param {BlockType} type
 * @param {any} config
 * @param {number} x - X position on canvas
 * @param {number} y - Y position on canvas
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {{state: State, newBlockId: number}} Updated state with new block
 */
export function addBlock(state, type, config, x, y, width, height) {
  const currentBlocks = getCurrentBlocks(state);
  const currentPage = getCurrentPage(state);
  if (!currentPage) {
    throw Error("no current page");
  }
  const defaultConfig = (() => {
    switch (type) {
      case "webview":
        return DEFAULT_WEBVIEW_BLOCK_CONFIG;
      case "text":
        return DEFAULT_TEXT_BLOCK_CONFIG;
      default:
        return {};
    }
  })();

  /** @type {Block} */
  const newBlock = {
    ...defaultConfig,
    ...config,
    id: currentPage.idCounter,
    width: width,
    height: height,
    x: x,
    y: y,
    zIndex: Math.max(...currentBlocks.map((block) => block.zIndex), 0) + 1,
    type,
  };

  // manual overrides
  // i.e. when copying and pasting a block config we want some fields to always be set a certain value
  if (newBlock.type === "webview") {
    newBlock.domReady = false;
  }

  const newState = updateCurrentPage(state, {
    blocks: [...currentBlocks, newBlock],
    idCounter: currentPage.idCounter + 1,
  });

  return {
    state: saveMementoAndReturn(state, newState),
    newBlockId: newBlock.id,
  };
}

/**
 * @param {State} state
 * @param {Partial<BlockConfig<WebviewBlock>>} config
 * @param {number} x - X position on canvas
 * @param {number} y - Y position on canvas
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {{state: State, newBlockId: number}} Updated state and new block id
 */
export function addWebviewBlock(state, config, x, y, width, height) {
  return addBlock(state, "webview", config, x, y, width, height);
}

/**
 * @param {State} state
 * @param {Partial<BlockConfig<TextBlock>>} config
 * @param {number} x - X position on canvas
 * @param {number} y - Y position on canvas
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {{state: State, newBlockId: number}} Updated state and new block id
 */
export function addTextBlock(state, config, x, y, width, height) {
  return addBlock(state, "text", config, x, y, width, height);
}

/**
 * @param {State} state
 * @param {Partial<BlockConfig<ImageBlock>>} config
 * @param {number} x - X position on canvas
 * @param {number} y - Y position on canvas
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {{state: State, newBlockId: number}} Updated state and new block id
 */
export function addImageBlock(state, config, x, y, width, height) {
  return addBlock(state, "image", config, x, y, width, height);
}

/**
 * Adds a new block to the state and renders its program
 * @param {State} state - Current application state
 * @param {string} src - Name of view to instantiate
 * @param {boolean} isPreview - Name of view to instantiate
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {State} Updated state with new block
 **/
export function addBlockToViewportCenter(
  state,
  src,
  isPreview,
  width = DEFAULT_BLOCK_WIDTH,
  height = DEFAULT_BLOCK_HEIGHT,
) {
  const viewportCenter = getViewportCenterCoordinates(state);
  const x = viewportCenter.x - width / 2; // Center the block
  const y = viewportCenter.y - height / 2; // Center the block

  return addWebviewBlock(
    state,
    { initialSrc: src, isPreview },
    x,
    y,
    width,
    height,
  ).state;
}

/**
 * Add a preview block adjacent to the original block
 * @param {State} state
 * @param {number} parentBlockId
 * @param {string} src
 * @param {boolean} isPreview
 * @return {State}
 */
export function addChildBlock(state, parentBlockId, src, isPreview) {
  const parentBlock = getCurrentBlocks(state).find(
    (b) => b.id === parentBlockId,
  );
  if (!parentBlock || parentBlock.type !== "webview") {
    throw Error(`no parent block found of id ${parentBlockId}`);
  }
  const offsetX = 150;
  const newX = parentBlock.x + parentBlock.width + offsetX;
  const newY = parentBlock.y;

  let { state: newState, newBlockId: childBlockId } = addWebviewBlock(
    state,
    {
      initialSrc: src,
      isPreview,
    },
    newX,
    newY,
    DEFAULT_BLOCK_WIDTH,
    DEFAULT_BLOCK_HEIGHT,
  );
  newState = addLink(newState, parentBlockId, childBlockId);

  //TODO: fix kinda broken
  if (isPreview) {
    newState = updateBlock(newState, parentBlock.id, {
      previewChildId: childBlockId,
    });
  } else {
    newState = updateBlock(newState, parentBlock.id, {
      realChildrenIds: [...parentBlock.realChildrenIds, childBlockId],
    });
  }
  return newState;
}

/**
 * Pastes blocks from clipboard into the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with pasted blocks
 */
export function pasteClipboardBlocks(state) {
  const clipboardData = state.clipboard;
  if (clipboardData === null) {
    return state;
  }

  /** @type {Block[]} */
  const blockConfigs = clipboardData.map((blockData) => ({
    ...blockData,
    x: blockData.x + PASTE_OFFSET_X,
    y: blockData.y + PASTE_OFFSET_Y,
  }));

  const { stateWithNewBlocks, newBlockIds } = (() => {
    let stateWithNewBlocks = state;
    const newBlockIds = [];

    // Add each block sequentially
    for (const blockConfig of blockConfigs) {
      // NOTE: this is kinda jank
      const addBlockRes = addBlock(
        stateWithNewBlocks,
        blockConfig.type,
        blockConfig,
        blockConfig.x,
        blockConfig.y,
        blockConfig.width,
        blockConfig.height,
      );
      stateWithNewBlocks = addBlockRes.state;
      newBlockIds.push(addBlockRes.newBlockId);
    }

    return {
      stateWithNewBlocks,
      newBlockIds,
    };
  })();

  // Select all pasted blocks
  return updateCurrentPage(stateWithNewBlocks, {
    selectedIds: newBlockIds,
  });
}

/**
 * Copies the selected blocks to application clipboard
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state with clipboard data
 */
export function copySelectedBlocks(state) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length === 0) return state;

  // Create copies of the block data for clipboard, capturing current state
  /** @type {Block[]} */
  const blocksData = selectedBlocks
    .sort((a, b) => a.zIndex - b.zIndex)
    .map((block) => {
      if (block.type === "webview") {
        return {
          ...block,
          id: -1, // not a "real" block
          initialSrc: block.currentSrc,
        };
      }
      return {
        ...block,
        id: -1, // not a "real" block
      };
    });

  return [
    {
      ...state,
      clipboard: blocksData,
    },
    clearUserClipboardEffect,
  ];
}

/**
 * @param {State} state
 * @param {number} blockId
 * @param {Partial<Block>} newBlockConfig
 */
export function updateBlock(state, blockId, newBlockConfig) {
  if (newBlockConfig.id !== undefined) {
    throw Error("Illegal: cannot update block ID");
  }
  const currentBlocks = getCurrentBlocks(state);

  return updateCurrentPage(state, {
    //@ts-ignore: this is weird because the union types combind with partial cause unintended types to be returned
    blocks: currentBlocks.map((block) =>
      block.id === blockId ? { ...block, ...newBlockConfig } : block,
    ),
  });
}
