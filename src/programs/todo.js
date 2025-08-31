import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {Todo[]} todos
 * @property {String} inputValue
 */

/**
 * @typedef Todo
 * @property {String} value
 * @property {Boolean} checked
 */

/** @type {Program<ProgramState>} */
export const TodoProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    todos: [],
    inputValue: "",
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [stateVisualizer, addTodoView, todosView, reset, todoPreview],
};

// ----------------
// Actions
// ----------------

/**
 * @param {ProgramState} state
 * @returns {ProgramState} Block renderer function
 */
function addTodo(state) {
  return {
    ...state,
    todos: state.todos.concat({ value: state.inputValue, checked: false }),
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
 * @param {number} index
 * @returns {ProgramState} Block renderer function
 */
function toggleTodo(state, index) {
  return {
    ...state,
    todos: state.todos.map((todo, i) =>
      i === index ? { ...todo, checked: !todo.checked } : todo,
    ),
  };
}

// ----------------
// Views
// ----------------

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
  return h("div", {}, [
    h("h2", {}, text("todos")),
    h(
      "ul",
      {},
      state.todos.map((t, index) => todo(t, index)),
    ),
  ]);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function todoPreview(state) {
  if (state.todos.length > 0) {
    return todo(state.todos[0], 0);
  }
  return h("p", {}, text("no todos"));
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function reset(state) {
  /**
   * @param {ProgramState} state
   * @returns {ProgramState}
   */
  function resetState(state) {
    return TodoProgram.initialState;
  }
  return h("button", { onclick: resetState }, text("reset"));
}

// ----------------
// Components
// ----------------

/**
 * @param {Todo} todo
 * @param {number} index
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function todo(todo, index) {
  return h("li", { style: { display: "flex" } }, [
    h("input", {
      type: "checkbox",
      checked: todo.checked,
      onclick: (state) => toggleTodo(state, index),
    }),
    h(
      "p",
      {
        style: {
          textDecoration: todo.checked ? "line-through" : "none",
          opacity: todo.checked ? "0.6" : "1",
        },
      },
      text(todo.value),
    ),
  ]);
}
