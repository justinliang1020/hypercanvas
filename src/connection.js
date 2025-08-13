import { h } from "./packages/hyperapp/index.js";

/**
 * Adds a connection between two blocks
 * @param {State} state - Current application state
 * @param {string} name - Connection name/type
 * @param {number} sourceBlockId - ID of source block
 * @param {number} targetBlockId - ID of target block
 * @returns {State} Updated state with new connection
 */

export function addConnection(state, name, sourceBlockId, targetBlockId) {
  const connection = {
    name,
    sourceBlockId,
    targetBlockId,
  };
  // TODO: allowed connection logic
  // TODO: multiple connections per program
  return { ...state, connections: [...state.connections, connection] };
}

/**
 * Checks if a block can be connected to from the connecting block
 * @param {State} state - Current application state
 * @param {number} targetBlockId - ID of potential target block
 * @returns {boolean} True if block can be connected to
 */
export function isBlockConnectable(state, targetBlockId) {
  if (state.connectingId === null) return false;
  if (state.connectingId === targetBlockId) return false; // Can't connect to self

  // For now, allow connection to any other block (simple 1-connection rule)
  // In the future, this could check program compatibility, existing connections, etc.
  return true;
}

/**
 * Gets connected block IDs for a given source block
 * @param {State} state - Current application state
 * @param {number} sourceBlockId - ID of source block
 * @returns {number[]} Array of connected block IDs
 */
export function getConnectedBlockIds(state, sourceBlockId) {
  return state.connections
    .filter((conn) => conn.sourceBlockId === sourceBlockId)
    .map((conn) => conn.targetBlockId);
}

/**
 * Creates a connection line component between two blocks
 * @param {State} state - Current application state
 * @param {BlockConnection} connection - Connection data
 * @returns {import("hyperapp").ElementVNode<State>} Connection line element
 */
export function connectionLine(state, connection) {
  const sourceBlock = state.blocks.find(
    (b) => b.id === connection.sourceBlockId,
  );
  const targetBlock = state.blocks.find(
    (b) => b.id === connection.targetBlockId,
  );

  if (!sourceBlock || !targetBlock) {
    return h("div", {}); // Return empty div if blocks not found
  }

  // Calculate center points of blocks
  const sourceX = sourceBlock.x + sourceBlock.width / 2;
  const sourceY = sourceBlock.y + sourceBlock.height / 2;
  const targetX = targetBlock.x + targetBlock.width / 2;
  const targetY = targetBlock.y + targetBlock.height / 2;

  // Calculate line properties
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const length = Math.sqrt(dx * dx + dy * dy);
  const angle = Math.atan2(dy, dx) * (180 / Math.PI);

  // Scale line thickness inversely with zoom to maintain consistent visual appearance
  const lineThickness = 3 / state.zoom;

  return h("div", {
    key: `connection-${connection.sourceBlockId}-${connection.targetBlockId}`,
    style: {
      position: "absolute",
      left: `${sourceX}px`,
      top: `${sourceY}px`,
      width: `${length}px`,
      height: `${lineThickness}px`,
      backgroundColor: "#666",
      transformOrigin: "0 50%",
      transform: `rotate(${angle}deg)`,
      pointerEvents: "none",
      zIndex: "-1", // Behind blocks
    },
  });
}
