import { AbstractProgram } from "../abstractProgram.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} connectedState - JSON string representation of connected program state
 * @property {string} editableState - Editable JSON string in textarea
 * @property {string|null} error - Error message for invalid JSON
 */

export class StateEditorProgram extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      connectedState: "{}",
      editableState: "{}",
      error: null,
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
      return [
        this.onConnectionStateChange("default", this.#updateConnectedState),
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
          padding: "10px",
          height: "100%",
          fontFamily: "monospace",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        },
      },
      [
        h("h3", {}, text("State Editor")),
        h(
          "button",
          {
            style: {
              margin: "10px 0",
              padding: "8px 16px",
              backgroundColor: state.error ? "#ccc" : "#007acc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: state.error ? "not-allowed" : "pointer",
              width: "fit-content",
            },
            disabled: !!state.error,
            onclick: (/** @type {State} */ state) =>
              this.#applyStateChanges(state),
          },
          text("Apply Changes"),
        ),
        h("textarea", {
          style: {
            flex: "1",
            minHeight: "0",
            padding: "10px",
            border: state.error ? "3px solid #ff6b6b" : "3px solid #ccc",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "12px",
            resize: "vertical",
            boxSizing: "border-box",
          },
          value: state.editableState,
          oninput: (/** @type {State} */ state, /** @type {Event} */ event) =>
            this.#updateEditableState(
              state,
              /** @type {HTMLTextAreaElement} */ (event.target).value,
            ),
        }),
        state.error
          ? h(
              "div",
              {
                style: {
                  color: "#ff6b6b",
                  marginTop: "5px",
                  fontSize: "12px",
                },
              },
              text(state.error),
            )
          : null,
      ],
    );

  /**
   * @param {State} state
   * @param {any} connectedState
   * @return {State}
   */
  #updateConnectedState = (state, connectedState) => {
    const jsonString = JSON.stringify(connectedState, null, 2);
    return {
      ...state,
      connectedState: jsonString,
      editableState:
        state.editableState === state.connectedState
          ? jsonString
          : state.editableState,
    };
  };

  /**
   * @param {State} state
   * @param {string} newValue
   * @return {State}
   */
  #updateEditableState = (state, newValue) => {
    let error = null;
    try {
      JSON.parse(newValue);
    } catch (e) {
      error = `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`;
    }
    return {
      ...state,
      editableState: newValue,
      error,
    };
  };

  /**
   * @param {State} state
   * @return {State}
   */
  #applyStateChanges = (state) => {
    const connectedProgramInstance = this.getConnection("default");
    if (!connectedProgramInstance) return state;
    const parsedState = JSON.parse(state.editableState);
    connectedProgramInstance.modifyState(parsedState);
    return state;
  };
}
