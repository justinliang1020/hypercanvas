import { ImageProgram } from "./image.js";
import { TextProgram } from "./text.js";
import { TextStyleProgram } from "./textStyleEditor.js";
import { StateVisualizerProgram } from "./stateVisualizer.js";
import { PaintProgram } from "./paint.js";

/** @type{Object.<string, (typeof import("./program.js").Program | null)>} */
export const programRegistry = {
  text: TextProgram,
  textStyleEditor: TextStyleProgram,
  image: ImageProgram,
  stateVisualizer: StateVisualizerProgram,
  paint: PaintProgram,
};
