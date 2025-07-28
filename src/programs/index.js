import { TextProgram } from "./text.js";
import { TextStyleProgram } from "./textStyleEditor.js";

/** @type{Object.<string, (typeof import("./program.js").Program | null)>} */
export const programRegistry = {
  text: TextProgram,
  textStyleEditor: TextStyleProgram,
};
