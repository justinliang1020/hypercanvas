//@ts-nocheck
import "./packages/ace/index.js";
import "./packages/ace/mode-javascript.js";
import "./packages/ace/mode-css.js";
import "./packages/ace/keybinding-vim.js";
import "./packages/ace/theme-twilight.js";
import "./packages/ace/ext-beautify.js";

class AceEditor extends HTMLElement {
  constructor() {
    super();
    this.editor = null;
    this.shadow = this.attachShadow({ mode: "open" });
  }

  connectedCallback() {
    this.shadow.innerHTML = `
      <style>
        .ace-editor-container {
          width: 100%;
          height: 500px;
          border: 1px solid #ccc;
          font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
          position: relative;
        }
      </style>
      <div class="ace-editor-container"></div>
    `;

    const editorDiv = this.shadow.querySelector(".ace-editor-container");
    this.editor = ace.edit(editorDiv);
    this.editor.renderer.attachToShadowRoot();

    this.editor.setOptions({
      fontSize: "12px",
      showPrintMargin: false,
      useWorker: false, // https://github.com/ajaxorg/ace/issues/4060#issuecomment-1217133879
    });
    this.editor.session.setOptions({
      tabSize: 2,
      useSoftTabs: true,
    });

    this.setMode(this.getAttribute("mode"));
    this.updateTheme();
    // this.editor.setKeyboardHandler("ace/keyboard/vim");
    this.editor.setValue(this.initialContent, -1);

    // Emit input event on change
    this.editor.on("change", () => {
      const inputEvent = new Event("aceinput", {
        bubbles: true,
        cancelable: true,
      });
      inputEvent.value = this.editor.getValue(); // not standard, but useful
      this.dispatchEvent(inputEvent);
    });
  }

  getValue() {
    return this.editor ? this.editor.getValue() : "";
  }

  setValue(value) {
    if (this.editor) {
      this.editor.setValue(value, -1);
    }
  }

  // Value property getter/setter
  get value() {
    return this.getValue();
  }

  set value(val) {
    this.setValue(val);
  }

  updateTheme() {
    if (this.editor) {
      const isDarkMode =
        this.hasAttribute("dark-mode") &&
        this.getAttribute("dark-mode") !== "false";
      if (isDarkMode) {
        this.editor.setTheme("ace/theme/twilight");
      } else {
        // Use default light theme (no theme set)
        this.editor.setTheme("");
      }
    }
  }

  /**
   * @param {String | null} mode
   */
  setMode(mode) {
    if (!this.editor) {
      return;
    }
    switch (mode) {
      case "css": {
        this.editor.session.setMode("ace/mode/css");
        break;
      }
      case "javascript": {
        this.editor.session.setMode("ace/mode/javascript");

        // commands
        this.editor.commands.addCommand({
          name: "beautify",
          bindKey: { win: "Ctrl-Alt-L", mac: "Cmd-Alt-L" },
          exec: function (editor) {
            const beautify = ace.require("ace/ext/beautify");
            beautify.beautify(editor.session);
          },
        });
        break;
      }
      case null: {
        break;
      }
      default: {
        console.error(`invalid ace editor mode: ${mode}`);
      }
    }
  }

  static get observedAttributes() {
    return ["dark-mode", "mode"];
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "dark-mode" && this.editor) {
      this.updateTheme();
    } else if (name === "mode" && this.editor) {
      this.setMode(newValue);
    }
  }
}

customElements.define("ace-editor", AceEditor);
