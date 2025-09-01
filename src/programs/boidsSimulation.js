import { h, text } from "../packages/hyperapp/index.js";
import { stateVisualizer } from "./utils.js";

/**
 * @typedef Boid
 * @property {number} x - X position
 * @property {number} y - Y position
 * @property {number} vx - X velocity
 * @property {number} vy - Y velocity
 * @property {number} id - Unique identifier
 */

/**
 * @typedef ProgramState
 * @property {Boid[]} boids - Array of boid entities
 * @property {number} separationRadius - Distance for separation behavior
 * @property {number} alignmentRadius - Distance for alignment behavior
 * @property {number} cohesionRadius - Distance for cohesion behavior
 * @property {number} separationStrength - Strength of separation force
 * @property {number} alignmentStrength - Strength of alignment force
 * @property {number} cohesionStrength - Strength of cohesion force
 * @property {number} maxSpeed - Maximum boid speed
 * @property {number} canvasWidth - Canvas width
 * @property {number} canvasHeight - Canvas height
 * @property {boolean} paused - Animation paused state
 */

/** @type {Program<ProgramState>} */
export const BoidsSimulation = {
  initialState: {
    boids: createInitialBoids(50),
    separationRadius: 30,
    alignmentRadius: 50,
    cohesionRadius: 80,
    separationStrength: 1.5,
    alignmentStrength: 1.0,
    cohesionStrength: 1.0,
    maxSpeed: 3,
    canvasWidth: 800,
    canvasHeight: 600,
    paused: false,
  },
  views: [
    boidsCanvas,
    controlPanel,
    flockStatistics,
    calculationExplainer,
    stateVisualizer,
  ],
  subscriptions: (state) => [[animationSubscription, {}]],
};

/**
 * Creates initial boids with random positions and velocities
 * @param {number} count - Number of boids to create
 * @returns {Boid[]} Array of boids
 */
function createInitialBoids(count) {
  const boids = [];
  for (let i = 0; i < count; i++) {
    boids.push({
      id: i,
      x: Math.random() * 800,
      y: Math.random() * 600,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
    });
  }
  return boids;
}

/**
 * Animation subscription that updates boid positions
 * @param {import("hyperapp").Dispatch<ProgramState>} dispatch
 * @param {{}} props
 * @returns {() => void} Cleanup function
 */
function animationSubscription(dispatch, props) {
  const animate = () => {
    dispatch((state) => ({
      ...state,
      boids: updateBoids(state),
    }));
  };

  const intervalId = setInterval(animate, 16); // ~60fps

  return () => {
    clearInterval(intervalId);
  };
}

/**
 * Updates all boids based on flocking rules
 * @param {ProgramState} state
 * @returns {Boid[]} Updated boids array
 */
function updateBoids(state) {
  if (state.paused) return state.boids;
  const { boids, canvasWidth, canvasHeight, maxSpeed } = state;

  return boids.map((boid) => {
    // Calculate flocking forces
    const separation = calculateSeparation(boid, boids, state);
    const alignment = calculateAlignment(boid, boids, state);
    const cohesion = calculateCohesion(boid, boids, state);

    // Apply forces to velocity
    let newVx = boid.vx + separation.x + alignment.x + cohesion.x;
    let newVy = boid.vy + separation.y + alignment.y + cohesion.y;

    // Limit speed
    const speed = Math.sqrt(newVx * newVx + newVy * newVy);
    if (speed > maxSpeed) {
      newVx = (newVx / speed) * maxSpeed;
      newVy = (newVy / speed) * maxSpeed;
    }

    // Update position
    let newX = boid.x + newVx;
    let newY = boid.y + newVy;

    // Wrap around edges
    if (newX < 0) newX = canvasWidth;
    if (newX > canvasWidth) newX = 0;
    if (newY < 0) newY = canvasHeight;
    if (newY > canvasHeight) newY = 0;

    return {
      ...boid,
      x: newX,
      y: newY,
      vx: newVx,
      vy: newVy,
    };
  });
}

/**
 * Calculates separation force (avoid crowding neighbors)
 * @param {Boid} boid
 * @param {Boid[]} boids
 * @param {ProgramState} state
 * @returns {{x: number, y: number}} Force vector
 */
