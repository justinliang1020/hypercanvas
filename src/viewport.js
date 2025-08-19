import { h } from "./packages/hyperapp/index.js";
import { pasteEffect } from "./utils.js";
import { saveApplicationAndNotify } from "./utils.js";
import { copySelectedBlocks, deleteSelectedBlocks, block } from "./block.js";
import { connectionLine } from "./connection.js";
import {
  RESIZE_HANDLERS,
  ResizeHandle,
  handleResizePointerMove,
} from "./resize.js";
import { saveMementoAndReturn, redoState, undoState } from "./memento.js";
import {
  getCurrentPage,
  getCurrentBlocks,
  getCurrentConnections,
  getCurrentViewport,
  updateCurrentPage,
} from "./pages.js";
import {
  deselectAllBlocks,
  getSelectedBlockId,
  getSelectedBlockIds,
  getSelectedBlocks,
  getSelectionBoundingBox,
  hasSelection,
} from "./selection.js";

/**
 * Checks if a point is within the selection bounding box
 * @param {State} state - Current application state
 * @param {number} canvasX - X coordinate in canvas space
 * @param {number} canvasY - Y coordinate in canvas space
 * @returns {boolean} True if point is within selection bounds
 */
function isPointInSelectionBounds(state, canvasX, canvasY) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length <= 1) return false;

  const boundingBox = getSelectionBoundingBox(state);
  if (!boundingBox) return false;

  return (
    canvasX >= boundingBox.x &&
    canvasX <= boundingBox.x + boundingBox.width &&
    canvasY >= boundingBox.y &&
    canvasY <= boundingBox.y + boundingBox.height
  );
}

