import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

const canvas = document.querySelector("#three-canvas");
const sceneFrame = document.querySelector(".scene-frame");
const energyButton = document.querySelector("#energy-toggle");
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const smallScreen = window.matchMedia("(max-width: 720px)").matches;

let renderer;
let controls;
let energyMode = false;
let animationFrame = 0;
let elapsed = 0;

function setSceneFallback(message) {
  const liveLabel = document.querySelector(".live-indicator");
  if (liveLabel) liveLabel.innerHTML = "<i></i> " + message;
  if (canvas) canvas.style.display = "none";
  if (sceneFrame) sceneFrame.classList.add("scene-unavailable");
}

function initScene() {
  if (!canvas || !window.WebGLRenderingContext) {
    setSceneFallback("3D PREVIEW UNAVAILABLE");
    return;
  }

  try {
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x070b12, 0.045);

    const camera = new THREE.PerspectiveCamera(35, 1, 0.1, 80);
    camera.position.set(0, 0.1, 7.4);

    renderer = new THREE.WebGLRenderer({
      canvas,
      alpha: true,
      antialias: !smallScreen,
      powerPreference: "high-performance"
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, smallScreen ? 1.35 : 1.8));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.22;

    const ambient = new THREE.HemisphereLight(0xb9f5ff, 0x10162d, 1.45);
    scene.add(ambient);

    const keyLight = new THREE.PointLight(0x67eee7, 35, 18);
    keyLight.position.set(3.2, 2.6, 3.5);
    scene.add(keyLight);

    const violetLight = new THREE.PointLight(0x8d7dff, 28, 16);
    violetLight.position.set(-3, -2, 1);
    scene.add(violetLight);

    const rimLight = new THREE.DirectionalLight(0xffffff, 1.8);
    rimLight.position.set(0, 4, -4);
    scene.add(rimLight);

    const sculpture = new THREE.Group();
    scene.add(sculpture);

    const coreMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x9cf9f1,
      metalness: 0.72,
      roughness: 0.19,
      clearcoat: 1,
      clearcoatRoughness: 0.12,
      emissive: 0x087d80,
      emissiveIntensity: 0.48
    });

    const core = new THREE.Mesh(
      new THREE.TorusKnotGeometry(1.02, 0.255, 240, 32, 2, 3),
      coreMaterial
    );
    sculpture.add(core);

    const innerCore = new THREE.Mesh(
      new THREE.IcosahedronGeometry(0.53, 3),
      new THREE.MeshPhysicalMaterial({
        color: 0xd8fffb,
        metalness: 0.22,
        roughness: 0.11,
        clearcoat: 1,
        emissive: 0x286e8e,
        emissiveIntensity: 0.2
      })
    );
    sculpture.add(innerCore);

    const wire = new THREE.Mesh(
      new THREE.IcosahedronGeometry(1.68, 2),
      new THREE.MeshBasicMaterial({
        color: 0x84b8ff,
        wireframe: true,
        transparent: true,
        opacity: 0.16
      })
    );
    sculpture.add(wire);

    const ringMaterials = [
      new THREE.MeshBasicMaterial({ color: 0x70eee4, transparent: true, opacity: 0.55 }),
      new THREE.MeshBasicMaterial({ color: 0x9f92ff, transparent: true, opacity: 0.42 }),
      new THREE.MeshBasicMaterial({ color: 0x76aaff, transparent: true, opacity: 0.27 })
    ];
    const rings = [];
    [
      { radius: 2.05, rotation: [1.12, 0.25, 0.1] },
      { radius: 2.28, rotation: [0.34, 1.05, 0.7] },
      { radius: 2.42, rotation: [1.48, 0.7, 1.2] }
    ].forEach((config, index) => {
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(config.radius, 0.009, 8, 240),
        ringMaterials[index]
      );
      ring.rotation.set(...config.rotation);
      sculpture.add(ring);
      rings.push(ring);
    });

    const satelliteGeometry = new THREE.IcosahedronGeometry(0.09, 1);
    const satellites = [];
    [
      { radius: 2.16, speed: 0.3, phase: 0.4, tilt: 0.25, color: 0xa2fff4 },
      { radius: 2.35, speed: -0.22, phase: 2.6, tilt: 1.1, color: 0xb7a9ff },
      { radius: 1.94, speed: 0.38, phase: 4.4, tilt: 2.1, color: 0x8eb6ff },
      { radius: 2.48, speed: -0.16, phase: 5.6, tilt: 0.8, color: 0xffd69b }
    ].forEach((config, index) => {
      const material = new THREE.MeshStandardMaterial({
        color: config.color,
        metalness: 0.48,
        roughness: 0.2,
        emissive: config.color,
        emissiveIntensity: index === 3 ? 0.32 : 0.22
      });
      const satellite = new THREE.Mesh(satelliteGeometry, material);
      sculpture.add(satellite);
      satellites.push({ mesh: satellite, ...config });
    });

    const starCount = smallScreen ? 420 : 950;
    const starPositions = new Float32Array(starCount * 3);
    for (let index = 0; index < starCount; index += 1) {
      const index3 = index * 3;
      const radius = 4.2 + Math.random() * 9;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos((Math.random() * 2) - 1);
      starPositions[index3] = radius * Math.sin(phi) * Math.cos(theta);
      starPositions[index3 + 1] = radius * Math.cos(phi);
      starPositions[index3 + 2] = radius * Math.sin(phi) * Math.sin(theta);
    }
    const starGeometry = new THREE.BufferGeometry();
    starGeometry.setAttribute("position", new THREE.BufferAttribute(starPositions, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        color: 0x91cbd8,
        size: smallScreen ? 0.018 : 0.023,
        transparent: true,
        opacity: 0.68,
        sizeAttenuation: true
      })
    );
    scene.add(stars);

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.055;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.rotateSpeed = 0.58;
    controls.autoRotate = !reducedMotion;
    controls.autoRotateSpeed = 0.65;
    controls.minPolarAngle = 0.72;
    controls.maxPolarAngle = 2.42;
    controls.target.set(0, 0, 0);

    const resize = () => {
      const rect = sceneFrame.getBoundingClientRect();
      const width = Math.max(1, rect.width);
      const height = Math.max(1, rect.height);
      camera.aspect = width / height;
      camera.fov = width < 420 ? 40 : 35;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height, false);
    };
    resize();
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(sceneFrame);

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    let pointerDown = null;

    canvas.addEventListener("pointerdown", (event) => {
      pointerDown = { x: event.clientX, y: event.clientY };
    });

    canvas.addEventListener("pointerup", (event) => {
      if (!pointerDown) return;
      const moved = Math.hypot(event.clientX - pointerDown.x, event.clientY - pointerDown.y);
      pointerDown = null;
      if (moved > 7) return;

      const bounds = canvas.getBoundingClientRect();
      pointer.x = ((event.clientX - bounds.left) / bounds.width) * 2 - 1;
      pointer.y = -(((event.clientY - bounds.top) / bounds.height) * 2 - 1);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects([core, innerCore], false);
      if (hits.length) toggleEnergyMode();
    });

    const clock = new THREE.Clock();
    const animate = () => {
      animationFrame = window.requestAnimationFrame(animate);
      const delta = Math.min(clock.getDelta(), 0.04);
      if (document.hidden) return;
      elapsed += delta;

      const pulse = 1 + Math.sin(elapsed * (energyMode ? 3.1 : 1.55)) * (energyMode ? 0.055 : 0.022);
      sculpture.scale.setScalar(pulse);
      core.rotation.x += delta * (energyMode ? 0.42 : 0.18);
      core.rotation.y += delta * (energyMode ? 0.58 : 0.28);
      innerCore.rotation.x -= delta * 0.16;
      innerCore.rotation.y += delta * 0.21;
      wire.rotation.y -= delta * 0.035;
      wire.rotation.x += delta * 0.018;
      rings[0].rotation.z += delta * 0.035;
      rings[1].rotation.x -= delta * 0.024;
      rings[2].rotation.y += delta * 0.02;
      stars.rotation.y += delta * 0.003;
      stars.rotation.x = Math.sin(elapsed * 0.08) * 0.025;

      satellites.forEach((satellite, index) => {
        const angle = elapsed * satellite.speed + satellite.phase;
        const radius = satellite.radius;
        satellite.mesh.position.set(
          Math.cos(angle) * radius,
          Math.sin(angle * 1.12 + satellite.tilt) * radius * 0.42,
          Math.sin(angle) * radius * 0.75
        );
        satellite.mesh.rotation.x += delta * (0.45 + index * 0.08);
        satellite.mesh.rotation.y += delta * 0.4;
      });

      controls.update();
      renderer.render(scene, camera);
    };
    animate();
  } catch (error) {
    console.error("3D scene initialization failed:", error);
    setSceneFallback("3D PREVIEW UNAVAILABLE");
  }
}