function calculateSeparation(boid, boids, state) {
  const { separationRadius, separationStrength } = state;
  let steerX = 0;
  let steerY = 0;
  let count = 0;

  for (const other of boids) {
    if (other.id === boid.id) continue;

    const dx = boid.x - other.x;
    const dy = boid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < separationRadius) {
      steerX += dx / distance;
      steerY += dy / distance;
      count++;
    }
  }

  if (count > 0) {
    steerX /= count;
    steerY /= count;
  }

  return {
    x: steerX * separationStrength,
    y: steerY * separationStrength,
  };
}

/**
 * Calculates alignment force (steer towards average heading of neighbors)
 * @param {Boid} boid
 * @param {Boid[]} boids
 * @param {ProgramState} state
 * @returns {{x: number, y: number}} Force vector
 */
function calculateAlignment(boid, boids, state) {
  const { alignmentRadius, alignmentStrength } = state;
  let avgVx = 0;
  let avgVy = 0;
  let count = 0;

  for (const other of boids) {
    if (other.id === boid.id) continue;

    const dx = boid.x - other.x;
    const dy = boid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < alignmentRadius) {
      avgVx += other.vx;
      avgVy += other.vy;
      count++;
    }
  }

  if (count > 0) {
    avgVx /= count;
    avgVy /= count;

    return {
      x: (avgVx - boid.vx) * alignmentStrength * 0.1,
      y: (avgVy - boid.vy) * alignmentStrength * 0.1,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Calculates cohesion force (steer towards average position of neighbors)
 * @param {Boid} boid
 * @param {Boid[]} boids
 * @param {ProgramState} state
 * @returns {{x: number, y: number}} Force vector
 */
function calculateCohesion(boid, boids, state) {
  const { cohesionRadius, cohesionStrength } = state;
  let avgX = 0;
  let avgY = 0;
  let count = 0;

  for (const other of boids) {
    if (other.id === boid.id) continue;

    const dx = boid.x - other.x;
    const dy = boid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance > 0 && distance < cohesionRadius) {
      avgX += other.x;
      avgY += other.y;
      count++;
    }
  }

  if (count > 0) {
    avgX /= count;
    avgY /= count;

    return {
      x: (avgX - boid.x) * cohesionStrength * 0.01,
      y: (avgY - boid.y) * cohesionStrength * 0.01,
    };
  }

  return { x: 0, y: 0 };
}

/**
 * Canvas view that renders the boids simulation
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Canvas element
 */
function boidsCanvas(state) {
  const { boids, canvasWidth, canvasHeight } = state;

  return h(
    "div",
    {
      style: {
        border: "2px solid #333",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
        width: `${canvasWidth}px`,
        height: `${canvasHeight}px`,
        backgroundColor: "#001122",
        margin: "20px",
      },
    },
    [
      h(
        "svg",
        {
          width: canvasWidth,
          height: canvasHeight,
          style: { display: "block" },
        },
        [
          ...boids.map((boid) =>
            h(
              "g",
              {
                key: `boid-${boid.id}`,
                transform: `translate(${boid.x}, ${boid.y}) rotate(${(Math.atan2(boid.vy, boid.vx) * 180) / Math.PI})`,
              },
              [
                h("polygon", {
                  points: "0,-2 -6,4 0,2 6,4",
                  fill: "#00aaff",
                  stroke: "#0088cc",
                  "stroke-width": "0.5",
                }),
              ],
            ),
          ),
        ],
      ),
    ],
  );
}

/**
 * Control panel for adjusting simulation parameters
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Control panel element
 */
function controlPanel(state) {
  return h(
    "div",
    {
      style: {
        padding: "20px",
        backgroundColor: "#f5f5f5",
        borderRadius: "8px",
        margin: "20px",
        minWidth: "300px",
      },
    },
    [
      h("h3", {}, text("Boids Simulation Controls")),

      h("div", { style: { marginBottom: "10px" } }, [
        h(
          "button",
          {
            onclick: (state) => ({ ...state, paused: !state.paused }),
            style: {
              padding: "10px 20px",
              fontSize: "16px",
              backgroundColor: state.paused ? "#4CAF50" : "#f44336",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            },
          },
          text(state.paused ? "Resume" : "Pause"),
        ),
      ]),

      createSlider(
        "Separation Radius",
        state.separationRadius,
        10,
        100,
        "separationRadius",
      ),
      createSlider(
        "Alignment Radius",
        state.alignmentRadius,
        10,
        150,
        "alignmentRadius",
      ),
      createSlider(
        "Cohesion Radius",
        state.cohesionRadius,
        10,
        200,
        "cohesionRadius",
      ),
      createSlider(
        "Separation Strength",
        state.separationStrength,
        0,
        3,
        "separationStrength",
        0.1,
      ),
      createSlider(
        "Alignment Strength",
        state.alignmentStrength,
        0,
        3,
        "alignmentStrength",
        0.1,
      ),
      createSlider(
        "Cohesion Strength",
        state.cohesionStrength,
        0,
        3,
        "cohesionStrength",
        0.1,
      ),
      createSlider("Max Speed", state.maxSpeed, 1, 8, "maxSpeed", 0.1),

      h("div", { style: { marginTop: "15px" } }, [
        h(
          "button",
          {
            onclick: (state) => ({ ...state, boids: createInitialBoids(50) }),
            style: {
              padding: "8px 16px",
              backgroundColor: "#2196F3",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
            },
          },
          text("Reset Boids"),
        ),
      ]),
    ],
  );
}

/**
 * Flock statistics view showing aggregate metrics
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Statistics panel element
 */
function flockStatistics(state) {
  const { boids } = state;

  // Calculate statistics
  const avgSpeed =
    boids.reduce((sum, boid) => {
      const speed = Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy);
      return sum + speed;
    }, 0) / boids.length;

  const speeds = boids.map((boid) =>
    Math.sqrt(boid.vx * boid.vx + boid.vy * boid.vy),
  );
  const minSpeed = Math.min(...speeds);
  const maxSpeed = Math.max(...speeds);

  // Calculate center of mass
  const centerX = boids.reduce((sum, boid) => sum + boid.x, 0) / boids.length;
  const centerY = boids.reduce((sum, boid) => sum + boid.y, 0) / boids.length;

  // Calculate spread (average distance from center)
  const avgDistanceFromCenter =
    boids.reduce((sum, boid) => {
      const dx = boid.x - centerX;
      const dy = boid.y - centerY;
      return sum + Math.sqrt(dx * dx + dy * dy);
    }, 0) / boids.length;

  // Calculate neighbor counts
  const neighborCounts = boids.map((boid) => {
    let neighbors = 0;
    for (const other of boids) {
      if (other.id !== boid.id) {
        const dx = boid.x - other.x;
        const dy = boid.y - other.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        if (distance < state.cohesionRadius) neighbors++;
      }
    }
    return neighbors;
  });

  const avgNeighbors =
    neighborCounts.reduce((sum, count) => sum + count, 0) / boids.length;
  const minNeighbors = Math.min(...neighborCounts);
  const maxNeighbors = Math.max(...neighborCounts);

  // Calculate alignment metric (how aligned velocities are)
  const totalVx = boids.reduce((sum, boid) => sum + boid.vx, 0);
  const totalVy = boids.reduce((sum, boid) => sum + boid.vy, 0);
  const flockAlignment =
    Math.sqrt(totalVx * totalVx + totalVy * totalVy) /
    (boids.length * avgSpeed);

  return h(
    "div",
    {
      style: {
        padding: "20px",
        backgroundColor: "#f8f9fa",
        borderRadius: "8px",
        margin: "20px",
        minWidth: "320px",
        fontFamily: "monospace",
      },
    },
    [
      h(
        "h3",
        { style: { marginTop: "0", color: "#333" } },
        text("Flock Statistics"),
      ),

      h(
        "div",
        {
          style: {
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "15px",
          },
        },
        [
          // Left column
          h("div", {}, [
            h(
              "h4",
              { style: { margin: "0 0 10px 0", color: "#666" } },
              text("Movement"),
            ),
            createStatItem("Avg Speed", avgSpeed.toFixed(2)),
            createStatItem("Min Speed", minSpeed.toFixed(2)),
            createStatItem("Max Speed", maxSpeed.toFixed(2)),
            createStatItem(
              "Alignment",
              (flockAlignment * 100).toFixed(1) + "%",
            ),
          ]),

          // Right column
          h("div", {}, [
            h(
              "h4",
              { style: { margin: "0 0 10px 0", color: "#666" } },
              text("Formation"),
            ),
            createStatItem("Flock Size", boids.length.toString()),
            createStatItem("Avg Neighbors", avgNeighbors.toFixed(1)),
            createStatItem(
              "Min/Max Neighbors",
              `${minNeighbors}/${maxNeighbors}`,
            ),
            createStatItem("Spread", avgDistanceFromCenter.toFixed(1)),
          ]),
        ],
      ),

      h("div", { style: { marginTop: "15px" } }, [
        h(
          "h4",
          { style: { margin: "0 0 10px 0", color: "#666" } },
          text("Center of Mass"),
        ),
        createStatItem("X Position", centerX.toFixed(1)),
        createStatItem("Y Position", centerY.toFixed(1)),
      ]),
    ],
  );
}

