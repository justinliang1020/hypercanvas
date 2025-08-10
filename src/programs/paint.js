import { h, text } from "../packages/hyperapp/index.js";

import { AbstractProgram } from "../abstractProgram.js";

/**
 * @typedef State
 * @property {Object<string, string>} paintedCells - Object of "x,y" coordinates to color values
 * @property {number} gridWidth - Number of cells horizontally
 * @property {number} gridHeight - Number of cells vertically
 * @property {number} cellSize - Size of each cell in pixels
 * @property {boolean} isDragging - Whether the user is currently dragging
 * @property {'paint'|'erase'|'fill'} tool - Current selected tool
 * @property {string} selectedColor - Currently selected color
 * @property {string[]} colorPalette - Available colors
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
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
      paintedCells: {},
    };
    /** @type {import("../abstractProgram.js").AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) => {
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
      [this.#toolbar(state), this.#canvasContainer(state)],
    );
  };

  /**
   * Flood fill algorithm to fill connected cells of the same color
   * @param {Object<string, string>} paintedCells - Current painted cells
   * @param {number} startX - Starting x coordinate
   * @param {number} startY - Starting y coordinate
   * @param {string} targetColor - Color to replace
   * @param {string} fillColor - Color to fill with
   * @param {number} gridWidth - Grid width boundary
   * @param {number} gridHeight - Grid height boundary
   * @returns {Object<string, string>} Updated painted cells
   */
  #floodFill = (
    paintedCells,
    startX,
    startY,
    targetColor,
    fillColor,
    gridWidth,
    gridHeight,
  ) => {
    if (targetColor === fillColor) return paintedCells;

    const newPaintedCells = { ...paintedCells };
    const stack = [[startX, startY]];
    const visited = new Set();

    while (stack.length > 0) {
      const coords = stack.pop();
      if (!coords) continue;
      const [x, y] = coords;
      const key = `${x},${y}`;

      if (
        x < 0 ||
        x >= gridWidth ||
        y < 0 ||
        y >= gridHeight ||
        visited.has(key)
      ) {
        continue;
      }

      const currentColor = paintedCells[key] || "#ffffff";
      if (currentColor !== targetColor) {
        continue;
      }

      visited.add(key);
      newPaintedCells[key] = fillColor;

      // Add adjacent cells to stack
      stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }

    return newPaintedCells;
  };

  /**
   * Applies the current tool (paint, erase, or fill) to a cell at the given coordinates
   * @param {State} currentState - The current application state
   * @param {number} x - The x coordinate of the cell
   * @param {number} y - The y coordinate of the cell
   * @returns {State} The updated state with the tool applied
   */
  #applyTool = (currentState, x, y) => {
    const key = `${x},${y}`;
    let newPaintedCells = { ...currentState.paintedCells };

    if (currentState.tool === "paint") {
      newPaintedCells[key] = currentState.selectedColor;
    } else if (currentState.tool === "erase") {
      delete newPaintedCells[key];
    } else if (currentState.tool === "fill") {
      const targetColor = currentState.paintedCells[key] || "#ffffff";
      newPaintedCells = this.#floodFill(
        currentState.paintedCells,
        x,
        y,
        targetColor,
        currentState.selectedColor,
        currentState.gridWidth,
        currentState.gridHeight,
      );
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
  #getButtonStyle = (isActive) => ({
    padding: "6px 12px",
    border: isActive ? "2px solid #007acc" : "1px solid #ccc",
    backgroundColor: isActive ? "#e6f3ff" : "#ffffff",
    borderRadius: "3px",
    cursor: "pointer",
    fontSize: "12px",
  });

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #buttons = (state) =>
    h(
      "div",
      {
        style: { display: "flex", gap: "4px" },
      },
      [
        h(
          "button",
          {
            style: this.#getButtonStyle(state.tool === "paint"),
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
            style: this.#getButtonStyle(state.tool === "erase"),
            onclick: (currentState) => ({
              ...currentState,
              tool: "erase",
            }),
          },
          text("Erase"),
        ),
        h(
          "button",
          {
            style: this.#getButtonStyle(state.tool === "fill"),
            onclick: (currentState) => ({
              ...currentState,
              tool: "fill",
            }),
          },
          text("Fill"),
        ),
        h(
          "button",
          {
            style: this.#getButtonStyle(false),
            onclick: (currentState) => ({
              ...currentState,
              paintedCells: {},
            }),
          },
          text("Erase All"),
        ),
      ],
    );

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #colorPalette = (state) =>
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
            onclick: (currentState) => {
              return {
                ...currentState,
                selectedColor: color,
              };
            },
          },
          [],
        ),
      ),
    );

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #toolbar = (state) =>
    h(
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
      [this.#buttons(state), this.#colorPalette(state)],
    );

  /**
   * @param {State} state
   * @returns {Array<import("hyperapp").ElementVNode<State>>}
   */
  #cells = (state) =>
    Array.from({ length: state.gridHeight }, (_, y) =>
      Array.from({ length: state.gridWidth }, (_, x) => {
        const key = `${x},${y}`;
        const cellColor = state.paintedCells[key];

        return h("div", {
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
          onmousedown: (currentState, event) => {
            event.preventDefault();
            const newState = this.#applyTool(currentState, x, y);
            return {
              ...newState,
              isDragging: true,
            };
          },
          onmouseenter: (currentState) => {
            if (currentState.isDragging) {
              return this.#applyTool(currentState, x, y);
            }
            return currentState;
          },
        });
      }),
    ).flat();

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #canvasContainer = (state) =>
    h(
      "div",
      {
        style: {
          position: "absolute",
          top: "0",
          left: "0",
          width: `${state.gridWidth * state.cellSize}px`,
          height: `${state.gridHeight * state.cellSize}px`,
          margin: "80px 20px 20px 20px",
          border: "3px solid #333", // border size needs to be 3px or greater to avoid visual artifact glitch when zooming out
          backgroundColor: "#ffffff",
        },
        onmouseup: (currentState) => ({
          ...currentState,
          isDragging: false,
        }),
        onmouseleave: (currentState) => ({
          ...currentState,
          isDragging: false,
        }),
      },
      this.#cells(state),
    );
}
