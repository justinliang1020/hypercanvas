# AGENTS.md - Development Guidelines for Hypercanvas

## Build/Test Commands

- `pnpm start` - Start Electron app in development mode
- `pnpm run package` - Package the application  
- `pnpm run make` - Build distributable packages
- `pnpm run type-check` - Run TypeScript checking on JavaScript files via jsconfig.json
- `pnpm run lint` - No linting configured (returns "No linting configured")
- No test framework configured - no test commands available

## Code Style Guidelines

- **Language**: JavaScript with JSDoc type annotations (TypeScript checking enabled via jsconfig.json)
- **Imports**: Use ES6 imports with relative paths (e.g., `import { h } from "../packages/hyperapp/index.js"`)
- **Types**: Extensive JSDoc typedef comments for type safety (see types.js for centralized definitions)
- **Hyperapp**: Uses custom Hyperapp implementation from `src/packages/hyperapp/index.js`
- **Naming**: camelCase for variables/functions, PascalCase for classes/components, PascalCase for program exports
- **Functions**: Prefer function declarations over arrow functions for main functions
- **Comments**: Use JSDoc format with @typedef, @param, @returns annotations
- **Error Handling**: Use try/catch blocks, console.error for logging
- **State Management**: Hyperapp-style immutable state updates with spread operator
- **File Structure**: Programs in src/programs/, main app logic in src/app.js
- **CSS**: Global styles in style.css, inline styles for component-specific styling
- **Electron**: Main process in src/index.js, renderer in src/app.js with preload.js bridge

## Program Development Guidelines

- **Program Structure**: Programs are plain objects with `initialState` and `views` properties
- **Export Pattern**: Export program objects with PascalCase names (e.g., `export const TestProgram = {...}`)
- **Registration**: Programs are manually registered in `src/program.js` programRegistry object
- **State Typedef**: Define a JSDoc `@typedef ProgramState` at the top with all state properties
- **Program Object Pattern**:
  - Set `initialState` property with typed initial state
  - Set `views` array containing view functions for rendering different UI states
- **View Functions**: Regular functions that take `state` parameter and return Hyperapp VNode
- **Event Handlers**: Use inline action functions that return new state objects
- **State Updates**: Return new state objects using spread operator (`{...state, newProp: value}`)
- **JSDoc**: Include proper return type annotations: `@returns {import("hyperapp").ElementVNode<ProgramState>}`

## State Management Patterns

- **Global State**: Centralized in `src/types.js` with comprehensive JSDoc typedef for `State`
- **Page-based Architecture**: Each page has its own state and programName, multiple pages supported
- **Program State**: Each page contains program-specific state accessed via `currentPage.state`
- **Immutable Updates**: Always use spread operator for state changes: `{...state, newProp: value}`
- **Memento Pattern**: Use `saveMementoAndReturn(prevState, newState)` for undo/redo operations
- **State Bridging**: `createPageAction` transforms between app state and page state for program actions
- **Effects**: Use Hyperapp effects for async operations (file I/O, clipboard, etc.)
- **Subscriptions**: Use for theme changes and system integration

## Event Handling Patterns

- **Pointer Events**: Use `onpointerdown`, `onpointermove`, `onpointerup` for cross-device compatibility
- **Event Propagation**: Call `event.stopPropagation()` to prevent viewport interactions
- **Keyboard Shortcuts**: Handle in viewport.js with proper checks for edit mode and text selection
- **Zoom-Aware Interactions**: Scale UI elements and coordinates by `1/state.zoom` for consistent appearance

## File Organization

- **Core Logic**: Main app files in `src/` root
- **Programs**: All programs in `src/programs/` directory
- **Program Registry**: Manual registration in `src/program.js` programRegistry object
- **Types**: Centralized JSDoc typedefs in `src/types.js`
- **Constants**: App-wide constants in `src/constants.js`
- **Pages**: Page management utilities in `src/pages.js`
- **Packages**: Custom Hyperapp implementation in `src/packages/hyperapp/`

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

## Page System

- **Multi-Page Architecture**: Support for multiple pages with independent state and programs
- **Page Management**: Create, switch, delete, and rename pages via `src/pages.js` utilities
- **Program Assignment**: Each page has a `programName` property linking it to program registry
- **State Isolation**: Each page maintains its own program state in `page.state`
- **Page Navigation**: Switch between pages without losing individual page states

## Architecture Notes

- Hyperapp-based reactive UI with page/program architecture
- Program-based system where each page runs a specific program with isolated state
- State persistence via Electron file API to user data directory (`user/state.json`)
- Manual program registration in `src/program.js` programRegistry
- Multi-page application with page switching and independent state management
- Action bridging system (`createPageAction`) to connect app state with program state
- Canvas with infinite zoom/pan, block drag/resize system
- TypeScript checking enabled via jsconfig.json for JavaScript files
