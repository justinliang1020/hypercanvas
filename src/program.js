import { h, text } from "./packages/hyperapp/index.js";
import { updateCurrentPage } from "./pages.js";
import { TestProgram } from "./programs/testProgram.js";
import { TestProgram2 } from "./programs/testProgram2.js";

/**
 * Wraps a program effect to work with page state instead of app state
 * @param {Array} effect - Effect array [effectFunction, ...args]
 * @param {Page} currentPage - Current page context
 * @returns {Array} Wrapped effect array
 */
function wrapProgramEffect(effect, currentPage) {
  if (!Array.isArray(effect) || effect.length === 0) {
    return effect;
  }

  const [effectFunction, ...args] = effect;

  // Create a wrapped effect function
  const wrappedEffectFunction = (dispatch, ...effectArgs) => {
    // Create a wrapped dispatch that transforms program state to app state
    const wrappedDispatch = (programAction) => {
      const appAction = createPageAction(currentPage, programAction);
      return dispatch(appAction);
    };

    // Call the original effect with the wrapped dispatch
    return effectFunction(wrappedDispatch, ...effectArgs);
  };

  return [wrappedEffectFunction, ...args];
}

/**
 * Creates a higher-order action that transforms between app state and page state
 * @param {Page} currentPage - Current page context
 * @param {Function} pageAction - Action function that works with page state
 * @returns {import("hyperapp").Action<State>} Action function that works with app state
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
      const wrappedEffects = effects.map((effect) =>
        wrapProgramEffect(effect, currentPage),
      );
      return [
        updateCurrentPage(appState, { state: newPageState }),
        ...wrappedEffects,
      ];
    } else if (result && typeof result === "object") {
      // If result is a state object, update the page state
      return updateCurrentPage(appState, { state: result });
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
 * @type {Record<String, Program<any>>}
 */
export const programRegistry = {
  testProgram: TestProgram,
  testProgram2: TestProgram2,
};
