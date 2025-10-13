import { h } from "hyperapp";
import { MIN_SIZE, RESIZE_CURSORS } from "./constants.js";
import {
  getCurrentBlocks,
  getCurrentPage,
  getCurrentViewport,
  updateCurrentPage,
} from "./pages.js";
import {
  getSelectionBoundingBox,
  getSelectedBlocks,
  selectBlock,
} from "./selection.js";

/**
 * @type {Record<ResizeString, ResizeHandler>}
 */
export const RESIZE_HANDLERS = {
  //TODO: refactor this to not use type block, rather a specialized type that just has the properties needed
  nw: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: block.y + block.height - e.percentY,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  ne: (block, e) => ({
    width: e.percentX - block.x,
    height: block.y + block.height - e.percentY,
    x: block.x,
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  sw: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: e.percentY - block.y,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: block.y,
  }),
  se: (block, e) => ({
    width: e.percentX - block.x,
    height: e.percentY - block.y,
    x: block.x,
    y: block.y,
  }),
  n: (block, e) => ({
    width: block.width,
    height: block.y + block.height - e.percentY,
    x: block.x,
    y: Math.min(block.y + block.height - MIN_SIZE, e.percentY),
  }),
  s: (block, e) => ({
    width: block.width,
    height: e.percentY - block.y,
    x: block.x,
    y: block.y,
  }),
  w: (block, e) => ({
    width: block.x + block.width - e.percentX,
    height: block.height,
    x: Math.min(block.x + block.width - MIN_SIZE, e.percentX),
    y: block.y,
  }),
  e: (block, e) => ({
    width: e.percentX - block.x,
    height: block.height,
    x: block.x,
    y: block.y,
  }),
};

/**
 * Apply aspect ratio constraints for a resize operation based on the original block and active handle.
 * Maintains the original aspect ratio while respecting minimum size.
 *
 * @param {{width:number,height:number,x:number,y:number}} dimensions - Proposed dimensions from a resize handler
 * @param {Block} originalBlock - The original block used to derive the aspect ratio
 * @param {"nw"|"ne"|"sw"|"se"|"n"|"s"|"e"|"w"} handle - Active resize handle
 * @returns {{width:number,height:number,x:number,y:number}} Constrained dimensions
 */
function applyAspectRatioConstraint(dimensions, originalBlock, handle) {
  const originalAspectRatio = originalBlock.width / originalBlock.height;

  if (["nw", "ne", "sw", "se"].includes(handle)) {
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

    const widthArea = constrainedByWidth.width * constrainedByWidth.height;
    const heightArea = constrainedByHeight.width * constrainedByHeight.height;
    const useWidthConstraint = widthArea <= heightArea;
    let result = useWidthConstraint ? constrainedByWidth : constrainedByHeight;

    result.width = Math.max(MIN_SIZE, result.width);
    result.height = Math.max(MIN_SIZE, result.height);

    if (useWidthConstraint) {
      if (handle.includes("n")) {
        const heightDiff = result.height - dimensions.height;
        result.y = dimensions.y - heightDiff;
      }
    } else {
      if (handle.includes("w")) {
        const widthDiff = result.width - dimensions.width;
        result.x = dimensions.x - widthDiff;
      }
    }

    return result;
  }

  if (["n", "s"].includes(handle)) {
    const newWidth = dimensions.height * originalAspectRatio;
    const widthDiff = newWidth - originalBlock.width;
    return {
      ...dimensions,
      width: Math.max(MIN_SIZE, newWidth),
      x: originalBlock.x - widthDiff / 2,
    };
  }

  if (["e", "w"].includes(handle)) {
    const newHeight = dimensions.width / originalAspectRatio;
    const heightDiff = newHeight - originalBlock.height;
    return {
      ...dimensions,
      height: Math.max(MIN_SIZE, newHeight),
      y: originalBlock.y - heightDiff / 2,
    };
  }

  return dimensions;
}

