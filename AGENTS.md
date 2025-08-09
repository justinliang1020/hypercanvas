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
- **Hyperapp Types**: hyperapp types are found in `/src/packages/types/hyperapp/index.d.ts`
- **Naming**: camelCase for variables/functions, PascalCase for classes/components
- **Functions**: Prefer function declarations over arrow functions for main functions
- **Comments**: Use JSDoc format with @typedef, @param, @returns annotations
- **Error Handling**: Use try/catch blocks, console.error for logging
- **State Management**: Hyperapp-style immutable state updates with spread operator
- **File Structure**: Programs in src/programs/, main app logic in src/app.js
- **CSS**: Global styles in style.css, inline styles for component-specific styling
- **Electron**: Main process in src/index.js, renderer in src/app.js with preload.js bridge

## Architecture Notes
- Hyperapp-based reactive UI with custom block/canvas system
- Program-based architecture where each block runs a Program class instance
- State persistence via Electron file API to user data directory
