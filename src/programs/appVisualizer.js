import { getCurrentPage } from "../pages.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef ProgramState
 * @property {State | null} appState
 */
/** @type {Program<ProgramState>} */
export const AppVisualizerProgram = {
  // initial state that can be reset to in event of catastrophe
  initialState: {
    appState: null,
  },
  // want to have specific control over what views get rendered. generic API that still gives control
  views: [show, currentPage],
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
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Block renderer function
 */
function currentPage(state) {
  if (!state.appState) return h("div", {}, text("null"));
  const currentPage = getCurrentPage(state.appState);
  if (!currentPage) return h("div", {}, text("no page"));

  return table(
    Object.keys(currentPage).map((key) => ({
      name: key,
      value: /** @type {any} */ (currentPage)[key],
    })),
  );
}

/**
 * @param {{name: String, value: any}[]} properties
 * @returns {import("hyperapp").ElementVNode<ProgramState>}
 */
function table(properties) {
  return h(
    "div",
    {
      // required for containing the table contents within the block
      style: {
        width: "100%",
        height: "100%",
        overflow: "auto",
      },
    },
    h(
      "table",
      {
        style: {
          borderCollapse: "collapse",
          border: "1px solid #ccc",
          fontSize: "12px",
        },
      },
      [
        h("thead", {}, [
          h("tr", { style: { backgroundColor: "#f5f5f5" } }, [
            h(
              "th",
              {
                style: {
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: "bold",
                  width: "1%",
                  whiteSpace: "nowrap",
                },
              },
              text("Property"),
            ),
            h(
              "th",
              {
                style: {
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  fontWeight: "bold",
                },
              },
              text("Value"),
            ),
          ]),
        ]),
        h(
          "tbody",
          {},
          properties.map((prop) =>
            h("tr", { key: prop.name }, [
              h(
                "td",
                {
                  style: {
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                    width: "1%",
                    whiteSpace: "nowrap",
                  },
                },
                text(prop.name),
              ),
              h(
                "td",
                {
                  style: {
                    border: "1px solid #ccc",
                    padding: "8px",
                    textAlign: "left",
                  },
                },
                text(JSON.stringify(prop.value)),
              ),
            ]),
          ),
        ),
      ],
    ),
  );
}
