import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {{actionName: string, diff: {path: string, value: any}[], count: number, timestamp: number}[]} groupedActions
 * @property {string[]} uniqueActionNames
 * @property {boolean} isPaused
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      groupedActions: [],
      uniqueActionNames: [],
      isPaused: false,
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    this.subscriptions = () => {
      return [this.onAppDispatch(this.#updateAppState)];
    };
  }

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #main = (state) => {
    //@ts-ignore
    const isDarkMode = document
      .querySelector("main")
      .classList.contains("dark-mode");
    if (state.groupedActions.length === 0) {
      return h(
        "div",
        { style: { padding: "10px", fontFamily: "monospace" } },
        text("No actions yet"),
      );
    }

    return h(
      "div",
      {
        style: {
          padding: "10px",
          fontFamily: "monospace",
          fontSize: "11px",
          height: "100%",
          overflow: "auto",
          boxSizing: "border-box",
        },
      },
      [
        h(
          "div",
          {
            style: {
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              margin: "0 0 10px 0",
            },
          },
          [
            h(
              "h3",
              {
                style: {
                  margin: "0",
                  color: isDarkMode ? "#e0e0e0" : "#333",
                },
              },
              text("App Actions Timeline"),
            ),
            h(
              "button",
              {
                style: {
                  padding: "4px 8px",
                  backgroundColor: state.isPaused ? "#f44336" : "#4caf50",
                  color: "white",
                  border: "none",
                  borderRadius: "4px",
                  cursor: "pointer",
                  fontSize: "11px",
                },
                onclick: (/** @type {ProgramState} */ state) => ({
                  ...state,
                  isPaused: !state.isPaused,
                }),
              },
              text(state.isPaused ? "Resume" : "Pause"),
            ),
          ],
        ),
        this.#renderTable(state),
      ],
    );
  };

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #renderTable = (state) => {
    const columnWidth = Math.max(
      120,
      Math.floor(
        (window.innerWidth - 100) / Math.max(state.uniqueActionNames.length, 1),
      ),
    );
    //@ts-ignore
    const isDarkMode = document
      .querySelector("main")
      .classList.contains("dark-mode");

    return h(
      "table",
      {
        style: {
          borderCollapse: "collapse",
          width: "100%",
          border: isDarkMode ? "1px solid #666" : "1px solid #ccc",
        },
      },
      [
        this.#renderTableHeader(state, columnWidth),
        this.#renderTableBody(state, columnWidth),
      ],
    );
  };

  /**
   * @param {ProgramState} state
   * @param {number} columnWidth
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #renderTableHeader = (state, columnWidth) => {
    //@ts-ignore
    const isDarkMode = document
      .querySelector("main")
      .classList.contains("dark-mode");

    return h(
      "thead",
      {
        style: {
          position: "sticky",
          top: "0",
          zIndex: "1",
        },
      },
      h(
        "tr",
        {
          style: {
            backgroundColor: isDarkMode ? "#444" : "#f5f5f5",
            color: isDarkMode ? "#e0e0e0" : "#333",
          },
        },
        [
          h(
            "th",
            {
              style: {
                border: isDarkMode ? "1px solid #666" : "1px solid #ccc",
                padding: "8px 4px",
                textAlign: "left",
                fontWeight: "bold",
                width: "60px",
                fontSize: "10px",
                color: isDarkMode ? "#e0e0e0" : "#333",
              },
            },
            text("Time"),
          ),
          ...state.uniqueActionNames.map((actionName) =>
            h(
              "th",
              {
                style: {
                  border: isDarkMode ? "1px solid #666" : "1px solid #ccc",
                  padding: "8px 4px",
                  textAlign: "center",
                  fontWeight: "bold",
                  width: `${columnWidth}px`,
                  fontSize: "10px",
                  wordBreak: "break-word",
                  color: isDarkMode ? "#e0e0e0" : "#333",
                },
              },
              text(actionName),
            ),
          ),
        ],
      ),
    );
  };

  /**
   * @param {ProgramState} state
   * @param {number} columnWidth
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #renderTableBody = (state, columnWidth) => {
    //@ts-ignore
    const isDarkMode = document
      .querySelector("main")
      .classList.contains("dark-mode");

    return h(
      "tbody",
      {},
      state.groupedActions
        .slice(-50)
        .reverse()
        .map(
          (
            action,
            index, // Show last 50 actions, newest first
          ) =>
            h("tr", { key: `action-${action.timestamp}-${index}` }, [
              h(
                "td",
                {
                  style: {
                    border: isDarkMode ? "1px solid #666" : "1px solid #ccc",
                    padding: "4px",
                    fontSize: "9px",
                    color: isDarkMode ? "#aaa" : "#666",
                    verticalAlign: "top",
                  },
                },
                text(new Date(action.timestamp).toLocaleTimeString()),
              ),
              ...state.uniqueActionNames.map((actionName) => {
                const isActiveAction = action.actionName === actionName;
                return h(
                  "td",
                  {
                    style: {
                      border: isDarkMode ? "1px solid #666" : "1px solid #ccc",
                      padding: "4px",
                      width: `${columnWidth}px`,
                      verticalAlign: "top",
                      backgroundColor: isActiveAction
                        ? isDarkMode
                          ? "#1976d2"
                          : "#e8f4fd"
                        : "transparent",
                    },
                  },
                  isActiveAction ? this.#renderActionCell(action) : null,
                );
              }),
            ]),
        ),
    );
  };

  /**
   * @param {{actionName: string, diff: {path: string, value: any}[], count: number}} action
   * @returns {import("hyperapp").ElementVNode<any>}
   */
  #renderActionCell = (action) => {
    //@ts-ignore
    const isDarkMode = document
      .querySelector("main")
      .classList.contains("dark-mode");

    const maxDiffLength = 6;

    return h("div", {}, [
      action.count > 1
        ? h(
            "div",
            {
              style: {
                fontSize: "9px",
                fontWeight: "bold",
                color: isDarkMode ? "#64b5f6" : "#0066cc",
                marginBottom: "2px",
              },
            },
            text(`×${action.count}`),
          )
        : null,
      ...action.diff.slice(0, maxDiffLength).map(
        (
          change,
          index, // Show first 3 changes
        ) =>
          h(
            "div",
            {
              key: `change-${index}`,
              style: {
                fontSize: "9px",
                marginBottom: "1px",
                color: isDarkMode ? "#e0e0e0" : "#333",
                wordBreak: "break-word",
              },
            },
            text(`${change.path}: ${this.#formatValue(change.value)}`),
          ),
      ),
      action.diff.length > maxDiffLength
        ? h(
            "div",
            {
              style: {
                fontSize: "8px",
                color: isDarkMode ? "#aaa" : "#999",
                fontStyle: "italic",
              },
            },
            text(`+${action.diff.length - 3} more...`),
          )
        : null,
    ]);
  };

  /**
   * @param {any} value
   * @returns {string}
   */
  #formatValue = (value) => {
    if (value === undefined) return "undefined";
    if (value === null) return "null";
    if (typeof value === "string")
      return `"${value.length > 20 ? value.slice(0, 20) + "..." : value}"`;
    if (typeof value === "object")
      return JSON.stringify(value).slice(0, 30) + "...";
    return String(value);
  };

  /**
   * @param {ProgramState} state
   * @param {AppDispatchEventDetail} payload
   * @returns {ProgramState}
   */
  #updateAppState = (state, payload) => {
    // If paused, don't process new diffs
    if (state.isPaused) {
      return state;
    }

    const diff = this.#calculateDiff(payload.prevState, payload.state);
    const actionName = payload.action.name;
    const timestamp = Date.now();

    const lastAction = state.groupedActions.at(-1);
    let newGroupedActions;

    // Check if we can deduplicate with the last action
    if (lastAction && lastAction.actionName === actionName) {
      // Merge consecutive actions of the same type
      const mergedDiff = this.#mergeDiffs(lastAction.diff, diff);
      newGroupedActions = [
        ...state.groupedActions.slice(0, -1),
        {
          actionName,
          diff: mergedDiff,
          count: lastAction.count + 1,
          timestamp: lastAction.timestamp, // Keep original timestamp for grouping
        },
      ];
    } else {
      // Add new action
      newGroupedActions = [
        ...state.groupedActions,
        {
          actionName,
          diff,
          count: 1,
          timestamp,
        },
      ];
    }

    // Limit to last 1000 actions
    if (newGroupedActions.length > 1000) {
      newGroupedActions = newGroupedActions.slice(-1000);
    }

    // Update unique action names
    const uniqueActionNames = [
      ...new Set(newGroupedActions.map((action) => action.actionName)),
    ];

    return {
      ...state,
      groupedActions: newGroupedActions,
      uniqueActionNames,
    };
  };

  /**
   * @param {{path: string, value: any}[]} diff1
   * @param {{path: string, value: any}[]} diff2
   * @returns {{path: string, value: any}[]}
   */
  #mergeDiffs = (diff1, diff2) => {
    const pathMap = new Map();

    // Add all diffs from first set
    diff1.forEach((change) => {
      pathMap.set(change.path, change.value);
    });

    // Override with values from second set (latest wins)
    diff2.forEach((change) => {
      pathMap.set(change.path, change.value);
    });

    // Convert back to array
    return Array.from(pathMap.entries()).map(([path, value]) => ({
      path,
      value,
    }));
  };

  /**
   * @param {any} prevState
   * @param {any} state
   * @returns {{path: string, value: any}[]}
   */
  #calculateDiff = (prevState, state) => {
    /** @type {{path: string, value: any}[]} */
    const changes = [];
    this.#findChanges(prevState, state, "", changes);
    return changes;
  };

  /**
   * @param {any} prev
   * @param {any} current
   * @param {string} path
   * @param {{path: string, value: any}[]} changes
   */
  #findChanges = (prev, current, path, changes) => {
    if (prev === current) return;

    if (typeof prev !== typeof current || prev === null || current === null) {
      changes.push({ path: path || ".", value: current });
      return;
    }

    if (Array.isArray(prev) && Array.isArray(current)) {
      if (prev.length !== current.length) {
        changes.push({ path: path || ".", value: current });
        return;
      }
      for (let i = 0; i < current.length; i++) {
        this.#findChanges(prev[i], current[i], `${path}[${i}]`, changes);
      }
      return;
    }

    if (typeof prev === "object" && typeof current === "object") {
      const allKeys = new Set([...Object.keys(prev), ...Object.keys(current)]);
      for (const key of allKeys) {
        const newPath = path ? `${path}.${key}` : `.${key}`;
        if (!(key in prev)) {
          changes.push({ path: newPath, value: current[key] });
        } else if (!(key in current)) {
          changes.push({ path: newPath, value: undefined });
        } else {
          this.#findChanges(prev[key], current[key], newPath, changes);
        }
      }
      return;
    }

    changes.push({ path: path || ".", value: current });
  };
}
