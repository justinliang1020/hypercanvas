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
function textBoxNode(state, props) {
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
      name: "Text Box",
      node: textBoxNode,
      props: textProps,
    },
  ],
};
