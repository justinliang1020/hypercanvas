import { h, text } from "./packages/hyperapp/index.js";
import { updateCurrentPage } from "./pages.js";
import { TestProgram } from "./programs/testProgram.js";
import { TestProgram2 } from "./programs/testProgram2.js";

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

  // Create a wrapped effect function
  /** @type {import("hyperapp").Effecter<State, any>} */
  const wrappedEffectFunction = (dispatch, ...effectArgs) => {
    // Create a wrapped dispatch that transforms program state to app state
    /** @type {import("hyperapp").Dispatch<any>} */
    const wrappedDispatch = (programAction) => {
      const appAction = createPageAction(currentPage, programAction);
      return dispatch(appAction);
    };

    // Call the original effect with the wrapped dispatch
    return effectFunction(wrappedDispatch, ...effectArgs);
  };

  // Type assertion to match Hyperapp's Effect type
  /** @type {import("hyperapp").Effect<State, any>} */
  const wrappedEffect = /** @type {any} */ ([wrappedEffectFunction, ...args]);
  return wrappedEffect;
}

/**
 * Creates a higher-order action that transforms between app state and page state
 * @param {Page} currentPage - Current page context
 * @param {import("hyperapp").Action<any, any>} pageAction - Action function that works with page state
 * @returns {import("hyperapp").Action<State, any>} Action function that works with app state
 */
function createPageAction(currentPage, pageAction) {
  return (appState, props) => {
    // Call the page action with page state
    const result = pageAction(currentPage.state, props);

    // Handle different action result types (following Hyperapp's action patterns)
    if (typeof result === "function") {
      // If result is another action, wrap it recursively
      return createPageAction(currentPage, result);
    } else if (Array.isArray(result)) {
      // If result is [state, ...effects], transform the state part and wrap effects
      const [newPageState, ...effects] = result;
      /** @type {import("hyperapp").MaybeEffect<State, any>[]} */
      const wrappedEffects = effects.map((effect) =>
        wrapProgramEffect(effect, currentPage),
      );
      return [
        {
          ...appState,
          pages: appState.pages.map((page) =>
            page.id === currentPage.id ? { ...page, state: newPageState } : page,
          ),
        },
        ...wrappedEffects,
      ];
    } else if (result && typeof result === "object") {
      // If result is a state object, update the specific page state
      return {
        ...appState,
        pages: appState.pages.map((page) =>
          page.id === currentPage.id ? { ...page, state: result } : page,
        ),
      };
    } else {
      // Return unchanged app state for other cases
      return appState;
    }
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
 * Recursively wraps actions in program elements to transform between app and page state
 * @param {import("hyperapp").ElementVNode<any>} element - Program element
 * @param {Page} currentPage - Current page
 * @returns {import("hyperapp").ElementVNode<State>} Wrapped element
 */
function wrapProgramActions(element, currentPage) {
  if (!element || typeof element !== "object" || !element.props) {
    return element;
  }

  const wrappedProps = { ...element.props };

  // Wrap all event handlers that start with 'on'
  for (const propName in element.props) {
    if (
      propName.startsWith("on") &&
      typeof element.props[propName] === "function"
    ) {
      wrappedProps[propName] = createPageAction(
        currentPage,
        //@ts-ignore  TODO: investigate
        element.props[propName],
      );
    }
  }

  // Recursively wrap children if they exist
  let wrappedChildren = element.children;
  if (Array.isArray(element.children)) {
    wrappedChildren = element.children.map((child) =>
      wrapProgramActions(child, currentPage),
    );
  }

  return {
    ...element,
    props: wrappedProps,
    children: wrappedChildren,
  };
}

/**
 * Program subscription manager that handles all program subscriptions
 * @param {import("hyperapp").Dispatch<State>} dispatch - App-level dispatch function
 * @param {{state: State}} props - Props containing app state
 * @returns {() => void} Cleanup function
 */
function programSubscriptionManager(dispatch, props) {
  const { state } = props;
  const cleanupFunctions = [];

  // For each page, start its program subscriptions
  for (const page of state.pages) {
    const program = programRegistry[page.programName];
    if (program.subscriptions) {
      const programSubs = program.subscriptions(page.state);
      
      for (const sub of programSubs) {
        const [subFn, ...args] = sub;
        // Capture page in closure to prevent reference sharing
        const wrappedDispatch = ((currentPage) => (action) => dispatch(createPageAction(currentPage, action)))(page);
        const cleanup = subFn(wrappedDispatch, ...args);
        if (cleanup) cleanupFunctions.push(cleanup);
      }
    }
  }

  return () => {
    cleanupFunctions.forEach(fn => fn());
  };
}

export { programSubscriptionManager };

/**
 * @type {Record<String, Program<any>>}
 */
export const programRegistry = {
  testProgram: TestProgram,
  testProgram2: TestProgram2,
};
