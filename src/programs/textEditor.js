import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String} value
 * @property {String} color
 * @property {String} backgroundColor
 * @property {Number} fontSize
 */

/** @type {Program<ProgramState>} */
export const TextEditorProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    value: "hello world",
    color: "inherit",
    backgroundColor: "transparent",
    fontSize: 12,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [textBox, stateVisualizer, reset, editor],
};

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function textBox(state) {
  return h("textarea", {
    value: state.value,
    style: {
      backgroundColor: state.backgroundColor,
      border: "none",
      resize: "none",
      outline: "none",
      width: "100%",
      height: "100%",
      overflow: null,
      color: state.color,
      fontSize: `${state.fontSize}px`,
    },
    oninput: (state, event) => ({
      ...state,
      value: /** @type {HTMLInputElement} */ (event.target).value,
    }),
  });
}

/**
 * returns whether a string is like "#rrggbb"
 * @param {String} s
 * @returns {Boolean}
 */
function isHex(s) {
  //this is kinda a dumb check, a more accurate check would verify if characters are actually 0-f
  try {
    return s[0] === "#" && s.length === 7;
  } catch {
    return false;
  }
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function editor(state) {
  return h("div", {}, [
    h("p", {}, text("color")),
    h("input", {
      type: "text",
      value: state.color,
      oninput: (state, event) => ({
        ...state,
        color: /** @type {HTMLInputElement} */ (event.target).value,
      }),
    }),
    h("input", {
      type: "color",
      value: isHex(state.color) ? state.color : "#000000",
      oninput: (state, event) => ({
        ...state,
        color: /** @type{HTMLInputElement}*/ (event.target).value,
      }),
    }),
    h("hr", {}),
    h("p", {}, text("backgroundColor")),
    h("input", {
      type: "text",
      value: state.backgroundColor,
      oninput: (state, event) => ({
        ...state,
        backgroundColor: /** @type {HTMLInputElement} */ (event.target).value,
      }),
    }),
    h("input", {
      type: "color",
      value: isHex(state.backgroundColor) ? state.backgroundColor : "#000000",
      oninput: (state, event) => ({
        ...state,
        backgroundColor: /** @type{HTMLInputElement}*/ (event.target).value,
      }),
    }),
    h("hr", {}),
    h("p", {}, text("fontSize")),
    h("input", {
      type: "text",
      value: state.fontSize,
      oninput: (state, event) => ({
        ...state,
        fontSize: Number(/** @type {HTMLInputElement} */ (event.target).value),
      }),
    }),
    fontSizeSelect(state),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function fontSizeSelect(state) {
  const options = [8, 12, 14, 18, 22, 24, 36];
  return h(
    "select",
    {
      value: state.fontSize,
      onchange: (state, event) => {
        //@ts-ignore TODO: fix
        return {
          ...state,
          fontSize: Number(
            /** @type {HTMLInputElement} */ (event.target).value,
          ),
        };
      },
    },
    options.map((o) =>
      h(
        "option",
        {
          value: o,
        },
        text(o),
      ),
    ),
  );
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
//TODO: make this generic in utils.js
function reset(state) {
  /**
   * @param {ProgramState} state
   * @returns {ProgramState}
   */
  function resetState(state) {
    return TextEditorProgram.initialState;
  }
  return h("button", { onclick: resetState }, text("reset"));
}
