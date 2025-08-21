import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {{actionName: string, diff: {path: string, value: any}[]}[]} actionDiffs
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      actionDiffs: [],
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
    const latestAction = state.actionDiffs.at(-1);
    if (!latestAction) {
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
          fontSize: "12px",
          lineHeight: "1.4",
        },
      },
      [
        h(
          "div",
          { style: { fontWeight: "bold", marginBottom: "10px" } },
          text(`Action: ${latestAction.actionName}`),
        ),
        h(
          "div",
          { style: { marginBottom: "5px", fontWeight: "bold" } },
          text("Changes:"),
        ),
        ...latestAction.diff.map((change) =>
          h(
            "div",
            { style: { marginBottom: "2px" } },
            text(`${change.path} - ${JSON.stringify(change.value)}`),
          ),
        ),
      ],
    );
  };

  /**
   * @param {ProgramState} state
   * @param {AppDispatchEventDetail} payload
   * @returns {ProgramState}
   */
  #updateAppState = (state, payload) => {
    const diff = this.#calculateDiff(payload.prevState, payload.state);
    const newActionDiffs = [
      ...state.actionDiffs,
      {
        actionName: payload.action.name,
        diff,
      },
    ];

    return {
      ...state,
      actionDiffs:
        newActionDiffs.length > 1000
          ? newActionDiffs.slice(-1000)
          : newActionDiffs,
    };
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
