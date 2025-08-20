import { h } from "./packages/hyperapp/index.js";
import { pasteEffect } from "./utils.js";
import { saveApplicationAndNotify } from "./utils.js";
import { copySelectedBlocks, deleteSelectedBlocks, block } from "./block.js";
import { connectionLine } from "./connection.js";
import { handleResizePointerMove } from "./resize.js";
import { saveMementoAndReturn, redoState, undoState } from "./memento.js";
import {
  getCurrentPage,
  getCurrentBlocks,
  getCurrentConnections,
  getCurrentViewport,
  updateCurrentPage,
} from "./pages.js";
import {
  calculatePreviewSelection,
  deselectAllBlocks,
  getSelectedBlockId,
  getSelectedBlockIds,
  getSelectedBlocks,
  handleSelectionBoxComplete,
  hasSelection,
  isPointInSelectionBounds,
  selectionBoundingBox,
  selectionBoxComponent,
} from "./selection.js";

/**
 * Calculates canvas coordinates from screen coordinates
 * @param {PointerEvent} event - Pointer event
 * @param {State} state - Application state
 * @returns {{canvasX: number, canvasY: number}} Canvas coordinates
 */
function getCanvasCoordinates(event, state) {
  const canvasRect = /** @type {HTMLElement} */ (
    document.getElementById("canvas")
  ).getBoundingClientRect();
  const viewport = getCurrentViewport(state);
  const canvasX = (event.clientX - canvasRect.left) / viewport.zoom;
  const canvasY = (event.clientY - canvasRect.top) / viewport.zoom;
  return { canvasX, canvasY };
}

