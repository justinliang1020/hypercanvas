import { ImageProgram } from "./programs/image.js";
import { TextProgram } from "./programs/text.js";
import { TextStyleProgram } from "./programs/textStyleEditor.js";
import { StateVisualizerProgram } from "./programs/stateVisualizer.js";
import { StateEditorProgram } from "./programs/stateEditor.js";
import { PaintProgram } from "./programs/paint.js";
import { HistoryProgram } from "./programs/history.js";

/** @type{Object.<string, (typeof import("./programs/program.js").Program | null)>} */
export const programRegistry = {
  text: TextProgram,
  textStyleEditor: TextStyleProgram,
  image: ImageProgram,
  stateVisualizer: StateVisualizerProgram,
  stateEditor: StateEditorProgram,
  paint: PaintProgram,
  history: HistoryProgram,
};
