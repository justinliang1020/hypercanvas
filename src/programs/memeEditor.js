import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String} topText
 * @property {String} bottomText
 */

/** @type {Program<ProgramState>} */
export const MemeEditorProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    topText: "",
    bottomText: "",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [stateVisualizer, meme, bottomTextEditor, topTextEditor],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function meme(state) {
  /** @type {import("hyperapp").StyleProp} */
  const textStyle = {
    margin: "0",
    textAlign: "center",
    fontSize: "60px",
    font: "bold",
    color: "magenta",
  };

  return h(
    "div",
    {
      style: {
        width: "100%",
        height: "100%",
        backgroundImage: "url(./assets/sun-cat.jpg)",
      },
    },
    [
      h(
        "div",
        {
          style: {
            display: "flex",
            flexDirection: "column",
            height: "100%",
            justifyContent: "space-between",
          },
        },
        [
          h(
            "p",
            {
              style: textStyle,
            },
            text(state.topText),
          ),
          h(
            "p",
            {
              style: textStyle,
            },
            text(state.bottomText),
          ),
        ],
      ),
    ],
  );
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function topTextEditor(state) {
  return h("div", {}, [
    h("p", {}, text("top text editor")),
    textBox(state, "topText"),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function bottomTextEditor(state) {
  return h("div", {}, [
    h("p", {}, text("bottom text editor")),
    textBox(state, "bottomText"),
  ]);
}

/**
 * @param {ProgramState} state
 * @param {"topText" | "bottomText"} text
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function textBox(state, text) {
  return h("textarea", {
    value: state[text],
    style: {
      border: "none",
      resize: "none",
      outline: "none",
      width: "100%",
      height: "100%",
      overflow: null,
      color: "black",
    },
    oninput: (state, event) => {
      const newState = state;
      newState[text] = /** @type {HTMLInputElement} */ (event.target).value;
      return newState;
    },
  });
}
