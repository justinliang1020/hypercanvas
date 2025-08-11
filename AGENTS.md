# AGENTS.md - Development Guidelines for Hypercanvas

## Build/Test Commands

- `pnpm start` - Start Electron app in development mode
- `pnpm run package` - Package the application
- `pnpm run make` - Build distributable packages
- `pnpm run lint` - No linting configured (returns "No linting configured")
- No test framework configured - no test commands available

## Code Style Guidelines

- **Language**: JavaScript with JSDoc type annotations (TypeScript checking enabled via jsconfig.json)
- **Imports**: Use ES6 imports with relative paths (e.g., `import { h } from "../packages/hyperapp/index.js"`)
- **Types**: Extensive JSDoc typedef comments for type safety (see app.js for examples)
- **Hyperapp**: Uses custom Hyperapp implementation from `src/packages/hyperapp/index.js` with types in `src/packages/types/hyperapp/index.d.ts`
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Functions**: Prefer function declarations over arrow functions for main functions
- **Comments**: Use JSDoc format with @typedef, @param, @returns annotations
- **Error Handling**: Use try/catch blocks, console.error for logging
- **State Management**: Hyperapp-style immutable state updates with spread operator
- **File Structure**: Programs in src/programs/, main app logic in src/app.js
- **CSS**: Global styles in style.css, inline styles for component-specific styling
- **Electron**: Main process in src/index.js, renderer in src/app.js with preload.js bridge

## Program Development Guidelines

- **Base Class**: All programs extend the `AbstractProgram` class from `src/abstractProgram.js`
- **Registration**: New programs are automatically added to the program registry. No manual steps needed for this.
- **State Typedef**: Define a JSDoc `@typedef State` at the top with all state properties
- **Constructor Pattern**:
  - Call `super()` first
  - Set `this.defaultState` with proper JSDoc type annotation: `/** @type {State} */`
  - Define `this.allowedConnections` array with proper type annotation: `/** @type {import("../abstractProgram.js").AllowedConnection[]} */`
  - Set `this.view = this.#main` (private method reference)
  - Optional: Set `this.subscriptions` as a function returning subscription array
- **View Methods**: Use private arrow function methods with `#` prefix (e.g., `#main = (state) => ...`)
- **Event Handlers**: Use inline arrow functions with proper JSDoc type annotations for parameters
- **State Updates**: Return new state objects using spread operator (`{...state, newProp: value}`)
- **Styling**: Inline styles using JavaScript objects, prefer flexbox layouts with `boxSizing: "border-box"`
- **Error Handling**: Validate connections exist before using, handle JSON parsing errors
- **Method Structure**: Use private arrow function methods with `#` prefix for all internal logic
- **JSDoc**: Include proper return type annotations for view methods: `@returns {import("hyperapp").ElementVNode<State>}`
- **Connections**: Use `this.getConnection(name)` and `this.onConnectionStateChange(name, action)`
  - Currently, connections can only be named "Default"
  - Connection Programs should import the class of the program attempted to connect to

example connection initialization is the following

```js
import { Program as TextProgram } from "./system/text.js";
this.allowedConnections = [
  {
    name: "default",
    program: TextProgram,
  },
];
```

example code for `stateEditor.js`

