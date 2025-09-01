import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer, table } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {string} url
 * @property {string} response
 * @property {boolean} loading
 * @property {string} error
 */

/** @type {Program<ProgramState>} */
export const UrlQueryProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    url: "https://api.are.na/v2/channels/interactive-irl/contents",
    response: "",
    loading: false,
    error: "",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [urlInput, responseDisplay, stateVisualizer],
};

/**
 * Effect that fetches data from a URL
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {string} url
 */
export const fetchUrlEffect = (dispatch, url) => {
  fetch(url)
    .then((response) => response.text())
    .then((data) => {
      dispatch((state) => ({
        ...state,
        response: data,
        loading: false,
        error: "",
      }));
    })
    .catch((error) => {
      dispatch((state) => ({
        ...state,
        response: "",
        loading: false,
        error: error.message,
      }));
    });
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} URL input and query interface
 */
function urlInput(state) {
  return h("div", { style: { padding: "20px" } }, [
    h("h2", {}, text("URL Query Program")),
    h("div", { style: { marginBottom: "10px" } }, [
      h("label", {}, text("URL: ")),
      h("input", {
        type: "text",
        value: state.url,
        style: {
          width: "400px",
          padding: "5px",
          marginLeft: "10px",
        },
        oninput: (state, event) => ({
          ...state,
          url: /** @type {HTMLInputElement} */ (event.target).value,
        }),
      }),
    ]),
    h(
      "button",
      {
        style: {
          padding: "10px 20px",
          marginTop: "10px",
          backgroundColor: state.loading ? "#ccc" : "#007bff",
          color: "white",
          border: "none",
          borderRadius: "4px",
          cursor: state.loading ? "not-allowed" : "pointer",
        },
        disabled: state.loading,
        onclick: (state) => {
          if (!state.url.trim()) {
            return {
              ...state,
              error: "Please enter a valid URL",
            };
          }

          return [
            {
              ...state,
              loading: true,
              error: "",
              response: "",
            },
            [fetchUrlEffect, state.url],
          ];
        },
      },
      text(state.loading ? "Loading..." : "Query URL"),
    ),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Response display
 */
function responseDisplay(state) {
  const children = [];

  if (state.error) {
    children.push(
      h(
        "div",
        {
          style: {
            backgroundColor: "#f8d7da",
            color: "#721c24",
            padding: "10px",
            borderRadius: "4px",
            marginBottom: "10px",
            border: "1px solid #f5c6cb",
          },
        },
        text(`Error: ${state.error}`),
      ),
    );
  }

  if (state.response) {
    children.push(table(JSON.parse(state.response)));
  }

  return h("div", { style: { padding: "20px" } }, [
    h("h3", {}, text("response")),
    ...children,
  ]);
}