/**
 * Handles middle mouse button down for viewport dragging
 * @param {State} state - Application state
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleMiddleMouseDown(state) {
  const deselectedState = deselectAllBlocks(state);
  return updateCurrentPage(deselectedState, {
    isViewportDragging: true,
    cursorStyle: "grabbing",
  });
}

/**
 * Handles drag start for selected blocks
 * @param {State} state - Application state
 * @param {number} canvasX - Canvas X coordinate
 * @param {number} canvasY - Canvas Y coordinate
 * @param {boolean} isShiftKey - Whether shift key is pressed
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleDragStart(state, canvasX, canvasY, isShiftKey) {
  const isInSelectionBounds = isPointInSelectionBounds(state, canvasX, canvasY);

  if (isInSelectionBounds && !isShiftKey) {
    const selectedBlocks = getSelectedBlocks(state);
    if (selectedBlocks.length > 0) {
      const referenceBlock = selectedBlocks[0];
      return updateCurrentPage(state, {
        dragStart: {
          id: referenceBlock.id,
          startX: referenceBlock.x,
          startY: referenceBlock.y,
        },
      });
    }
  }

  return state;
}

/**
 * Handles selection box start
 * @param {State} state - Application state
 * @param {number} canvasX - Canvas X coordinate
 * @param {number} canvasY - Canvas Y coordinate
 * @param {boolean} isShiftKey - Whether shift key is pressed
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleSelectionBoxStart(state, canvasX, canvasY, isShiftKey) {
  return updateCurrentPage(state, {
    selectionBox: {
      startX: canvasX,
      startY: canvasY,
      currentX: canvasX,
      currentY: canvasY,
    },
    selectedIds: isShiftKey ? getCurrentPage(state)?.selectedIds || [] : [],
    previewSelectedIds: [],
    editingId: null,
  });
}

/**
 * @param {State} state
 * @param {PointerEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onpointerdown(state, event) {
  if (event.button === 1) {
    return handleMiddleMouseDown(state);
  }

  const { canvasX, canvasY } = getCanvasCoordinates(event, state);

  const isInSelectionBounds = isPointInSelectionBounds(state, canvasX, canvasY);

  // If clicking within selection bounds and not shift-clicking, start drag
  if (isInSelectionBounds && !event.shiftKey) {
    const dragResult = handleDragStart(state, canvasX, canvasY, event.shiftKey);
    if (dragResult !== state) {
      return dragResult;
    }
  }

  // Left click on empty space - start selection box dragging
  if (event.button === 0) {
    return handleSelectionBoxStart(state, canvasX, canvasY, event.shiftKey);
  }

  return state;
}

/**
 * Handles block dragging movement
 * @param {State} state - Application state
 * @param {number} dx - X delta movement
 * @param {number} dy - Y delta movement
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleBlockDrag(state, dx, dy) {
  const viewport = getCurrentViewport(state);
  const adjustedDx = dx / viewport.zoom;
  const adjustedDy = dy / viewport.zoom;

  const blocks = getCurrentBlocks(state);
  const selectedBlockIds = getSelectedBlockIds(state);

  return updateCurrentPage(state, {
    blocks: blocks.map((block) => {
      if (selectedBlockIds.includes(block.id)) {
        return {
          ...block,
          x: block.x + adjustedDx,
          y: block.y + adjustedDy,
        };
      }
      return block;
    }),
  });
}

/**
 * Handles viewport dragging movement
 * @param {State} state - Application state
 * @param {number} dx - X delta movement
 * @param {number} dy - Y delta movement
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleViewportDrag(state, dx, dy) {
  const viewport = getCurrentViewport(state);
  return updateCurrentPage(state, {
    offsetX: viewport.offsetX + dx,
    offsetY: viewport.offsetY + dy,
  });
}

/**
 * Handles selection box movement
 * @param {State} state - Application state
 * @param {PointerEvent} event - Pointer event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleSelectionBoxMove(state, event) {
  const currentPage = getCurrentPage(state);
  if (!currentPage?.selectionBox) return state;

  const { canvasX, canvasY } = getCanvasCoordinates(event, state);

  const updatedSelectionBox = {
    ...currentPage.selectionBox,
    currentX: canvasX,
    currentY: canvasY,
  };

  const previewSelectedIds = calculatePreviewSelection(
    state,
    updatedSelectionBox,
  );

  return updateCurrentPage(state, {
    selectionBox: updatedSelectionBox,
    previewSelectedIds,
  });
}

/**
 * @param {State} state
 * @param {PointerEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onpointermove(state, event) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  const dx = event.clientX - currentPage.mouseX;
  const dy = event.clientY - currentPage.mouseY;

  state = updateCurrentPage(state, {
    mouseX: event.clientX,
    mouseY: event.clientY,
  });

  if (currentPage.resizing) {
    return handleResizePointerMove(state, event);
  }

  if (currentPage.dragStart && currentPage.editingId === null) {
    return handleBlockDrag(state, dx, dy);
  }

  if (currentPage.isViewportDragging) {
    return handleViewportDrag(state, dx, dy);
  }

  if (currentPage.selectionBox) {
    return handleSelectionBoxMove(state, event);
  }

  return state;
}
/**
 * Handles completion of drag operation with memento saving
 * @param {State} state - Application state
 * @param {State} newState - New state after drag completion
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleDragCompletion(state, newState) {
  const currentPage = getCurrentPage(state);
  if (!currentPage?.dragStart) return newState;

  const blocks = getCurrentBlocks(state);
  const selectedBlockIds = getSelectedBlockIds(state);
  const draggedBlock = blocks.find((b) => b.id === currentPage.dragStart?.id);

  const hasAnyBlockMoved = selectedBlockIds.some((blockId) => {
    const block = blocks.find((b) => b.id === blockId);
    if (!block || !currentPage.dragStart) return false;

    if (blockId === currentPage.dragStart.id) {
      return (
        block.x !== currentPage.dragStart.startX ||
        block.y !== currentPage.dragStart.startY
      );
    }

    const dragDeltaX =
      (currentPage.dragStart.startX || 0) - (draggedBlock?.x || 0);
    const dragDeltaY =
      (currentPage.dragStart.startY || 0) - (draggedBlock?.y || 0);
    const originalX = block.x + dragDeltaX;
    const originalY = block.y + dragDeltaY;

    return (
      Math.abs(block.x - originalX) > 0.1 || Math.abs(block.y - originalY) > 0.1
    );
  });

  if (hasAnyBlockMoved && draggedBlock && currentPage.dragStart) {
    const dragDeltaX =
      (draggedBlock.x || 0) - (currentPage.dragStart.startX || 0);
    const dragDeltaY =
      (draggedBlock.y || 0) - (currentPage.dragStart.startY || 0);

    const beforeDragState = updateCurrentPage(state, {
      blocks: blocks.map((b) => {
        if (selectedBlockIds.includes(b.id)) {
          return { ...b, x: b.x - dragDeltaX, y: b.y - dragDeltaY };
        }
        return b;
      }),
    });
    return saveMementoAndReturn(beforeDragState, newState);
  }

  return newState;
}

/**
 * Handles completion of resize operation with memento saving
 * @param {State} state - Application state
 * @param {State} newState - New state after resize completion
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function handleResizeCompletion(state, newState) {
  const currentPage = getCurrentPage(state);
  if (!currentPage?.resizing) return newState;

  const blocks = getCurrentBlocks(state);

  if (currentPage.resizing.id === "selection-bounding-box") {
    const originalBlocks = currentPage.resizing.originalBlocks;
    if (!originalBlocks) return newState;

    const hasAnyBlockChanged = originalBlocks.some((originalBlock) => {
      const currentBlock = blocks.find((b) => b.id === originalBlock.id);
      return (
        currentBlock &&
        (Math.abs(currentBlock.x - originalBlock.x) > 0.1 ||
          Math.abs(currentBlock.y - originalBlock.y) > 0.1 ||
          Math.abs(currentBlock.width - originalBlock.width) > 0.1 ||
          Math.abs(currentBlock.height - originalBlock.height) > 0.1)
      );
    });

    if (hasAnyBlockChanged) {
      const beforeResizeState = updateCurrentPage(state, {
        blocks: blocks.map((b) => {
          const originalBlock = originalBlocks.find((orig) => orig.id === b.id);
          return originalBlock
            ? {
                ...b,
                x: originalBlock.x,
                y: originalBlock.y,
                width: originalBlock.width,
                height: originalBlock.height,
              }
            : b;
        }),
      });
      return saveMementoAndReturn(beforeResizeState, newState);
    }
  } else {
    const resizedBlock = blocks.find((b) => b.id === currentPage.resizing?.id);
    if (
      resizedBlock &&
      currentPage.resizing &&
      (resizedBlock.width !== currentPage.resizing.startWidth ||
        resizedBlock.height !== currentPage.resizing.startHeight ||
        resizedBlock.x !== currentPage.resizing.startX ||
        resizedBlock.y !== currentPage.resizing.startY)
    ) {
      const beforeResizeState = updateCurrentPage(state, {
        blocks: blocks.map((b) =>
          b.id === resizedBlock.id
            ? {
                ...b,
                width: currentPage.resizing?.startWidth || 0,
                height: currentPage.resizing?.startHeight || 0,
                x: currentPage.resizing?.startX || 0,
                y: currentPage.resizing?.startY || 0,
              }
            : b,
        ),
      });
      return saveMementoAndReturn(beforeResizeState, newState);
    }
  }

  return newState;
}

/**
 * @param {State} state
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onpointerup(state) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  let newState = updateCurrentPage(state, {
    isViewportDragging: false,
    resizing: null,
    dragStart: null,
    cursorStyle: "default",
  });

  if (currentPage.selectionBox) {
    newState = handleSelectionBoxComplete(newState, currentPage.selectionBox);
    newState = updateCurrentPage(newState, { selectionBox: null });
  }

  if (currentPage.dragStart) {
    return handleDragCompletion(state, newState);
  }

  if (currentPage.resizing) {
    return handleResizeCompletion(state, newState);
  }

  return newState;
}

/**
 * @param {State} state
 * @param {WheelEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onwheel(state, event) {
  // Prevent default scrolling behavior
  event.preventDefault();

  // Check if this is a trackpad gesture (typically has smaller deltaY values and ctrlKey for zoom)
  const isTrackpad = Math.abs(event.deltaY) < 50 && !event.ctrlKey;
  const page = getCurrentPage(state);
  if (!page) return state;

  if (isTrackpad) {
    // Trackpad pan gesture - use deltaX and deltaY directly
    // Invert the delta values to match Figma-like behavior
    return updateCurrentPage(state, {
      offsetX: page.offsetX - event.deltaX,
      offsetY: page.offsetY - event.deltaY,
    });
  } else if (event.ctrlKey || event.metaKey) {
    // Zoom gesture (Ctrl/Cmd + scroll or trackpad pinch)
    const zoomDelta = -event.deltaY * 0.01;
    const newZoom = Math.max(0.1, Math.min(5, page.zoom + zoomDelta));

    // Get mouse position relative to viewport for zoom centering
    const rect = /** @type {HTMLElement} */ (
      event.currentTarget
    )?.getBoundingClientRect();
    const relativeMouseX = page.mouseX - rect.left;
    const relativeMouseY = page.mouseY - rect.top;

    // Calculate zoom offset to keep mouse position fixed
    const zoomRatio = newZoom / page.zoom;
    const newOffsetX =
      relativeMouseX - (relativeMouseX - page.offsetX) * zoomRatio;
    const newOffsetY =
      relativeMouseY - (relativeMouseY - page.offsetY) * zoomRatio;

    return updateCurrentPage(state, {
      zoom: newZoom,
      offsetX: newOffsetX,
      offsetY: newOffsetY,
    });
  }

  return state;
}
/**
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onkeydown(state, event) {
  const currentPage = getCurrentPage(state);
  if (!currentPage) return state;

  // Track shift key state
  if (event.key === "Shift") {
    return updateCurrentPage(state, {
      isShiftPressed: true,
    });
  }

  // Check if user is interacting with an input field or has text selected
  const hasTextSelection = (window.getSelection()?.toString() ?? "").length > 0;

  // Handle keyboard shortcuts
  switch (event.key) {
    case "Escape":
      // Exit connect mode, edit mode, or deselect
      if (currentPage.connectingId !== null) {
        event.preventDefault();
        return updateCurrentPage(state, {
          connectingId: null,
        });
      } else if (currentPage.editingId !== null) {
        event.preventDefault();
        return updateCurrentPage(state, {
          editingId: null,
        });
      } else if (hasSelection(state)) {
        event.preventDefault();
        return deselectAllBlocks(state);
      }
      return state;
    case "Delete":
    case "Backspace":
      // Only handle block deletion if not in input field, a block is selected, and not in edit mode
      const selectedBlockId = getSelectedBlockId(state);
      if (selectedBlockId !== null && currentPage.editingId === null) {
        event.preventDefault();
        return deleteSelectedBlocks(state);
      }
      // Let browser handle regular text deletion
      return state;

    case "c":
      // Handle copy shortcut (Ctrl+C or Cmd+C)
      if (event.ctrlKey || event.metaKey) {
        // Only handle block copy if not in input field, no text is selected, and not in edit mode
        if (
          !hasTextSelection &&
          hasSelection(state) &&
          currentPage.editingId === null
        ) {
          event.preventDefault();
          return copySelectedBlocks(state);
        } else {
          // Let browser handle regular text copy
          return {
            ...state,
            clipboard: null,
          };
        }
      }
      return state;

    case "v":
      // Handle paste shortcut (Ctrl+V or Cmd+V)
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
          event.preventDefault();
          return [state, [pasteEffect, state]];
        }
      }
      return state;

    case "z":
    case "Z":
      // Handle undo/redo shortcuts
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
          event.preventDefault();
          if (event.shiftKey) {
            // Ctrl+Shift+Z or Cmd+Shift+Z = Redo
            return redoState(state);
          } else {
            // Ctrl+Z or Cmd+Z = Undo
            return undoState(state);
          }
        }
      }
      return state;

    case "y":
      // Handle redo shortcut (Ctrl+Y or Cmd+Y)
      if (event.ctrlKey || event.metaKey) {
        if (currentPage.editingId === null) {
          event.preventDefault();
          return redoState(state);
        }
      }
      return state;

    case "s":
      // Handle save shortcut (Ctrl+S or Cmd+S)
      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        return [state, (dispatch) => saveApplicationAndNotify(dispatch, state)];
      }
      return state;
    default:
      return state;
  }
}

/**
 * @param {State} state
 * @param {KeyboardEvent} event
 * @returns {import("hyperapp").Dispatchable<State>}
 */
