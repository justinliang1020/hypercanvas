import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String} color
 * @property {String} backgroundColor
 * @property {Number} fontSize
 */

/**
 * @typedef TextProps
 * @property {String} textValue
 * @property {String} color
 * @property {String} backgroundColor
 * @property {Number} fontSize
 */

/** @type {TextProps} */
const textProps = {
  textValue: "hello world",
  color: "inherit",
  backgroundColor: "transparent",
  fontSize: 12,
};

/**
 * @param {ProgramState} state
 * @param {TextProps} props
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function textNode(state, props) {
  return h(
    "p",
    {
      style: {
        backgroundColor: props.backgroundColor,
        border: "none",
        resize: "none",
        outline: "none",
        width: "100%",
        height: "100%",
        margin: "0",
        overflow: null,
        color: props.color,
        fontSize: `${props.fontSize}px`,
      },
    },
    text(props.textValue),
  );
}

/**
 * @param {TextProps} props
 * @returns {import("hyperapp").ElementVNode<TextProps>} Block renderer function
 */
function textEditor(props) {
  return h("div", {}, [
    h("p", {}, text("color")),
    h("input", {
      type: "text",
      value: props.color,
      oninput: (state, event) => ({
        ...state,
        color: /** @type {HTMLInputElement} */ (event.target).value,
      }),
    }),
    h("input", {
      type: "color",
      value: isHex(props.color) ? props.color : "#000000",
      oninput: (state, event) => ({
        ...state,
        color: /** @type{HTMLInputElement}*/ (event.target).value,
      }),
    }),
    h("hr", {}),
    h("p", {}, text("backgroundColor")),
    h("input", {
      type: "text",
      value: props.backgroundColor,
      oninput: (state, event) => ({
        ...state,
        backgroundColor: /** @type {HTMLInputElement} */ (event.target).value,
      }),
    }),
    h("input", {
      type: "color",
      value: isHex(props.backgroundColor) ? props.backgroundColor : "#000000",
      oninput: (state, event) => ({
        ...state,
        backgroundColor: /** @type{HTMLInputElement}*/ (event.target).value,
      }),
    }),
    h("hr", {}),
    h("p", {}, text("fontSize")),
    h("input", {
      type: "text",
      value: props.fontSize,
      oninput: (state, event) => ({
        ...state,
        fontSize: Number(/** @type {HTMLInputElement} */ (event.target).value),
      }),
    }),
    fontSizeSelect(props),
  ]);
}

/**
 * @param {TextProps} props
 * @returns {import("hyperapp").ElementVNode<TextProps>} Block renderer function
 */
function fontSizeSelect(props) {
  const options = [8, 12, 14, 18, 22, 24, 36];
  return h(
    "select",
    {
      value: props.fontSize,
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
function textNodeWithoutProps(state) {
  return h(
    "p",
    {
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
    },
    text("no props"),
  );
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

/** @type {Program<ProgramState>} */
export const TextProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    color: "inherit",
    backgroundColor: "transparent",
    fontSize: 12,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [
    /** @type {View<ProgramState, TextProps>} */
    ({
      name: "Text", //TODO: name has to be unique, how do we communicate this to user
      viewNode: textNode,
      props: textProps,
      editor: textEditor,
    }),
    {
      name: "Text without props", //TODO: name has to be unique, how do we communicate this to user
      viewNode: textNodeWithoutProps,
    },
    {
      name: "State Visualizer",
      viewNode: stateVisualizer,
    },
  ],
};
