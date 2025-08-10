import { AbstractProgram } from "../abstractProgram.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {any[]} history - Array of historical states
 * @property {number} currentIndex - Current position in history (0 = oldest, length-1 = newest)
 * @property {number} maxHistorySize - Maximum number of states to keep in history
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      history: [],
      currentIndex: -1,
      maxHistorySize: 100,
    };
    /** @type {import("../abstractProgram.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: AbstractProgram,
      },
    ];
    this.view = this.#main;
    this.subscriptions = () => {
      return [this.onConnectionStateChange("default", this.#recordStateChange)];
    };
  }

  /**
   * @param {State} state
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h(
      "section",
      {
        style: {
          padding: "20px",
          height: "100%",
          fontFamily: "monospace",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        },
      },
      [
        this.#renderHeader(),
        state.history.length > 0
          ? this.#renderSliderContainer(state)
          : this.#renderEmptyState(),
      ],
    );

  /**
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #renderHeader = () =>
    h("h3", { style: { margin: "0 0 20px 0" } }, text("History"));

  /**
   * @param {State} state
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #renderSliderContainer = (state) =>
    h(
      "div",
      {
        style: {
          marginBottom: "20px",
        },
      },
      [this.#renderSliderLabel(state), this.#renderSlider(state)],
    );

  /**
   * @param {State} state
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #renderSliderLabel = (state) =>
    h(
      "label",
      {
        style: {
          display: "block",
          marginBottom: "10px",
          fontWeight: "bold",
        },
      },
      text(
        `Current position: ${state.currentIndex + 1}/${state.history.length}`,
      ),
    );

  /**
   * @param {State} state
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #renderSlider = (state) =>
    h("input", {
      type: "range",
      min: "0",
      max: String(state.history.length - 1),
      value: String(Math.max(0, state.currentIndex)),
      style: {
        width: "100%",
        height: "30px",
        marginBottom: "10px",
      },
      oninput: (/** @type {State} */ state, /** @type {Event} */ event) =>
        this.#navigateToHistoryIndex(
          state,
          parseInt(/** @type {HTMLInputElement} */ (event.target).value),
        ),
    });

  /**
   * @return {import("hyperapp").ElementVNode<State>}
   */
  #renderEmptyState = () =>
    h(
      "div",
      {
        style: {
          padding: "20px",
          textAlign: "center",
          fontStyle: "italic",
        },
      },
      text("No history recorded yet. Connect to a program to start recording."),
    );

  /**
   * @param {State} state
   * @param {any} connectedState
   * @returns {State}
   */
  #recordStateChange = (state, connectedState) => {
    // Create a deep copy of the connected state
    const stateCopy = JSON.parse(JSON.stringify(connectedState));

    // Don't record if the state hasn't actually changed
    if (state.history.length > 0) {
      const lastState = state.history[state.history.length - 1];
      if (JSON.stringify(lastState) === JSON.stringify(stateCopy)) {
        return state;
      }
    }

    let newHistory = [...state.history, stateCopy];

    // Trim history if it exceeds max size
    if (newHistory.length > state.maxHistorySize) {
      newHistory = newHistory.slice(-state.maxHistorySize);
    }

    return {
      ...state,
      history: newHistory,
      currentIndex: newHistory.length - 1,
    };
  };

  /**
   * @param {State} state
   * @param {number} index
   * @returns {State}
   */
  #navigateToHistoryIndex = (state, index) => {
    if (index < 0 || index >= state.history.length) {
      return state;
    }

    const connectedProgramInstance = this.getConnection("default");
    if (!connectedProgramInstance) {
      return state;
    }

    // Apply the historical state to the connected program
    const historicalState = state.history[index];
    connectedProgramInstance.modifyState(historicalState);

    return {
      ...state,
      currentIndex: index,
    };
  };
}
