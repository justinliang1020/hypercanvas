interface BaseBlock {
  id: number;
  width: number;
  height: number;
  x: number;
  y: number;
  zIndex: number;
}

interface WebviewBlock extends BaseBlock {
  type: "webview";
  // the initial src value loaded by the webview node
  // the webview is reloaded whenever the value of initialSrc changes
  initialSrc: string;
  // the current src value kept track by navigation events
  // when copying block or saving app state, the value of initialSrc must be manually synced to currentSrc
  currentSrc: string;
  domReady: boolean;
  isPreview: boolean;
  previewChildId: number | null;
  realChildrenIds: number[];
  pageTitle: string;
  faviconUrl: string | null;
  canGoBack: boolean;
  canGoForward: boolean;
  isUrlBarExpanded: boolean;
}

interface TextBlock extends BaseBlock {
  type: "text";
  value: string;
  fontSize: number; // px
}

interface ImageBlock extends BaseBlock {
  type: "image";
  src: string;
}

type Block = WebviewBlock | TextBlock | ImageBlock;
type BlockType = Block["type"];

type Link = {
  id: number;
  parentBlockId: number;
  childBlockId: number;
};

interface Page {
  id: string;
  name: string;
  blocks: Block[];
  offsetX: number;
  offsetY: number;
  zoom: number;
  isViewportDragging: boolean;
  selectedIds: number[];
  pendingSelectedIds: number[];
  hoveringId: number | null;
  fullScreenState: fullScreenState | null;
  resizing: ResizeState | null;
  dragStart: DragState | null;
  selectionBox: SelectionBoxState | null;
  idCounter: number;
  links: Link[];
}

interface Memento {
  pages: Page[];
  currentPageId: string;
}

interface MementoManager {
  undoStack: Memento[];
  redoStack: Memento[];
  maxHistorySize: number;
}

interface OriginalBlockState {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

interface fullScreenState {
  id: number; // block ID of full screen block
  width: number; // original block width
  height: number; // original block height
  offsetX: number; // original page offsetX
  offsetY: number; // original page offsetY
  zoom: number; // original page zoom
}

interface ResizeState {
  id: number | string;
  handle: ResizeString;
  startWidth: number;
  startHeight: number;
  startX: number;
  startY: number;
  originalBlocks?: OriginalBlockState[];
}

interface DragState {
  id: number;
  startX: number;
  startY: number;
}

interface SelectionBoxState {
  startX: number;
  startY: number;
  currentX: number;
  currentY: number;
}

interface State {
  pages: Page[];
  currentPageId: string;
  mementoManager: MementoManager;
  isDarkMode: boolean;
  mouseX: number;
  mouseY: number;
  cursorStyleOverride: CursorStyle | null;
  isSidebarVisible: boolean;
  programsPanelWidth: number;
  clipboard: Block[] | null;
  notification: string | null;
  notificationVisible: boolean;
  contextMenu: ContextMenu | null;
}

interface BaseContextMenu {
  x: number;
  y: number;
}

interface ViewportContextMenu extends BaseContextMenu {
  type: "viewport";
}

interface WebviewContextMenu extends BaseContextMenu {
  type: "webview";
  block: WebviewBlock;
  anchorHref: string | null;
}

type ContextMenu = ViewportContextMenu | WebviewContextMenu;

type ResizeHandler = (
  block: BaseBlock,
  e: { percentX: number; percentY: number },
) => { width: number; height: number; x: number; y: number };

type ResizeString = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

type BlockConfig<T> = Omit<T, keyof BaseBlock | "type">;

type CursorStyle =
  | "auto"
  | "default"
  | "none"
  | "context-menu"
  | "help"
  | "pointer"
  | "progress"
  | "wait"
  | "cell"
  | "crosshair"
  | "text"
  | "vertical-text"
  | "alias"
  | "copy"
  | "move"
  | "no-drop"
  | "not-allowed"
  | "grab"
  | "grabbing"
  | "all-scroll"
  | "col-resize"
  | "row-resize"
  | "n-resize"
  | "s-resize"
  | "e-resize"
  | "w-resize"
  | "ne-resize"
  | "nw-resize"
  | "se-resize"
  | "sw-resize"
  | "ew-resize"
  | "ns-resize"
  | "nesw-resize"
  | "nwse-resize"
  | "zoom-in"
  | "zoom-out";
