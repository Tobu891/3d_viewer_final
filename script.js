import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { OBJLoader } from "three/addons/loaders/OBJLoader.js";

const canvas = document.getElementById("canvas3d");
const wrap = document.getElementById("canvas-wrap");
const fileInput = document.getElementById("file-input");

const infoNazov = document.getElementById("info-nazov");
const infoVertexy = document.getElementById("info-vertexy");
const infoNormals = document.getElementById("info-normals");
const infoPlochy = document.getElementById("info-plochy");
const infoStav = document.getElementById("info-stav");

const btnWire = document.getElementById("btn-wireframe");
const btnReset = document.getElementById("btn-reset");
const btnNextModel = document.getElementById("btn-next-model");

let currentModel = null;
let wireframe = false;

let currentMaterialSettings = {
  color: new THREE.Color(0.55, 0.58, 0.62),
  metalness: 0.03,
  roughness: 0.62
};

const sampleModels = [
  {
    name: "alien",
    file: "models/model1.obj",
    color: new THREE.Color(0.55, 0.75, 0.48),
    metalness: 0.05,
    roughness: 0.72
  },
  {
    name: "spider",
    file: "models/model2.obj",
    color: new THREE.Color(0.65, 0.72, 0.85),
    metalness: 0.35,
    roughness: 0.38
  },
  {
    name: "zombie",
    file: "models/model3.obj",
    color: new THREE.Color(0.95, 0.58, 0.22),
    metalness: 0.15,
    roughness: 0.5
  }
];

let currentSampleIndex = 0;

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x05070b);
scene.fog = new THREE.Fog(0x05070b, 9, 28);

const camera = new THREE.PerspectiveCamera(55, 1, 0.01, 1000);
camera.position.set(0, 1.4, 4.2);

const renderer = new THREE.WebGLRenderer({
  canvas,
  antialias: true,
  alpha: false,
  powerPreference: "high-performance"
});

renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.15;

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.075;
controls.screenSpacePanning = true;

controls.mouseButtons = {
  LEFT: THREE.MOUSE.ROTATE,
  MIDDLE: THREE.MOUSE.DOLLY,
  RIGHT: THREE.MOUSE.PAN
};

controls.target.set(0, 0, 0);

window.addEventListener("keydown", (e) => {
  if (e.shiftKey) controls.mouseButtons.LEFT = THREE.MOUSE.PAN;

  const key = e.key.toLowerCase();
  if (key === "r") resetCamera();
  if (key === "l") toggleWireframe();
  if (key === "1") setView("front");
  if (key === "3") setView("side");
  if (key === "7") setView("top");
  if (key === "5") switchCameraMode();
});

window.addEventListener("keyup", (e) => {
  if (!e.shiftKey) controls.mouseButtons.LEFT = THREE.MOUSE.ROTATE;
});

// svetlá
scene.add(new THREE.HemisphereLight(0xdff7ff, 0x10131a, 1.15));

const frontLight = new THREE.DirectionalLight(0xffffff, 3.2);
frontLight.position.set(0, 2.4, 5.5);
scene.add(frontLight);

const frontFill = new THREE.DirectionalLight(0xc8f4ff, 1.4);
frontFill.position.set(-3.2, 1.5, 4.2);
scene.add(frontFill);

const rimLight = new THREE.DirectionalLight(0x7dd3fc, 1.4);
rimLight.position.set(3.5, 3.5, -4);
scene.add(rimLight);

scene.add(new THREE.AmbientLight(0xffffff, 0.6));

// grid
const grid = new THREE.GridHelper(8, 32, 0x1e90aa, 0x16202d);
grid.position.y = -1.25;
grid.material.transparent = true;
grid.material.opacity = 0.42;
scene.add(grid);

const axes = new THREE.AxesHelper(1.35);
axes.position.y = -1.24;
scene.add(axes);

function createMaterial() {
  return new THREE.MeshPhysicalMaterial({
    color: currentMaterialSettings.color,
    roughness: currentMaterialSettings.roughness,
    metalness: currentMaterialSettings.metalness,
    clearcoat: 0.25,
    clearcoatRoughness: 0.45,
    side: THREE.DoubleSide,
    wireframe: Boolean(wireframe)
  });
}

