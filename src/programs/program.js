import { app } from "../packages/hyperapp/index.js";

/**
 * @typedef {Object} AllowedConnection
 * @property {String} name
 * @property {typeof Program} program
 */

/**
 * @template S
 * @param {(state: S) => S} fn
 * @returns {(dispatch: import("hyperapp").Dispatch<S>) => import("hyperapp").Dispatch<S>}
 */
const stateMiddleware = (fn) => (dispatch) => (action, payload) => {
  if (Array.isArray(action) && typeof action[0] !== "function") {
    action = /** @type {import("hyperapp").Dispatchable<S>} */ ([
      fn(/** @type {S} */ (action[0])),
      ...action.slice(1),
    ]);
  } else if (!Array.isArray(action) && typeof action !== "function") {
    action = fn(/** @type {S} */ (action));
  }
  dispatch(action, payload);
};

/**
 * @abstract
 */
export class Program {
  /** @type{import("hyperapp").Dispatch<any> | null}*/
  #dispatch = null;
  /** @type{Object.<string, (Program | null)>} */
  #connections = {};
  /** @type {AllowedConnection[]} */
  allowedConnections = [];
  defaultState = {};
  /** @type {Number} */
  id = -1;
  /** @type {any} */
  #currentState = null;

  /**
   * Required to set when initializing a program
   * This isn't in the constructor to reduce boilerplate of classes implementing this class
   * @param {Number} id
   */
  setId(id) {
    this.id = id;
  }

  /**
   * @abstract
   * @param {HTMLElement} node
   * @param {object | null} initialState
   * @returns {import("hyperapp").App<any>}
   **/
  appConfig(node, initialState) {
    throw new Error("app must be implemented");
  }

  /** Runs a hyperapp program on a node. If no state is passed in, it uses the default state of the program.
   * @param {HTMLElement} node
   * @param {Object | null} state
   */
  mount(node, state) {
    if (this.id === -1) {
      throw Error("No ID set on Program Instance");
    }
    if (state === null) {
      state = this.defaultState;
    }
    this.#dispatch = app({
      dispatch: this.#logStateMiddleware,
      ...this.appConfig(node, state),
    });
  }

  isMounted() {
    return Boolean(this.#dispatch);
  }

  /**
   * returns the current state
   * @returns {object}
   */
  getState() {
    if (!this.#dispatch) {
      console.error("no dispatch function");
      return {};
    }
    return this.#currentState || {};
  }

  /**
   * @param {object} state
   */
  modifyState(state) {
    if (this.#dispatch) {
      this.#dispatch(() => state);
    } else {
      throw Error("No dispatch");
    }
  }

  /**
   * @param {String} name
   * @param {Program} program
   */
  setConnection(name, program) {
    for (const allowedConnection of this.allowedConnections) {
      if (program instanceof allowedConnection.program) {
        this.#connections[name] = program;
      }
    }
  }

  /**
   * @param {String} name
   */
  getConnection(name) {
    return this.#connections[name];
  }

  /**
   * @param {String} name
   */
  removeConnection(name) {
    this.#connections[name] = null;
  }

  getConnectionNames() {
    return Object.keys(this.#connections);
  }

  /**
   * @type {(dispatch: import("hyperapp").Dispatch<any>) => import("hyperapp").Dispatch<any>}
   */
  #logStateMiddleware = stateMiddleware((state) => {
    this.#currentState = state;
    console.log(`${this.id} STATE:`, state);
    this.#emitStateChange(state);
    return state;
  });

  /**
   * Emits a state change event
   * @param {any} state
   */
  #emitStateChange(state) {
    const event = new CustomEvent("programStateChange", {
      detail: { programId: this.id, state },
    });
    document.dispatchEvent(event);
  }
}