/**
 * Unified resize handle for blocks and multi-select.
 * Renders an interactive handle div with proper cursor and pointer handlers.
 *
 * @param {{
 *   handle: ResizeString,
 *   zoom: number,
 *   context: "block"|"multi"
 * }} props
 * @returns {import("hyperapp").ElementVNode<any>}
 */
export function ResizeHandle({ handle, zoom, context }) {
  const handleSize = 10 / zoom;
  const handleOffset = 5 / zoom;
  const borderWidth = 1 / zoom;

  const isCorner = ["nw", "ne", "sw", "se"].includes(handle);
  const isEdge = ["n", "s", "e", "w"].includes(handle);

  /** @type {import("hyperapp").StyleProp} */
  const style = {
    position: "absolute",
    backgroundColor: isCorner ? "white" : "transparent",
    border: isCorner ? `${borderWidth}px solid blue` : "none",
    width: isEdge && ["n", "s"].includes(handle) ? "auto" : `${handleSize}px`,
    height: isEdge && ["e", "w"].includes(handle) ? "auto" : `${handleSize}px`,
    pointerEvents: "auto",
  };

  if (handle.includes("n")) style.top = `-${handleOffset}px`;
  if (handle.includes("s")) style.bottom = `-${handleOffset}px`;
  if (handle.includes("e")) style.right = `-${handleOffset}px`;
  if (handle.includes("w")) style.left = `-${handleOffset}px`;

  if (["n", "s"].includes(handle)) {
    style.left = `${handleSize}px`;
    style.right = `${handleSize}px`;
  }
  if (["e", "w"].includes(handle)) {
    style.top = `${handleSize}px`;
    style.bottom = `${handleSize}px`;
  }

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {State}
   */
  function onpointerenter(state, event) {
    event.stopPropagation();
    return updateCurrentPage(state, {
      cursorStyle: RESIZE_CURSORS[handle] || "default",
    });
  }

  /**
   * @param {State} state
   * @param {PointerEvent} event
   * @returns {State}
   */
  function onpointerleave(state, event) {
    event.stopPropagation();
    return updateCurrentPage(state, { cursorStyle: "default" });
  }

  const commonProps = {
    class: `resize-handle ${handle}`,
    "data-handle": handle,
    style,
    onpointerenter,
    onpointerleave,
  };

  if (context === "block") {
    return h("div", {
      ...commonProps,
      onpointerdown: (state, event) => {
        event.stopPropagation();
        const blockId = parseInt(
          /** @type {HTMLElement} */ (event.target)?.parentElement?.dataset
            ?.id || "",
        );
        const blocks = getCurrentBlocks(state);
        const block = blocks.find((b) => b.id === blockId);
        if (!block) return state;
        const selectedState = selectBlock(state, blockId);
        return updateCurrentPage(selectedState, {
          resizing: {
            id: blockId,
            handle: /** @type {ResizeString} */ (
              /** @type {HTMLElement} */ (event.target).dataset.handle
            ),
            startWidth: block.width,
            startHeight: block.height,
            startX: block.x,
            startY: block.y,
          },
          cursorStyle: RESIZE_CURSORS[handle] || "default",
        });
      },
    });
  }

  // multi-select context
  return h("div", {
    ...commonProps,
    onpointerdown: (state, event) => {
      event.stopPropagation();
      const selectedBlocks = getSelectedBlocks(state);
      const bbox = getSelectionBoundingBox(state);
      if (!bbox || selectedBlocks.length <= 1) return state;
      return updateCurrentPage(state, {
        resizing: {
          id: "selection-bounding-box",
          handle,
          startWidth: bbox.width,
          startHeight: bbox.height,
          startX: bbox.x,
          startY: bbox.y,
          originalBlocks: selectedBlocks.map((block) => ({
            id: block.id,
            x: block.x,
            y: block.y,
            width: block.width,
            height: block.height,
          })),
        },

        cursorStyle: RESIZE_CURSORS[handle] || "default",
      });
    },
  });
}

