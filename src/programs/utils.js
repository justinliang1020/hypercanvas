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
    "div",
    {
      // required for containing the table contents within the block
      style: {
        width: "100%",
        height: "100%",
        overflow: "auto",
      },
    },
    h(
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
          h("tr", { style: { backgroundColor: "#f5f5f5" } }, [
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
    ),
  );
}
