import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} url
 * @property {string} inputUrl
 */

export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      url: "https://www.justinliang.me/",
      inputUrl: "https://www.justinliang.me/",
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    this.subscriptions = () => {
      return [];
    };
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h(
      "div",
      {
        style: {
          height: "100%",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        },
      },
      [this.#UrlForm(state), this.#IframeDisplay(state.url)],
    );

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #UrlForm = (state) =>
    h(
      "form",
      {
        style: {
          display: "flex",
          gap: "4px",
          marginBottom: "4px",
        },
        onsubmit: (/** @type {State} */ state, /** @type {Event} */ event) => {
          event.preventDefault();
          return {
            ...state,
            url: state.inputUrl,
          };
        },
      },
      [
        h("input", {
          type: "text",
          placeholder: "Enter URL...",
          value: state.inputUrl,
          style: {
            flex: "1",
            padding: "8px",
            border: "1px solid #ccc",
            borderRadius: "4px",
            fontSize: "14px",
            boxSizing: "border-box",
          },
          oninput: (
            /** @type {State} */ state,
            /** @type {Event} */ event,
          ) => ({
            ...state,
            inputUrl: /** @type {HTMLInputElement} */ (event.target).value,
          }),
        }),
        h(
          "button",
          {
            type: "submit",
            style: {
              padding: "8px 16px",
              border: "1px solid #ccc",
              borderRadius: "4px",
              fontSize: "14px",
              backgroundColor: "#f5f5f5",
              cursor: "pointer",
              boxSizing: "border-box",
            },
          },
          text("Go"),
        ),
      ],
    );

  /**
   * @param {string} url
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #IframeDisplay = (url) =>
    url
      ? h("iframe", {
          src: url,
          style: {
            flex: "1",
            border: "1px solid #ccc",
            borderRadius: "4px",
            boxSizing: "border-box",
          },
        })
      : h(
          "div",
          {
            style: {
              flex: "1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#666",
              border: "1px solid #ccc",
              borderRadius: "4px",
              boxSizing: "border-box",
            },
          },
          text("Enter a URL to load content"),
        );
}
