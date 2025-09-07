import { h, text } from "./packages/hyperapp/index.js";
import { AppVisualizerProgram } from "./programs/appVisualizer.js";
import { TestProgram } from "./programs/testProgram.js";
import { TestProgram2 } from "./programs/testProgram2.js";
import { TodoProgram } from "./programs/todo.js";
import { UrlQueryProgram } from "./programs/urlQueryProgram.js";
import { BoidsSimulation } from "./programs/boidsSimulation.js";
import { TextEditorProgram } from "./programs/textEditor.js";
import { MemeEditorProgram } from "./programs/memeEditor.js";
import { TextProgram } from "./programs/text.js";

/**
 * Creates a generic scoped action that transforms between outer and inner state
 * @param {(outerState: any) => any} getter - Extracts inner state from outer state
 * @param {(outerState: any, innerState: any) => any} setter - Updates outer state with new inner state
 * @param {import("hyperapp").Action<any, any>} innerAction - Action that works with inner state
 * @returns {import("hyperapp").Action<any, any>} Action that works with outer state
 */
function createScopedAction(getter, setter, innerAction) {
  return (outerState, props) => {
    const innerState = getter(outerState);
    if (!innerState) return outerState;

    const result = innerAction(innerState, props);

    if (typeof result === "function") {
      return createScopedAction(getter, setter, result);
    } else if (Array.isArray(result)) {
      const [newInnerState, ...effects] = result;
      return [setter(outerState, newInnerState), ...effects];
    } else if (result && typeof result === "object") {
      return setter(outerState, result);
    } else {
      return outerState;
    }
  };
}

/**
 * Creates a wrapped dispatch that transforms program actions to app actions
 * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch
 * @param {Page} currentPage - Current page context
 * @returns {import("hyperapp").Dispatch<any>} Wrapped dispatch
 */
function createWrappedDispatch(dispatch, currentPage) {
  return (programAction) => {
    const appAction = createPageAction(currentPage, programAction);
    return dispatch(appAction);
  };
}

/**
 * Wraps a program effect to work with page state instead of app state
 * @param {import("hyperapp").MaybeEffect<any, any>} effect - Effect array [effectFunction, ...args]
 * @param {Page} currentPage - Current page context
 * @returns {import("hyperapp").MaybeEffect<State, any>} Wrapped effect array
 */
function wrapProgramEffect(effect, currentPage) {
  if (!Array.isArray(effect) || effect.length === 0) {
    return effect;
  }

  const [effectFunction, ...args] = effect;

  /** @type {import("hyperapp").Effecter<State, any>} */
  const wrappedEffectFunction = (dispatch, ...effectArgs) => {
    const wrappedDispatch = createWrappedDispatch(dispatch, currentPage);
    return effectFunction(wrappedDispatch, ...effectArgs);
  };

  /** @type {import("hyperapp").Effect<State, any>} */
  const wrappedEffect = /** @type {any} */ ([wrappedEffectFunction, ...args]);
  return wrappedEffect;
}

/**
 * Updates page state within app state
 * @param {State} appState - Current app state
 * @param {Page} currentPage - Current page
 * @param {any} newPageState - New page state
 * @returns {State} Updated app state
 */
function updatePageState(appState, currentPage, newPageState) {
  const updatedPages = appState.pages.map((page) => {
    if (page.id !== currentPage.id) return page;

    return { ...page, state: newPageState };
  });
  return {
    ...appState,
    pages: updatedPages,
  };
}

/**
 * Updates block props within app state
 * @param {State} appState - Current app state
 * @param {Page} currentPage - Current page
 * @param {number} blockId - Block ID to update
 * @param {any} newProps - New block props
 * @returns {State} Updated app state
 */
function updateBlockProps(appState, currentPage, blockId, newProps) {
  const updatedPages = appState.pages.map((page) => {
    if (page.id !== currentPage.id) return page;

    const updatedBlocks = page.blocks.map((block) => {
      if (block.id !== blockId) return block;
      return { ...block, props: newProps };
    });

    return { ...page, blocks: updatedBlocks };
  });

  return { ...appState, pages: updatedPages };
}

