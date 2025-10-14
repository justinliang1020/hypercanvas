import { h } from "hyperapp";
import {
  PASTE_OFFSET_X,
  PASTE_OFFSET_Y,
  OUTLINE_COLORS,
  OUTLINE_WIDTHS,
  BLOCK_CONTENTS_CLASS_NAME,
  DEFAULT_BLOCK_WIDTH,
  DEFAULT_BLOCK_HEIGHT,
} from "./constants.js";
import { saveMementoAndReturn } from "./memento.js";
import { RESIZE_HANDLERS, ResizeHandle } from "./resize.js";
import { getViewportCenterCoordinates } from "./viewport.js";
import { clearUserClipboardEffect } from "./utils.js";
import {
  getCurrentBlocks,
  updateCurrentPage,
  getCurrentPage,
} from "./pages.js";
import {
  isBlockSelected,
  isBlockPreviewSelected,
  selectBlock,
  getFirstSelectedBlockId,
  getSelectedBlocks,
  toggleBlockSelection,
} from "./selection.js";

/**
 * Creates a block component renderer
 * @param {State} state - Current application state
 * @returns {(block: Block) => import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function block(state) {
  return (block) => {
    const currentPage = getCurrentPage(state);
    if (!currentPage) return h("div", {});

    const isSelected = isBlockSelected(state, block.id);
    const isPreviewSelected = isBlockPreviewSelected(state, block.id);
    const selectedBlocks = getSelectedBlocks(state);
    const isMultiSelect = selectedBlocks.length > 1;
    const isEditing = currentPage.editingId === block.id;
    const isHovering = currentPage.hoveringId === block.id;
    const isInteractMode = state.isInteractMode;

    // Having small borders, i.e. 1px, can cause rendering glitches to occur when CSS transform translations are applied such as zooming out
    // Scale outline thickness inversely with zoom to maintain consistent visual appearance
    const outline = getBlockOutline(
      {
        isHovering,
        isEditing,
        isMultiSelect,
        isSelected,
        isPreviewSelected,
        isInteractMode,
      },
      state,
    );

    /**
     * @param {State} state
     * @param {PointerEvent} event
     * @returns {import("hyperapp").Dispatchable<State>}
     */
    function onpointerover(state, event) {
      event.stopPropagation();
      const currentPage = getCurrentPage(state);
      if (!currentPage) return state;

      if (
        getFirstSelectedBlockId(state) !== null &&
        getFirstSelectedBlockId(state) !== block.id &&
        currentPage.dragStart !== null
      )
        return state;

      // Don't change cursor if we're over a resize handle
      const target = /** @type {HTMLElement} */ (event.target);
      if (target.classList.contains("resize-handle")) {
        return updateCurrentPage(state, {
          hoveringId: block.id,
        });
      }

      // Set cursor based on current mode
      let cursorStyle;
      if (isMultiSelect) {
        cursorStyle = "default";
      } else if (currentPage.editingId === block.id || state.isInteractMode) {
        // In edit mode, use default cursor
        cursorStyle = "default";
      } else {
        // Normal mode, use move cursor
        cursorStyle = "move";
      }

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
      const currentPage = getCurrentPage(state);
      if (!currentPage) return state;
      if (isMultiSelect) return state;

      event.stopPropagation();

      // If block is in edit mode, don't start dragging
      if (currentPage.editingId === block.id || state.isInteractMode) {
        return state;
      }

      // Handle shift-click for multi-select
      if (event.shiftKey) {
        return toggleBlockSelection(state, block.id);
      }

      // Normal selection and drag start
      const selectedState = selectBlock(state, block.id);
      return updateCurrentPage(selectedState, {
        dragStart: {
          id: block.id,
          startX: block.x,
          startY: block.y,
        },
      });
    }

    /**
     * @param {State} state
     * @param {MouseEvent} event
     * @returns {import("hyperapp").Dispatchable<State>}
     */
    function ondblclick(state, event) {
      event.stopPropagation();

      const currentPage = getCurrentPage(state);
      if (!currentPage) return state;
      if (state.isInteractMode || currentPage.isTextEditorFocused) {
        return state;
      }

      // Double-click enters edit mode
      const selectedState = selectBlock(state, block.id);
      return updateCurrentPage(selectedState, {
        editingId: block.id,
        dragStart: null,
      });
    }

    return h(
      "div",
      {
        // Key ensures Hyperapp's virtual DOM can properly track each block element during list updates,
        // preventing DOM node reuse bugs when blocks are deleted (fixes positioning issues)
        key: `block-${block.id}`,
        "data-id": block.id,
        style: {
          outline: outline,
          transform: `translate(${block.x}px, ${block.y}px)`,
          width: `${block.width}px`,
          height: `${block.height}px`,
          zIndex: `${block.zIndex}`,
        },
        class: { block: true },
        onpointerover,
        onpointerleave,
        onpointerdown,
        ondblclick,
      },
      [
        hyperIframe(state, block),
        ...(isSelected && !isEditing && !isMultiSelect
          ? Object.keys(RESIZE_HANDLERS).map((handle) =>
              ResizeHandle({
                handle: /** @type{ResizeString} */ (handle),
                zoom: currentPage.zoom,
                context: "block",
              }),
            )
          : []),
      ],
    );
  };
}