/**
 * Handle pointermove during resize.
 * Computes new dimensions for either a single block or the multi-select bounding box,
 * applies aspect ratio locking when Shift is pressed, and updates page blocks.
 *
 * @param {State} state - Current application state
 * @param {PointerEvent} event - Pointer event from the canvas
 * @returns {State} New application state with updated block sizes/positions
 */
export function handleResizePointerMove(state, event) {
  const page = getCurrentPage(state);
  if (!page || !page.resizing) return state;

  const canvasRect = /** @type {HTMLElement} */ (
    document.getElementById("canvas")
  ).getBoundingClientRect();
  const viewport = getCurrentViewport(state);
  const canvasX = (event.clientX - canvasRect.left) / viewport.zoom;
  const canvasY = (event.clientY - canvasRect.top) / viewport.zoom;

  const blocks = getCurrentBlocks(state);

  if (page.resizing.id === "selection-bounding-box") {
    const handler = RESIZE_HANDLERS[page.resizing.handle];
    if (!handler || !page.resizing.originalBlocks) return state;

    //TODO: clean this up
    //
    /** @type {Block} */
    const virtualBoundingBox = {
      id: -1,
      x: page.resizing.startX,
      y: page.resizing.startY,
      width: page.resizing.startWidth,
      height: page.resizing.startHeight,
      zIndex: 0,
      content: "",
      type: "real",
      previewChildId: 0,
      realChildrenIds: [],
    };

    let newBBox = handler(virtualBoundingBox, {
      percentX: canvasX,
      percentY: canvasY,
    });

    if (state.isShiftPressed) {
      newBBox = applyAspectRatioConstraint(
        newBBox,
        virtualBoundingBox,
        page.resizing.handle,
      );
    }

    const scaleX = newBBox.width / page.resizing.startWidth;
    const scaleY = newBBox.height / page.resizing.startHeight;

    return updateCurrentPage(state, {
      blocks: blocks.map((block) => {
        const originalBlock = page.resizing?.originalBlocks?.find(
          (o) => o.id === block.id,
        );
        if (!originalBlock) return block;
        if (!page.resizing) return block; //possibly redundant

        const relativeX =
          (originalBlock.x - page.resizing.startX) / page.resizing.startWidth;
        const relativeY =
          (originalBlock.y - page.resizing.startY) / page.resizing.startHeight;

        const newWidth = Math.max(MIN_SIZE, originalBlock.width * scaleX);
        const newHeight = Math.max(MIN_SIZE, originalBlock.height * scaleY);
        const newX = newBBox.x + relativeX * newBBox.width;
        const newY = newBBox.y + relativeY * newBBox.height;

        return {
          ...block,
          x: newX,
          y: newY,
          width: newWidth,
          height: newHeight,
        };
      }),
    });
  }

  const block = blocks.find((b) => b.id == page.resizing?.id);
  if (!block) return state;
  const handler = RESIZE_HANDLERS[page.resizing.handle];
  if (!handler) return state;

  let newDimensions = handler(block, { percentX: canvasX, percentY: canvasY });

  if (state.isShiftPressed) {
    const originalBlock = {
      ...block,
      width: page.resizing.startWidth,
      height: page.resizing.startHeight,
      x: page.resizing.startX,
      y: page.resizing.startY,
    };
    newDimensions = applyAspectRatioConstraint(
      newDimensions,
      originalBlock,
      page.resizing.handle,
    );
  }

  const finalWidth = Math.max(MIN_SIZE, newDimensions.width);
  const finalHeight = Math.max(MIN_SIZE, newDimensions.height);

  return updateCurrentPage(state, {
    blocks: blocks.map((b) =>
      b.id == page.resizing?.id
        ? { ...b, ...newDimensions, width: finalWidth, height: finalHeight }
        : b,
    ),
  });
}
