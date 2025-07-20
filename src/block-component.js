import { h, text, app } from "./packages/hyperapp/index.js"; // weird, not sure what exactly to import

class BlockComponent extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  static get observedAttributes() {
    return ["program"];
  }

  connectedCallback() {
    this.render();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "program" && oldValue !== newValue) {
      this.render();
    }
  }

  render() {
    const program = this.getAttribute("program");
    if (!program) return;

    // Clear previous content
    this.shadowRoot.innerHTML = "";

    // Evaluate program string — be cautious
    try {
      eval(program);
    } catch (e) {
      this.shadowRoot.innerHTML = `<pre style="color:red;">Error: ${e.message}</pre>`;
    }
  }
}

customElements.define("block-component", BlockComponent);
