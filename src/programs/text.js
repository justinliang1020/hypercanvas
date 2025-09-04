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
 */

/** @type {TextProps} */
const textProps = { textValue: "hello world" };

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
    text(props.textValue),
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
    {
      name: "Text", //TODO: name has to be unique, how do we communicate this to user
      node: textNode,
      props: textProps,
    },
    {
      name: "Text without props", //TODO: name has to be unique, how do we communicate this to user
      node: textNodeWithoutProps,
    },
  ],
};
