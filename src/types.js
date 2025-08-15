/**
 * @typedef {Object} Block
 * @property {number} id - Unique block identifier
 * @property {number} width - Block width in pixels
 * @property {number} height - Block height in pixels
 * @property {number} x - X position on canvas
 * @property {number} y - Y position on canvas
 * @property {number} zIndex - Stacking order (higher = front)
 * @property {ProgramData} programData - Associated program data
 */

/**
 * @typedef {Object} ProgramData - Data for Hyperapp Program
 * @property {string} name - Unique program name for mounting hyperapp program
 * @property {Object | null} state - State of hyperapp program instance, constantly synced.
 * If 'null', the program will be mounted with its default state.
 * This is state value only impacts the state of program on mount, i.e. it cannot be edited to edit the state of a program
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
 * @property {number} lastX - Last mouse X position
 * @property {number} lastY - Last mouse Y position
 * @property {string} cursorStyle - Current cursor style
 * @property {boolean} isViewportDragging - Whether viewport is being dragged
 * @property {boolean} isBlockDragging - Whether a block is being dragged
 * @property {boolean} isShiftPressed - Whether shift key is currently pressed
 * @property {number|null} selectedId - ID of selected block
 * @property {number|null} editingId - ID of block in edit mode
 * @property {number|null} hoveringId - ID of hovered block
 * @property {number|null} connectingId - ID of block in connect mode (pending connection)
 * @property {ResizeState|null} resizing - Current resize operation
 * @property {DragState|null} dragStart - Drag operation start state
 * @property {ResizeStartState|null} resizeStart - Resize operation start state
 */

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
 * @typedef {Object} ResizeState
 * @property {number} id - Block ID being resized
 * @property {string} handle - Resize handle (nw, ne, sw, se, n, s, e, w)
 */

/**
 * @typedef {Object} DragState
 * @property {number} id - Block ID being dragged
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 */

/**
 * @typedef {Object} ResizeStartState
 * @property {number} id - Block ID
 * @property {number} startWidth - Initial width
 * @property {number} startHeight - Initial height
 * @property {number} startX - Initial X position
 * @property {number} startY - Initial Y position
 */

/**
 * @typedef {Object} State
 * @property {Page[]} pages - All pages in the application
 * @property {string} currentPageId - ID of the currently active page
 * @property {MementoManager} mementoManager - Undo/redo manager
 * @property {boolean} isDarkMode - Dark mode toggle
 * @property {boolean} panelsVisible - Whether panels are visible
 * @property {number} programsPanelWidth - Width of programs panel in pixels
 * @property {Block|null} clipboard - Copied block data
 * @property {string} programFilter - Filter text for program buttons
 * @property {string|null} notification - Current notification message
 * @property {boolean} notificationVisible - Whether notification is visible
 */

/**
 * @typedef {(block: Block, e: {percentX: number, percentY: number}) => {width: number, height: number, x: number, y: number}} ResizeHandler
 */

/**
 * @typedef {Object} AllowedConnection
 * @property {String} name
 * @property {typeof import('./programBase.js').ProgramBase} program
 */
