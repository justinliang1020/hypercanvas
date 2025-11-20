import { h, text } from "hyperapp";
import { Z_INDEX_TOP } from "./constants.js";

const outerRadius = 120;
const innerRadius = 15;
const labelRadius = 80; // Distance from center for labels

/**
 * @typedef RadialOption
 * @property {string} label - Display label for the option
 * @property {string} [action] - Action identifier
 */

/**
 * Creates a sector path for the radial menu
 * @param {number} index - Section index
 * @param {number} totalSections - Total number of sections
 * @returns {string} SVG path data
 */
function createSectorPath(index, totalSections) {
  const anglePerSection = (2 * Math.PI) / totalSections;
  const startAngle = index * anglePerSection;
  const endAngle = (index + 1) * anglePerSection;

  // Calculate points
  const x1 = 120 + outerRadius * Math.cos(startAngle);
  const y1 = 120 + outerRadius * Math.sin(startAngle);
  const x2 = 120 + outerRadius * Math.cos(endAngle);
  const y2 = 120 + outerRadius * Math.sin(endAngle);
  const x3 = 120 + innerRadius * Math.cos(endAngle);
  const y3 = 120 + innerRadius * Math.sin(endAngle);
  const x4 = 120 + innerRadius * Math.cos(startAngle);
  const y4 = 120 + innerRadius * Math.sin(startAngle);

  const largeArcFlag = anglePerSection > Math.PI ? 1 : 0;

  return `
    M ${x1},${y1}
    A ${outerRadius},${outerRadius} 0 ${largeArcFlag} 1 ${x2},${y2}
    L ${x3},${y3}
    A ${innerRadius},${innerRadius} 0 ${largeArcFlag} 0 ${x4},${y4}
    Z
  `.trim();
}

/**
 * Creates a single option sector
 * @param {RadialOption} option - Option configuration
 * @param {number} index - Option index
 * @param {number} totalOptions - Total number of options
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function createOptionSector(option, index, totalOptions) {
  const pathData = createSectorPath(index, totalOptions);

  return h("path", {
    class: "sector-path",
    "data-index": index,
    role: "menuitem",
    "aria-label": option.label,
    d: pathData,
    onpointerenter: (state) => {
      console.log("enter", index);
      return state;
    },
    onpointerleave: (state) => {
      console.log("leave", index);
      return state;
    },
    style: {
      fill: "rgba(255, 255, 255, 0.1)",
      stroke: "rgba(255, 255, 255, 0.3)",
      strokeWidth: "1px",
      pointerEvents: "auto",
      cursor: "pointer",
    },
  });
}

/**
 * Creates a divider line
 * @param {number} index - Divider index
 * @param {number} totalSections - Total number of sections
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function createDivider(index, totalSections) {
  const angle = (index * 2 * Math.PI) / totalSections;
  const length = outerRadius; // From center to outer edge

  return h("div", {
    class: "divider",
    style: {
      position: "absolute",
      width: `${length}px`,
      height: "1px",
      backgroundColor: "rgba(255, 255, 255, 0.3)",
      left: "0px",
      top: "0px",
      transform: `rotate(${angle}rad)`,
      transformOrigin: "0 0",
    },
  });
}

/**
 * Creates an option label
 * @param {RadialOption} option - Option configuration
 * @param {number} index - Option index
 * @param {number} totalOptions - Total number of options
 * @returns {import("hyperapp").ElementVNode<State>}
 */
function createOptionLabel(option, index, totalOptions) {
  const angle = ((index + 0.5) * (2 * Math.PI)) / totalOptions;
  const x = labelRadius * Math.cos(angle);
  const y = labelRadius * Math.sin(angle);

  return h(
    "div",
    {
      class: "option-label",
      style: {
        position: "absolute",
        left: `${x}px`,
        top: `${y}px`,
        transform: "translate(-50%, -50%)",
        color: "white",
        fontSize: "14px",
        fontWeight: "500",
        pointerEvents: "none",
        userSelect: "none",
        textAlign: "center",
        whiteSpace: "nowrap",
      },
    },
    text(option.label),
  );
}

/**
 * @param {State} state - Current application state
 * @returns {import("hyperapp").ElementVNode<State> | null} Radial menu component
 */
export function radialMenu(state) {
  if (!state.contextMenu) return null;

  const options = [
    { label: "Copy", action: "copy" },
    { label: "Cut", action: "cut" },
    { label: "Paste", action: "paste" },
    { label: "Delete", action: "delete" },
    { label: "Group", action: "group" },
    { label: "Edit", action: "edit" },
  ];

  return h(
    "div",
    {
      id: "radialMenu",
      class: "radial-menu",
      role: "menu",
      "aria-hidden": "false",
      style: {
        display: "block",
        position: "absolute",
        left: `${state.contextMenu.x}px`,
        top: `${state.contextMenu.y}px`,
        pointerEvents: "auto",
        zIndex: `${Z_INDEX_TOP}`,
      },
    },
    [
      // Single SVG containing all sectors
      h(
        "svg",
        {
          width: 240,
          height: 240,
          style: {
            position: "absolute",
            left: "-120px",
            top: "-120px",
            pointerEvents: "auto",
          },
        },
        [
          // Option sectors as paths
          ...options.map((option, index) =>
            createOptionSector(option, index, options.length),
          ),
        ],
      ),

      // Center indicator
      h("div", {
        class: "center-indicator",
        style: {
          position: "absolute",
          width: "30px",
          height: "30px",
          backgroundColor: "rgba(255, 255, 255, 0.8)",
          border: "2px solid rgba(255, 255, 255, 0.9)",
          borderRadius: "50%",
          left: "-15px",
          top: "-15px",
          pointerEvents: "none",
          boxSizing: "border-box",
        },
      }),

      // Dividers
      ...options.map((_, index) => createDivider(index, options.length)),

      // Option labels
      ...options.map((option, index) =>
        createOptionLabel(option, index, options.length),
      ),
    ],
  );
}
