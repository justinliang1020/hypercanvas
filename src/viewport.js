import { h } from "./packages/hyperapp/index.js";
import { pasteEffect } from "./utils.js";
import { saveApplicationAndNotify } from "./utils.js";
import { copySelectedBlock } from "./block.js";
import { connectionLine } from "./connection.js";
import { deleteBlock } from "./block.js";
import { RESIZE_HANDLERS, block } from "./block.js";
import { MIN_SIZE, RESIZE_CURSORS } from "./constants.js";
import { saveMementoAndReturn, redoState, undoState } from "./memento.js";
import {
  getCurrentPage,
  getCurrentBlocks,
  getCurrentConnections,
  getCurrentViewport,
  updateCurrentPage,
} from "./pages.js";

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
        "sidebar-hidden": !state.sidebarVisible,
      },
      style: {
        paddingRight: state.sidebarVisible ? `${state.sidebarWidth}px` : "0",
        touchAction: "none", // Prevent default touch behaviors
        outline: "none", // Remove focus oultine
      },
      tabindex: -1, // Make the main element focusable for keyboard events
      onpointerdown: (state, event) => {
        // Only start dragging on middle mouse button or space+click
        if (event.button === 1 || (event.button === 0 && event.shiftKey)) {
          return {
            ...state,
            isViewportDragging: true,
            lastX: event.clientX,
            lastY: event.clientY,
            cursorStyle: "grabbing",
            selectedId: null,
          };
        }

        // Regular click - deselect blocks, exit edit mode, and exit connect mode
        return {
          ...state,
          selectedId: null,
          editingId: null,
          connectingId: null,
        };
      },
      onpointermove: (state, event) => {
        const dx = event.clientX - state.lastX;
        const dy = event.clientY - state.lastY;

        if (state.resizing) {
          // Handle resizing with zoom adjustment
          const canvasRect = /** @type {HTMLElement} */ (
            document.getElementById("canvas")
          ).getBoundingClientRect();

          // Calculate position relative to canvas accounting for zoom and offset
          const viewport = getCurrentViewport(state);
          const canvasX = (event.clientX - canvasRect.left) / viewport.zoom;
          const canvasY = (event.clientY - canvasRect.top) / viewport.zoom;

          const blocks = getCurrentBlocks(state);
          const block = blocks.find((b) => b.id == state.resizing?.id);
          if (!block) return state;
          const handler = RESIZE_HANDLERS[state.resizing.handle];
          if (!handler) return state;

          let newDimensions = handler(block, {
            percentX: canvasX,
            percentY: canvasY,
          });

          // Apply aspect ratio constraint if shift is pressed
          if (state.isShiftPressed && state.resizeStart) {
            const originalBlock = {
              ...block,
              width: state.resizeStart.startWidth,
              height: state.resizeStart.startHeight,
              x: state.resizeStart.startX,
              y: state.resizeStart.startY,
            };
            newDimensions = applyAspectRatioConstraint(
              newDimensions,
              originalBlock,
              state.resizing.handle,
            );
          }

          // Ensure minimum size
          const finalWidth = Math.max(MIN_SIZE, newDimensions.width);
          const finalHeight = Math.max(MIN_SIZE, newDimensions.height);

          return updateCurrentPage(state, {
            blocks: blocks.map((b) =>
              b.id == state.resizing?.id
                ? {
                    ...b,
                    ...newDimensions,
                    width: finalWidth,
                    height: finalHeight,
                  }
                : b,
            ),
          });
        } else if (state.isBlockDragging && state.editingId === null) {
          // Only allow dragging if no block is in edit mode
          // Adjust drag delta by zoom level - when zoomed in, smaller movements should result in smaller position changes
          const viewport = getCurrentViewport(state);
          const adjustedDx = dx / viewport.zoom;
          const adjustedDy = dy / viewport.zoom;

          const blocks = getCurrentBlocks(state);
          return {
            ...updateCurrentPage(state, {
              blocks: blocks.map((block) => {
                if (block.id === state.selectedId) {
                  return {
                    ...block,
                    x: block.x + adjustedDx,
                    y: block.y + adjustedDy,
                  };
                } else {
                  return block;
                }
              }),
            }),
            lastX: event.clientX,
            lastY: event.clientY,
          };
        } else if (state.isViewportDragging) {
          const viewport = getCurrentViewport(state);
          return {
            ...updateCurrentPage(state, {
              offsetX: viewport.offsetX + dx,
              offsetY: viewport.offsetY + dy,
            }),
            lastX: event.clientX,
            lastY: event.clientY,
          };
        }
        return state;
      },
      onpointerup: (state) => {
        const newState = {
          ...state,
          isViewportDragging: false,
          isBlockDragging: false,
          resizing: null,
          dragStart: null,
          resizeStart: null,
          cursorStyle: "default",
        };

        // Save state for completed drag operation
        if (state.dragStart && state.isBlockDragging) {
          const blocks = getCurrentBlocks(state);
          const draggedBlock = blocks.find((b) => b.id === state.dragStart?.id);
          if (
            draggedBlock &&
            state.dragStart &&
            (draggedBlock.x !== state.dragStart.startX ||
              draggedBlock.y !== state.dragStart.startY)
          ) {
            // Create memento from the state before the drag started
            const beforeDragState = updateCurrentPage(state, {
              blocks: blocks.map((b) =>
                b.id === draggedBlock.id
                  ? {
                      ...b,
                      x: state.dragStart?.startX || 0,
                      y: state.dragStart?.startY || 0,
                    }
                  : b,
              ),
            });
            return saveMementoAndReturn(beforeDragState, newState);
          }
        }

        // Save state for completed resize operation
        if (state.resizeStart && state.resizing) {
          const blocks = getCurrentBlocks(state);
          const resizedBlock = blocks.find(
            (b) => b.id === state.resizeStart?.id,
          );
          if (
            resizedBlock &&
            state.resizeStart &&
            (resizedBlock.width !== state.resizeStart.startWidth ||
              resizedBlock.height !== state.resizeStart.startHeight ||
              resizedBlock.x !== state.resizeStart.startX ||
              resizedBlock.y !== state.resizeStart.startY)
          ) {
            // Create memento from the state before the resize started
            const beforeResizeState = updateCurrentPage(state, {
              blocks: blocks.map((b) =>
                b.id === resizedBlock.id
                  ? {
                      ...b,
                      width: state.resizeStart?.startWidth || 0,
                      height: state.resizeStart?.startHeight || 0,
                      x: state.resizeStart?.startX || 0,
                      y: state.resizeStart?.startY || 0,
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

        if (isTrackpad) {
          // Trackpad pan gesture - use deltaX and deltaY directly
          // Invert the delta values to match Figma-like behavior
          const viewport = getCurrentViewport(state);
          return updateCurrentPage(state, {
            offsetX: viewport.offsetX - event.deltaX,
            offsetY: viewport.offsetY - event.deltaY,
          });
        } else if (event.ctrlKey || event.metaKey) {
          // Zoom gesture (Ctrl/Cmd + scroll or trackpad pinch)
          const viewport = getCurrentViewport(state);
          const zoomDelta = -event.deltaY * 0.01;
          const newZoom = Math.max(0.1, Math.min(5, viewport.zoom + zoomDelta));

          // Get mouse position relative to viewport for zoom centering
          const rect = /** @type {HTMLElement} */ (
            event.currentTarget
          )?.getBoundingClientRect();
          const mouseX = event.clientX - rect.left;
          const mouseY = event.clientY - rect.top;

          // Calculate zoom offset to keep mouse position fixed
          const zoomRatio = newZoom / viewport.zoom;
          const newOffsetX = mouseX - (mouseX - viewport.offsetX) * zoomRatio;
          const newOffsetY = mouseY - (mouseY - viewport.offsetY) * zoomRatio;

          return updateCurrentPage(state, {
            zoom: newZoom,
            offsetX: newOffsetX,
            offsetY: newOffsetY,
          });
        }

        return state;
      },
      onkeydown: (state, event) => {
        // Track shift key state
        if (event.key === "Shift") {
          return {
            ...state,
            isShiftPressed: true,
          };
        }

        // Check if user is interacting with an input field or has text selected
        const hasTextSelection =
          (window.getSelection()?.toString() ?? "").length > 0;

        // Handle keyboard shortcuts
        switch (event.key) {
          case "Escape":
            // Exit connect mode, edit mode, or deselect
            if (state.connectingId !== null) {
              event.preventDefault();
              return {
                ...state,
                connectingId: null,
              };
            } else if (state.editingId !== null) {
              event.preventDefault();
              return {
                ...state,
                editingId: null,
              };
            } else if (state.selectedId !== null) {
              event.preventDefault();
              return {
                ...state,
                selectedId: null,
              };
            }
            return state;

          case "Delete":
          case "Backspace":
            // Only handle block deletion if not in input field, a block is selected, and not in edit mode
            if (state.selectedId !== null && state.editingId === null) {
              event.preventDefault();
              return deleteBlock(state, state.selectedId);
            }
            // Let browser handle regular text deletion
            return state;

          case "c":
            // Handle copy shortcut (Ctrl+C or Cmd+C)
            if (event.ctrlKey || event.metaKey) {
              // Only handle block copy if not in input field, no text is selected, and not in edit mode
              if (
                !hasTextSelection &&
                state.selectedId !== null &&
                state.editingId === null
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
              if (state.editingId === null) {
                event.preventDefault();
                return [state, [pasteEffect, state]];
              }
            }
            return state;

          case "z":
          case "Z":
            // Handle undo/redo shortcuts
            if (event.ctrlKey || event.metaKey) {
              if (state.editingId === null) {
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
              if (state.editingId === null) {
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
          return {
            ...state,
            isShiftPressed: false,
          };
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
    window.innerWidth - (state.sidebarVisible ? state.sidebarWidth : 0);
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
