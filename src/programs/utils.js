import { h, text } from "../packages/hyperapp/index.js";

/**
 * @param {Object} obj
 * @returns {import("hyperapp").ElementVNode<any>}
 */
export function table(obj) {
  const properties = Object.keys(obj).map((key) => ({
    name: key,
    value: /** @type {any} */ (obj)[key],
  }));
  return h(
    "table",
    {
      style: {
        borderCollapse: "collapse",
        border: "1px solid #ccc",
        fontSize: "12px",
      },
    },
    [
      h("thead", {}, [
        h("tr", {}, [
          h(
            "th",
            {
              style: {
                border: "1px solid #ccc",
                padding: "8px",
                textAlign: "left",
                fontWeight: "bold",
                width: "1%",
                whiteSpace: "nowrap",
              },
            },
            text("Property"),
          ),
          h(
            "th",
            {
              style: {
                border: "1px solid #ccc",
                padding: "8px",
                textAlign: "left",
                fontWeight: "bold",
              },
            },
            text("Value"),
          ),
        ]),
      ]),
      h(
        "tbody",
        {},
        properties.map((prop) =>
          h("tr", { key: prop.name }, [
            h(
              "td",
              {
                style: {
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                  width: "1%",
                  whiteSpace: "nowrap",
                },
              },
              text(prop.name),
            ),
            h(
              "td",
              {
                style: {
                  border: "1px solid #ccc",
                  padding: "8px",
                  textAlign: "left",
                },
              },
              text(JSON.stringify(prop.value)),
            ),
          ]),
        ),
      ),
    ],
  );
}

/**
 * @param {any} state
 * @returns {import("hyperapp").ElementVNode<any>} Block renderer function
 */
export function stateVisualizer(state) {
  return table(state);
}

/**
 * @template {Record<string, any>} T
 * @param {T} props
 * @returns {import("hyperapp").ElementVNode<T>} Generic props editor
 */
export function genericPropsEditor(props) {
  return h(
    "table",
    {
      style: {
        width: "100%",
        borderCollapse: "collapse",
      },
    },
    [
      h("thead", {}, [
        h("tr", {}, [
          h(
            "th",
            {
              style: {
                border: "1px solid #ccc",
                padding: "8px",
                textAlign: "left",
              },
            },
            text("Property"),
          ),
          h(
            "th",
            {
              style: {
                border: "1px solid #ccc",
                padding: "8px",
                textAlign: "left",
              },
            },
            text("Value"),
          ),
        ]),
      ]),
      h(
        "tbody",
        {},
        Object.keys(/** @type {Record<string, any>} */ (props)).map((key) =>
          h("tr", { key }, [
            h(
              "td",
              { style: { border: "1px solid #ccc", padding: "8px" } },
              text(key),
            ),
            h(
              "td",
              { style: { border: "1px solid #ccc", padding: "8px" } },
              renderValueEditor(
                key,
                /** @type {Record<string, any>} */ (props)[key],
              ),
            ),
          ]),
        ),
      ),
    ],
  );
}

/**
 * @param {string} key
 * @param {any} value
 * @returns {import("hyperapp").ElementVNode<any>}
 */
function renderValueEditor(key, value) {
  const inputType = typeof value === "number" ? "number" : "text";
  const isColorProp = key.toLowerCase().includes("color");

  if (isColorProp && typeof value === "string") {
    return h("div", { style: { display: "flex", gap: "4px" } }, [
      h("input", {
        type: "text",
        value: value,
        style: { flex: "1" },
        oninput: (state, event) => ({
          ...state,
          [key]: /** @type {HTMLInputElement} */ (event.target).value,
        }),
      }),
      h("input", {
        type: "color",
        value: isHex(value) ? value : "#000000",
        oninput: (state, event) => ({
          ...state,
          [key]: /** @type {HTMLInputElement} */ (event.target).value,
        }),
      }),
    ]);
  }

  return h("input", {
    type: inputType,
    value: value,
    oninput: (state, event) => ({
      ...state,
      [key]:
        inputType === "number"
          ? Number(/** @type {HTMLInputElement} */ (event.target).value)
          : /** @type {HTMLInputElement} */ (event.target).value,
    }),
  });
}

/**
 * returns whether a string is like "#rrggbb"
 * @param {String} s
 * @returns {Boolean}
 */
function isHex(s) {
  //this is kinda a dumb check, a more accurate check would verify if characters are actually 0-f
  try {
    return s[0] === "#" && s.length === 7;
  } catch {
    return false;
  }
}
