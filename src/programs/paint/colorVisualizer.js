import { ProgramBase } from "../../programBase.js";
import { h, text } from "../../packages/hyperapp/index.js";
import { Program as PaintProgram } from "./paint.js";

/**
 * @typedef State
 * @property {Object<string, number>} colorCounts - Count of each color
 * @property {number} totalCells - Total number of painted cells
 * @property {number} unpaintedCount - Total number of unpainted cells
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      colorCounts: {},
      totalCells: 0,
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
      return [this.onConnectionStateChange("default", this.#updateColorCounts)];
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
          fontFamily: "system-ui, -apple-system, sans-serif",
          backgroundColor: "#f9f9f9",
          height: "100%",
          boxSizing: "border-box",
          overflow: "auto",
        },
      },
      [
        h(
          "h3",
          {
            style: {
              margin: "0 0 20px 0",
              color: "#333",
              fontSize: "18px",
            },
          },
          text("Paint Color Analysis"),
        ),
        state.totalCells === 0
          ? h(
              "p",
              {
                style: {
                  color: "#666",
                  fontStyle: "italic",
                },
              },
              text("No painted cells to analyze"),
            )
          : this.#colorStats(state),
      ],
    );

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #colorStats = (state) =>
    h(
      "div",
      {
        style: {
          display: "flex",
          flexDirection: "column",
          gap: "12px",
        },
      },
      [
        h(
          "div",
          {
            style: {
              fontSize: "14px",
              color: "#666",
              marginBottom: "8px",
            },
          },
          text(`Total painted cells: ${state.totalCells}`),
        ),
        h(
          "div",
          {
            style: {
              fontSize: "14px",
              color: "#666",
              marginBottom: "8px",
            },
          },
          text(`Total unpainted cells: ${state.unpaintedCount}`),
        ),
        ...Object.entries(state.colorCounts)
          .sort(([, a], [, b]) => b - a)
          .map(([color, count]) =>
            this.#colorRow(color, count, state.totalCells),
          ),
      ],
    );

  /**
   * @param {string} color
   * @param {number} count
   * @param {number} total
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #colorRow = (color, count, total) => {
    const percentage = ((count / total) * 100).toFixed(1);

    return h(
      "div",
      {
        style: {
          display: "flex",
          alignItems: "center",
          gap: "12px",
          padding: "8px",
          backgroundColor: "#ffffff",
          border: "1px solid #e0e0e0",
          borderRadius: "6px",
          boxShadow: "0 1px 2px rgba(0,0,0,0.05)",
        },
      },
      [
        h("div", {
          style: {
            width: "24px",
            height: "24px",
            backgroundColor: color,
            border: "2px solid #333",
            borderRadius: "4px",
            flexShrink: "0",
          },
        }),
        h(
          "div",
          {
            style: {
              flex: "1",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
            },
          },
          [
            h(
              "span",
              {
                style: {
                  fontFamily: "monospace",
                  fontSize: "13px",
                  color: "#666",
                },
              },
              text(color.toUpperCase()),
            ),
            h(
              "div",
              {
                style: {
                  display: "flex",
                  gap: "16px",
                  alignItems: "center",
                },
              },
              [
                h(
                  "span",
                  {
                    style: {
                      fontSize: "14px",
                      fontWeight: "600",
                      color: "#333",
                    },
                  },
                  text(`${count} cells`),
                ),
                h(
                  "span",
                  {
                    style: {
                      fontSize: "14px",
                      color: "#007acc",
                      fontWeight: "500",
                    },
                  },
                  text(`${percentage}%`),
                ),
              ],
            ),
          ],
        ),
      ],
    );
  };

  /**
   * @param {State} state
   * @param {import("./paint.js").State} paintState
   * @returns {State}
   */
  #updateColorCounts = (state, paintState) => {
    if (!paintState || !paintState.paintedCells) {
      return {
        ...state,
        colorCounts: {},
        totalCells: 0,
      };
    }

    /** @type {Object<string, number>} */
    const colorCounts = {};
    Object.values(paintState.paintedCells).forEach((color) => {
      if (typeof color === "string") {
        colorCounts[color] = (colorCounts[color] || 0) + 1;
      }
    });
    const totalColorCount = Object.values(colorCounts).reduce(
      (acc, val) => acc + val,
      0,
    );
    const unpaintedCount =
      paintState.gridWidth * paintState.gridHeight - totalColorCount;

    return {
      ...state,
      colorCounts,
      totalCells: Object.keys(paintState.paintedCells).length,
      unpaintedCount,
    };
  };
}
