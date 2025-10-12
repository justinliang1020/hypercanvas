interface Block {
  id: number;
  width: number;
  height: number;
  x: number;
  y: number;
  zIndex: number;
  filename: string;
}

type BlockConfig = Omit<Block, "id" | "zIndex">;

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
  isInteractMode: boolean;
  selectedIds: number[];
  previewSelectedIds: number[];
  editingId: number | null;
  hoveringId: number | null;
  resizing: ResizeState | null;
  dragStart: DragState | null;
  selectionBox: SelectionBoxState | null;
  state: any;
  css: string;
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
  htmlPaths: string[];
}

type ResizeHandler = (
  block: Block,
  e: { percentX: number; percentY: number },
) => { width: number; height: number; x: number; y: number };

type ResizeString = "nw" | "ne" | "sw" | "se" | "n" | "s" | "e" | "w";

interface AppDispatchEventDetail {
  state: State;
  action: import("hyperapp").Action<State>;
  payload: any;
  prevState: State;
}