```js
import { AbstractProgram } from "../abstractProgram.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} connectedState - JSON string representation of connected program state
 * @property {string} editableState - Editable JSON string in textarea
 * @property {string|null} error - Error message for invalid JSON
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      connectedState: "{}",
      editableState: "{}",
      error: null,
    };
    /** @type {import("../abstractProgram.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: AbstractProgram,
      },
    ];
    this.view = this.#main;
    this.subscriptions = () => {
      return [
        this.onConnectionStateChange("default", this.#updateConnectedState),
      ];
    };
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h(
      "section",
      {
        style: {
          padding: "10px",
          height: "100%",
          fontFamily: "monospace",
          display: "flex",
          flexDirection: "column",
          boxSizing: "border-box",
        },
      },
      [
        h("h3", {}, text("State Editor")),
        h(
          "button",
          {
            style: {
              margin: "10px 0",
              padding: "8px 16px",
              backgroundColor: state.error ? "#ccc" : "#007acc",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: state.error ? "not-allowed" : "pointer",
              width: "fit-content",
            },
            disabled: !!state.error,
            onclick: (/** @type {State} */ state) =>
              this.#applyStateChanges(state),
          },
          text("Apply Changes"),
        ),
        h("textarea", {
          style: {
            flex: "1",
            minHeight: "0",
            padding: "10px",
            border: state.error ? "3px solid #ff6b6b" : "3px solid #ccc",
            borderRadius: "4px",
            fontFamily: "monospace",
            fontSize: "12px",
            resize: "vertical",
            boxSizing: "border-box",
          },
          value: state.editableState,
          oninput: (/** @type {State} */ state, /** @type {Event} */ event) =>
            this.#updateEditableState(
              state,
              /** @type {HTMLTextAreaElement} */ (event.target).value,
            ),
        }),
        state.error
          ? h(
              "div",
              {
                style: {
                  color: "#ff6b6b",
                  marginTop: "5px",
                  fontSize: "12px",
                },
              },
              text(state.error),
            )
          : null,
      ],
    );

  /**
   * @param {State} state
   * @param {any} connectedState
   * @return {State}
   */
  #updateConnectedState = (state, connectedState) => {
    const jsonString = JSON.stringify(connectedState, null, 2);
    return {
      ...state,
      connectedState: jsonString,
      editableState:
        state.editableState === state.connectedState
          ? jsonString
          : state.editableState,
    };
  };

  /**
   * @param {State} state
   * @param {string} newValue
   * @return {State}
   */
  #updateEditableState = (state, newValue) => {
    let error = null;
    try {
      JSON.parse(newValue);
    } catch (e) {
      error = `Invalid JSON: ${e instanceof Error ? e.message : String(e)}`;
    }
    return {
      ...state,
      editableState: newValue,
      error,
    };
  };

  /**
   * @param {State} state
   * @return {State}
   */
  #applyStateChanges = (state) => {
    const connectedProgramInstance = this.getConnection("default");
    if (!connectedProgramInstance) return state;
    const parsedState = JSON.parse(state.editableState);
    connectedProgramInstance.modifyState(parsedState);
    return state;
  };
}
```

example code for textStyleEditor.js

```js
import { AbstractProgram } from "../abstractProgram.js";
import { Program as TextProgram } from "./system/text.js";
import { h, text } from "../packages/hyperapp/index.js";

/**
 * @typedef State
 * @property {string} value
 */

export class Program extends AbstractProgram {
  constructor() {
    super();
    /** @type {State} */
    this.defaultState = {
      value: "#000000",
    };
    /** @type {import("../abstractProgram.js").AllowedConnection[]} */
    this.allowedConnections = [
      {
        name: "default",
        program: TextProgram,
      },
    ];
    this.view = this.#main;
  }

  /**
   * @param {State} state
   * @returns {import("hyperapp").ElementVNode<State>}
   */
  #main = (state) =>
    h("section", {}, [
      h("h3", {}, text("Text Style Editor")),
      h("input", {
        type: "color",
        value: state.value,
        oninput: (state, event) => {
          const newValue = /** @type{HTMLInputElement}*/ (event.target).value;
          const newState = {
            ...state,
            value: newValue,
          };
          this.#changeBackground(newState);
          return newState;
        },
      }),
    ]);

  /**
   * @param {State} state
   * @returns {void}
   */
  #changeBackground = (state) => {
    const textProgramInstance = this.getConnection("default");
    if (!textProgramInstance) return;
    const textProgramState = textProgramInstance.getState();
    textProgramInstance.modifyState({
      ...textProgramState,
      backgroundColor: state.value,
    });
  };
}
```

## Architecture Notes

- Hyperapp-based reactive UI with custom block/canvas system
- Program-based architecture where each block runs a Program class instance
- State persistence via Electron file API to user data directory
