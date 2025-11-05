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
  src: string;
  domReady: boolean;
  isPreview: boolean;
  previewChildId: number | null;
  realChildrenIds: number[];
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
  mouseX: number;
  mouseY: number;
  cursorStyle: string;
  isViewportDragging: boolean;
  isTextEditorFocused: boolean;
  selectedIds: number[];
  previewSelectedIds: number[];
  editingId: number | null;
  hoveringId: number | null;
  resizing: ResizeState | null;
  dragStart: DragState | null;
  selectionBox: SelectionBoxState | null;
  blockIdCounter: number;
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
  panelsVisible: boolean;
  programsPanelWidth: number;
  clipboard: Block[] | null;
  programFilter: string;
  notification: string | null;
  notificationVisible: boolean;
  editingPageId: string | null;
  isShiftPressed: boolean;
  userPath: string;
  isInteractMode: boolean;
}

type ResizeHandler = (
  block: BaseBlock,
  e: { percentX: number; percentY: number },
) => { width: number; height: number; x: number; y: number };

type ResizeString = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

type BlockConfig<T> = Omit<T, keyof BaseBlock | "type">;
