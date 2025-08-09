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

- **Base Class**: All programs extend the `Program` class from `src/programs/program.js`
- **Registration**: New programs must be imported and added to `programRegistry` in `src/programs/index.js`
- **State Typedef**: Define a JSDoc `@typedef State` at the top with all state properties
- **Constructor Pattern**:
  - Call `super()` first
  - Set `this.defaultState` with proper JSDoc type annotation
  - Define `this.allowedConnections` array for program connections
  - Set `this.view = this.#main` (private method reference)
  - Optional: Set `this.subscriptions` for reactive connections
- **View Methods**: Use private methods with `#` prefix (e.g., `#main`, `#renderHeader`)
- **Event Handlers**: Use arrow functions with proper JSDoc type annotations for parameters
- **State Updates**: Return new state objects using spread operator (`{...state, newProp: value}`)
- **Connections**: Use `this.getConnection(name)` and `this.onConnectionStateChange(name, action)`
- **Styling**: Inline styles using JavaScript objects, prefer flexbox layouts
- **Error Handling**: Validate connections exist before using, handle JSON parsing errors
- **Class Structure**: All functions should be class members (methods), not standalone functions. Use private methods with `#` prefix for internal logic

## Architecture Notes

- Hyperapp-based reactive UI with custom block/canvas system
- Program-based architecture where each block runs a Program class instance
- State persistence via Electron file API to user data directory
