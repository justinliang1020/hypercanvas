import { app } from "../packages/hyperapp/index.js";

/**
 * @abstract
 */
export class Program {
  /** @type{import("hyperapp").Dispatch<any> | null}*/
  #dispatch;
  /** @type{Object.<string, (Program | null)>} */
  #connections;

  constructor() {
    this.#dispatch = null;
    this.#connections = {};
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

  /**
   * @typedef {Object} AllowedConnection
   * @property {String} name
   * @property {typeof Program} program
   */
  /**
   * @abstract
   * @returns {AllowedConnection[]}
   **/
  allowedConnections() {
    throw new Error("no allowed connections implemented");
  }

  /**
   * @param {HTMLElement} node
   * @param {Object | null} state
   */
  run(node, state) {
    this.#dispatch = app(this.appConfig(node, state));
  }

  /**
   * changes the text of the program
   * @param {string} text
   */
  changeText(text) {
    if (this.#dispatch) {
      this.#dispatch(() => ({ text: text }));
    }
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
    this.#connections[name] = program;
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
