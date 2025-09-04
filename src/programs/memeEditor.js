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

// ---------
// Below contains pseudo-code for what props may look like
// ---------

/**
 * @typedef EditorProps
 * @property {String} title
 */

/** @type {EditorProps} */
const initialEditorProps = { title: "hello world" };

/**
 * @param {ProgramState} state
 * @param {EditorProps} props
 * @param {any} editor
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function topTextEditor2(state, props, editor) {
  return h("div", {}, [
    h("p", {}, text(props.title)),
    textBox(state, "topText"),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {any} Block renderer function
 */
function topTextEditor3(state) {
  /** @type {EditorProps} */
  const props = { title: "hello world" };
  const view = h("div", {}, [
    h("p", {}, text(props.title)),
    textBox(state, "topText"),
  ]);
  const editor = topTextEditor2PropsEditor;
  return {
    view,
    props,
    editor,
  };
}

/**
 * @param {{title: String}} props
 * @returns {import("hyperapp").ElementVNode<EditorProps>} Block renderer function
 */
function topTextEditor2PropsEditor(props) {
  return h("textarea", {
    value: props.title,
    style: {
      border: "none",
      resize: "none",
      outline: "none",
      width: "100%",
      height: "100%",
      overflow: null,
      color: "black",
    },
    oninput: (props, event) => {
      const newProps = props;
      const newTitle = /** @type {HTMLInputElement} */ (event.target).value;
      props.title = newTitle;
      return newProps;
    },
  });
}

const views = [
  {
    view: topTextEditor2,
    initialProps: initialEditorProps,
    editor: topTextEditor2PropsEditor,
  },
];

/** @typedef View
 * @property {any} view - view doesn't need props technically
 * @property {any} [props] - if editor does not exist, give default UI to edit props
 * @property {any} [editor] - editor can only exist if props exists. if editor exsits, use that to modify props
 */
