import { app } from "../packages/hyperapp/index.js";

/**
 * @abstract
 */
export class Program {
  /** @type{import("hyperapp").Dispatch<any> | null}*/
  #dispatch;
  /** @type{object | null} */
  #initialState;

  /**
   * @param {object | null} initialState
   */
  constructor(initialState) {
    this.#dispatch = null;
    this.#initialState = initialState;
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
   * @param {HTMLElement} node
   */
  run(node) {
    this.#dispatch = app(this.appConfig(node, this.#initialState));
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
    if (!this.#dispatch) return {};
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
}
