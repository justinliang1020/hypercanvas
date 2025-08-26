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

- **Base Class**: All programs extend the `ProgramBase` class from `src/programBase.js`
- **Registration**: New programs are automatically added to the program registry. No manual steps needed for this.
- **State Typedef**: Define a JSDoc `@typedef State` at the top with all state properties
- **Constructor Pattern**:
  - Call `super()` first
  - Set `this.defaultState` with proper JSDoc type annotation: `/** @type {State} */`
  - Define `this.allowedConnections` array with proper type annotation: `/** @type {AllowedConnection[]} */`
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

## State Management Patterns

- **Global State**: Centralized in `src/types.js` with comprehensive JSDoc typedef for `State`
- **Immutable Updates**: Always use spread operator for state changes: `{...state, newProp: value}`
- **Memento Pattern**: Use `saveMementoAndReturn(prevState, newState)` for undo/redo operations
- **Effects**: Use Hyperapp effects for async operations (file I/O, clipboard, etc.)
- **Subscriptions**: Use for cross-program communication via `onConnectionStateChange`

## Event Handling Patterns

- **Pointer Events**: Use `onpointerdown`, `onpointermove`, `onpointerup` for cross-device compatibility
- **Event Propagation**: Call `event.stopPropagation()` to prevent viewport interactions
- **Keyboard Shortcuts**: Handle in viewport.js with proper checks for edit mode and text selection
- **Zoom-Aware Interactions**: Scale UI elements and coordinates by `1/state.zoom` for consistent appearance

## File Organization

- **Core Logic**: Main app files in `src/` root
- **Programs**: All programs in `src/programs/` with automatic registry loading
- **System Programs**: Built-in programs in `src/programs/system/` (text, image)
- **Custom Programs**: User programs can be organized in subdirectories
- **Types**: Centralized JSDoc typedefs in `src/types.js`
- **Constants**: App-wide constants in `src/constants.js`

## Electron Integration

- **File API**: Use `window.fileAPI` for file operations (reading, writing, image handling)
- **Theme API**: Use `window.electronAPI` for system theme detection and changes
- **Preload Bridge**: All Electron APIs exposed through preload.js security bridge
- **State Persistence**: Auto-save to `user/state.json` on app quit
- **Media Handling**: Images saved to `user/media/` directory

## UI Component Patterns

- **Inline Styles**: Use JavaScript objects for styling, prefer flexbox layouts
- **Zoom Scaling**: Scale borders, handles, and UI elements by `1/state.zoom`
- **Conditional Rendering**: Use ternary operators and array spreading for conditional elements
- **Key Props**: Always use unique `key` props for dynamic lists to prevent DOM reuse bugs
- **Pointer Events**: Disable with `pointerEvents: "none"` during drag operations

## Connection System

- **Default Connections**: Currently limited to "default" connection name
- **Type Safety**: Import target program class for `allowedConnections` type checking
- **State Sync**: Use `onConnectionStateChange` subscription for reactive updates
- **Connection Management**: Automatic cleanup of invalid connections via `deleteInactiveConnections`

## Architecture Notes

- Hyperapp-based reactive UI with custom block/canvas system
- Program-based architecture where each block runs a Program class instance
- State persistence via Electron file API to user data directory
- Automatic program registry with recursive directory loading
- Canvas with infinite zoom/pan, block drag/resize, and connection system
