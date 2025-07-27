import { app } from "../packages/hyperapp/index.js";

/**
 * @abstract
 */
export class Program {
  constructor() {
    this.dispatch = null;
  }

  /**
   * @abstract
   * @param {HTMLElement} node
   * @returns {import("hyperapp").App<any>}
   **/
  appConfig(node) {
    throw new Error("app must be implemented");
  }

  /**
   * @param {HTMLElement} node
   */
  run(node) {
    this.dispatch = app(this.appConfig(node));
  }

  /**
   * changes the text of the program
   * @param {string} text
   */
  changeText(text) {
    if (this.dispatch) {
      this.dispatch(() => ({ text: text }));
    }
  }

  /**
   * returns the current state
   * @returns {object}
   */
  getCurrentState() {
    if (!this.dispatch) return {};
    let currentState;
    this.dispatch((/** @type {any} */ state) => {
      currentState = state;
      return state;
    });
    // @ts-ignore
    return currentState;
  }
}
