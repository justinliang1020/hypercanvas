#!/usr/bin/env node

const { spawn } = require("child_process");
const path = require("path");
const fs = require("fs");

/**
 * CLI for starting the Hypercanvas Electron app
 * @param {string[]} args
 */
function startElectronApp(args = []) {
  // Path to the Electron main process file
  const electronMain = path.join(__dirname, "../electron/index.js");

  // Check if the main file exists
  if (!fs.existsSync(electronMain)) {
    console.error("Error: Electron main file not found at", electronMain);
    process.exit(1);
  }

  // Try to find electron executable
  let electronPath;
  try {
    // First try to use electron from node_modules
    electronPath = require.resolve("electron/cli.js");
  } catch (error) {
    // Fallback to global electron
    electronPath = "electron";
  }

  console.log("Starting Hypercanvas...");

  // Spawn the electron process
  const electronProcess = spawn(electronPath, [electronMain, ...args], {
    stdio: "inherit",
    env: {
      ...process.env,
      NODE_ENV: process.env.NODE_ENV || "development",
    },
  });

  // Handle process events
  electronProcess.on("error", (err) => {
    console.error("Failed to start Hypercanvas:", err.message);
    process.exit(1);
  });

  electronProcess.on("exit", (code) => {
    if (code !== 0) {
      console.error(`Hypercanvas exited with code ${code}`);
    }
    process.exit(code);
  });

  // Handle SIGINT (Ctrl+C) gracefully
  process.on("SIGINT", () => {
    console.log("\nShutting down Hypercanvas...");
    electronProcess.kill("SIGINT");
  });

  // Handle SIGTERM gracefully
  process.on("SIGTERM", () => {
    console.log("\nShutting down Hypercanvas...");
    electronProcess.kill("SIGTERM");
  });
}

/**
 * Display help information
 */
function showHelp() {
  console.log(`
Hypercanvas CLI

Usage:
  hypercanvas [options]

Options:
  --help, -h     Show this help message

Examples:
  hypercanvas              Start Hypercanvas
`);
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);

  // Handle help flag
  if (args.includes("--help") || args.includes("-h")) {
    showHelp();
    return;
  }

  // Filter out CLI-specific flags and pass the rest to Electron
  const electronArgs = args.filter((arg) => !["--help", "-h"].includes(arg));

  // Start the Electron app
  startElectronApp(electronArgs);
}

// Only run if this file is executed directly
if (require.main === module) {
  main();
}

module.exports = {
  startElectronApp,
  showHelp,
  main,
};
