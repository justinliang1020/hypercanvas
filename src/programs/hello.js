import { ProgramBase } from "../programBase.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {String} hello
 */

/**
 * @extends ProgramBase<ProgramState>
 */
export class Program extends ProgramBase {
  constructor() {
    super();
    /** @type {ProgramState} */
    this.defaultState = {
      hello: "hello",
    };
    /** @type {AllowedConnection[]} */
    this.allowedConnections = [];
    this.view = this.#main;
    this.subscriptions = () => {
      return [];
    };
  }

  /**
   * @param {ProgramState} state
   * @returns {import("hyperapp").ElementVNode<ProgramState>}
   */
  #main = (state) => h("div", {}, [h("h3", {}, text(state.hello))]);
}