/**
 * Creates a higher-order action that transforms between app state and page state
 * @param {Page} currentPage - Current page context
 * @param {import("hyperapp").Action<any, any>} pageAction - Action function that works with page state
 * @returns {import("hyperapp").Action<State, any>} Action function that works with app state
 */
function createPageAction(currentPage, pageAction) {
  /** @type {(appState: State) => any} */
  const getter = (appState) => {
    const freshCurrentPage = appState.pages.find(
      (/** @type {Page} */ p) => p.id === currentPage.id,
    );
    return freshCurrentPage ? freshCurrentPage.state : null;
  };

  /** @type {(appState: State, newPageState: any) => State} */
  const setter = (appState, newPageState) => {
    return updatePageState(appState, currentPage, newPageState);
  };

  return createScopedAction(getter, setter, pageAction);
}

/**
 * Creates a higher-order action that transforms between app state and block props
 * @param {Page} currentPage - Current page context
 * @param {number} blockId - Block ID whose props to update
 * @param {import("hyperapp").Action<any, any>} propsAction - Action function that works with block props
 * @returns {import("hyperapp").Action<State, any>} Action function that works with app state
 */
function createBlockPropsAction(currentPage, blockId, propsAction) {
  /** @type {(appState: State) => any} */
  const getter = (appState) => {
    const freshCurrentPage = appState.pages.find(
      (/** @type {Page} */ p) => p.id === currentPage.id,
    );
    if (!freshCurrentPage) return null;

    const block = freshCurrentPage.blocks.find(
      (/** @type {Block} */ b) => b.id === blockId,
    );
    return block ? block.props : null;
  };

  /** @type {(appState: State, newProps: any) => State} */
  const setter = (appState, newProps) => {
    return updateBlockProps(appState, currentPage, blockId, newProps);
  };

  return createScopedAction(getter, setter, propsAction);
}

/**
 * @typedef {Object} StateContext
 * @property {"page"} type - Type of state context
 * @property {Page} currentPage - Current page context
 */

/**
 * @typedef {Object} PropsContext
 * @property {"props"} type - Type of state context
 * @property {Page} currentPage - Current page context
 * @property {number} blockId - Block ID for props context
 */

/**
 * Wraps event handler properties in element props
 * @param {any} props - Original element props
 * @param {StateContext | PropsContext} context - State context for wrapping
 * @returns {any} Props with wrapped event handlers
 */
function wrapEventHandlers(props, context) {
  const wrappedProps = { ...props };

  for (const propName in props) {
    if (propName.startsWith("on") && typeof props[propName] === "function") {
      if (context.type === "page") {
        wrappedProps[propName] = createPageAction(
          context.currentPage,
          props[propName],
        );
      } else if (context.type === "props") {
        wrappedProps[propName] = createBlockPropsAction(
          context.currentPage,
          context.blockId,
          props[propName],
        );
      }
    }
  }

  return wrappedProps;
}

/**
 * Recursively wraps children elements
 * @param {any} children - Element children
 * @param {StateContext | PropsContext} context - State context for wrapping
 * @returns {any} Wrapped children
 */
function wrapElementChildren(children, context) {
  if (!Array.isArray(children)) {
    return children;
  }

  return children.map((child) => wrapProgramActions(child, context));
}

/**
 * Recursively wraps actions in program elements to transform between app and scoped state
 * @param {import("hyperapp").ElementVNode<any>} element - Program element
 * @param {StateContext | PropsContext} context - State context for wrapping
 * @returns {import("hyperapp").ElementVNode<State>} Wrapped element
 */
function wrapProgramActions(element, context) {
  if (!element || typeof element !== "object" || !element.props) {
    return element;
  }

  return {
    ...element,
    props: wrapEventHandlers(element.props, context),
    children: wrapElementChildren(element.children, context),
  };
}

/**
 * Creates subscription cleanup functions for a single page
 * @param {Page} page - Page to create subscriptions for
 * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch
 * @returns {(() => void)[]} Array of cleanup functions
 */
