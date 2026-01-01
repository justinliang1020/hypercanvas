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

export const OUTLINE_COLORS = {
  EDITING: "skyblue",
  SELECTED: "blue",
  PREVIEW_SELECTED: "rgba(0, 122, 204, 0.6)", // Semi-transparent blue for preview
  HOVERING: "blue",
  INTERACT_MODE: "green",
};

export const OUTLINE_WIDTHS = {
  THICK: 4, // For important states
  MEDIUM: 3, // For secondary states
  THIN: 2, // For hover states
};

export const BLOCK_CONTENTS_CLASS_NAME = "block-contents";

const blockContentsWidth = 500; // golden ratio lol
const blockContentsHeight = 809; // golden ratio lol
export const BLOCK_PADDING = 70;
export const DEFAULT_BLOCK_WIDTH = blockContentsWidth + 2 * BLOCK_PADDING;
export const DEFAULT_BLOCK_HEIGHT = blockContentsHeight + 2 * BLOCK_PADDING;
export const NEW_CHILD_BLOCK_OFFSET_X = 100;
export const BLOCK_OPEN_SPACE_PUSH_OFFSET = 10;

export const FONT_SIZES = [
  8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72,
]; // px

export const Z_INDEX_TOP = 100000;
