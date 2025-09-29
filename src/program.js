import { BLOCK_CONTENTS_CLASS_NAME } from "./constants.js";
import { h, text } from "./packages/hyperapp/index.js";

/**
 * Creates a generic scoped action that transforms between outer and inner state
 * @param {(outerState: any) => any} getter - Extracts inner state from outer state
 * @param {(outerState: any, innerState: any) => any} setter - Updates outer state with new inner state
 * @param {import("hyperapp").Action<any, any>} innerAction - Action that works with inner state
 * @param {((effect: import("hyperapp").MaybeEffect<any, any>) => import("hyperapp").MaybeEffect<any, any>)} effectWrapper
 * @returns {import("hyperapp").Action<any, any>} Action that works with outer state
 */
function createScopedAction(getter, setter, innerAction, effectWrapper) {
  return (outerState, props) => {
    const innerState = getter(outerState);
    if (!innerState) return outerState;

    const result = innerAction(innerState, props);

    if (typeof result === "function") {
      return createScopedAction(getter, setter, result, effectWrapper);
    } else if (Array.isArray(result)) {
      const [newInnerState, ...effects] = result;
      return [
        setter(outerState, newInnerState),
        ...effects.map((effect) => effectWrapper(effect)),
      ];
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
  return (programAction, payload) => {
    const appAction = createPageAction(currentPage, programAction);
    return dispatch(appAction, payload);
  };
}

/**
 * Wraps a program effect to work with page state instead of app state
 * @param {import("hyperapp").MaybeEffect<any, any>} effect - Effect array [effectFunction, ...args]
 * @param {Page} currentPage - Current page context
 * @returns {import("hyperapp").MaybeEffect<State, any>} Wrapped effect array
 */
//TODO: the way this function is used is not semantic, fix its usage so it doesn't use a generic wrap program effect thing
function wrapProgramEffect(effect, currentPage) {
  if (!Array.isArray(effect) || effect.length === 0) {
    return effect;
  }

  const [effectFunction, ...args] = effect;

  /** @type {import("hyperapp").Effecter<State, any>} */
  const wrappedEffectFunction = (dispatch, payload) => {
    const wrappedDispatch = createWrappedDispatch(dispatch, currentPage);
    return effectFunction(wrappedDispatch, payload);
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

  /** @type {(effect: import("hyperapp").MaybeEffect<any, any>) => import("hyperapp").MaybeEffect<State, any>} */
  const effectWrapper = (effect) => wrapProgramEffect(effect, currentPage);

  return createScopedAction(getter, setter, pageAction, effectWrapper);
}

/**
 * @typedef {Object} StateContext
 * @property {"page"} type - Type of state context
 * @property {Page} currentPage - Current page context
 */

/**
 * Wraps event handler properties in element props
 * @param {any} props - Original element props
 * @param {StateContext} context - State context for wrapping
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
      }
    }
  }

  return wrappedProps;
}

/**
 * Recursively wraps children elements
 * @param {any} children - Element children
 * @param {StateContext} context - State context for wrapping
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
 * @param {StateContext} context - State context for wrapping
 * @returns {import("hyperapp").ElementVNode<State>} Wrapped element
 */
function wrapProgramActions(element, context) {
  if (!element) {
    return element;
  }
  if (!element.tag) {
    // Finding syntax errors in nested v nodes
    return h("p", {}, text("syntax error"));
  }
  if (typeof element !== "object" || !element.props) {
    return element;
  }

  return {
    ...element,
    props: wrapEventHandlers(element.props, context),
    children: wrapElementChildren(element.children, context),
  };
}

///**
// * Creates subscription cleanup functions for a single page
// * @param {Page} page - Page to create subscriptions for
// * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch
// * @returns {(() => void)[]} Array of cleanup functions
// */
//function createPageSubscriptions(page, dispatch) {
//  //FIX: refactor this just take in a list of subscriptions since we will be deprecating program registry
//  const program = programRegistry[page.programName];
//  const cleanupFunctions = [];
//
//  if (program.subscriptions) {
//    const programSubs = program.subscriptions(page.state);
//
//    for (const sub of programSubs) {
//      const [subFn, ...args] = sub;
//      const wrappedDispatch = createWrappedDispatch(dispatch, page);
//      const cleanup = subFn(wrappedDispatch, ...args);
//      if (cleanup) cleanupFunctions.push(cleanup);
//    }
//  }
//
//  return cleanupFunctions;
//}

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
  //FIX: add back program subscription manager later
  //
  // const pageCleanups = currentState.pages.map((/** @type {Page}*/ page) =>
  //   createPageSubscriptions(page, dispatch),
  // );

  // globalCleanups = pageCleanups;

  // TODO: investigate. cleanups don't actually run becaue susbscription manager only runs once
  return () => {
    globalCleanups.forEach((cleanup) => cleanup());
    globalCleanups = [];
  };
}

/** @type {HTMLStyleElement | null} */
let currentBlockStyleElement = null;

/**
 * Injects shared CSS for all blocks, scoped to .block class
 * @param {string} css - CSS to scope
 */
function injectSharedBlockCSS(css) {
  // Remove existing style if it exists
  if (currentBlockStyleElement) {
    currentBlockStyleElement.remove();
    currentBlockStyleElement = null;
  }

  if (css && css.trim()) {
    // Transform CSS to be scoped to .block class
    const scopedCSS = css.replace(
      /([^{}]+){/g,
      `.${BLOCK_CONTENTS_CLASS_NAME} $1 {`,
    );

    // Inject into document head
    currentBlockStyleElement = document.createElement("style");
    currentBlockStyleElement.id = "block-styles";
    currentBlockStyleElement.textContent = scopedCSS;
    document.head.appendChild(currentBlockStyleElement);
  }
}

/**
 * @param {Page} currentPage
 * @param {Block} block
 * @returns {import("hyperapp").ElementVNode<State>} Block renderer function
 */
export function renderView(currentPage, block) {
  try {
    // Inject CSS for current page (shared by all blocks)
    injectSharedBlockCSS(currentPage.css || "");

    const viewFunction = new Function(
      "h",
      "text",
      `${block.program}; return view;`,
    )(h, text);
    const viewNode = viewFunction(currentPage.state);
    if (!viewNode.tag) {
      return h("p", {}, text("error, invalid view node tag"));
    }
    /** @type {StateContext} */
    const pageContext = { type: "page", currentPage };
    const wrappedScopedProgramNode = wrapProgramActions(viewNode, pageContext);
    return wrappedScopedProgramNode;
  } catch (e) {
    return h("p", {}, text(`error:\n${e}`));
  }
}
