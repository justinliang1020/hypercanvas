import { h, text, app } from "../packages/hyperapp/index.js";

/**
 * @param {HTMLElement} node
 */
export function run(node) {
  console.log("run");
  app({
    init: {},
    view: () => h("p", {}, text("hello world")),
    node: node,
  });
}
