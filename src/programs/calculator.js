import { h, text } from "../packages/hyperapp/index.js";
import { genericPropsEditor, stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {Number} value
 */

/**
 * @typedef LabelProps
 * @property {String} color
 * @property {String} backgroundColor
 **/
/**
 * @param {ProgramState} state
 * @param {LabelProps} props
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function label(state, props) {
  return h(
    "p",
    {
      style: {
        border: "none",
        resize: "none",
        outline: "none",
        width: "100%",
        height: "100%",
        overflow: null,
        margin: "0",
        color: props.color,
        backgroundColor: props.backgroundColor,
      },
    },
    text(state.value),
  );
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function numpad(state) {
  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, "X"];
  return h(
    "div",
    {},
    numbers.map((n) => numberButton(state, { value: String(n) })),
  );
}

/**
 * @param {ProgramState} state
 * @param {String} n
 * @returns {ProgramState}
 */
function appendNumber(state, n) {
  const newValue = Number(`${state.value}${n}`);
  return {
    ...state,
    value: newValue,
  };
}

/**
 * @param {ProgramState} state
 * @returns {ProgramState}
 */
function clear(state) {
  return {
    ...state,
    value: 0,
  };
}

/**
 * @typedef NumberButtonProps
 * @property {String} value
 **/
/**
 * @param {ProgramState} state
 * @param {NumberButtonProps} props
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function numberButton(state, props) {
  /**
   * @param {ProgramState} state
   * @returns {ProgramState}
   */
  function onclick(state) {
    if (Number.isInteger(Number(props.value))) {
      return appendNumber(state, props.value);
    } else if (props.value === "X") {
      return clear(state);
    }
    return state;
  }
  return h(
    "button",
    {
      onclick,
    },
    text(props.value),
  );
}

/** @type {Program<ProgramState>} */
export const CalculatorProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    value: 12,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [
    /** @type {View<ProgramState, LabelProps>} */
    ({
      name: "label", //TODO: name has to be unique, how do we communicate this to user
      viewNode: label,
      props: {
        color: "#000000",
        backgroundColor: "#FFFFFF",
      },
      editor: genericPropsEditor,
    }),
    {
      name: "State Visualizer",
      viewNode: stateVisualizer,
    },
    /** @type {View<ProgramState, NumberButtonProps>} */
    ({
      name: "Number Button",
      viewNode: numberButton,
      props: {
        value: "1",
      },
      editor: genericPropsEditor,
    }),
    {
      name: "numpad",
      viewNode: numpad,
    },
  ],
};
