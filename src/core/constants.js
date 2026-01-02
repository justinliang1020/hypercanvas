// -----------------------------
// ## Constants
// -----------------------------

export const MIN_SIZE = 20; // Minimum size in px
export const STATE_SAVE_PATH = "user/state.json";
export const MEDIA_SAVE_PATH = "user/media/";
export const PASTE_OFFSET_X = 20;
export const PASTE_OFFSET_Y = 20;

/**
 * @type {Record<string, CursorStyle>}
 */
export const RESIZE_CURSORS = {
  nw: "nwse-resize",
  ne: "nesw-resize",
  sw: "nesw-resize",
  se: "nwse-resize",
  n: "ns-resize",
  s: "ns-resize",
  w: "ew-resize",
  e: "ew-resize",
};

export const BLOCK_CONTENTS_CLASS_NAME = "block-contents";

const blockContentsWidth = 1200;
const blockContentsHeight = 1080;
export const BLOCK_PADDING = 70;
export const DEFAULT_BLOCK_WIDTH = blockContentsWidth + 2 * BLOCK_PADDING;
export const DEFAULT_BLOCK_HEIGHT = blockContentsHeight + 2 * BLOCK_PADDING;
export const NEW_CHILD_BLOCK_OFFSET_X = 100;

export const Z_INDEX_TOP = 100000;
export const MIN_ZOOM = 0.2;
export const MAX_ZOOM = 1.4; // get performance issues from zooming in too much