function onkeyup(state, event) {
  // Track shift key release
  if (event.key === "Shift") {
    return updateCurrentPage(state, {
      isShiftPressed: false,
    });
  }
  return state;
}

/**
 * @param {State} state
 * @returns {import("hyperapp").ElementVNode<State>}
 */
export function viewport(state) {
  return h(
    "div",
    {
      id: "viewport",
      class: {
        "panels-hidden": !state.panelsVisible,
      },
      style: {
        paddingRight: state.panelsVisible
          ? `${state.programsPanelWidth}px`
          : "0",
        touchAction: "none", // Prevent default touch behaviors
        outline: "none", // Remove focus oultine
      },
      tabindex: -1, // Make the main element focusable for keyboard events
      onpointerdown,
      onpointermove,
      onpointerup,
      onwheel,
      onkeydown,
      onkeyup,
    },
    [
      h(
        "div",
        {
          id: "canvas",
          style: {
            // `translateZ(0)` required to fix rendering glitch where small borders and zoomed out would create rendering artifacts
            // The problem occurs because browsers have difficulty rendering fractional pixels when scaling,
            transform: `translate(${getCurrentViewport(state).offsetX}px, ${getCurrentViewport(state).offsetY}px) scale(${getCurrentViewport(state).zoom}) translateZ(0)`,
          },
        },
        [
          // Render connection lines first (behind blocks)
          ...getCurrentConnections(state).map((connection) =>
            connectionLine(state, connection),
          ),
          // Then render blocks on top
          ...getCurrentBlocks(state).map(block(state)),
          // Render selection bounding box above blocks
          selectionBoundingBox(state),
          // Render selection box during drag
          selectionBoxComponent(state),
        ].filter(Boolean),
      ),
    ],
  );
}

/**
 * Calculates viewport-relative coordinates for placing new blocks
 * @param {State} state - Current application state
 * @returns {{x: number, y: number}} Coordinates in the center of the current viewport
 */
export function getViewportCenterCoordinates(state) {
  // Get viewport dimensions (assuming standard viewport, could be made more dynamic)
  const viewportWidth =
    window.innerWidth - (state.panelsVisible ? state.programsPanelWidth : 0);
  const viewportHeight = window.innerHeight;

  // Calculate center of viewport in screen coordinates
  const viewportCenterX = viewportWidth / 2;
  const viewportCenterY = viewportHeight / 2;

  // Convert to canvas coordinates by accounting for zoom and offset
  const viewport = getCurrentViewport(state);
  const canvasX = (viewportCenterX - viewport.offsetX) / viewport.zoom;
  const canvasY = (viewportCenterY - viewport.offsetY) / viewport.zoom;

  return { x: canvasX, y: canvasY };
}