/**
 * @param {Link} link
 * @return {import("hyperapp").ElementVNode<State>}
 */
export function linkView(link) {
  const parentCenterX = link.parentBlock.x + link.parentBlock.width / 2;
  const parentCenterY = link.parentBlock.y + link.parentBlock.height / 2;
  const childCenterX = link.childBlock.x + link.childBlock.width / 2;
  const childCenterY = link.childBlock.y + link.childBlock.height / 2;

  const dx = childCenterX - parentCenterX;
  const dy = childCenterY - parentCenterY;
  const distance = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  return h("div", {
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
    key: `${link.parentBlock.id}-${link.childBlock.id}`,
  });
}

/**
 * @param {State} state
 * @param {Block} block
 * @return {import("hyperapp").ElementVNode<State>}
 */
function hyperIframe(state, block) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return h("div", {});
  const isEditing = currentPage.editingId === block.id;

  /**
   * @param {State} state
   * @returns {import("hyperapp").Dispatchable<State>}
   */
  function onload(state) {
    /**
     * @param {HTMLIFrameElement} el
     * TODO: figure out a better hack than this to fix global events not firing after an iframe gets focus
     */
    function propogateEventListeners(el) {
      if (!el || !el.contentWindow) return;
      // Inject key event listeners to forward to parent window
      el.contentWindow.document.addEventListener("keydown", (event) => {
        window.dispatchEvent(
          new KeyboardEvent("keydown", {
            key: event.key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            bubbles: true,
          }),
        );
      });

      el.contentWindow.document.addEventListener("keyup", (event) => {
        window.dispatchEvent(
          new KeyboardEvent("keyup", {
            key: event.key,
            code: event.code,
            ctrlKey: event.ctrlKey,
            metaKey: event.metaKey,
            shiftKey: event.shiftKey,
            altKey: event.altKey,
            bubbles: true,
          }),
        );
      });
    }

    /**
     * @param {import("hyperapp").Dispatch<State>} dispatch - Function to dispatch actions
     * @returns {void}
     */
    function injectATags(dispatch) {
      // TODO: fix typing
      // @ts-ignore
      const /** @type {HTMLIFrameElement}  */ el = document.getElementById(
          `block-${block.id}`,
        );
      if (!el || !el.contentWindow) return;
      //BUG: gracefully handle cross-origin sites which cannot access the element.contentWindow.document property

      propogateEventListeners(el);

      const aEls = el.contentWindow.document.getElementsByTagName("a");
      [...aEls].forEach((aEl) => {
        aEl.onpointerover = (event) => {
          const href = aEl.getAttribute("href");
          if (!href) {
            return;
          }
          dispatch((state) => {
            let newState = state;
            newState = removePreviewChildBlock(newState, block.id);
            newState = addChildBlock(newState, block.id, href, "preview");
            return newState;
          });
        };
        aEl.onclick = (event) => {
          event.preventDefault();
          const href = aEl.getAttribute("href");
          if (!href) {
            return;
          }
          dispatch((state) => {
            let newState = state;
            newState = removePreviewChildBlock(newState, block.id);
            newState = addChildBlock(newState, block.id, href, "real");
            return newState;
          });
        };
      });
    }

    return [state, (dispatch) => injectATags(dispatch)];
  }

  const src = block.content.startsWith("https://")
    ? block.content
    : `${state.userPath}/${block.content}`;

  /** @type {import("hyperapp").StyleProp} */
  const previewStyles = {
    opacity: "0.6",
    pointerEvents: "none",
    outline: "2px dashed grey",
  };

  return h("iframe", {
    style: {
      pointerEvents: isEditing || state.isInteractMode ? null : "none",
      width: "100%",
      height: "100%",
      overflow: "hidden",
      border: "none",
      ...(block.type === "preview" ? previewStyles : {}),
    },
    class: BLOCK_CONTENTS_CLASS_NAME,
    src,
    id: `block-${block.id}`,
    key: `${block.id}-${src}`,
    onload,
  });
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
 * @param {{isHovering: boolean, isEditing: boolean, isMultiSelect: boolean, isSelected: boolean, isPreviewSelected: boolean, isInteractMode: boolean}} blockState - Block state flags
 * @param {State} state - Application state
 * @returns {string|null} CSS outline property value
 */
