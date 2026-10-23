/* CarRentX 3D hero — Three.js ES module (loaded with <script type="module">) */

import * as THREE from "https://cdn.jsdelivr.net/npm/three@0.168.0/build/three.module.js";

const container = document.getElementById("car-scene");

if (container) {
  startWhenSized(container);
}

/* Wait until the hero actually has a size, then build the scene once. */
function startWhenSized(el) {
  if (el.clientWidth && el.clientHeight) {
    safeInit(el);
    return;
  }

  const observer = new ResizeObserver(() => {
    if (el.clientWidth && el.clientHeight) {
      observer.disconnect();
      safeInit(el);
    }
  });

  observer.observe(el);
}

function safeInit(el) {
  try {
    initCarScene(el);
  } catch (error) {
    console.error("CarRentX 3D scene failed:", error);
    el.classList.add("scene-unavailable");
  }
}

function initCarScene(container) {
  const PIXEL_RATIO_CAP = 1.6;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color("#030405");
  scene.fog = new THREE.FogExp2("#030405", 0.018);

  const camera = new THREE.PerspectiveCamera(
    38,
    container.clientWidth / container.clientHeight,
    0.1,
    120
  );

  camera.position.set(0, 2, 10.5);
  camera.lookAt(0, 0.65, 0);

  // If WebGL is unavailable this throws before the fallback is removed,
  // so the CSS fallback background stays visible.
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    powerPreference: "high-performance"
  });

  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.35;
  renderer.domElement.setAttribute("aria-hidden", "true");

  const fallback = container.querySelector(".scene-fallback");
  if (fallback) fallback.remove();

  container.appendChild(renderer.domElement);

  // ---------- Lighting ----------
  scene.add(new THREE.HemisphereLight("#c6d7f5", "#08090d", 1.5));

  const keyLight = new THREE.DirectionalLight("#dce8ff", 3);
  keyLight.position.set(-4, 6, 5);
  scene.add(keyLight);

  const rimLight = new THREE.PointLight("#648cc7", 20, 15);
  rimLight.position.set(3, 2.3, -3);
  scene.add(rimLight);

  const frontLight = new THREE.PointLight("#dceaff", 4, 10);
  frontLight.position.set(0, 1.8, 4);
  scene.add(frontLight);

  // ---------- Materials ----------
  const bodyMaterial = new THREE.MeshPhysicalMaterial({
    color: "#20252e",
    metalness: 0.88,
    roughness: 0.23,
    clearcoat: 1,
    clearcoatRoughness: 0.13
  });

  const rubberMaterial = new THREE.MeshStandardMaterial({ color: "#050608", roughness: 0.8 });

  const glassMaterial = new THREE.MeshPhysicalMaterial({
    color: "#07101a",
    metalness: 0.4,
    roughness: 0.14,
    clearcoat: 1
  });

  const chromeMaterial = new THREE.MeshStandardMaterial({
    color: "#a6b3c4",
    metalness: 0.95,
    roughness: 0.22
  });

  const ledMaterial = new THREE.MeshBasicMaterial({ color: "#ffffff" });

  const grilleMaterial = new THREE.MeshStandardMaterial({
    color: "#020305",
    metalness: 0.3,
    roughness: 0.85
  });

  function addMesh(parent, geometry, material, position, scale) {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(position[0], position[1], position[2]);
    if (scale) mesh.scale.set(scale[0], scale[1], scale[2]);
    parent.add(mesh);
    return mesh;
  }

  function addBox(parent, size, position, material) {
    return addMesh(parent, new THREE.BoxGeometry(size[0], size[1], size[2]), material, position);
  }

  // ---------- Car (faces +Z, towards the camera) ----------
  const car = new THREE.Group();
  scene.add(car);

  // Main body, long hood and nose.
  addMesh(car, new THREE.SphereGeometry(1, 40, 24), bodyMaterial, [0, 0.48, 0], [1.38, 0.4, 1.78]);
  addMesh(car, new THREE.SphereGeometry(1, 32, 20), bodyMaterial, [0, 0.61, 0.82], [1.2, 0.24, 0.95]);
  addMesh(car, new THREE.SphereGeometry(1, 32, 18), bodyMaterial, [0, 0.34, 1.36], [1.18, 0.27, 0.35]);

  // Front splitter and grille.
  addBox(car, [2.12, 0.055, 0.4], [0, 0.19, 1.47], chromeMaterial);
  addBox(car, [0.82, 0.19, 0.045], [0, 0.4, 1.67], grilleMaterial);

  // Roof.
  addMesh(car, new THREE.SphereGeometry(1, 32, 20), bodyMaterial, [0, 1.17, -0.3], [0.87, 0.3, 0.91]);

  // Windshield and rear window.
  addBox(car, [1.48, 0.065, 0.77], [0, 1.0, 0.29], glassMaterial).rotation.x = -0.4;
  addBox(car, [1.35, 0.06, 0.55], [0, 1.0, -0.8], glassMaterial).rotation.x = 0.38;

  // Side mirrors.
  for (const side of [-1, 1]) {
    addMesh(car, new THREE.SphereGeometry(1, 20, 12), bodyMaterial, [side * 1.08, 0.84, 0.15], [0.19, 0.09, 0.15]);
  }

  // Wheels, rims and hubs.
  for (const side of [-1, 1]) {
    for (const z of [-1.05, 0.91]) {
      addMesh(car, new THREE.CylinderGeometry(0.37, 0.37, 0.25, 32), rubberMaterial, [side * 1.12, 0.38, z]).rotation.z = Math.PI / 2;
      addMesh(car, new THREE.CylinderGeometry(0.235, 0.235, 0.265, 24), chromeMaterial, [side * 1.13, 0.38, z]).rotation.z = Math.PI / 2;
      addMesh(car, new THREE.CylinderGeometry(0.08, 0.08, 0.28, 16), grilleMaterial, [side * 1.14, 0.38, z]).rotation.z = Math.PI / 2;
    }
  }

  // Headlights, LED strips and light beams.
  for (const side of [-1, 1]) {
    const x = side * 0.77;

    addBox(car, [0.5, 0.14, 0.08], [x, 0.66, 1.48], chromeMaterial);
    addBox(car, [0.41, 0.055, 0.095], [x, 0.68, 1.54], ledMaterial);

    const glow = new THREE.PointLight("#eaf3ff", 38, 10, 2);
    glow.position.set(x, 0.68, 1.66);
    car.add(glow);

    const outerBeam = new THREE.Mesh(
      new THREE.ConeGeometry(0.95, 5.2, 32, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#d9e9ff",
        transparent: true,
        opacity: 0.085,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    outerBeam.rotation.x = Math.PI / 2;
    outerBeam.position.set(x * 1.1, 0.63, 4.25);
    car.add(outerBeam);

    const innerBeam = new THREE.Mesh(
      new THREE.ConeGeometry(0.33, 4.1, 24, 1, true),
      new THREE.MeshBasicMaterial({
        color: "#ffffff",
        transparent: true,
        opacity: 0.065,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide
      })
    );
    innerBeam.rotation.x = Math.PI / 2;
    innerBeam.position.set(x * 1.1, 0.65, 3.55);
    car.add(innerBeam);
  }

  // Rear light accents.
  const rearLampMaterial = new THREE.MeshBasicMaterial({ color: "#b41424" });
  for (const side of [-1, 1]) {
    addBox(car, [0.36, 0.045, 0.035], [side * 0.8, 0.57, -1.57], rearLampMaterial);
  }

  // ---------- Ground, road markings, reflection ----------
  const ground = addMesh(
    scene,
    new THREE.PlaneGeometry(200, 200),
    new THREE.MeshStandardMaterial({ color: "#080a0e", metalness: 0.45, roughness: 0.34 }),
    [0, -0.025, 0]
  );
  ground.rotation.x = -Math.PI / 2;

  const laneMaterial = new THREE.MeshBasicMaterial({ color: "#424c5d", transparent: true, opacity: 0.42 });

  const LANE_COUNT = 18;
  const LANE_GAP = 1.15;
  const LANE_SPAN = LANE_COUNT * LANE_GAP; // keeps dash spacing even when they wrap
  const laneMarks = [];

  for (let i = 0; i < LANE_COUNT; i++) {
    laneMarks.push(
      addMesh(scene, new THREE.BoxGeometry(0.025, 0.008, 0.65), laneMaterial, [0, 0.003, -10 + i * LANE_GAP])
    );
  }

  for (const x of [-3.8, 3.8]) {
    addMesh(scene, new THREE.BoxGeometry(0.025, 0.008, 100), laneMaterial, [x, 0.003, 0]);
  }

  const reflection = addMesh(
    scene,
    new THREE.PlaneGeometry(4.2, 3),
    new THREE.MeshBasicMaterial({ color: "#b4d5ff", transparent: true, opacity: 0.045, depthWrite: false }),
    [0, 0.006, 0.25]
  );
  reflection.rotation.x = -Math.PI / 2;

  // ---------- Animation ----------
  const clock = new THREE.Clock();
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

  let frameId = null;
  let running = false;
  let disposed = false;

  function renderFrame(elapsed) {
    const still = reduceMotion.matches;

    // Smooth loop: the car drifts forward and back, with no sudden jump.
    const approach = still ? 0.5 : 0.5 - 0.5 * Math.cos(((elapsed % 7) / 7) * Math.PI * 2);

    car.position.z = -2.7 + approach * 1.75;
    car.position.y = still ? 0 : 0.015 * Math.sin(elapsed * 1.2);
    car.rotation.y = still ? 0 : Math.sin(elapsed * 0.48) * 0.025;

    camera.position.x = still ? 0 : Math.sin(elapsed * 0.22) * 0.08;
    camera.position.z = 10.5 - approach * 0.16;
    camera.lookAt(0, 0.66, 0.15 + approach * 0.15);

    laneMarks.forEach((mark, index) => {
      mark.position.z = -10 + ((index * LANE_GAP + (still ? 0 : elapsed * 2.1)) % LANE_SPAN);
    });

    reflection.position.z = car.position.z + 0.25;

    renderer.render(scene, camera);
  }

  function loop() {
    if (disposed || !running) return;
    frameId = requestAnimationFrame(loop);
    renderFrame(clock.getElapsedTime());
  }

  function startAnimation() {
    if (disposed || running) return;

    // Reduced motion: draw one still frame instead of a continuous loop.
    if (reduceMotion.matches) {
      renderFrame(0);
      return;
    }

    running = true;
    clock.start();
    loop();
  }

  function stopAnimation() {
    running = false;
    if (frameId !== null) {
      cancelAnimationFrame(frameId);
      frameId = null;
    }
  }

  // Responsive resizing.
  const resizeObserver = new ResizeObserver(() => {
    const width = container.clientWidth;
    const height = container.clientHeight;
    if (!width || !height) return;

    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, PIXEL_RATIO_CAP));
    renderer.setSize(width, height);

    // A paused or still scene needs an explicit redraw after resizing.
    if (!running) renderFrame(clock.elapsedTime);
  });

  resizeObserver.observe(container);

  // Pause when the tab is hidden.
  function onVisibilityChange() {
    if (document.hidden) stopAnimation();
    else startAnimation();
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  // React if the user changes the reduced-motion setting while the page is open.
  function onMotionChange() {
    stopAnimation();
    startAnimation();
  }

  if (reduceMotion.addEventListener) reduceMotion.addEventListener("change", onMotionChange);

  // WebGL context loss.
  function onContextLost(event) {
    event.preventDefault();
    stopAnimation();
    container.classList.add("scene-unavailable");
  }

  function onContextRestored() {
    container.classList.remove("scene-unavailable");
    startAnimation();
  }

  renderer.domElement.addEventListener("webglcontextlost", onContextLost);
  renderer.domElement.addEventListener("webglcontextrestored", onContextRestored);

  if (!document.hidden) startAnimation();

  // Back/forward cache: pause on hide, resume on restore (no disposal).
  window.addEventListener("pageshow", (event) => {
    if (event.persisted && !disposed) startAnimation();
  });

  // Free GPU memory when the page is really unloaded.
  window.addEventListener(
    "pagehide",
    (event) => {
      if (event.persisted) {
        stopAnimation();
        return;
      }

      disposed = true;
      stopAnimation();
      resizeObserver.disconnect();
      document.removeEventListener("visibilitychange", onVisibilityChange);
      if (reduceMotion.removeEventListener) reduceMotion.removeEventListener("change", onMotionChange);

      scene.traverse((object) => {
        if (object.geometry) object.geometry.dispose();
      });

      [
        bodyMaterial, rubberMaterial, glassMaterial, chromeMaterial,
        ledMaterial, grilleMaterial, laneMaterial, rearLampMaterial
      ].forEach((material) => material.dispose());

      renderer.dispose();
    }
  );
}
