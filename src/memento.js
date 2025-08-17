/**
 * Creates a new memento manager
 * @returns {MementoManager}
 */
export function createMementoManager() {
  return {
    undoStack: [],
    redoStack: [],
    maxHistorySize: 50,
  };
}

/**
 * Creates a memento from the current state for undo/redo
 * @param {State} state - Current application state
 * @returns {Memento} Snapshot of state for history
 */
export function createMemento(state) {
  const cleanPages = state.pages.map((page) => ({
    ...page,
    selectedId: null,
    isBlockDragging: false,
    dragStart: null,
    resizing: null,
  }));

  return {
    pages: JSON.parse(JSON.stringify(cleanPages)),
    currentPageId: state.currentPageId,
  };
}

/**
 * Saves previous state in memento history and returns the new state
 * @param {State} prevState - Previous state to save in history
 * @param {State} newState - New state to return with updated history
 * @returns {State} New state with updated memento manager
 */
export function saveMementoAndReturn(prevState, newState) {
  const memento = createMemento(prevState);

  const newMementoManager = {
    ...prevState.mementoManager,
    undoStack: [...prevState.mementoManager.undoStack, memento].slice(
      -prevState.mementoManager.maxHistorySize,
    ),
    redoStack: [],
  };

  return {
    ...newState,
    mementoManager: newMementoManager,
  };
}

/**
 * Undoes the last state change
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Previous state from undo stack
 */
export function undoState(state) {
  if (state.mementoManager.undoStack.length === 0) return state;

  const memento =
    state.mementoManager.undoStack[state.mementoManager.undoStack.length - 1];
  const currentMemento = createMemento(state);

  const newMementoManager = {
    ...state.mementoManager,
    undoStack: state.mementoManager.undoStack.slice(0, -1),
    redoStack: [...state.mementoManager.redoStack, currentMemento],
  };

  return {
    ...state,
    pages: memento.pages,
    currentPageId: memento.currentPageId,
    mementoManager: newMementoManager,
  };
}

/**
 * Redoes the last undone state change
 * @param {State} state - Current application state
 * @returns {import("hyperapp").Dispatchable<State>} Next state from redo stack
 */
export function redoState(state) {
  if (state.mementoManager.redoStack.length === 0) return state;

  const memento =
    state.mementoManager.redoStack[state.mementoManager.redoStack.length - 1];
  const currentMemento = createMemento(state);

  const newMementoManager = {
    ...state.mementoManager,
    undoStack: [...state.mementoManager.undoStack, currentMemento],
    redoStack: state.mementoManager.redoStack.slice(0, -1),
  };

  return {
    ...state,
    pages: memento.pages,
    currentPageId: memento.currentPageId,
    mementoManager: newMementoManager,
  };
}
