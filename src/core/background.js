/**
 * Effect to draw background gradient on canvas
 * @param {*} dispatch - Hyperapp dispatch function
 * @param {{offsetX: number, offsetY: number, zoom: number}} props - Props containing offsetX, offsetY, zoom
 */
export function drawBackgroundEffect(dispatch, props) {
  const canvas = /** @type {HTMLCanvasElement | null} */ (
    document.getElementById("background-canvas")
  );
  if (!canvas) return;

  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  // Set canvas size to window size
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  // Define one gradient cycle width in world coordinates
  const repeatWidth = 10000;

  // Calculate visible world coordinate range
  const visibleWorldStart = -props.offsetX / props.zoom;
  const visibleWorldEnd = (canvas.width - props.offsetX) / props.zoom;

  // Find which gradient cycles are visible
  const firstCycle = Math.floor(visibleWorldStart / repeatWidth);
  const lastCycle = Math.ceil(visibleWorldEnd / repeatWidth);

  // Draw each visible gradient cycle
  for (let i = firstCycle; i <= lastCycle; i++) {
    const cycleWorldStart = i * repeatWidth;
    const cycleWorldEnd = (i + 1) * repeatWidth;

    // Transform world coordinates to screen coordinates
    const x0 = cycleWorldStart * props.zoom + props.offsetX;
    const x1 = cycleWorldEnd * props.zoom + props.offsetX;

    const gradient = ctx.createLinearGradient(x0, 0, x1, 0);
    const color1 = "#F1F1EC";
    const color2 = "#E3C6C6";
    gradient.addColorStop(0, color1);
    gradient.addColorStop(0.5, color2);
    gradient.addColorStop(1, color1);

    ctx.fillStyle = gradient;
    // Extend by 1px to prevent gaps from floating-point rounding
    ctx.fillRect(x0, 0, x1 - x0 + 1, canvas.height);
  }
}
