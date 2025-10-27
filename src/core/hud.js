import { h,text  } from "hyperapp";

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} 
 */
export function hud(state) {
  return h("div", {style: {
    position: "fixed",
    bottom: "0",
    left: "50%",
    transform: "translateX(-50%)",
    margin: "0",
    paddingBottom: "10px",
    display: "flex",
    gap: "5px",
    alignItems: "center",
    justifyContent: "center"
  }}, [searchBar(state), newBlockButton(state)])
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} 
 */
function searchBar(state) {
  return h("input", {type: "text", style: {width: "20em"}}, text("hi"))
}


/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State>} 
 */
function newBlockButton(state) {
  return h("button", {}, text("New block"))
}
