import { app } from "./packages/hyperapp/index.js";
import { wrapDispatch } from "./utils.js";

/**
 * @template TState
 * @abstract
 */
export class ProgramBase {
  /** @type{import("hyperapp").Dispatch<any> | null}*/
  #dispatch = null;
  /** @type{Object.<string, (ProgramBase<any> | null)>} */
  #connections = {};
  /** @type {TState | null} */
  #currentState = null;
  /** @type {AllowedConnection[]} */
  allowedConnections = [];
  /** @type {TState | null} */
  defaultState = null;
  /** @type {EditorBase<any, TState> | null} */
  editor = null;
  /** @type {Number} */
  id = -1;
  /** @type {((state: any) => import("hyperapp").VNode<any>) | undefined} - imported from import("hyperapp").App<any> */
  view = undefined;
  /** @type {((state: any) => readonly (boolean | undefined | import("hyperapp").Subscription<any>)[]) | undefined}  - imported from import("hyperapp").App<any> */
  subscriptions = undefined;

  /**
   * Required to set when initializing a program
   * This isn't in the constructor to reduce boilerplate of classes implementing this class
   * @param {Number} id
   */
  setId(id) {
    this.id = id;
  }

  /** Runs a hyperapp program on a node. If no state is passed in, it uses the default state of the program.
   * @param {HTMLElement} node
   * @param {TState | null} state
   */
  mount(node, state) {
    if (this.id === -1) {
      throw Error("No ID set on Program Instance");
    }
    if (!this.view) {
      throw Error("App config is undefined");
    }
    if (state === null) {
      state = this.defaultState;
    }
    //@ts-ignore
    this.#dispatch = app({
      dispatch: this.#stateTrackingMiddleware,
      init: state,
      node: node,
      view: this.view,
      subscriptions: this.subscriptions,
    });
  }

  isMounted() {
    return Boolean(this.#dispatch);
  }

  /**
   * returns the current state
   * @returns {TState | null}
   */
  getState() {
    if (!this.#dispatch) {
      console.error("no dispatch function");
      return null;
    }
    return this.#currentState || null;
  }

  /**
   * @param {TState} state
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
   * @param {ProgramBase<any>} program
   */
  setConnection(name, program) {
    for (const allowedConnection of this.allowedConnections) {
      if (program instanceof allowedConnection.program) {
        this.#connections[name] = program;
        // Emit initial state change event for newly connected program
        if (program.isMounted()) {
          const event = new CustomEvent("programStateChange", {
            detail: { id: program.id, state: program.getState() },
          });
          dispatchEvent(event);
        }
      }
    }
  }

  /**
   * @param {String} name
   * @returns {ProgramBase<any> | null}
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

  /**
   * @param {String} name
   * @param {import("hyperapp").Action<any>} action
   * @returns {import("hyperapp").Subscription<any>}
   */
  onConnectionStateChange(name, action) {
    /**
     * @param {import("hyperapp").Dispatch<any>} dispatch
     * @param {{name: String, action: import("hyperapp").Action<any>, program: ProgramBase<any>}} props
     * @returns {() => void}
     */
    function programStateSubscriber(dispatch, props) {
      /**
       * @param {Event} ev
       */
      function handler(ev) {
        const customEvent =
          /** @type {CustomEvent<{id: Number, state: any}>} */ (ev);
        const connectedProgram = props.program.getConnection(props.name);
        if (!connectedProgram || customEvent.detail.id !== connectedProgram.id)
          return;
        dispatch(props.action, customEvent.detail.state);
      }
      addEventListener("programStateChange", handler);
      return () => removeEventListener("programStateChange", handler);
    }
    return [programStateSubscriber, { name, action, program: this }];
  }

  /**
   * @param {import("hyperapp").Action<any>} action
   * @returns {import("hyperapp").Subscription<any>}
   */
  onAppDispatch(action) {
    /**
     * @param {import("hyperapp").Dispatch<any>} dispatch
     * @param {import("hyperapp").Action<any>} action
     * @returns {() => void}
     */
    function appStateSubscriber(dispatch, action) {
      /**
       * @param {Event} ev
       */
      function handler(ev) {
        const customEvent = /** @type {CustomEvent<{state: any}>} */ (ev);
        dispatch(action, customEvent.detail);
      }
      addEventListener("appDispatch", handler);
      return () => removeEventListener("appDispatch", handler);
    }
    return [appStateSubscriber, action];
  }

  /**
   * Emit

  /**
   * Emits a state change event
   * @param {any} state
   */
  #emitStateChange(state) {
    const event = new CustomEvent("programStateChange", {
      detail: { id: this.id, state },
    });
    dispatchEvent(event);
  }

  /**
   * @type {(dispatch: import("hyperapp").Dispatch<any>) => import("hyperapp").Dispatch<any>}
   */
  #stateTrackingMiddleware = wrapDispatch((state) => {
    this.#currentState = state;
    this.#emitStateChange(state);
    return state;
  });
}

// Editor is stateless. UI should be rebuilt on each click away from the program it is editing
// TODO: do some type thing to get the state of the connected program as a param into the functions here,

/**
 * @template ProgramState
 * @template EditorState
 * @extends ProgramBase<EditorState>
 */
export class EditorBase extends ProgramBase {
  /** @param {ProgramBase<ProgramState> | undefined} program */
  constructor(program) {
    super();
    this.program = program;
  }

  /** Runs a hyperapp program on a node. If no state is passed in, it uses the default state of the program.
   * @param {HTMLElement} node
   * @param {EditorState | null} state
   */
  mount(node, state) {
    if (!this.view) {
      throw Error("App config is undefined");
    }
    if (state === null) {
      state = this.defaultState;
    }
    //@ts-ignore
    app({
      init: state,
      node: node,
      view: this.view,
      subscriptions: this.subscriptions,
    });
  }

  // the following functions should have type for state
  // getState()
  // modifyState()
}
