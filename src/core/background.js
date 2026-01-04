/**
 * Effect to draw background gradient on canvas
 * @param {*} dispatch - Hyperapp dispatch function
 * @param {{offsetX: number, offsetY: number, zoom: number, isDarkMode: boolean}} props - Props containing offsetX, offsetY, zoom
 */
export function drawBackgroundEffect(dispatch, props) {
  // Define one gradient cycle width in world coordinates
  const REPEAT_WIDTH = 12000;
  const COLOR_1 = props.isDarkMode ? "#4B3A4C" : "#F0F0E7";
  const COLOR_2 = props.isDarkMode ? "#3B3B3B" : "#F3DEDE";
  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("background-canvas")
  );
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size to window size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Calculate visible world coordinate range
  const visibleWorldStart = -props.offsetX / props.zoom;
  const visibleWorldEnd = (canvas.width - props.offsetX) / props.zoom;

  // Find which gradient cycles are visible
  const firstCycle = Math.floor(visibleWorldStart / REPEAT_WIDTH);
  const lastCycle = Math.ceil(visibleWorldEnd / REPEAT_WIDTH);

  // Draw each visible gradient cycle
  for (let i = firstCycle; i <= lastCycle; i++) {
    const cycleWorldStart = i * REPEAT_WIDTH;
    const cycleWorldEnd = (i + 1) * REPEAT_WIDTH;

    // Transform world coordinates to screen coordinates
    const x0 = cycleWorldStart * props.zoom + props.offsetX;
    const x1 = cycleWorldEnd * props.zoom + props.offsetX;

    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    gradient.addColorStop(0, COLOR_1);
    gradient.addColorStop(0.5, COLOR_2);
    gradient.addColorStop(1, COLOR_1);

    ctx.fillStyle = gradient;
    // Extend by 1px to prevent gaps from floating-point rounding
    ctx.fillRect(x0, 0, x1 - x0 + 1, canvas.height);
  }

  // noise(ctx, 0.005);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} rate - Noise density (0-1), where 0 is no noise and 1 is maximum noise
 */
function noise(ctx, rate = 0.02) {
  const w = ctx.canvas.width,
    h = ctx.canvas.height,
    iData = ctx.createImageData(w, h),
    buffer32 = new Uint32Array(iData.data.buffer),
    len = buffer32.length;
  let i = 0;

  for (; i < len; i++) if (Math.random() < rate) buffer32[i] = 0xffffffff;

  // Use offscreen canvas so transparent pixels don't replace the gradient
  const offscreen = document.createElement("canvas");
  offscreen.width = w;
  offscreen.height = h;
  const offscreenCtx = offscreen.getContext("2d");
  offscreenCtx.putImageData(iData, 0, 0);

  ctx.drawImage(offscreen, 0, 0);
}
