//@ts-nocheck
import "../packages/ace/index.js";
import "../packages/ace/mode-javascript.js";
import "../packages/ace/mode-json.js";
import "../packages/ace/mode-css.js";
import "../packages/ace/keybinding-vim.js";
import "../packages/ace/theme-twilight.js";
import "../packages/ace/ext-beautify.js";

class AceEditor extends HTMLElement {
  /** @type {any} */
  editor;
  /** @type {ShadowRoot} */
  shadow;

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
    this.editor.setValue(this.getAttribute("editorvalue"), -1);

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

  /**
   * @param {string} v
   */
  setEditorValue(v) {
    if (this.editor && this.editor.getValue() !== v) {
      this.editor.session.setValue(v);
    }
  }

  updateTheme() {
    if (this.editor) {
      const isDarkMode =
        this.hasAttribute("darkmode") &&
        this.getAttribute("darkmode") !== "false";
      if (isDarkMode) {
        this.editor.setTheme("ace/theme/twilight");
      } else {
        // Use default light theme (no theme set)
        this.editor.setTheme("");
      }
    }
  }

  /**
   * @param {string | null} mode
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
      case "json": {
        this.editor.session.setMode("ace/mode/json");
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

  /**
   * @returns {string[]}
   */
  static get observedAttributes() {
    return ["darkmode", "mode", "editorvalue"];
  }

  /**
   * @param {string} name
   * @param {string | null} oldValue
   * @param {string | null} newValue
   */
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "darkmode" && this.editor) {
      this.updateTheme();
    } else if (name === "mode" && this.editor) {
      this.setMode(newValue);
    } else if (name === "editorvalue" && this.editor) {
      this.setEditorValue(newValue);
    }
  }
}

customElements.define("ace-editor", AceEditor);
