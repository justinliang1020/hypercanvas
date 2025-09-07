import { getCurrentPage } from "../pages.js";
import { h, text } from "../packages/hyperapp/index.js";
import { table } from "./utils.js";

/**
 * @typedef ProgramState
 * @property {State | null} appState
 */

/**
 * @typedef TableStatePreviewProps
 * @property {"Current Page" | "Current Blocks"} preview
 */

/** @type {Program<ProgramState>} */
export const AppVisualizerProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    appState: null,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [
    /** @type {View<ProgramState, TableStatePreviewProps>} */
    ({
      //TODO: get rid of the manual type annotation, that is too complex
      name: "Table State Preview",
      viewNode: tableStatePreview,
      props: {
        //TODO: rename to `props` to `initialProps`
        preview: "Current Page",
      },
      editor: tableStatePreviewEditor,
    }),
  ],
  // subscriptions for this program
  subscriptions: (state) => [[syncAppState, {}]],
};

/**
 * Test subscription that increments the counter every second
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function syncAppState(dispatch, props) {
  /**
   * @param {Event} ev
   */
  function handler(ev) {
    const customEvent = /** @type {CustomEvent<{state: any}>} */ (ev);
    // breaks without requestAnimationFrame, unsure why
    requestAnimationFrame(() =>
      dispatch((state) => {
        const newState = {
          ...state,
          appState: customEvent.detail.state,
        };
        return newState;
      }),
    );
  }
  addEventListener("appDispatch", handler);
  return () => removeEventListener("appDispatch", handler);
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function show(state) {
  return h("div", {}, text(JSON.stringify(state.appState)));
}

/**
 * @param {ProgramState} state
 * @param {TableStatePreviewProps} props
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function tableStatePreview(state, props) {
  if (!state.appState) return h("div", {}, text("null"));
  const currentPage = getCurrentPage(state.appState);
  if (!currentPage) return h("div", {}, text("no page"));

  let contents = {};
  if (props.preview === "Current Page") {
    contents = currentPage;
  } else if (props.preview === "Current Blocks") {
    contents = currentPage.blocks;
  }

  return h("div", {}, [h("h2", {}, text(props.preview)), table(contents)]);
}

/**
 * @param {TableStatePreviewProps} state
 * @returns {import("hyperapp").ElementVNode<TableStatePreviewProps>} Block renderer function
 */
function tableStatePreviewEditor(state) {
  const options = ["Current Page", "Current Blocks"];
  return h(
    "select",
    {
      value: state.preview,
      onchange: (state, event) => {
        return {
          ...state,
          preview: /** @type {"Current Page" | "Current Blocks"} */ (
            /** @type {HTMLInputElement} */ (event.target).value
          ),
        };
      },
    },
    options.map((o) =>
      h(
        "option",
        {
          value: o,
        },
        text(o),
      ),
    ),
  );
}

/**
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function currentBlocks(state) {
  if (!state.appState) return h("div", {}, text("null"));
  const currentPage = getCurrentPage(state.appState);
  if (!currentPage) return h("div", {}, text("no page"));

  return table(currentPage.blocks);
}
