/**
 * @typedef {Object} Block
 * @property {number} id - Unique block identifier
 * @property {number} width - Block width in pixels
 * @property {number} height - Block height in pixels
 * @property {number} x - X position on canvas
 * @property {number} y - Y position on canvas
 * @property {number} zIndex - Stacking order (higher = front)
 * @property {string} programName - Program name TODO: remove
 */

/**
 * @typedef {Object} BlockConnection
 * @property {string} name - Connection name/type
 * @property {number} sourceBlockId - ID of source block
 * @property {number} targetBlockId - ID of target block
 */

/**
 * @typedef {Object} Page
 * @property {string} id - Unique page identifier
 * @property {string} name - Display name for the page
 * @property {Block[]} blocks - All blocks on this page
 * @property {BlockConnection[]} connections - Connections between blocks on this page
 * @property {number} offsetX - Canvas X offset for panning on this page
 * @property {number} offsetY - Canvas Y offset for panning on this page
 * @property {number} zoom - Current zoom level for this page
 * @property {number} mouseX - Current mouse X position
 * @property {number} mouseY - Current mouse Y position
 * @property {string} cursorStyle - Current cursor style
 * @property {boolean} isViewportDragging - Whether viewport is being dragged
 * @property {boolean} isShiftPressed - Whether shift key is currently pressed
 * @property {boolean} isAltPressed - Whether alt key (option on Mac) is currently pressed
 * @property {number[]} selectedIds - IDs of selected blocks
 * @property {number[]} previewSelectedIds - IDs of blocks that would be selected (during selection box drag)
 * @property {number|null} editingId - ID of block in edit mode
 * @property {number|null} hoveringId - ID of hovered block
 * @property {number|null} connectingId - ID of block in connect mode (pending connection)
 * @property {ResizeState|null} resizing - Current resize operation
 * @property {DragState|null} dragStart - Drag operation start state
 * @property {SelectionBoxState|null} selectionBox - Selection box drag state
 * @property {any} state - State of app inside this page
 * @property {string} programName - Program name, should have the same state type as the page state
 **/

/**
 * @typedef {Object} Memento
 * @property {Page[]} pages - Snapshot of pages state
 * @property {string} currentPageId - Current page ID at time of snapshot
 */

/**
 * @typedef {Object} MementoManager
 * @property {Memento[]} undoStack - Stack of previous states for undo
 * @property {Memento[]} redoStack - Stack of undone states for redo
 * @property {number} maxHistorySize - Maximum number of states to keep
 */

/**
 * @typedef {Object} OriginalBlockState
 * @property {number} id - Block ID
 * @property {number} x - Original X position
 * @property {number} y - Original Y position
 * @property {number} width - Original width
 * @property {number} height - Original height
 */

/**
 * @typedef {Object} ResizeState
 * @property {number|string} id - Block ID being resized or "selection-bounding-box" for multi-select
 * @property {ResizeString} handle - Resize handle (nw, ne, sw, se, n, s, e, w)
 * @property {number} startWidth - Initial width
 * @property {number} startHeight - Initial height
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 * @property {OriginalBlockState[]} [originalBlocks] - Original block states for multi-select resize
 */

/**
 * @typedef {Object} DragState
 * @property {number} id - Block ID being dragged
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 */

/**
 * @typedef {Object} SelectionBoxState
 * @property {number} startX - Starting X position in canvas coordinates
 * @property {number} startY - Starting Y position in canvas coordinates
 * @property {number} currentX - Current X position in canvas coordinates
 * @property {number} currentY - Current Y position in canvas coordinates
 */

/**
 * @typedef {Object} State
 * @property {Page[]} pages - All pages in the application
 * @property {string} currentPageId - ID of the currently active page
 * @property {MementoManager} mementoManager - Undo/redo manager
 * @property {boolean} isDarkMode - Dark mode toggle
 * @property {boolean} panelsVisible - Whether panels are visible
 * @property {number} programsPanelWidth - Width of programs panel in pixels
 * @property {Block[]|null} clipboard - Copied block data
 * @property {string} programFilter - Filter text for program buttons
 * @property {string|null} notification - Current notification message
 * @property {boolean} notificationVisible - Whether notification is visible
 * @property {string|null} editingPageId - ID of page currently being renamed
 */

/**
 * @typedef {(block: Block, e: {percentX: number, percentY: number}) => {width: number, height: number, x: number, y: number}} ResizeHandler
 */

/**
 * @typedef {"nw"|"ne"|"sw"|"se"|"n"|"s"|"e"|"w"} ResizeString
 */

/**
 * @typedef {Object} AppDispatchEventDetail
 * @property {State} state - doesn't include program states
 * @property {import("hyperapp").Action<State>} action
 * @property {any} payload
 * @property {State} prevState - doesn't include program states
 */

/**
 * @template S
 * @typedef Program
 * @property {S} initialState
 * @property {((state: S) => import("hyperapp").ElementVNode<S>)[]} views
 * worry about subscriptions later, i don't really use them
 */
