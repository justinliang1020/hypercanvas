import { h, text, app } from "../packages/hyperapp/index.js";

/**
 * @param {HTMLElement} node
 */
export function run(node) {
  app({
    init: {},
    view: () =>
      h(
        "textarea",
        {
          style: {
            boxSizing: "border-box",
            width: "100%",
            height: "100%",
            padding: "10px",
            border: "0px",
            backgroundColor: "transparent",
            color: "inherit",
            resize: "none",
            overflow: "hidden",
            outline: "none",
          },
        },
        text(
          "Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.",
        ),
      ),
    node: node,
  });
}