/**
 * Creates a statistics display item
 * @param {string} label
 * @param {string} value
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Stat item element
 */
function createStatItem(label, value) {
  return h(
    "div",
    {
      style: {
        display: "flex",
        justifyContent: "space-between",
        marginBottom: "8px",
        padding: "4px 8px",
        backgroundColor: "white",
        borderRadius: "4px",
        border: "1px solid #e0e0e0",
      },
    },
    [
      h(
        "span",
        { style: { color: "#666", fontSize: "14px" } },
        text(label + ":"),
      ),
      h(
        "span",
        { style: { fontWeight: "bold", fontSize: "14px" } },
        text(value),
      ),
    ],
  );
}

/**
 * Educational view that explains the boids flocking calculations
 * @param {ProgramState} state
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Educational explanation view
 */
function calculationExplainer(state) {
  const selectedBoid = state.boids[0];
  const separation = calculateSeparation(selectedBoid, state.boids, state);
  const alignment = calculateAlignment(selectedBoid, state.boids, state);
  const cohesion = calculateCohesion(selectedBoid, state.boids, state);

  // Calculate detailed separation info
  const separationNeighbors = state.boids.filter((other) => {
    if (other.id === selectedBoid.id) return false;
    const dx = selectedBoid.x - other.x;
    const dy = selectedBoid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance > 0 && distance < state.separationRadius;
  });

  // Calculate detailed alignment info
  const alignmentNeighbors = state.boids.filter((other) => {
    if (other.id === selectedBoid.id) return false;
    const dx = selectedBoid.x - other.x;
    const dy = selectedBoid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance > 0 && distance < state.alignmentRadius;
  });
  const avgVx =
    alignmentNeighbors.length > 0
      ? alignmentNeighbors.reduce((sum, b) => sum + b.vx, 0) /
        alignmentNeighbors.length
      : 0;
  const avgVy =
    alignmentNeighbors.length > 0
      ? alignmentNeighbors.reduce((sum, b) => sum + b.vy, 0) /
        alignmentNeighbors.length
      : 0;

  // Calculate detailed cohesion info
  const cohesionNeighbors = state.boids.filter((other) => {
    if (other.id === selectedBoid.id) return false;
    const dx = selectedBoid.x - other.x;
    const dy = selectedBoid.y - other.y;
    const distance = Math.sqrt(dx * dx + dy * dy);
    return distance > 0 && distance < state.cohesionRadius;
  });
  const centerX =
    cohesionNeighbors.length > 0
      ? cohesionNeighbors.reduce((sum, b) => sum + b.x, 0) /
        cohesionNeighbors.length
      : selectedBoid.x;
  const centerY =
    cohesionNeighbors.length > 0
      ? cohesionNeighbors.reduce((sum, b) => sum + b.y, 0) /
        cohesionNeighbors.length
      : selectedBoid.y;

  return h(
    "div",
    {
      style: {
        padding: "20px",
        backgroundColor: "#fff",
        borderRadius: "8px",
        margin: "20px",
        fontFamily: "system-ui",
        maxWidth: "700px",
      },
    },
    [
      h("h3", {}, text("Boids Flocking Algorithm Explained")),
      h(
        "p",
        { style: { marginBottom: "20px", fontStyle: "italic" } },
        text(
          `Analyzing Boid #${selectedBoid.id} at position (${selectedBoid.x.toFixed(1)}, ${selectedBoid.y.toFixed(1)})`,
        ),
      ),

      h(
        "div",
        {
          style: {
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#ffebee",
            borderRadius: "6px",
          },
        },
        [
          h(
            "h4",
            { style: { color: "#c62828", margin: "0 0 10px 0" } },
            text("1. Separation (Avoid Crowding)"),
          ),
          h(
            "p",
            {},
            text(
              `Found ${separationNeighbors.length} neighbors within ${state.separationRadius}px radius`,
            ),
          ),
          h(
            "div",
            {
              style: {
                fontFamily: "monospace",
                fontSize: "14px",
                margin: "10px 0",
              },
            },
            [
              h(
                "div",
                {},
                text(
                  `• My position: (${selectedBoid.x.toFixed(1)}, ${selectedBoid.y.toFixed(1)})`,
                ),
              ),
              separationNeighbors.length > 0
                ? h(
                    "div",
                    {},
                    text(
                      `• Computing: Σ(normalized_away_vectors) × ${state.separationStrength}`,
                    ),
                  )
                : h("div", {}, text("• No neighbors to avoid")),
            ],
          ),
          h(
            "p",
            {
              style: {
                fontFamily: "monospace",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
              },
            },
            text(
              `Force: (${separation.x.toFixed(3)}, ${separation.y.toFixed(3)})`,
            ),
          ),
        ],
      ),

      h(
        "div",
        {
          style: {
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e8f5e8",
            borderRadius: "6px",
          },
        },
        [
          h(
            "h4",
            { style: { color: "#2e7d32", margin: "0 0 10px 0" } },
            text("2. Alignment (Match Velocity)"),
          ),
          h(
            "p",
            {},
            text(
              `Found ${alignmentNeighbors.length} neighbors within ${state.alignmentRadius}px radius`,
            ),
          ),
          h(
            "div",
            {
              style: {
                fontFamily: "monospace",
                fontSize: "14px",
                margin: "10px 0",
              },
            },
            [
              h(
                "div",
                {},
                text(
                  `• My velocity: (${selectedBoid.vx.toFixed(2)}, ${selectedBoid.vy.toFixed(2)})`,
                ),
              ),
              ...(alignmentNeighbors.length > 0
                ? [
                    h(
                      "div",
                      {},
                      text(
                        `• Avg neighbor velocity: (${avgVx.toFixed(2)}, ${avgVy.toFixed(2)})`,
                      ),
                    ),
                    h(
                      "div",
                      {},
                      text(
                        `• Formula: (avg - my_vel) × ${state.alignmentStrength} × 0.1`,
                      ),
                    ),
                    h(
                      "div",
                      {},
                      text(
                        `• = ((${avgVx.toFixed(2)}, ${avgVy.toFixed(2)}) - (${selectedBoid.vx.toFixed(2)}, ${selectedBoid.vy.toFixed(2)})) × ${(state.alignmentStrength * 0.1).toFixed(2)}`,
                      ),
                    ),
                  ]
                : [h("div", {}, text("• No neighbors to align with"))]),
            ],
          ),
          h(
            "p",
            {
              style: {
                fontFamily: "monospace",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
              },
            },
            text(
              `Force: (${alignment.x.toFixed(3)}, ${alignment.y.toFixed(3)})`,
            ),
          ),
        ],
      ),

      h(
        "div",
        {
          style: {
            marginBottom: "20px",
            padding: "15px",
            backgroundColor: "#e3f2fd",
            borderRadius: "6px",
          },
        },
        [
          h(
            "h4",
            { style: { color: "#1565c0", margin: "0 0 10px 0" } },
            text("3. Cohesion (Move Toward Center)"),
          ),
          h(
            "p",
            {},
            text(
              `Found ${cohesionNeighbors.length} neighbors within ${state.cohesionRadius}px radius`,
            ),
          ),
          h(
            "div",
            {
              style: {
                fontFamily: "monospace",
                fontSize: "14px",
                margin: "10px 0",
              },
            },
            [
              h(
                "div",
                {},
                text(
                  `• My position: (${selectedBoid.x.toFixed(1)}, ${selectedBoid.y.toFixed(1)})`,
                ),
              ),
              ...(cohesionNeighbors.length > 0
                ? [
                    h(
                      "div",
                      {},
                      text(
                        `• Center of mass: (${centerX.toFixed(1)}, ${centerY.toFixed(1)})`,
                      ),
                    ),
                    h(
                      "div",
                      {},
                      text(
                        `• Formula: (center - my_pos) × ${state.cohesionStrength} × 0.01`,
                      ),
                    ),
                    h(
                      "div",
                      {},
                      text(
                        `• = ((${centerX.toFixed(1)}, ${centerY.toFixed(1)}) - (${selectedBoid.x.toFixed(1)}, ${selectedBoid.y.toFixed(1)})) × ${(state.cohesionStrength * 0.01).toFixed(3)}`,
                      ),
                    ),
                  ]
                : [h("div", {}, text("• No neighbors to move toward"))]),
            ],
          ),
          h(
            "p",
            {
              style: {
                fontFamily: "monospace",
                backgroundColor: "#fff",
                padding: "8px",
                borderRadius: "4px",
              },
            },
            text(`Force: (${cohesion.x.toFixed(3)}, ${cohesion.y.toFixed(3)})`),
          ),
        ],
      ),

      h(
        "div",
        {
          style: {
            padding: "15px",
            backgroundColor: "#f5f5f5",
            borderRadius: "6px",
          },
        },
        [
          h(
            "h4",
            { style: { margin: "0 0 10px 0" } },
            text("Final Velocity Calculation"),
          ),
          h("div", { style: { fontFamily: "monospace", fontSize: "14px" } }, [
            h(
              "div",
              {},
              text(
                `Current velocity: (${selectedBoid.vx.toFixed(2)}, ${selectedBoid.vy.toFixed(2)})`,
              ),
            ),
            h(
              "div",
              {},
              text(
                `+ Separation: (${separation.x.toFixed(3)}, ${separation.y.toFixed(3)})`,
              ),
            ),
            h(
              "div",
              {},
              text(
                `+ Alignment: (${alignment.x.toFixed(3)}, ${alignment.y.toFixed(3)})`,
              ),
            ),
            h(
              "div",
              {},
              text(
                `+ Cohesion: (${cohesion.x.toFixed(3)}, ${cohesion.y.toFixed(3)})`,
              ),
            ),
            h(
              "div",
              {
                style: {
                  borderTop: "1px solid #ccc",
                  paddingTop: "5px",
                  marginTop: "5px",
                },
              },
              text(
                `= New velocity: (${(selectedBoid.vx + separation.x + alignment.x + cohesion.x).toFixed(3)}, ${(selectedBoid.vy + separation.y + alignment.y + cohesion.y).toFixed(3)})`,
              ),
            ),
            h(
              "div",
              { style: { marginTop: "5px" } },
              text(
                `Then limit to max speed: ${state.maxSpeed} and update position`,
              ),
            ),
          ]),
        ],
      ),
    ],
  );
}

/**
 * Creates a slider control for parameter adjustment
 * @param {string} label
 * @param {number} value
 * @param {number} min
 * @param {number} max
 * @param {string} property
 * @param {number} step
 * @returns {import("hyperapp").ElementVNode<ProgramState>} Slider element
 */
function createSlider(label, value, min, max, property, step = 1) {
  return h(
    "div",
    {
      style: {
        marginBottom: "15px",
        display: "flex",
        alignItems: "center",
        gap: "10px",
      },
    },
    [
      h(
        "label",
        {
          style: {
            minWidth: "140px",
            fontSize: "14px",
            fontWeight: "500",
          },
        },
        text(`${label}:`),
      ),
      h("input", {
        type: "range",
        min: min,
        max: max,
        step: step,
        value: value,
        style: { flex: "1" },
        oninput: (state, event) => ({
          ...state,
          [property]: parseFloat(
            /** @type {HTMLInputElement} */ (event.target).value,
          ),
        }),
      }),
      h(
        "span",
        {
          style: {
            minWidth: "40px",
            fontSize: "14px",
            textAlign: "right",
          },
        },
        text(value.toFixed(step < 1 ? 1 : 0)),
      ),
    ],
  );
}