function toggleEnergyMode() {
  energyMode = !energyMode;
  if (energyButton) {
    energyButton.setAttribute("aria-pressed", String(energyMode));
    energyButton.innerHTML = energyMode
      ? '<span class="energy-icon">✦</span> ENERGY ACTIVATED'
      : '<span class="energy-icon">✳</span> ACTIVATE ENERGY';
  }
  if (controls) {
    controls.autoRotate = !reducedMotion && !energyMode;
  }
}

energyButton?.addEventListener("click", toggleEnergyMode);
initScene();

const typedText = document.querySelector("#typed-text");
const phrases = [
  "building web experiences.",
  "connecting design with engineering.",
  "learning by shipping real projects."
];
if (typedText && !reducedMotion) {
  let phraseIndex = 0;
  let characterIndex = phrases[0].length;
  let deleting = false;
  const typeNext = () => {
    const phrase = phrases[phraseIndex];
    if (!deleting) {
      characterIndex += 1;
      typedText.textContent = phrase.slice(0, characterIndex);
      if (characterIndex >= phrase.length) {
        deleting = true;
        window.setTimeout(typeNext, 1700);
        return;
      }
    } else {
      characterIndex -= 1;
      typedText.textContent = phrase.slice(0, characterIndex);
      if (characterIndex <= 0) {
        deleting = false;
        phraseIndex = (phraseIndex + 1) % phrases.length;
      }
    }
    window.setTimeout(typeNext, deleting ? 27 : 48);
  };
  window.setTimeout(typeNext, 1400);
}

