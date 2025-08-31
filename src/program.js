import { h, text } from "./packages/hyperapp/index.js";
import { AppVisualizerProgram } from "./programs/appVisualizer.js";
import { TestProgram } from "./programs/testProgram.js";
import { TestProgram2 } from "./programs/testProgram2.js";

/**
 * Creates a wrapped dispatch that transforms program actions to app actions
 * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch
 * @param {Page} currentPage - Current page context
 * @returns {import("hyperapp").Dispatch<any>} Wrapped dispatch
 */
export function createWrappedDispatch(dispatch, currentPage) {
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
  return {
    ...appState,
    pages: appState.pages.map((page) =>
      page.id === currentPage.id ? { ...page, state: newPageState } : page,
    ),
  };
}

/**
 * Handles action result that returns another function (chained action)
 * @param {Page} currentPage - Current page context
 * @param {import("hyperapp").Action<any, any>} resultFunction - The returned function
 * @returns {import("hyperapp").Action<State, any>} Wrapped action
 */
function handleFunctionResult(currentPage, resultFunction) {
  return createPageAction(currentPage, resultFunction);
}

/**
 * Handles action result that returns [state, ...effects]
 * @param {State} appState - Current app state
 * @param {Page} currentPage - Current page context
 * @param {any[]} resultArray - The [state, ...effects] array
 * @returns {[State, ...import("hyperapp").MaybeEffect<State, any>[]]} Updated state and wrapped effects
 */
function handleArrayResult(appState, currentPage, resultArray) {
  const [newPageState, ...effects] = resultArray;
  /** @type {import("hyperapp").MaybeEffect<State, any>[]} */
  const wrappedEffects = effects.map((effect) =>
    wrapProgramEffect(effect, currentPage),
  );
  return [
    updatePageState(appState, currentPage, newPageState),
    ...wrappedEffects,
  ];
}

/**
 * Handles action result that returns a state object
 * @param {State} appState - Current app state
 * @param {Page} currentPage - Current page context
 * @param {any} resultObject - The state object
 * @returns {State} Updated app state
 */
function handleObjectResult(appState, currentPage, resultObject) {
  return updatePageState(appState, currentPage, resultObject);
}

/**
 * Creates a higher-order action that transforms between app state and page state
 * @param {Page} currentPage - Current page context
 * @param {import("hyperapp").Action<any, any>} pageAction - Action function that works with page state
 * @returns {import("hyperapp").Action<State, any>} Action function that works with app state
 */
function createPageAction(currentPage, pageAction) {
  return (appState, props) => {
    // Get the current page state from app state, not the stale currentPage.state
    const freshCurrentPage = appState.pages.find(
      (p) => p.id === currentPage.id,
    );
    if (!freshCurrentPage) return appState;

    const result = pageAction(freshCurrentPage.state, props);

    if (typeof result === "function") {
      return handleFunctionResult(freshCurrentPage, result);
    } else if (Array.isArray(result)) {
      return handleArrayResult(appState, freshCurrentPage, result);
    } else if (result && typeof result === "object") {
      return handleObjectResult(appState, freshCurrentPage, result);
    } else {
      return appState;
    }
  };
}

/**
 * Wraps event handler properties in element props
 * @param {any} props - Original element props
 * @param {Page} currentPage - Current page context
 * @returns {any} Props with wrapped event handlers
 */
function wrapEventHandlers(props, currentPage) {
  const wrappedProps = { ...props };

  for (const propName in props) {
    if (propName.startsWith("on") && typeof props[propName] === "function") {
      wrappedProps[propName] = createPageAction(currentPage, props[propName]);
    }
  }

  return wrappedProps;
}

/**
 * Recursively wraps children elements
 * @param {any} children - Element children
 * @param {Page} currentPage - Current page context
 * @returns {any} Wrapped children
 */
function wrapElementChildren(children, currentPage) {
  if (!Array.isArray(children)) {
    return children;
  }

  return children.map((child) => wrapProgramActions(child, currentPage));
}

/**
 * Recursively wraps actions in program elements to transform between app and page state
 * @param {import("hyperapp").ElementVNode<any>} element - Program element
 * @param {Page} currentPage - Current page
 * @returns {import("hyperapp").ElementVNode<State>} Wrapped element
 */
function wrapProgramActions(element, currentPage) {
  if (!element || typeof element !== "object" || !element.props) {
    return element;
  }

  return {
    ...element,
    props: wrapEventHandlers(element.props, currentPage),
    children: wrapElementChildren(element.children, currentPage),
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
 * @param {{}} props - Empty props (must stay stable)
 * @returns {() => void} Cleanup function
 *
 * NOTE: props must remain an empty object {} to prevent subscription restarts.
 * Hyperapp's patchSubs compares subscription arguments and restarts when they change.
 * Passing state as props would cause restarts on every state change (mouse moves, etc.),
 * delaying effects. Instead, we get current state internally via dispatch.
 */
export function programSubscriptionManager(dispatch, props) {
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
 * @param {String} viewName
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function view(currentPage, viewName) {
  // Get the program view with page state
  const program = programRegistry[currentPage.programName];
  const viewFunction = program.views.find((v) => v.name === viewName);
  if (viewFunction === undefined)
    return h("p", {}, text("error: no view function"));
  const programElement = viewFunction(currentPage.state);
  const wrappedElement = wrapProgramActions(programElement, currentPage);

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
};