/*
function createDemoModel() {
  const group = new THREE.Group();
  const geo = new THREE.BoxGeometry(1.7, 1.7, 1.7);
  const mesh = new THREE.Mesh(geo, createMaterial());
  group.add(mesh);

  setModel(group, "demo_kocka.obj");
  setStats("demo_kocka", 24, 12, "GPU normály");
  setStatus("✓ Demo model", "ok");
}
  */

async function loadSampleModel(index) {
  const sample = sampleModels[index];

  setStatus(`⏳ Načítavam sample: ${sample.name}…`, "warn");

  try {
    const response = await fetch(sample.file);

    if (!response.ok) {
      throw new Error(`Súbor nenájdený: ${sample.file}`);
    }

    const objText = await response.text();

    currentMaterialSettings = {
      color: sample.color.clone(),
      metalness: sample.metalness,
      roughness: sample.roughness
    };

    const loader = new OBJLoader();
    const object = loader.parse(objText);

    setModel(object, sample.name + ".obj");
    setStatus(`✓ Sample model: ${sample.name}`, "ok");

  } catch (err) {
    console.error("Sample model load error:", err);
    setStatus(`✗ ${err.message}`, "danger");
  }
}

function nextSampleModel() {
  currentSampleIndex = (currentSampleIndex + 1) % sampleModels.length;
  loadSampleModel(currentSampleIndex);
}

function setModel(object, fileName = "model.obj") {
  wireframe = false;
  btnWire.dataset.active = "false";
  btnWire.textContent = "⬡ Wireframe";

  if (currentModel) {
    scene.remove(currentModel);
    disposeObject(currentModel);
  }

  currentModel = object;
  scene.add(currentModel);

  let vertices = 0;
  let triangles = 0;
  let hasNormals = false;

  currentModel.traverse((child) => {
    if (child.isMesh && child.geometry) {
      const geo = child.geometry;

      if (!geo.attributes.normal) {
        geo.computeVertexNormals();
      }

      hasNormals = hasNormals || Boolean(geo.attributes.normal);

      vertices += geo.attributes.position ? geo.attributes.position.count : 0;

      if (geo.index) {
        triangles += geo.index.count / 3;
      } else if (geo.attributes.position) {
        triangles += geo.attributes.position.count / 3;
      }

      child.material?.dispose?.();
      child.material = createMaterial();
      child.material.wireframe = false;
      child.material.needsUpdate = true;
    }
  });

  normalizeAndCenter(currentModel);
  resetCamera();

  setStats(
    fileName.replace(/\.obj$/i, ""),
    vertices,
    Math.round(triangles),
    hasNormals ? "OBJ / GPU" : "GPU generated"
  );
}

function disposeObject(object) {
  object.traverse((child) => {
    if (child.isMesh) {
      child.geometry?.dispose?.();
      child.material?.dispose?.();
    }
  });
}

function normalizeAndCenter(object) {
  const box = new THREE.Box3().setFromObject(object);
  const center = new THREE.Vector3();
  const size = new THREE.Vector3();

  box.getCenter(center);
  box.getSize(size);

  object.position.sub(center);

  const maxDim = Math.max(size.x, size.y, size.z);

  if (maxDim > 0) {
    object.scale.setScalar(2.7 / maxDim);
  }

  const newBox = new THREE.Box3().setFromObject(object);
  const newCenter = new THREE.Vector3();

  newBox.getCenter(newCenter);
  object.position.sub(newCenter);
}

function loadObjFile(file) {
  if (!file.name.toLowerCase().endsWith(".obj")) {
    setStatus("✗ Vyber iba .obj", "danger");
    return;
  }

  setStatus("⏳ Načítavam OBJ…", "warn");

  const reader = new FileReader();

  reader.onload = () => {
    try {
      currentMaterialSettings = {
        color: new THREE.Color(0.55, 0.58, 0.62),
        metalness: 0.05,
        roughness: 0.62
      };

      const loader = new OBJLoader();
      const object = loader.parse(reader.result);

      if (!object.children.length) {
        setStatus("✗ OBJ neobsahuje mesh", "danger");
        return;
      }

      setModel(object, file.name);
      setStatus("✓ Model načítaný", "ok");

    } catch (err) {
      console.error(err);
      setStatus("✗ Chyba pri OBJ", "danger");
    }
  };

  reader.readAsText(file);
}