const menuToggle = document.querySelector("#menu-toggle");
const mainNav = document.querySelector("#main-nav");
menuToggle?.addEventListener("click", () => {
  const expanded = menuToggle.getAttribute("aria-expanded") === "true";
  menuToggle.setAttribute("aria-expanded", String(!expanded));
  menuToggle.setAttribute("aria-label", expanded ? "Open navigation" : "Close navigation");
  mainNav?.classList.toggle("is-open", !expanded);
});
mainNav?.querySelectorAll("a").forEach((link) => {
  link.addEventListener("click", () => {
    mainNav.classList.remove("is-open");
    menuToggle?.setAttribute("aria-expanded", "false");
    menuToggle?.setAttribute("aria-label", "Open navigation");
  });
});

const progress = document.querySelector("#scroll-progress");
const updateProgress = () => {
  const scrollable = document.documentElement.scrollHeight - window.innerHeight;
  const amount = scrollable > 0 ? (window.scrollY / scrollable) * 100 : 0;
  if (progress) progress.style.width = amount + "%";
};
window.addEventListener("scroll", updateProgress, { passive: true });
updateProgress();

if ("IntersectionObserver" in window && !reducedMotion) {
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((element) => observer.observe(element));
} else {
  document.querySelectorAll(".reveal").forEach((element) => element.classList.add("is-visible"));
}

if (window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
  document.addEventListener("pointermove", (event) => {
    document.documentElement.style.setProperty("--pointer-x", event.clientX + "px");
    document.documentElement.style.setProperty("--pointer-y", event.clientY + "px");
  }, { passive: true });
}

const currentYear = document.querySelector("#current-year");
if (currentYear) currentYear.textContent = String(new Date().getFullYear());

document.addEventListener("visibilitychange", () => {
  if (!renderer) return;
  if (document.hidden) {
    window.cancelAnimationFrame(animationFrame);
  } else {
    const clockReset = performance.now();
    void clockReset;
    if (animationFrame) window.cancelAnimationFrame(animationFrame);
    const canvasEvent = new Event("visibility-resume");
    canvas.dispatchEvent(canvasEvent);
    // Re-enter the render loop without accumulating hidden-tab time.
    renderer.render(renderer.info.reset ? new THREE.Scene() : new THREE.Scene(), new THREE.Camera());
    window.location.hash;
  }
});