function getBlockOutline(blockState, state) {
  const {
    isHovering,
    isEditing,
    isMultiSelect,
    isSelected,
    isPreviewSelected,
    isInteractMode,
  } = blockState;

  const currentPage = getCurrentPage(state);
  if (!currentPage) return null;

  if (isInteractMode) {
    return createOutline(
      OUTLINE_WIDTHS.THICK,
      OUTLINE_COLORS.INTERACT_MODE,
      currentPage.zoom,
    );
  }

  if (isEditing) {
    return createOutline(
      OUTLINE_WIDTHS.THICK,
      OUTLINE_COLORS.EDITING,
      currentPage.zoom,
    );
  }

  if (isMultiSelect) {
    return ""; // No outline for multi-select
  }

  if (isSelected) {
    return createOutline(
      OUTLINE_WIDTHS.THICK,
      OUTLINE_COLORS.SELECTED,
      currentPage.zoom,
    );
  }

  if (isPreviewSelected) {
    return createOutline(
      OUTLINE_WIDTHS.MEDIUM,
      OUTLINE_COLORS.PREVIEW_SELECTED,
      currentPage.zoom,
    );
  }

  if (isHovering) {
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
 * Deletes a block from the state
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Updated state without the block
 */
export function deleteSelectedBlocks(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const newState = updateCurrentPage(state, {
    blocks: currentPage.blocks.filter(
      (block) => !currentPage.selectedIds.includes(block.id),
    ),
    selectedIds: [],
  });

  return saveMementoAndReturn(state, newState);
}

/**
 * Adds a new block to the state and renders its program
 * @param {State} state - Current application state
 * @param {string} content - Name of view to instantiate
 * @param {BlockType} type - Name of view to instantiate
 * @param {number} x - X position on canvas. If null, uses viewport's center X coordinate
 * @param {number} y - Y position on canvas. If null, uses viewport's center X coordinate
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {{state: State, newBlockId: number}} Updated state with new block
 */
export function addBlock(state, content, type, x, y, width, height) {
  const currentBlocks = getCurrentBlocks(state);
  const currentPage = getCurrentPage(state);
  if (!currentPage) {
    throw Error("no current page");
  }

  /** @type {Block} */
  const newBlock = {
    id: currentPage.blockIdCounter,
    width: width,
    height: height,
    x: x,
    y: y,
    type: type,
    zIndex: Math.max(...currentBlocks.map((block) => block.zIndex), 0) + 1,
    content: content,
    previewChildId: null,
    realChildrenIds: [],
  };
  const newState = updateCurrentPage(state, {
    blocks: [...currentBlocks, newBlock],
    blockIdCounter: currentPage.blockIdCounter + 1,
  });

  // const selectedState = selectBlock(newState, newBlock.id);

  return {
    state: saveMementoAndReturn(state, newState),
    newBlockId: newBlock.id,
  };
}

/**
 * Adds a new block to the state and renders its program
 * @param {State} state - Current application state
 * @param {string} content - Name of view to instantiate
 * @param {BlockType} type - Name of view to instantiate
 * @param {number} width - Block width in pixels
 * @param {number} height - Block height in pixels
 * @returns {State} Updated state with new block
 **/
export function addBlockToViewportCenter(
  state,
  content,
  type,
  width = DEFAULT_BLOCK_WIDTH,
  height = DEFAULT_BLOCK_HEIGHT,
) {
  const viewportCenter = getViewportCenterCoordinates(state);
  const x = viewportCenter.x - width / 2; // Center the block
  const y = viewportCenter.y - height / 2; // Center the block

  return addBlock(state, content, type, x, y, width, height).state;
}

/**
 * Add a preview block adjacent to the original block
 * @param {State} state
 * @param {number} parentBlockId
 * @param {string} content
 * @param {BlockType} type
 * @return {State}
 */
function addChildBlock(state, parentBlockId, content, type) {
  const parentBlock = getCurrentBlocks(state).find(
    (b) => b.id === parentBlockId,
  );
  if (!parentBlock) {
    throw Error(`no parent block found of id ${parentBlockId}`);
  }
  const offsetX = 300;
  const newX = parentBlock.x + parentBlock.width + offsetX;
  const newY = parentBlock.y;

  let { state: newState, newBlockId } = addBlock(
    state,
    content,
    type,
    newX,
    newY,
    DEFAULT_BLOCK_WIDTH,
    DEFAULT_BLOCK_HEIGHT,
  );

  //TODO: fix kinda broken
  if (type === "preview") {
    newState = updateBlock(newState, parentBlock, {
      previewChildId: newBlockId,
    });
  } else if (type === "real") {
    console.log([...parentBlock.realChildrenIds, newBlockId]);
    newState = updateBlock(newState, parentBlock, {
      realChildrenIds: [...parentBlock.realChildrenIds, newBlockId],
    });
  }
  return newState;
}

/**
 * Add a preview block adjacent to the original block
 * @param {State} state
 * @param {number} parentBlockId
 * @return {State}
 */
function removePreviewChildBlock(state, parentBlockId) {
  const parentBlock = getCurrentBlocks(state).find(
    (b) => b.id === parentBlockId,
  );
  if (!parentBlock) return state;
  const currentBlocks = getCurrentBlocks(state);
  const newBlocks = currentBlocks
    .filter((block) => block.id !== parentBlock.previewChildId)
    .map((block) =>
      block.id === parentBlock.id ? { ...block, previewChildId: null } : block,
    );

  return updateCurrentPage(state, { blocks: newBlocks });
}

/**
 * Adds multiple blocks to the state
 * @param {State} state - Current application state
 * @param {BlockConfig[]} blockConfigs - Array of block configurations
 * @returns {{state: State, blockIds: number[]}} Updated state with new blocks and array of new block IDs
 */
function addBlocks(state, blockConfigs) {
  if (!Array.isArray(blockConfigs) || blockConfigs.length === 0) {
    return { state, blockIds: [] };
  }

  let currentState = state;
  const newBlockIds = [];

  // Add each block sequentially
  for (const config of blockConfigs) {
    const { content, x, y, width, height, type } = config;

    currentState = addBlock(
      currentState,
      content,
      type,
      x,
      y,
      width,
      height,
    ).state;

    // Get the ID of the newly added block
    const currentBlocks = getCurrentBlocks(currentState);
    const lastBlock = currentBlocks[currentBlocks.length - 1];
    if (lastBlock) {
      newBlockIds.push(lastBlock.id);
    }
  }

  return { state: currentState, blockIds: newBlockIds };
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

  /** @type {BlockConfig[]} */
  const blockConfigs = clipboardData.map((blockData) => ({
    x: blockData.x + PASTE_OFFSET_X,
    y: blockData.y + PASTE_OFFSET_Y,
    width: blockData.width,
    height: blockData.height,
    content: blockData.content,
    type: blockData.type,
    //BUG: fix, actually implement this
    previewChildId: 0,
    realChildrenIds: [],
  }));

  const { state: newState, blockIds } = addBlocks(state, blockConfigs);

  // Select all pasted blocks
  if (blockIds.length > 0) {
    return updateCurrentPage(newState, {
      selectedIds: blockIds,
    });
  }

  return newState;
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
    .map((block) => ({
      ...block,
      id: -1, // not a "real" block
    }));

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
 * @param {Block} currentBlock
 * @param {Partial<Block>} newBlockConfig
 */
function updateBlock(state, currentBlock, newBlockConfig) {
  if (newBlockConfig.id !== undefined) {
    throw Error("Illegal: cannot update block ID");
  }
  const currentBlocks = getCurrentBlocks(state);

  return updateCurrentPage(state, {
    blocks: currentBlocks.map((block) =>
      block.id === currentBlock.id ? { ...block, ...newBlockConfig } : block,
    ),
  });
}