function setStats(name, vertices, faces, normals) {
  infoNazov.textContent = name;
  infoVertexy.textContent = String(vertices);
  infoPlochy.textContent = String(faces);
  infoNormals.textContent = normals;
}

function setStatus(text, type = "") {
  infoStav.textContent = text;

  if (type === "ok") infoStav.style.color = "#34d399";
  else if (type === "danger") infoStav.style.color = "#fb7185";
  else if (type === "warn") infoStav.style.color = "#facc15";
  else infoStav.style.color = "#ffffff";
}

function toggleWireframe() {
  wireframe = !wireframe;

  btnWire.dataset.active = wireframe ? "true" : "false";
  btnWire.textContent = wireframe ? "■ Solid" : "⬡ Wireframe";

  if (!currentModel) return;

  currentModel.traverse((child) => {
    if (child.isMesh && child.material) {
      child.material.wireframe = wireframe;
      child.material.needsUpdate = true;
    }
  });
}

function resetCamera() {
  camera.position.set(0, 1.4, 4.2);
  controls.target.set(0, 0, 0);
  controls.update();
}

function setView(type) {
  const distance = camera.position.distanceTo(controls.target) || 4.2;

  if (type === "front") camera.position.set(0, 0, distance);
  if (type === "side") camera.position.set(distance, 0, 0);
  if (type === "top") camera.position.set(0, distance, 0.001);

  controls.target.set(0, 0, 0);
  controls.update();
}

let perspectiveMode = true;

function switchCameraMode() {

  const distance =
    camera.position.distanceTo(
      controls.target
    );

  if (perspectiveMode) {

    // ORTHOGRAPHIC LOOK
    camera.fov = 12;

  } else {

    // NORMAL PERSPECTIVE
    camera.fov = 55;
  }

  perspectiveMode = !perspectiveMode;

  camera.updateProjectionMatrix();
}

// buttons
btnWire.addEventListener("click", toggleWireframe);
btnReset.addEventListener("click", resetCamera);
btnNextModel?.addEventListener("click", nextSampleModel);

document.getElementById("btn-view-1").addEventListener("click", () => setView("front"));
document.getElementById("btn-view-3").addEventListener("click", () => setView("side"));
document.getElementById("btn-view-7").addEventListener("click", () => setView("top"));

document.querySelectorAll(".mat-btn").forEach((btn) => {
  btn.addEventListener("click", () => {
    const rgb = btn.dataset.rgb.split(",").map(Number);

    currentMaterialSettings.color = new THREE.Color(rgb[0], rgb[1], rgb[2]);
    currentMaterialSettings.metalness = 0.08;
    currentMaterialSettings.roughness = 0.55;

    document.querySelectorAll(".mat-btn").forEach((b) => {
      b.dataset.active = "false";
    });

    btn.dataset.active = "true";

    if (!currentModel) return;

    currentModel.traverse((child) => {
      if (child.isMesh && child.material) {
        child.material.color.copy(currentMaterialSettings.color);
        child.material.metalness = currentMaterialSettings.metalness;
        child.material.roughness = currentMaterialSettings.roughness;
        child.material.needsUpdate = true;
      }
    });
  });
});

fileInput.addEventListener("change", (e) => {
  const file = e.target.files?.[0];
  if (file) loadObjFile(file);
  e.target.value = "";
});

// drag & drop
["dragenter", "dragover"].forEach((eventName) => {
  wrap.addEventListener(eventName, (e) => {
    e.preventDefault();
    wrap.classList.add("drag-active");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  wrap.addEventListener(eventName, (e) => {
    e.preventDefault();

    if (eventName === "drop") {
      const file = e.dataTransfer.files?.[0];
      if (file) loadObjFile(file);
    }

    wrap.classList.remove("drag-active");
  });
});

function resizeRenderer() {
  const rect = canvas.parentElement.getBoundingClientRect();
  const width = Math.max(320, rect.width);
  const height = Math.max(320, rect.height);

  renderer.setSize(width, height, false);
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
}

window.addEventListener("resize", resizeRenderer);

function animate() {
  requestAnimationFrame(animate);
  controls.update();
  renderer.render(scene, camera);
}

resizeRenderer();
loadSampleModel(0);
animate();

setTimeout(() => {
  document.getElementById("loading-screen")?.classList.add("hidden");
}, 450);

console.log("[3D Viewer] WebGL initialized");