/**
 * Creates the main viewport component for the canvas
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} Viewport element
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
      onpointerdown: (state, event) => {
        // Only start dragging on middle mouse button
        // Remove shift+click viewport dragging to allow shift+click block selection
        if (event.button === 1) {
          const deselectedState = deselectAllBlocks(state);
          return updateCurrentPage(deselectedState, {
            isViewportDragging: true,
            cursorStyle: "grabbing",
          });
        }

        // Calculate canvas coordinates for click position
        const canvasRect = /** @type {HTMLElement} */ (
          document.getElementById("canvas")
        ).getBoundingClientRect();
        const viewport = getCurrentViewport(state);
        const canvasX = (event.clientX - canvasRect.left) / viewport.zoom;
        const canvasY = (event.clientY - canvasRect.top) / viewport.zoom;

        // Check if click is within selection bounding box for multi-select
        const isInSelectionBounds = isPointInSelectionBounds(
          state,
          canvasX,
          canvasY,
        );

        // If clicking within selection bounds and not shift-clicking, start drag
        if (isInSelectionBounds && !event.shiftKey) {
          const selectedBlocks = getSelectedBlocks(state);
          if (selectedBlocks.length > 0) {
            // Use the first selected block as the drag reference
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

        // Regular click (not shift+click) - deselect blocks, exit edit mode, and exit connect mode
        // Allow shift+click to pass through to blocks for multi-select
        if (!event.shiftKey) {
          return deselectAllBlocks(state);
        }

        return state;
      },
      onpointermove: (state, event) => {
        const currentPage = getCurrentPage(state);
        if (!currentPage) return state;

        // Calculate deltas using previous mouse position
        const dx = event.clientX - currentPage.mouseX;
        const dy = event.clientY - currentPage.mouseY;

        // Update state with current mouse position for next calculation
        state = updateCurrentPage(state, {
          mouseX: event.clientX,
          mouseY: event.clientY,
        });

        if (currentPage.resizing) {
          // Handle resizing
          return handleResizePointerMove(state, event);
        } else if (currentPage.dragStart && currentPage.editingId === null) {
          // Only allow dragging if no block is in edit mode
          // Adjust drag delta by zoom level - when zoomed in, smaller movements should result in smaller position changes
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
              } else {
                return block;
              }
            }),
          });
        } else if (currentPage.isViewportDragging) {
          const viewport = getCurrentViewport(state);
          return updateCurrentPage(state, {
            offsetX: viewport.offsetX + dx,
            offsetY: viewport.offsetY + dy,
          });
        }
        return state;
      },
      onpointerup: (state) => {
        const currentPage = getCurrentPage(state);
        if (!currentPage) return state;

        const newState = updateCurrentPage(state, {
          isViewportDragging: false,
          resizing: null,
          dragStart: null,
          cursorStyle: "default",
        });

        // Save state for completed drag operation
        if (currentPage.dragStart) {
          const blocks = getCurrentBlocks(state);
          const selectedBlockIds = getSelectedBlockIds(state);
          const draggedBlock = blocks.find(
            (b) => b.id === currentPage.dragStart?.id,
          );

          // Check if any selected block has moved
          const hasAnyBlockMoved = selectedBlockIds.some((blockId) => {
            const block = blocks.find((b) => b.id === blockId);
            if (!block || !currentPage.dragStart) return false;

            // For the dragged block, compare with its start position
            if (blockId === currentPage.dragStart.id) {
              return (
                block.x !== currentPage.dragStart.startX ||
                block.y !== currentPage.dragStart.startY
              );
            }

            // For other selected blocks, we need to calculate their original positions
            // based on the drag delta applied to the dragged block
            const dragDeltaX =
              (currentPage.dragStart.startX || 0) - (draggedBlock?.x || 0);
            const dragDeltaY =
              (currentPage.dragStart.startY || 0) - (draggedBlock?.y || 0);
            const originalX = block.x + dragDeltaX;
            const originalY = block.y + dragDeltaY;

            return (
              Math.abs(block.x - originalX) > 0.1 ||
              Math.abs(block.y - originalY) > 0.1
            );
          });

          if (hasAnyBlockMoved && draggedBlock && currentPage.dragStart) {
            // Calculate the drag delta from the dragged block
            const dragDeltaX =
              (draggedBlock.x || 0) - (currentPage.dragStart.startX || 0);
            const dragDeltaY =
              (draggedBlock.y || 0) - (currentPage.dragStart.startY || 0);

            // Create memento from the state before the drag started
            const beforeDragState = updateCurrentPage(state, {
              blocks: blocks.map((b) => {
                if (selectedBlockIds.includes(b.id)) {
                  return {
                    ...b,
                    x: b.x - dragDeltaX,
                    y: b.y - dragDeltaY,
                  };
                }
                return b;
              }),
            });
            return saveMementoAndReturn(beforeDragState, newState);
          }
        }

        // Save state for completed resize operation
        if (currentPage.resizing) {
          const blocks = getCurrentBlocks(state);

          if (currentPage.resizing.id === "selection-bounding-box") {
            // Handle multi-select resize memento
            const originalBlocks = currentPage.resizing.originalBlocks;
            if (originalBlocks) {
              // Check if any block has changed
              const hasAnyBlockChanged = originalBlocks.some(
                (originalBlock) => {
                  const currentBlock = blocks.find(
                    (b) => b.id === originalBlock.id,
                  );
                  return (
                    currentBlock &&
                    (Math.abs(currentBlock.x - originalBlock.x) > 0.1 ||
                      Math.abs(currentBlock.y - originalBlock.y) > 0.1 ||
                      Math.abs(currentBlock.width - originalBlock.width) >
                        0.1 ||
                      Math.abs(currentBlock.height - originalBlock.height) >
                        0.1)
                  );
                },
              );

              if (hasAnyBlockChanged) {
                // Create memento from the state before the resize started
                const beforeResizeState = updateCurrentPage(state, {
                  blocks: blocks.map((b) => {
                    const originalBlock = originalBlocks.find(
                      (orig) => orig.id === b.id,
                    );
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
            }
          } else {
            // Handle single block resize memento (existing logic)
            const resizedBlock = blocks.find(
              (b) => b.id === currentPage.resizing?.id,
            );
            if (
              resizedBlock &&
              currentPage.resizing &&
              (resizedBlock.width !== currentPage.resizing.startWidth ||
                resizedBlock.height !== currentPage.resizing.startHeight ||
                resizedBlock.x !== currentPage.resizing.startX ||
                resizedBlock.y !== currentPage.resizing.startY)
            ) {
              // Create memento from the state before the resize started
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
        }

        return newState;
      },
      onwheel: (state, event) => {
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
      },
      onkeydown: (state, event) => {
        const currentPage = getCurrentPage(state);
        if (!currentPage) return state;

        // Track shift key state
        if (event.key === "Shift") {
          return updateCurrentPage(state, {
            isShiftPressed: true,
          });
        }

        // Check if user is interacting with an input field or has text selected
        const hasTextSelection =
          (window.getSelection()?.toString() ?? "").length > 0;

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
              return [
                state,
                (dispatch) => saveApplicationAndNotify(dispatch, state),
              ];
            }
            return state;
          default:
            return state;
        }
      },
      onkeyup: (state, event) => {
        // Track shift key release
        if (event.key === "Shift") {
          return updateCurrentPage(state, {
            isShiftPressed: false,
          });
        }
        return state;
      },
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
        ].filter(Boolean),
      ),
    ],
  );
}

/**
 * Creates a selection bounding box component for multi-select
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State> | null} Selection bounding box element or null
 */
function selectionBoundingBox(state) {
  const selectedBlocks = getSelectedBlocks(state);
  if (selectedBlocks.length <= 1) {
    return null; // No bounding box for single or no selection
  }

  const boundingBox = getSelectionBoundingBox(state);
  if (!boundingBox) {
    return null;
  }

  const viewport = getCurrentViewport(state);
  const outlineWidth = 4 / viewport.zoom;
  const currentPage = getCurrentPage(state);
  const isResizing = currentPage?.resizing?.id === "selection-bounding-box";

  return h(
    "div",
    {
      key: "selection-bounding-box",
      class: "selection-bounding-box",
      style: {
        left: `${boundingBox.x}px`,
        top: `${boundingBox.y}px`,
        width: `${boundingBox.width}px`,
        height: `${boundingBox.height}px`,
        outline: `${outlineWidth}px solid blue`,
        position: "absolute",
        pointerEvents: "none",
      },
    },
    [
      // Add resize handles for multi-select
      ...(!isResizing
        ? Object.keys(RESIZE_HANDLERS).map((handle) =>
            ResizeHandle({ handle, zoom: viewport.zoom, context: "multi" }),
          )
        : []),
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
