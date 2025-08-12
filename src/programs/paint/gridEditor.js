import { h, text } from "../../packages/hyperapp/index.js";
import { AbstractProgram } from "../../abstractProgram.js";
import { Program as PaintProgram } from "./paint.js";

/**
 * @typedef State
 * @property {number} width - Grid width value
 * @property {number} height - Grid height value
 * @property {number} cellSize - Cell size value
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      width: 40,
      height: 30,
      cellSize: 16,
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: PaintProgram,
      },
    ];
    this.view = this.#main;
    this.subscriptions = () => {
      return [
        this.onConnectionStateChange("default", this.#updateFromConnectedState),
      ];
    };
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h(
      "section",
      {
        style: {
          padding: "20px",
          height: "100%",
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          flexDirection: "column",
          gap: "20px",
          boxSizing: "border-box",
          backgroundColor: "#f9f9f9",
        },
      },
      [
        h("h3", { style: { margin: "0", color: "#333" } }, text("Grid Editor")),
        this.#inputGroup("Width", state.width, this.#updateWidth),
        this.#inputGroup("Height", state.height, this.#updateHeight),
        this.#inputGroup("Cell Size", state.cellSize, this.#updateCellSize),
      ],
    );

  /**
   * @param {string} label
   * @param {number} value
   * @param {function} updateFn
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #inputGroup = (label, value, updateFn) =>
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "8px",
        },
      },
      [
        h(
          "label",
          {
            style: {
              fontSize: "14px",
              fontWeight: "500",
              color: "#555",
            },
          },
          text(`${label}: ${value}`),
        ),
        h("input", {
          type: "range",
          value: value.toString(),
          min: label === "Cell Size" ? "1" : "1",
          max: label === "Cell Size" ? "50" : "100",
          style: {
            width: "200px",
          },
          oninput: (/** @type {State} */ state, /** @type {Event} */ event) =>
            updateFn(
              state,
              parseInt(/** @type {HTMLInputElement} */ (event.target).value) ||
                1,
            ),
        }),
      ],
    );

  /**
   * @param {State} state
   * @param {any} connectedState
   * @return {State}
   */
  #updateFromConnectedState = (state, connectedState) => {
    return {
      ...state,
      width: connectedState.gridWidth || state.width,
      height: connectedState.gridHeight || state.height,
      cellSize: connectedState.cellSize || state.cellSize,
    };
  };

  /**
   * @param {State} state
   * @param {number} newWidth
   * @return {State}
   */
  #updateWidth = (state, newWidth) => {
    const newState = {
      ...state,
      width: Math.max(1, Math.min(100, newWidth)),
    };
    this.#applyChanges(newState);
    return newState;
  };

  /**
   * @param {State} state
   * @param {number} newHeight
   * @return {State}
   */
  #updateHeight = (state, newHeight) => {
    const newState = {
      ...state,
      height: Math.max(1, Math.min(100, newHeight)),
    };
    this.#applyChanges(newState);
    return newState;
  };

  /**
   * @param {State} state
   * @param {number} newCellSize
   * @return {State}
   */
  #updateCellSize = (state, newCellSize) => {
    const newState = {
      ...state,
      cellSize: Math.max(1, Math.min(50, newCellSize)),
    };
    this.#applyChanges(newState);
    return newState;
  };

  /**
   * @param {State} state
   * @return {State}
   */
  #applyChanges = (state) => {
    const connectedPaintProgram = this.getConnection("default");
    if (!connectedPaintProgram) return state;
    const connectedPaintProgramState = connectedPaintProgram.getState();

    connectedPaintProgram.modifyState({
      ...connectedPaintProgramState,
      gridWidth: state.width,
      gridHeight: state.height,
      cellSize: state.cellSize,
    });

    return state;
  };
}
