import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {String[]} todos
 * @property {String} inputValue
 */

/** @type {Program<ProgramState>} */
export const TodoProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    todos: [],
    inputValue: "",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [stateVisualizer, addTodoView, todosView],
};

/**
 * @param {ProgramState} state
 * @returns {ProgramState} Block renderer function
 */
function addTodo(state) {
  return {
    ...state,
    todos: state.todos.concat(state.inputValue),
    inputValue: "",
  };
}

/**
 * @param {ProgramState} state
 * @param {Event} event
 * @returns {ProgramState} Block renderer function
 */
function newInputValue(state, event) {
  return {
    ...state,
    inputValue: /** @type {HTMLInputElement} */ (event.target).value,
  };
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function addTodoView(state) {
  return h("div", {}, [
    h("input", {
      type: "text",
      oninput: newInputValue,
      value: state.inputValue,
    }),
    h("button", { onclick: addTodo }, text("New!")),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function todosView(state) {
  return h(
    "ul",
    {},
    state.todos.map((todo) => h("li", {}, text(todo))),
  );
}
