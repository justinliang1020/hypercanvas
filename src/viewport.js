import { h } from "./packages/hyperapp/index.js";
import { pasteEffect } from "./utils.js";
import { saveApplicationAndNotify } from "./utils.js";
import { copySelectedBlock } from "./block.js";
import { connectionLine } from "./connection.js";
import { deleteBlock } from "./block.js";
import { RESIZE_HANDLERS, block } from "./block.js";
import { MIN_SIZE } from "./constants.js";
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
  hasSelection,
} from "./selection.js";

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
        // Only start dragging on middle mouse button or shift+click
        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
        const deselectedState = deselectAllBlocks(state);
        return updateCurrentPage(deselectedState, {
          isViewportDragging: true,
          cursorStyle: "grabbing",
        });        }

        // Regular click - deselect blocks, exit edit mode, and exit connect mode
        return deselectAllBlocks(state);
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
          // Handle resizing with zoom adjustment
          const canvasRect = /** @type {HTMLElement} */ (
            document.getElementById("canvas")
          ).getBoundingClientRect();

          // Calculate position relative to canvas accounting for zoom and offset
          const viewport = getCurrentViewport(state);
          const canvasX = (event.clientX - canvasRect.left) / viewport.zoom;
          const canvasY = (event.clientY - canvasRect.top) / viewport.zoom;

          const blocks = getCurrentBlocks(state);
          const block = blocks.find((b) => b.id == currentPage.resizing?.id);
          if (!block) return state;
          const handler = RESIZE_HANDLERS[currentPage.resizing.handle];
          if (!handler) return state;

          let newDimensions = handler(block, {
            percentX: canvasX,
            percentY: canvasY,
          });

          // Apply aspect ratio constraint if shift is pressed
          if (currentPage.isShiftPressed && currentPage.resizing) {
            const originalBlock = {
              ...block,
              width: currentPage.resizing.startWidth,
              height: currentPage.resizing.startHeight,
              x: currentPage.resizing.startX,
              y: currentPage.resizing.startY,
            };
            newDimensions = applyAspectRatioConstraint(
              newDimensions,
              originalBlock,
              currentPage.resizing.handle,
            );
          }

          // Ensure minimum size
          const finalWidth = Math.max(MIN_SIZE, newDimensions.width);
          const finalHeight = Math.max(MIN_SIZE, newDimensions.height);

          return updateCurrentPage(state, {
            blocks: blocks.map((b) =>
              b.id == currentPage.resizing?.id
                ? {
                    ...b,
                    ...newDimensions,
                    width: finalWidth,
                    height: finalHeight,
                  }
                : b,
            ),
          });
        } else if (currentPage.dragStart && currentPage.editingId === null) {
          // Only allow dragging if no block is in edit mode
          // Adjust drag delta by zoom level - when zoomed in, smaller movements should result in smaller position changes
          const viewport = getCurrentViewport(state);
          const adjustedDx = dx / viewport.zoom;
          const adjustedDy = dy / viewport.zoom;

          const blocks = getCurrentBlocks(state);
          const selectedBlockId = getSelectedBlockId(state);
          return updateCurrentPage(state, {
            blocks: blocks.map((block) => {
              if (block.id === selectedBlockId) {
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
          const draggedBlock = blocks.find(
            (b) => b.id === currentPage.dragStart?.id,
          );
          if (
            draggedBlock &&
            currentPage.dragStart &&
            (draggedBlock.x !== currentPage.dragStart.startX ||
              draggedBlock.y !== currentPage.dragStart.startY)
          ) {
            // Create memento from the state before the drag started
            const beforeDragState = updateCurrentPage(state, {
              blocks: blocks.map((b) =>
                b.id === draggedBlock.id
                  ? {
                      ...b,
                      x: currentPage.dragStart?.startX || 0,
                      y: currentPage.dragStart?.startY || 0,
                    }
                  : b,
              ),
            });
            return saveMementoAndReturn(beforeDragState, newState);
          }
        }

        // Save state for completed resize operation
        if (currentPage.resizing) {
          const blocks = getCurrentBlocks(state);
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
            if (
              selectedBlockId !== null &&
              currentPage.editingId === null
            ) {
              event.preventDefault();
              return deleteBlock(state, selectedBlockId);
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
                return copySelectedBlock(state);
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
            transform: `translate(${getCurrentViewport(state).offsetX}px, ${getCurrentViewport(state).offsetY}px) scale(${getCurrentViewport(state).zoom})`,
          },
        },
        [
          // Render connection lines first (behind blocks)
          ...getCurrentConnections(state).map((connection) =>
            connectionLine(state, connection),
          ),
          // Then render blocks on top
          ...getCurrentBlocks(state).map(block(state)),
        ],
      ),
    ],
  );
}

/**
 * Applies aspect ratio constraint to resize dimensions
 * @param {{width: number, height: number, x: number, y: number}} dimensions - Original dimensions from resize handler
 * @param {Block} originalBlock - Original block before resize
 * @param {string} handle - Resize handle being used
 * @returns {{width: number, height: number, x: number, y: number}} Constrained dimensions maintaining aspect ratio
 */
function applyAspectRatioConstraint(dimensions, originalBlock, handle) {
  const originalAspectRatio = originalBlock.width / originalBlock.height;

  // For corner handles, maintain aspect ratio
  if (["nw", "ne", "sw", "se"].includes(handle)) {
    // Calculate both possible constrained dimensions
    const constrainedByWidth = {
      width: dimensions.width,
      height: dimensions.width / originalAspectRatio,
      x: dimensions.x,
      y: dimensions.y,
    };

    const constrainedByHeight = {
      width: dimensions.height * originalAspectRatio,
      height: dimensions.height,
      x: dimensions.x,
      y: dimensions.y,
    };

    // Choose the constraint that results in the smaller overall size change
    // This prevents the block from growing too aggressively
    const widthArea = constrainedByWidth.width * constrainedByWidth.height;
    const heightArea = constrainedByHeight.width * constrainedByHeight.height;

    const useWidthConstraint = widthArea <= heightArea;
    let result = useWidthConstraint ? constrainedByWidth : constrainedByHeight;

    // Apply minimum size constraints
    result.width = Math.max(MIN_SIZE, result.width);
    result.height = Math.max(MIN_SIZE, result.height);

    // Adjust positions based on handle type and which constraint we're using
    if (useWidthConstraint) {
      // When constraining by width, adjust Y for north handles
      if (handle.includes("n")) {
        const heightDiff = result.height - dimensions.height;
        result.y = dimensions.y - heightDiff;
      }
    } else {
      // When constraining by height, adjust X for west handles
      if (handle.includes("w")) {
        const widthDiff = result.width - dimensions.width;
        result.x = dimensions.x - widthDiff;
      }
    }

    return result;
  }

  // For edge handles, maintain aspect ratio by adjusting the other dimension
  if (["n", "s"].includes(handle)) {
    // Height is changing, adjust width
    const newWidth = dimensions.height * originalAspectRatio;
    const widthDiff = newWidth - originalBlock.width;
    return {
      ...dimensions,
      width: Math.max(MIN_SIZE, newWidth),
      x: originalBlock.x - widthDiff / 2, // Center the width change
    };
  }

  if (["e", "w"].includes(handle)) {
    // Width is changing, adjust height
    const newHeight = dimensions.width / originalAspectRatio;
    const heightDiff = newHeight - originalBlock.height;
    return {
      ...dimensions,
      height: Math.max(MIN_SIZE, newHeight),
      y: originalBlock.y - heightDiff / 2, // Center the height change
    };
  }

  return dimensions;
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
