function UpdateState(state, appState) {
  return {
    ...state,
    appState: appState,
  };
}

const div = document.createElement("div");
const initialState = { appState: null };

app({
  init: initialState,
  view: (state) =>
    h("main", {}, [
      h("pre", {}, text(JSON.stringify(state.appState, null, 2))),
    ]),
  node: div,
  subscriptions: (state) => [
    // Listen for custom state update events
    // BUG: this part is still kinda weird, the entire block seems to rerun on every state change
    [
      (dispatch) => {
        const handleStateUpdate = (event) => {
          dispatch((state) => {
            return { ...state, appState: event.detail.appState };
          });
        };

        window.addEventListener("appStateUpdate", handleStateUpdate);

        return () => {
          window.removeEventListener("appStateUpdate", handleStateUpdate);
        };
      },
      {},
    ],
  ],
});
this.shadowRoot.appendChild(div);
