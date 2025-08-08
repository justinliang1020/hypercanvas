import { h, text } from "../packages/hyperapp/index.js";
import { Program } from "./program.js";

/**
 * @typedef State
 * @property {Object<string, string>} paintedCells - Object of "x,y" coordinates to color values
 * @property {number} gridWidth - Number of cells horizontally
 * @property {number} gridHeight - Number of cells vertically
 * @property {number} cellSize - Size of each cell in pixels
 * @property {boolean} isDragging - Whether the user is currently dragging
 * @property {'paint'|'erase'} tool - Current selected tool
 * @property {string} selectedColor - Currently selected color
 * @property {string[]} colorPalette - Available colors
 */

export class PaintProgram extends Program {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      paintedCells: {},
      gridWidth: 40,
      gridHeight: 30,
      cellSize: 16,
      isDragging: false,
      tool: "paint",
      selectedColor: "#000000",
      colorPalette: [
        "#000000", // Black
        "#FFFFFF", // White
        "#FF0000", // Red
        "#00FF00", // Green
        "#0000FF", // Blue
        "#FFFF00", // Yellow
        "#FF00FF", // Magenta
        "#00FFFF", // Cyan
      ],
    };
    /** @type {import("./program.js").AllowedConnection[]} */
    this.allowedConnections = [];

    this.view = (/** @type {State} */ state) => {
      /**
       * Applies the current tool (paint or erase) to a cell at the given coordinates
       * @param {State} currentState - The current application state
       * @param {number} x - The x coordinate of the cell
       * @param {number} y - The y coordinate of the cell
       * @returns {State} The updated state with the tool applied
       */
      const applyTool = (/** @type {State} */ currentState, x, y) => {
        const key = `${x},${y}`;
        const newPaintedCells = { ...currentState.paintedCells };

        if (currentState.tool === "paint") {
          newPaintedCells[key] = currentState.selectedColor;
        } else if (currentState.tool === "erase") {
          delete newPaintedCells[key];
        }

        return {
          ...currentState,
          paintedCells: newPaintedCells,
        };
      };

      /**
       * Creates consistent button styles
       * @param {boolean} isActive - Whether the button is in active state
       * @returns {import("hyperapp").StyleProp} Button style object
       */
      const getButtonStyle = (isActive) => ({
        padding: "6px 12px",
        border: isActive ? "2px solid #007acc" : "1px solid #ccc",
        backgroundColor: isActive ? "#e6f3ff" : "#ffffff",
        borderRadius: "3px",
        cursor: "pointer",
        fontSize: "12px",
      });

      /** @type {import("hyperapp").ElementVNode<State>} */
      const buttons = h(
        "div",
        {
          style: { display: "flex", gap: "4px" },
        },
        [
          h(
            "button",
            {
              style: getButtonStyle(state.tool === "paint"),
              onclick: (state) => ({
                ...state,
                tool: "paint",
              }),
            },
            text("Paint"),
          ),
          h(
            "button",
            {
              style: getButtonStyle(state.tool === "erase"),
              onclick: (/** @type {State} */ currentState) => ({
                ...currentState,
                tool: "erase",
              }),
            },
            text("Erase"),
          ),
        ],
      );

      // Create toolbar
      /** @type {import("hyperapp").ElementVNode<State>} */
      const toolbar = h(
        "div",
        {
          style: {
            position: "absolute",
            top: "10px",
            left: "10px",
            backgroundColor: "#ffffff",
            border: "1px solid #ccc",
            borderRadius: "4px",
            padding: "8px",
            boxShadow: "0 2px 4px rgba(0,0,0,0.1)",
            zIndex: "1000",
            display: "flex",
            alignItems: "center",
            gap: "16px",
          },
        },
        [
          // Tool buttons
          buttons,
          // Color palette
          h(
            "div",
            {
              style: {
                display: "flex",
                gap: "4px",
              },
            },
            state.colorPalette.map((color) =>
              h(
                "div",
                {
                  style: {
                    width: "24px",
                    height: "24px",
                    backgroundColor: color,
                    border:
                      state.selectedColor === color
                        ? "3px solid #007acc"
                        : "1px solid #ccc",
                    borderRadius: "3px",
                    cursor: "pointer",
                    boxSizing: "border-box",
                  },
                  /**
                   * @returns {State}
                   */
                  onclick: (/** @type {State} */ currentState) => {
                    return {
                      ...currentState,
                      selectedColor: color,
                      tool: "paint", // Auto-switch to paint when selecting color
                    };
                  },
                },
                [],
              ),
            ),
          ),
        ],
      );

      // Create canvas cells
      const cells = [];
      for (let y = 0; y < state.gridHeight; y++) {
        for (let x = 0; x < state.gridWidth; x++) {
          const key = `${x},${y}`;
          const cellColor = state.paintedCells[key];

          cells.push(
            h("div", {
              style: {
                position: "absolute",
                left: `${x * state.cellSize}px`,
                top: `${y * state.cellSize}px`,
                width: `${state.cellSize}px`,
                height: `${state.cellSize}px`,
                backgroundColor: cellColor || "#ffffff",
                border: "1px solid #e0e0e0",
                boxSizing: "border-box",
                cursor: state.tool === "paint" ? "crosshair" : "default",
                userSelect: "none",
              },
              onmousedown: (/** @type {State} */ currentState, event) => {
                event.preventDefault();
                const newState = applyTool(currentState, x, y);
                return {
                  ...newState,
                  isDragging: true,
                };
              },
              onmouseenter: (/** @type {State} */ currentState) => {
                if (currentState.isDragging) {
                  return applyTool(currentState, x, y);
                }
                return currentState;
              },
            }),
          );
        }
      }

      const canvasContainer = h(
        "div",
        {
          style: {
            position: "absolute",
            top: "0",
            left: "0",
            width: `${state.gridWidth * state.cellSize}px`,
            height: `${state.gridHeight * state.cellSize}px`,
            margin: "80px 20px 20px 20px",
            border: "2px solid #333",
            backgroundColor: "#ffffff",
          },
          onmouseup: (/** @type {State} */ currentState) => ({
            ...currentState,
            isDragging: false,
          }),
          onmouseleave: (/** @type {State} */ currentState) => ({
            ...currentState,
            isDragging: false,
          }),
        },
        cells,
      );

      return h(
        "div",
        {
          id: "paint-program-container",
          style: {
            position: "relative",
            width: "100%",
            height: "100%",
            overflow: "auto",
            backgroundColor: "#f5f5f5",
          },
        },
        [toolbar, canvasContainer],
      );
    };
  }
}