function createPageSubscriptions(page, dispatch) {
  const program = programRegistry[page.programName];
  const cleanupFunctions = [];

  if (program.subscriptions) {
    const programSubs = program.subscriptions(page.state);

    for (const sub of programSubs) {
      const [subFn, ...args] = sub;
      const wrappedDispatch = createWrappedDispatch(dispatch, page);
      const cleanup = subFn(wrappedDispatch, ...args);
      if (cleanup) cleanupFunctions.push(cleanup);
    }
  }

  return cleanupFunctions;
}

/** @type {(() => void)[]} */
let globalCleanups = [];

/**
 * Program subscription manager that handles all program subscriptions
 * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch function
 * @param {{}} _props - Empty props (must stay stable)
 * @returns {() => void} Cleanup function
 *
 * NOTE: props must remain an empty object {} to prevent subscription restarts.
 * Hyperapp's patchSubs compares subscription arguments and restarts when they change.
 * Passing state as props would cause restarts on every state change (mouse moves, etc.),
 * delaying effects. Instead, we get current state internally via dispatch.
 */
export function programSubscriptionManager(dispatch, _props) {
  // Clean up any existing subscriptions first
  globalCleanups.forEach((cleanup) => cleanup());
  globalCleanups = [];

  /** @type{any} should be `State` but the typing here is weird */
  let currentState;
  dispatch((state) => {
    currentState = state;
    return state;
  });

  if (!currentState) return () => {};
  const pageCleanups = currentState.pages.map((/** @type {Page}*/ page) =>
    createPageSubscriptions(page, dispatch),
  );

  globalCleanups = pageCleanups;

  // TODO: investigate. cleanups don't actually run becaue susbscription manager only runs once
  return () => {
    globalCleanups.forEach((cleanup) => cleanup());
    globalCleanups = [];
  };
}

/**
 * @param {Page} currentPage
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function renderView(currentPage, block) {
  // Get the program view with page state
  const program = programRegistry[currentPage.programName];
  const view = program.views.find((v) => v.name === block.viewName);
  if (view === undefined) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no view function. could not find ${block.viewName}`),
    );
  }
  if (Object.keys(block.props).length === 0) {
    block.props = view.props;
  }
  const viewNode = view.viewNode(currentPage.state, block.props);
  /** @type {StateContext} */
  const pageContext = { type: "page", currentPage };
  const wrappedViewNode = wrapProgramActions(viewNode, pageContext);

  try {
    return wrappedViewNode;
  } catch {
    return h("p", {}, text("error"));
  }
}

/**
 * @param {Page} currentPage
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function renderEditor(currentPage, block) {
  const program = programRegistry[currentPage.programName];
  const view = program.views.find((v) => v.name === block.viewName);
  const editingBlockId = block.editingBlockId;
  //TODO: fix this kinda ugly error handling
  if (view === undefined) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no view. could not find ${block.viewName}`),
    );
  }
  if (!view.props) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no view props. could not find props for ${view}`),
    );
  }
  if (!view.editor) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no view editor. could not find editor for ${view}`),
    );
  }
  if (!editingBlockId) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no editing block id. could not find editor for ${view}`),
    );
  }
  const editingBlock = currentPage.blocks.find((b) => b.id === editingBlockId);
  if (!editingBlock) {
    return h(
      "p",
      { style: { color: "red" } },
      text(`error: no editing block. could not find editor for ${view}`),
    );
  }

  // Create editor element with current block props as the state
  const programElement = view.editor(editingBlock.props);

  // Create props context for the editing block
  /** @type {PropsContext} */
  const propsContext = {
    type: "props",
    currentPage,
    blockId: editingBlockId,
  };

  // Wrap the editor with block props as scoped state
  const wrappedElement = wrapProgramActions(programElement, propsContext);

  try {
    return wrappedElement;
  } catch {
    return h("p", {}, text("error"));
  }
}

/**
 * @type {Record<String, Program<any>>}
 */
export const programRegistry = {
  testProgram: TestProgram,
  testProgram2: TestProgram2,
  appVisualizerProgram: AppVisualizerProgram,
  todoProgram: TodoProgram,
  urlQueryProgram: UrlQueryProgram,
  boidsSimulation: BoidsSimulation,
  textEditor: TextEditorProgram,
  memeEditor: MemeEditorProgram,
  text: TextProgram,
};
