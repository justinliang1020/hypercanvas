/**
 * Preload script for webview blocks
 * Handles event forwarding and anchor tag interaction without post-load injection
 */

const { ipcRenderer } = require("electron");
console.log("meow preload");

// Forward keyboard events to parent window
document.addEventListener("keydown", (event) => {
  ipcRenderer.sendToHost("keydown", {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
  });
});

document.addEventListener("keyup", (event) => {
  ipcRenderer.sendToHost("keyup", {
    key: event.key,
    code: event.code,
    ctrlKey: event.ctrlKey,
    metaKey: event.metaKey,
    shiftKey: event.shiftKey,
    altKey: event.altKey,
  });
});

// Helper function to get absolute href
/**
 * @param {string} href
 * @returns {string}
 */
function getAbsoluteHref(href) {
  // If it's already an absolute URL or local file, return as is
  if (
    href.startsWith("http://") ||
    href.startsWith("https://") ||
    href.startsWith("file://")
  ) {
    return href;
  }

  // If current location is not a local file, prepend the origin
  if (!window.location.protocol.startsWith("file:")) {
    return new URL(href, window.location.origin).href;
  }

  return href;
}

// Handle anchor tag interactions when DOM is ready
function setupAnchorHandling() {
  const aEls = document.getElementsByTagName("a");

  console.log(`Setting up ${aEls.length} anchor elements`);
  [...aEls].forEach((aEl) => {
    aEl.addEventListener("pointerover", () => {
      const href = aEl.getAttribute("href");
      if (!href) return;

      const finalHref = getAbsoluteHref(href);
      console.log("Sending anchor-hover IPC:", finalHref);
      ipcRenderer.sendToHost("anchor-hover", { href: finalHref });
    });

    aEl.addEventListener("click", (event) => {
      event.preventDefault();
      const href = aEl.getAttribute("href");
      if (!href) return;

      const finalHref = getAbsoluteHref(href);
      console.log("Sending anchor-click IPC:", finalHref);
      ipcRenderer.sendToHost("anchor-click", { href: finalHref });
    });
  });
}

// Set up anchor handling when DOM is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", setupAnchorHandling);
} else {
  setupAnchorHandling();
}

// Re-setup anchor handling when new content is added dynamically
const observer = new MutationObserver((mutations) => {
  let hasNewAnchors = false;
  mutations.forEach((mutation) => {
    mutation.addedNodes.forEach((node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const element = /** @type {Element} */ (node);
        if (element.tagName === "A" || element.querySelector("a")) {
          hasNewAnchors = true;
        }
      }
    });
  });

  if (hasNewAnchors) {
    setupAnchorHandling();
  }
});

observer.observe(document.body, {
  childList: true,
  subtree: true,
});
