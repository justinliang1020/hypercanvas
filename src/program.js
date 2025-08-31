import { h, text } from "./packages/hyperapp/index.js";
import { updateCurrentPage } from "./pages.js";
import { TestProgram } from "./programs/testProgram.js";
import { TestProgram2 } from "./programs/testProgram2.js";

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
      // If result is [state, ...effects], transform the state part
      const [newPageState, ...effects] = result;
      return [updateCurrentPage(appState, { state: newPageState }), ...effects];
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
