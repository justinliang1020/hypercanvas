import { app } from "../packages/hyperapp/index.js";

/**
 * @typedef {Object} AllowedConnection
 * @property {String} name
 * @property {typeof Program} program
 */

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
      this.#dispatch = app(this.appConfig(node, this.defaultState));
    } else {
      this.#dispatch = app(this.appConfig(node, state));
    }
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
    let currentState;
    this.#dispatch((/** @type {any} */ state) => {
      currentState = state;
      return state;
    });
    // @ts-ignore
    return currentState;
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
}
