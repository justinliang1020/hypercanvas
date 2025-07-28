import { TextProgram } from "./text.js";

/** @type{Object.<string, (typeof import("./program.js").Program | null)>} */
export const programRegistry = {
  text: TextProgram,
};
