// ====================================================================
// Indian Railways Real-Time AI Obstacle & Safety Recovery System
// Manages Track Clearance, 1km LiDAR / Camera Scanning,
// Weight-Tiered Electric Shock Deterrence, Inflatable Scoop Net,
// and 3D Stylized Human Obstacles (Enter Track, Exit Track, Mid-Track, Sudden Appear)
// ====================================================================

import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

export class ObstacleManager {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.train = null;
    this.obstacles = [];
    this.nextId = 1;

    // 3D GLTF Model Loader for Photorealistic Rigged Assets
    this.gltfLoader = new GLTFLoader();
    this.loadedModels = {};
    this.modelUrls = {
      human: "assets/models/human.glb",
      elephant: "assets/models/elephant.glb",
      cow: "assets/models/cow.glb",
      dog: "assets/models/dog.glb",
      deer: "assets/models/deer.glb",
      boar: "assets/models/boar.glb",
    };
    this.preloadModels();

    // Active Non-Lethal Electric Shock Suite (Track Clearance)
    this.activeDeterrenceMode = "electric_shock";
    this.deterrenceSpecs = {
      electric_shock: {
        id: "electric_shock",
        name: "Track Electric Shock (Non-Lethal Track Clearance)",
        shortTitle: "TRACK ELECTRIC SHOCK",
        badge: "E-SHOCK PULSE",
        color: "#38bdf8",
        detail:
          "Discharges non-lethal pulsed electrical gradient across track rails and forward contact sweepers (compliant with IEC 60335-2-76 / RDSO). Prompts immediate clearance off track without burns or physical injury.",
      },
    };

    // 3D Visual Effects Group for Active Deterrence Discharges
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
    this.activeFX = null;
    this.fxTimer = 0;
    this.activePowerSourceIndices = null;

    // Detection telemetry fed to HUD and Safety Controller
    this.telemetry = {
      targetDetected: false,
      type: null,
      name: "NONE (TRACK CLEAR)",
      distance: null,
      mass: null,
      tailoredSpec: null,
      tailoredLabel: null,
      canCollect: false,
      action: "STANDBY",
      alertMessage: null,
      alertType: "info",
      collectedCount: 0,
      collectedWeight: 0,
      deterrenceActive: false,
      deterrenceMode: "electric_shock",
    };

    this.animTime = 0;

    // High-Fidelity Procedural Textures & Photorealistic PBR Materials
    this.initTexturesAndMaterials();

    // Initialize track obstacles with the scenario suite
    this.initDefaultObstacles();
  }

  setTrain(train) {
    this.train = train;
  }

  // Preload photorealistic 3D GLTF models from assets/models/
  preloadModels() {
    if (typeof window === "undefined" || !this.gltfLoader) return;
    Object.entries(this.modelUrls).forEach(([type, url]) => {
      this.gltfLoader.load(
        url,
        (gltf) => {
          console.log(`[ObstacleManager] Loaded photorealistic 3D asset: ${type}`);
          const model = gltf.scene;
          model.traverse((child) => {
            if (child.isMesh) {
              child.castShadow = true;
              child.receiveShadow = true;
            }
          });
          this.loadedModels[type] = {
            scene: model,
            animations: gltf.animations || [],
          };
          // Reapply active scenario if current obstacle matches loaded model
          if (this.activeScenarioIndex) {
            this.applyScenario(this.activeScenarioIndex);
          }
        },
        undefined,
        () => {
          // Normal fallback: asset file not yet present in assets/models/, use organic procedural model
        }
      );
    });
  }

  // Load a custom photorealistic GLTF/GLB model from URL or local path
  loadCustomModel(type, url) {
    if (!this.gltfLoader) return;
    this.gltfLoader.load(url, (gltf) => {
      console.log(`[ObstacleManager] Loaded custom 3D model for ${type}:`, url);
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      this.loadedModels[type] = {
        scene: model,
        animations: gltf.animations || [],
      };
      if (this.activeScenarioIndex) {
        this.applyScenario(this.activeScenarioIndex);
      }
    });
  }

  // Remove any leftover human / animal / debris meshes from the scene
  cleanupSceneObstacles() {
    const toRemove = [];
    this.scene.traverse((child) => {
      if (
        child.name === "stylizedHuman" ||
        child.name === "stylizedAnimal" ||
        child.name === "trackCargoDebris" ||
        (child.userData &&
          (child.userData.type === "human" ||
            child.userData.type === "dog" ||
            child.userData.type === "deer" ||
            child.userData.type === "cow" ||
            child.userData.type === "elephant" ||
            child.userData.type === "boar" ||
            child.userData.type === "crate"))
      ) {
        toRemove.push(child);
      }
    });
    toRemove.forEach((obj) => {
      if (obj.parent) obj.parent.remove(obj);
      obj.traverse((c) => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach((m) => m.dispose());
          else c.material.dispose();
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // High-Fidelity Procedural PBR Textures & Material Initialization
  // ------------------------------------------------------------------
  initTexturesAndMaterials() {
    this.textures = this.createProceduralTextures();

    // Animal Fur, Hide, Horn & Tusk Textures
    const dogFurMap = this.textures.dogFur || null;
    const cowHideMap = this.textures.cowHide || null;
    const elephantSkinMap = this.textures.elephantSkin || null;
    const elephantBump = this.textures.elephantBump || null;
    const elephantEarMap = this.textures.elephantEar || null;
    const ivoryMap = this.textures.ivory || null;
    const ivoryBump = this.textures.ivoryBump || null;
    const hornMap = this.textures.horn || null;

    this.materials = {
      // Stylized Athletic Runner Mannequin & Apparel (Inspired by minimal line-art athletic runner in Image 2)
      humanSkin: new THREE.MeshStandardMaterial({
        color: 0xf3ebe2, // Clean, elegant athletic stylized warm porcelain skin
        roughness: 0.38,
        metalness: 0.02,
      }),
      runnerSkin: new THREE.MeshStandardMaterial({
        color: 0xf3ebe2, // Clean, elegant athletic stylized warm porcelain skin
        roughness: 0.38,
        metalness: 0.02,
      }),
      runnerSinglet: new THREE.MeshStandardMaterial({
        color: 0xf8fafc, // Clean crisp white athletic singlet / tank top
        roughness: 0.52,
        metalness: 0.01,
      }),
      runnerSingletTrim: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Dark athletic contrast piping / neckline / armhole trim
        roughness: 0.35,
        metalness: 0.05,
      }),
      runnerShorts: new THREE.MeshStandardMaterial({
        color: 0x1e293b, // Sleek athletic charcoal/slate running shorts
        roughness: 0.50,
        metalness: 0.02,
      }),
      runnerShortsTrim: new THREE.MeshStandardMaterial({
        color: 0x475569, // Athletic waistband & leg piping
        roughness: 0.40,
        metalness: 0.05,
      }),
      runnerShoesUpper: new THREE.MeshStandardMaterial({
        color: 0x0f172a, // Dark athletic running sneaker upper
        roughness: 0.45,
        metalness: 0.08,
      }),
      runnerShoesSole: new THREE.MeshStandardMaterial({
        color: 0xffffff, // Crisp white cushioned running shoe sole
        roughness: 0.35,
      }),
      runnerShoesAccent: new THREE.MeshStandardMaterial({
        color: 0x38bdf8, // Electric blue / cyan athletic racer streak
        roughness: 0.25,
        metalness: 0.2,
      }),

      // Indian Pariah Dog (Desi Indie: Golden-Tan Coat, Wet Leathery Nose)
      dogFurTan: new THREE.MeshStandardMaterial({
        color: 0xc47b36,
        map: dogFurMap,
        roughness: 0.76,
      }),
      dogFurCream: new THREE.MeshStandardMaterial({
        color: 0xf5ece0,
        map: dogFurMap,
        roughness: 0.74,
      }),
      dogNoseDark: new THREE.MeshStandardMaterial({
        color: 0x1a1818,
        roughness: 0.32,
        metalness: 0.15,
      }),

      // Indian Zebu Cow (Sacred Cow: White/Cream Hide with Grey Hump & Lyre Horns)
      cowHideCream: new THREE.MeshStandardMaterial({
        color: 0xf3f0e8,
        map: cowHideMap,
        bumpMap: elephantBump,
        bumpScale: 0.022,
        roughness: 0.75,
      }),
      cowHideGrey: new THREE.MeshStandardMaterial({
        color: 0x8a929e,
        bumpMap: elephantBump,
        bumpScale: 0.022,
        roughness: 0.78,
      }),
      cowHornsDark: new THREE.MeshStandardMaterial({
        color: 0x22262e,
        map: hornMap,
        roughness: 0.38,
        metalness: 0.12,
      }),
      cowMuzzlePink: new THREE.MeshStandardMaterial({
        color: 0x4a4143, // Slate-pink wet bovine muzzle
        roughness: 0.32,
        metalness: 0.12,
      }),
      hoofDark: new THREE.MeshStandardMaterial({
        color: 0x16171a,
        roughness: 0.45,
        metalness: 0.15,
      }),

      // Asian Wild Elephant (Weathered Deep-Wrinkled Slate Hide, Ivory Tusks)
      elephantHideGrey: new THREE.MeshStandardMaterial({
        color: 0x3d444d,
        map: elephantSkinMap,
        bumpMap: elephantBump,
        bumpScale: 0.065,
        roughness: 0.86,
      }),
      elephantEar: new THREE.MeshStandardMaterial({
        color: 0x424850,
        map: elephantEarMap,
        bumpMap: elephantBump,
        bumpScale: 0.05,
        roughness: 0.88,
      }),
      elephantIvory: new THREE.MeshStandardMaterial({
        color: 0xfcf8ed,
        map: ivoryMap,
        bumpMap: ivoryBump,
        bumpScale: 0.015,
        roughness: 0.22,
        metalness: 0.04,
      }),

      // Spotted Chital Deer & Wild Boar
      deerFurFawn: new THREE.MeshStandardMaterial({
        color: 0xb45309,
        roughness: 0.74,
      }),
      deerSpotsCream: new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        roughness: 0.7,
      }),
      deerAntlersDark: new THREE.MeshStandardMaterial({
        color: 0x3d200e,
        roughness: 0.52,
      }),
      boarBristleDark: new THREE.MeshStandardMaterial({
        color: 0x242120,
        roughness: 0.85,
      }),
    };
  }

  // ------------------------------------------------------------------
  // High-Resolution Procedural Texture Generators
  // ------------------------------------------------------------------
  createProceduralTextures() {
    if (typeof document === "undefined") return {};

    const textures = {};

    try {
      // 1. Indian Pariah Dog Golden-Tan Fur Texture (512x512)
      const canvasDog = document.createElement("canvas");
      canvasDog.width = 512;
      canvasDog.height = 512;
      const ctxDog = canvasDog.getContext("2d");
      ctxDog.fillStyle = "#c47b36";
      ctxDog.fillRect(0, 0, 512, 512);

      ctxDog.strokeStyle = "rgba(165, 95, 35, 0.4)";
      ctxDog.lineWidth = 1;
      for (let i = 0; i < 600; i++) {
        const fx = Math.random() * 512;
        const fy = Math.random() * 512;
        const flen = Math.random() * 16 + 6;
        ctxDog.beginPath();
        ctxDog.moveTo(fx, fy);
        ctxDog.lineTo(fx + flen * 0.4, fy + flen);
        ctxDog.stroke();
      }
      const dogGrad = ctxDog.createRadialGradient(256, 120, 20, 256, 120, 140);
      dogGrad.addColorStop(0, "rgba(245, 236, 224, 0.7)");
      dogGrad.addColorStop(1, "rgba(196, 123, 54, 0)");
      ctxDog.fillStyle = dogGrad;
      ctxDog.beginPath();
      ctxDog.arc(256, 120, 140, 0, Math.PI * 2);
      ctxDog.fill();

      const texDog = new THREE.CanvasTexture(canvasDog);
      texDog.wrapS = texDog.wrapT = THREE.RepeatWrapping;
      texDog.repeat.set(2, 2);
      textures.dogFur = texDog;

      // 6. Indian Zebu Cow Hide Texture (512x512)
      const canvasCow = document.createElement("canvas");
      canvasCow.width = 512;
      canvasCow.height = 512;
      const ctxCow = canvasCow.getContext("2d");
      ctxCow.fillStyle = "#eae6df";
      ctxCow.fillRect(0, 0, 512, 512);

      ctxCow.fillStyle = "rgba(148, 163, 184, 0.28)";
      for (let i = 0; i < 20; i++) {
        const cx = Math.random() * 512;
        const cy = Math.random() * 512;
        const cr = Math.random() * 50 + 20;
        ctxCow.beginPath();
        ctxCow.arc(cx, cy, cr, 0, Math.PI * 2);
        ctxCow.fill();
      }
      const texCow = new THREE.CanvasTexture(canvasCow);
      texCow.wrapS = texCow.wrapT = THREE.RepeatWrapping;
      texCow.repeat.set(2, 2);
      textures.cowHide = texCow;

      // 7. Asian Wild Elephant Weathered Wrinkled Hide Map (512x512)
      const canvasEle = document.createElement("canvas");
      canvasEle.width = 512;
      canvasEle.height = 512;
      const ctxEle = canvasEle.getContext("2d");
      ctxEle.fillStyle = "#3d444d";
      ctxEle.fillRect(0, 0, 512, 512);

      // Deep cross-hatch wrinkles and creases
      ctxEle.strokeStyle = "rgba(26, 30, 36, 0.7)";
      ctxEle.lineWidth = 1.6;
      for (let y = 0; y < 512; y += 10) {
        ctxEle.beginPath();
        ctxEle.moveTo(0, y + (Math.random() - 0.5) * 6);
        for (let x = 30; x < 512; x += 30) {
          ctxEle.lineTo(x, y + (Math.random() - 0.5) * 8);
        }
        ctxEle.stroke();
      }
      ctxEle.strokeStyle = "rgba(26, 30, 36, 0.45)";
      ctxEle.lineWidth = 1.2;
      for (let x = 0; x < 512; x += 16) {
        ctxEle.beginPath();
        ctxEle.moveTo(x + (Math.random() - 0.5) * 6, 0);
        for (let y = 30; y < 512; y += 30) {
          ctxEle.lineTo(x + (Math.random() - 0.5) * 8, y);
        }
        ctxEle.stroke();
      }
      // Pinkish-buff depigmentation mottling across Asian elephant forehead/ears/trunk margins
      ctxEle.fillStyle = "rgba(215, 145, 135, 0.55)";
      for (let i = 0; i < 110; i++) {
        const ex = Math.random() * 140 + 360;
        const ey = Math.random() * 512;
        ctxEle.beginPath();
        ctxEle.arc(ex, ey, Math.random() * 3.5 + 1, 0, Math.PI * 2);
        ctxEle.fill();
      }

      const texEle = new THREE.CanvasTexture(canvasEle);
      texEle.wrapS = texEle.wrapT = THREE.RepeatWrapping;
      texEle.repeat.set(2, 2);
      textures.elephantSkin = texEle;

      // 7B. Elephant 3D Reticulated Wrinkle Bump Map (512x512 High Relief)
      const canvasEleBump = document.createElement("canvas");
      canvasEleBump.width = 512;
      canvasEleBump.height = 512;
      const ctxEB = canvasEleBump.getContext("2d");
      ctxEB.fillStyle = "#808080";
      ctxEB.fillRect(0, 0, 512, 512);

      // Deep dark crevices for normal shading
      ctxEB.strokeStyle = "#252525";
      ctxEB.lineWidth = 2.4;
      for (let y = 0; y < 512; y += 12) {
        ctxEB.beginPath();
        ctxEB.moveTo(0, y + (Math.random() - 0.5) * 6);
        for (let x = 24; x < 512; x += 24) {
          ctxEB.lineTo(x, y + (Math.random() - 0.5) * 8);
        }
        ctxEB.stroke();
      }
      ctxEB.strokeStyle = "#383838";
      ctxEB.lineWidth = 1.8;
      for (let x = 0; x < 512; x += 18) {
        ctxEB.beginPath();
        ctxEB.moveTo(x + (Math.random() - 0.5) * 6, 0);
        for (let y = 24; y < 512; y += 24) {
          ctxEB.lineTo(x + (Math.random() - 0.5) * 8, y);
        }
        ctxEB.stroke();
      }
      // Highlight ridges on wrinkle crests
      ctxEB.strokeStyle = "#b5b5b5";
      ctxEB.lineWidth = 1.2;
      for (let y = 0; y < 512; y += 12) {
        ctxEB.beginPath();
        ctxEB.moveTo(0, y - 2 + (Math.random() - 0.5) * 4);
        for (let x = 30; x < 512; x += 30) {
          ctxEB.lineTo(x, y - 2 + (Math.random() - 0.5) * 4);
        }
        ctxEB.stroke();
      }
      const texEleBump = new THREE.CanvasTexture(canvasEleBump);
      texEleBump.wrapS = texEleBump.wrapT = THREE.RepeatWrapping;
      texEleBump.repeat.set(3, 3);
      textures.elephantBump = texEleBump;

      // 7C. Asian Elephant Fan Ear Map with Capillary Veins & Depigmentation (512x512)
      const canvasEleEar = document.createElement("canvas");
      canvasEleEar.width = 512;
      canvasEleEar.height = 512;
      const ctxEar = canvasEleEar.getContext("2d");
      ctxEar.fillStyle = "#3e454e";
      ctxEar.fillRect(0, 0, 512, 512);

      // Pinkish inner ear warmth
      const earGrad = ctxEar.createRadialGradient(256, 256, 30, 256, 256, 220);
      earGrad.addColorStop(0, "rgba(205, 140, 130, 0.45)");
      earGrad.addColorStop(0.7, "rgba(80, 85, 95, 0.2)");
      earGrad.addColorStop(1, "rgba(62, 69, 78, 0)");
      ctxEar.fillStyle = earGrad;
      ctxEar.fillRect(0, 0, 512, 512);

      // Radial branching capillary blood vessels
      ctxEar.strokeStyle = "rgba(145, 65, 60, 0.35)";
      ctxEar.lineWidth = 1.5;
      for (let angle = -0.6; angle <= 0.6; angle += 0.18) {
        ctxEar.beginPath();
        ctxEar.moveTo(60, 256);
        const ex = 60 + Math.cos(angle) * 380;
        const ey = 256 + Math.sin(angle) * 380;
        ctxEar.quadraticCurveTo(240, 256 + Math.sin(angle) * 180, ex, ey);
        ctxEar.stroke();
      }
      const texEleEar = new THREE.CanvasTexture(canvasEleEar);
      textures.elephantEar = texEleEar;

      // 8. Polished Ivory Texture & Subtle Enamel Bump (256x256)
      const canvasIvory = document.createElement("canvas");
      canvasIvory.width = 256;
      canvasIvory.height = 256;
      const ctxIvory = canvasIvory.getContext("2d");
      const ivoryGrad = ctxIvory.createLinearGradient(0, 0, 0, 256);
      ivoryGrad.addColorStop(0, "#fcf8ed");
      ivoryGrad.addColorStop(0.5, "#f3eedc");
      ivoryGrad.addColorStop(1, "#e6dec7");
      ctxIvory.fillStyle = ivoryGrad;
      ctxIvory.fillRect(0, 0, 256, 256);
      ctxIvory.strokeStyle = "rgba(200, 185, 155, 0.25)";
      ctxIvory.lineWidth = 1;
      for (let y = 0; y < 256; y += 8) {
        ctxIvory.beginPath();
        ctxIvory.moveTo(0, y);
        ctxIvory.lineTo(256, y);
        ctxIvory.stroke();
      }
      const texIvory = new THREE.CanvasTexture(canvasIvory);
      texIvory.wrapS = texIvory.wrapT = THREE.RepeatWrapping;
      texIvory.repeat.set(1, 2);
      textures.ivory = texIvory;

      const canvasIvoryBump = document.createElement("canvas");
      canvasIvoryBump.width = 256;
      canvasIvoryBump.height = 256;
      const ctxIB = canvasIvoryBump.getContext("2d");
      ctxIB.fillStyle = "#808080";
      ctxIB.fillRect(0, 0, 256, 256);
      ctxIB.strokeStyle = "#929292";
      ctxIB.lineWidth = 1;
      for (let y = 0; y < 256; y += 6) {
        ctxIB.beginPath();
        ctxIB.moveTo(0, y);
        ctxIB.lineTo(256, y);
        ctxIB.stroke();
      }
      const texIvoryBump = new THREE.CanvasTexture(canvasIvoryBump);
      texIvoryBump.wrapS = texIvoryBump.wrapT = THREE.RepeatWrapping;
      texIvoryBump.repeat.set(2, 4);
      textures.ivoryBump = texIvoryBump;

      // 9. Keratin Bovine Horn Texture (256x256)
      const canvasHorn = document.createElement("canvas");
      canvasHorn.width = 256;
      canvasHorn.height = 256;
      const ctxHorn = canvasHorn.getContext("2d");
      const hornGrad = ctxHorn.createLinearGradient(0, 0, 0, 256);
      hornGrad.addColorStop(0, "#363a42");
      hornGrad.addColorStop(0.7, "#1c1f24");
      hornGrad.addColorStop(1, "#0a0c0e");
      ctxHorn.fillStyle = hornGrad;
      ctxHorn.fillRect(0, 0, 256, 256);
      ctxHorn.strokeStyle = "rgba(70, 75, 85, 0.35)";
      ctxHorn.lineWidth = 1.5;
      for (let y = 0; y < 256; y += 12) {
        ctxHorn.beginPath();
        ctxHorn.moveTo(0, y);
        ctxHorn.lineTo(256, y);
        ctxHorn.stroke();
      }
      const texHorn = new THREE.CanvasTexture(canvasHorn);
      texHorn.wrapS = texHorn.wrapT = THREE.RepeatWrapping;
      texHorn.repeat.set(1, 2);
      textures.horn = texHorn;
    } catch (e) {
      console.warn("Could not generate procedural canvas textures:", e);
    }

    return textures;
  }

  // Parametric tapered tube geometry with closed rounded caps (Used for horns, tails, tusks)
  createTaperedTubeGeometry(
    curve,
    tubularSegments = 16,
    rStart = 0.024,
    rEnd = 0.003,
    radialSegments = 8,
    cap = true,
  ) {
    const points = curve.getPoints(tubularSegments);
    const frames = curve.computeFrenetFrames(tubularSegments, false);
    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= tubularSegments; i++) {
      const t = i / tubularSegments;
      const r = rStart * (1 - t) + rEnd * t;
      const p = points[i];
      const N = frames.normals[i];
      const B = frames.binormals[i];

      for (let j = 0; j <= radialSegments; j++) {
        const theta = (j / radialSegments) * Math.PI * 2;
        const sin = Math.sin(theta);
        const cos = -Math.cos(theta);

        const vx = p.x + r * (cos * N.x + sin * B.x);
        const vy = p.y + r * (cos * N.y + sin * B.y);
        const vz = p.z + r * (cos * N.z + sin * B.z);

        positions.push(vx, vy, vz);
        uvs.push(j / radialSegments, t);
      }
    }

    for (let i = 0; i < tubularSegments; i++) {
      for (let j = 0; j < radialSegments; j++) {
        const a = i * (radialSegments + 1) + j;
        const b = (i + 1) * (radialSegments + 1) + j;
        const c = (i + 1) * (radialSegments + 1) + (j + 1);
        const d = i * (radialSegments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    if (cap) {
      const startIdx = positions.length / 3;
      const pStart = points[0];
      positions.push(pStart.x, pStart.y, pStart.z);
      uvs.push(0.5, 0);

      for (let j = 0; j < radialSegments; j++) {
        indices.push(startIdx, j + 1, j);
      }

      const endIdx = positions.length / 3;
      const pEnd = points[tubularSegments];
      positions.push(pEnd.x, pEnd.y, pEnd.z);
      uvs.push(0.5, 1);

      const lastRing = tubularSegments * (radialSegments + 1);
      for (let j = 0; j < radialSegments; j++) {
        indices.push(endIdx, lastRing + j, lastRing + j + 1);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // ------------------------------------------------------------------
  // 3D Stylized Athletic Runner Character Model Builder
  // Sleek minimalist aerodynamic mannequin head, sleeveless athletic singlet with scoop neck,
  // athletic running shorts with waistband, bare athletic runner limbs,
  // sculpted runner fists, streamlined running sneakers, and dynamic athletic running stride.
  // Directly inspired by the minimal line-art athletic runner in Image 2.
  // ------------------------------------------------------------------
  buildHumanMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedHuman";

    const skinMat = config.skinMat || this.materials.runnerSkin || this.materials.humanSkin;
    const singletMat = config.singletMat || this.materials.runnerSinglet;
    const trimMat = config.trimMat || this.materials.runnerSingletTrim;
    const shortsMat = config.shortsMat || this.materials.runnerShorts;
    const shortsTrimMat = config.shortsTrimMat || this.materials.runnerShortsTrim || trimMat;
    const shoeUpperMat = config.shoeUpperMat || this.materials.runnerShoesUpper;
    const shoeSoleMat = config.shoeSoleMat || this.materials.runnerShoesSole;
    const shoeAccentMat = config.shoeAccentMat || this.materials.runnerShoesAccent || trimMat;

    // A. Pelvis & Athletic Running Shorts (Root of hips at y = 0.88)
    const pelvisGroup = new THREE.Group();
    pelvisGroup.position.y = 0.88;

    // Running shorts waistband
    const waistband = new THREE.Mesh(
      new THREE.CylinderGeometry(0.158, 0.154, 0.042, 24),
      shortsTrimMat,
    );
    waistband.position.y = 0.075;
    waistband.scale.set(1.06, 1.0, 0.78);
    waistband.castShadow = true;
    pelvisGroup.add(waistband);

    // Shorts pelvic body
    const shortsPelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.154, 0.138, 0.18, 24),
      shortsMat,
    );
    shortsPelvis.position.y = -0.01;
    shortsPelvis.scale.set(1.08, 1.0, 0.80);
    shortsPelvis.castShadow = true;
    shortsPelvis.receiveShadow = true;
    pelvisGroup.add(shortsPelvis);

    // Shorts left & right leg cuffs (short athletic cut ending at upper thigh)
    [-1, 1].forEach((side) => {
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.082, 0.078, 0.10, 20),
        shortsMat,
      );
      cuff.position.set(side * 0.09, -0.075, 0);
      cuff.rotation.z = side * 0.05;
      cuff.castShadow = true;
      pelvisGroup.add(cuff);

      // Contrast piping along shorts leg hem
      const hemTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.078, 0.005, 8, 20).rotateX(Math.PI / 2),
        shortsTrimMat,
      );
      hemTrim.position.set(side * 0.09, -0.125, 0);
      pelvisGroup.add(hemTrim);

      // Side athletic stripe
      const sideStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.18, 0.012),
        shortsTrimMat,
      );
      sideStripe.position.set(side * 0.165, -0.01, 0);
      pelvisGroup.add(sideStripe);
    });

    group.add(pelvisGroup);

    // B. Athletic Torso in Sleeveless Singlet (Pivoted at y = 0.94)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.94, 0);

    // Lower torso / waist (singlet tucking over shorts)
    const lowerTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.162, 0.148, 0.19, 24),
      singletMat,
    );
    lowerTorso.position.y = 0.095;
    lowerTorso.scale.set(1.05, 1.0, 0.76);
    lowerTorso.castShadow = true;
    torsoGroup.add(lowerTorso);

    // Singlet bottom hem fold
    const singletHem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.152, 0.162, 0.03, 24),
      singletMat,
    );
    singletHem.position.y = 0.01;
    singletHem.scale.set(1.06, 1.0, 0.77);
    torsoGroup.add(singletHem);

    // Chest & Upper Torso with athletic masculine V-taper
    const upperTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.198, 0.164, 0.25, 24),
      singletMat,
    );
    upperTorso.position.y = 0.29;
    upperTorso.scale.set(1.10, 1.0, 0.78);
    upperTorso.castShadow = true;
    torsoGroup.add(upperTorso);

    // Athletic Pectoral Contours
    [-1, 1].forEach((side) => {
      const pec = new THREE.Mesh(
        new THREE.SphereGeometry(0.076, 16, 12),
        singletMat,
      );
      pec.position.set(side * 0.072, 0.29, 0.078);
      pec.scale.set(1.08, 0.75, 0.52);
      torsoGroup.add(pec);
    });

    // Deep Scoop Neckline: Bare upper chest skin showing above the singlet
    const bareChest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.072, 0.082, 0.065, 20),
      skinMat,
    );
    bareChest.position.set(0, 0.395, 0.02);
    torsoGroup.add(bareChest);

    // Curved Scoop Neckline Contrast Trim
    const neckTrim = new THREE.Mesh(
      new THREE.TorusGeometry(0.076, 0.007, 8, 24).rotateX(Math.PI / 2),
      trimMat,
    );
    neckTrim.position.set(0, 0.40, 0.025);
    neckTrim.scale.set(1.05, 0.75, 1.0);
    torsoGroup.add(neckTrim);

    // Sleeveless Armhole Contrast Trims (Left & Right)
    [-1, 1].forEach((side) => {
      const armholeTrim = new THREE.Mesh(
        new THREE.TorusGeometry(0.082, 0.006, 8, 24).rotateY(Math.PI / 2),
        trimMat,
      );
      armholeTrim.position.set(side * 0.198, 0.34, 0);
      armholeTrim.scale.set(1.0, 1.15, 0.85);
      torsoGroup.add(armholeTrim);

      // Singlet side contrast vertical stripe
      const singletStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.008, 0.32, 0.012),
        trimMat,
      );
      singletStripe.position.set(side * 0.185, 0.22, 0);
      torsoGroup.add(singletStripe);
    });

    // Athletic Lean Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.058, 0.13, 24),
      skinMat,
    );
    neck.position.set(0, 0.44, 0.015);
    neck.rotation.x = 0.06;
    torsoGroup.add(neck);

    // C. Sculpted Aerodynamic Mannequin Head (Pivoted at y = 0.52 on torso)
    // Matches the sleek, smooth, featureless oval silhouette from Image 2!
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0.03);

    const cranium = new THREE.Mesh(
      new THREE.SphereGeometry(0.124, 32, 28),
      skinMat,
    );
    cranium.scale.set(0.88, 1.15, 0.98);
    cranium.rotation.x = 0.08;
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Subtle jawline contour blending smoothly toward the neck
    const jawTaper = new THREE.Mesh(
      new THREE.ConeGeometry(0.085, 0.12, 24),
      skinMat,
    );
    jawTaper.position.set(0, -0.06, 0.02);
    jawTaper.rotation.x = Math.PI;
    jawTaper.scale.set(0.9, 0.7, 1.0);
    headGroup.add(jawTaper);

    torsoGroup.add(headGroup);

    // D. Articulated Bare Athletic Arms with Sculpted Runner Fists
    [-1, 1].forEach((side) => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.195, 0.34, 0);

      // Bare deltoid shoulder cap
      const shoulder = new THREE.Mesh(
        new THREE.SphereGeometry(0.072, 18, 14),
        skinMat,
      );
      shoulder.scale.set(1.0, 0.92, 0.95);
      armGroup.add(shoulder);

      // Upper arm (bicep / tricep)
      const bicep = new THREE.Mesh(
        new THREE.CylinderGeometry(0.050, 0.042, 0.26, 18),
        skinMat,
      );
      bicep.position.set(0, -0.13, 0);
      bicep.castShadow = true;
      armGroup.add(bicep);

      // Forearm Group (Elbow joint pivot at y = -0.26)
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(0, -0.26, 0);

      // Elbow joint
      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.042, 16, 12),
        skinMat,
      );
      forearmGroup.add(elbow);

      // Forearm
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.044, 0.034, 0.25, 18),
        skinMat,
      );
      forearm.position.set(0, -0.125, 0);
      forearm.castShadow = true;
      forearmGroup.add(forearm);

      // Wrist
      const wrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.032, 12, 10),
        skinMat,
      );
      wrist.position.set(0, -0.25, 0);
      forearmGroup.add(wrist);

      // Athletic Runner Fist (Relaxed clenched running hand matching Image 2!)
      const fistGroup = new THREE.Group();
      fistGroup.position.set(0, -0.28, 0.005);

      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.042, 0.048, 0.026),
        skinMat,
      );
      fistGroup.add(palm);

      // Curled fingers cylinder
      const curledFingers = new THREE.Mesh(
        new THREE.CylinderGeometry(0.016, 0.016, 0.040, 14).rotateZ(Math.PI / 2),
        skinMat,
      );
      curledFingers.position.set(0, -0.022, 0.012);
      fistGroup.add(curledFingers);

      // Thumb wrapped over curled fingers
      const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.008, 0.030, 10),
        skinMat,
      );
      thumb.position.set(-side * 0.018, 0.005, 0.012);
      thumb.rotation.set(-0.35, 0, -side * 0.45);
      fistGroup.add(thumb);

      forearmGroup.add(fistGroup);
      armGroup.add(forearmGroup);
      torsoGroup.add(armGroup);

      if (side === -1) {
        group.userData.armL = armGroup;
        group.userData.forearmL = forearmGroup;
      } else {
        group.userData.armR = armGroup;
        group.userData.forearmR = forearmGroup;
      }
    });

    group.add(torsoGroup);

    // E. Articulated Bare Athletic Legs & Streamlined Running Sneakers
    [-1, 1].forEach((side) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.09, 0.86, 0);

      // Hip joint
      const hip = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 18, 14),
        shortsMat,
      );
      legGroup.add(hip);

      // Bare athletic muscular thigh
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.054, 0.40, 22),
        skinMat,
      );
      thigh.position.set(0, -0.20, 0.004);
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Lower Leg Group (KNEE PIVOT permanently anchored at y = -0.40)
      const lowerLegGroup = new THREE.Group();
      lowerLegGroup.position.set(0, -0.40, 0.006);

      // Knee cap / joint
      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 18, 14),
        skinMat,
      );
      lowerLegGroup.add(knee);

      const patella = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 12, 10),
        skinMat,
      );
      patella.position.set(0, 0.005, 0.042);
      patella.scale.set(0.9, 1.15, 0.45);
      lowerLegGroup.add(patella);

      // Bare athletic calf muscle & shin (tapering down to ankle)
      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.038, 0.40, 22),
        skinMat,
      );
      calf.position.set(0, -0.20, -0.004);
      calf.castShadow = true;
      lowerLegGroup.add(calf);

      // Ankle joint
      const ankle = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 14, 10),
        skinMat,
      );
      ankle.position.set(0, -0.40, 0.008);
      lowerLegGroup.add(ankle);

      // Streamlined Athletic Running Shoes (Sneakers)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.41, 0.02);

      // Thick cushioned running shoe midsole
      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.082, 0.030, 0.22),
        shoeSoleMat,
      );
      sole.position.set(0, -0.015, 0.035);
      shoeGroup.add(sole);

      // Outsole grip tread
      const tread = new THREE.Mesh(
        new THREE.BoxGeometry(0.084, 0.006, 0.22),
        shoeUpperMat,
      );
      tread.position.set(0, -0.031, 0.035);
      shoeGroup.add(tread);

      // Aerodynamic running shoe upper
      const shoeUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.046, 0.17, 16).rotateX(Math.PI / 2),
        shoeUpperMat,
      );
      shoeUpper.position.set(0, 0.022, 0.038);
      shoeUpper.scale.set(0.96, 0.70, 1.05);
      shoeUpper.castShadow = true;
      shoeGroup.add(shoeUpper);

      // Rounded heel counter
      const heel = new THREE.Mesh(
        new THREE.SphereGeometry(0.040, 14, 10),
        shoeUpperMat,
      );
      heel.position.set(0, 0.024, -0.032);
      shoeGroup.add(heel);

      // Rounded toe rocker spring
      const toeRocker = new THREE.Mesh(
        new THREE.SphereGeometry(0.040, 14, 10),
        shoeSoleMat,
      );
      toeRocker.position.set(0, 0.016, 0.112);
      toeRocker.scale.set(0.96, 0.65, 0.90);
      shoeGroup.add(toeRocker);

      // Athletic accent stripe (cyan / electric accent on side)
      const shoeStripe = new THREE.Mesh(
        new THREE.BoxGeometry(0.086, 0.008, 0.06),
        shoeAccentMat,
      );
      shoeStripe.position.set(0, 0.020, 0.035);
      shoeStripe.rotation.x = -0.22;
      shoeGroup.add(shoeStripe);

      lowerLegGroup.add(shoeGroup);
      legGroup.add(lowerLegGroup);
      group.add(legGroup);

      if (side === -1) {
        group.userData.legL = legGroup;
        group.userData.lowerLegL = lowerLegGroup;
      } else {
        group.userData.legR = legGroup;
        group.userData.lowerLegR = lowerLegGroup;
      }
    });

    group.userData.type = "human";
    group.userData.humanPose = poseMode;
    group.userData.torsoGroup = torsoGroup;
    group.userData.headGroup = headGroup;
    group.userData.faceData = { tex: null, drawFace: () => {} };

    this.applyHumanPose(group, poseMode);
    return group;
  }

  // ------------------------------------------------------------------
  // Configure Human Biomechanical Poses for Scenarios
  // Inspired by the dynamic athletic runner stride in Image 2
  // ------------------------------------------------------------------
  applyHumanPose(group, poseMode) {
    if (!group || !group.userData) return;
    const ud = group.userData;
    ud.humanPose = poseMode;

    switch (poseMode) {
      case "enter":
      case 1:
        // Scenario 1: Runner stepping/running onto the track over elevated rail
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.94, 0);
          ud.torsoGroup.rotation.set(0.20, 0, -0.04);
        }
        if (ud.headGroup) ud.headGroup.rotation.set(0.08, 0.22, 0);

        // Lead leg (Left): stepping up and forward onto rail
        if (ud.legL) ud.legL.rotation.set(0.62, 0.04, -0.05);
        if (ud.lowerLegL) ud.lowerLegL.rotation.set(-0.80, 0, 0);

        // Trailing leg (Right): driving off the outer ground
        if (ud.legR) ud.legR.rotation.set(-0.42, -0.04, 0.05);
        if (ud.lowerLegR) ud.lowerLegR.rotation.set(-0.25, 0, 0);

        // Arms in dynamic 90-degree running pump
        if (ud.armR) ud.armR.rotation.set(0.65, 0, 0.12);
        if (ud.forearmR) ud.forearmR.rotation.set(-1.42, 0, 0);
        if (ud.armL) ud.armL.rotation.set(-0.70, 0, -0.12);
        if (ud.forearmL) ud.forearmL.rotation.set(-1.32, 0, 0);
        break;

      case "exit":
      case 2:
        // Scenario 2: Runner leaping/running off the rail toward outer ground
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.94, 0);
          ud.torsoGroup.rotation.set(0.22, 0, 0.06);
        }
        if (ud.headGroup) ud.headGroup.rotation.set(0.08, -0.30, 0);

        // Outside lead leg (Right): driving forward/down to ground
        if (ud.legR) ud.legR.rotation.set(0.58, 0.04, 0.06);
        if (ud.lowerLegR) ud.lowerLegR.rotation.set(-0.75, 0, 0);

        // Inside trailing leg (Left): pushing off the rail behind
        if (ud.legL) ud.legL.rotation.set(-0.45, -0.04, -0.05);
        if (ud.lowerLegL) ud.lowerLegL.rotation.set(-0.28, 0, 0);

        // Arms in counter-stride
        if (ud.armL) ud.armL.rotation.set(0.60, 0, -0.12);
        if (ud.forearmL) ud.forearmL.rotation.set(-1.38, 0, 0);
        if (ud.armR) ud.armR.rotation.set(-0.68, 0, 0.12);
        if (ud.forearmR) ud.forearmR.rotation.set(-1.30, 0, 0);
        break;

      case "sudden":
      case 4:
        // Scenario 4: High-speed sprinter across track (Net rescue)
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.94, 0);
          ud.torsoGroup.rotation.set(0.30, 0, 0);
        }
        if (ud.headGroup) ud.headGroup.rotation.set(0.10, 0, 0);

        // Sprint drive legs
        if (ud.legR) ud.legR.rotation.set(0.72, 0, 0.04);
        if (ud.lowerLegR) ud.lowerLegR.rotation.set(-0.95, 0, 0);
        if (ud.legL) ud.legL.rotation.set(-0.52, 0, -0.04);
        if (ud.lowerLegL) ud.lowerLegL.rotation.set(-0.35, 0, 0);

        // Sprint arms
        if (ud.armL) ud.armL.rotation.set(0.80, 0, -0.18);
        if (ud.forearmL) ud.forearmL.rotation.set(-1.48, 0, 0);
        if (ud.armR) ud.armR.rotation.set(-0.85, 0, 0.18);
        if (ud.forearmR) ud.forearmR.rotation.set(-1.38, 0, 0);
        break;

      case "mid":
      case 3:
      default:
        // Scenario 3: The iconic running stride of Image 2!
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.94, 0);
          ud.torsoGroup.rotation.set(0.26, 0, 0);
        }
        if (ud.headGroup) ud.headGroup.rotation.set(0.06, 0, 0);

        // Dynamic running stride: Right leg forward, Left leg back
        if (ud.legR) ud.legR.rotation.set(0.68, 0, 0.04);
        if (ud.lowerLegR) ud.lowerLegR.rotation.set(-0.85, 0, 0);
        if (ud.legL) ud.legL.rotation.set(-0.48, 0, -0.04);
        if (ud.lowerLegL) ud.lowerLegL.rotation.set(-0.35, 0, 0);

        // Arms in 90-degree bent running form (Left forward, Right back)
        if (ud.armL) ud.armL.rotation.set(0.65, 0, -0.15);
        if (ud.forearmL) ud.forearmL.rotation.set(-1.45, 0, 0);
        if (ud.armR) ud.armR.rotation.set(-0.75, 0, 0.15);
        if (ud.forearmR) ud.forearmR.rotation.set(-1.35, 0, 0);
        break;
    }
  }
  // ------------------------------------------------------------------
  // 1. Indian Pariah Dog / Desi Indie Kutta (~22 kg < 150 kg -> Net Scoopable)
  // Athletic deep chest, tucked abdomen, wedge skull with stop, leathery rhinarium,
  // amber almond eyes, alert prick ears, articulated limbs with toe pads & sickle tail
  // ------------------------------------------------------------------
  buildDogMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedAnimal";

    const furMat = this.materials.dogFurTan;
    const creamMat = this.materials.dogFurCream;
    const darkMat = this.materials.dogNoseDark;

    // A. Athletic Canine Torso (Deep ribcage with dramatic flank tuck-up)
    const ribcage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.135, 0.115, 0.32, 18).rotateX(Math.PI / 2),
      furMat,
    );
    ribcage.position.set(0, 0.34, 0.06);
    ribcage.castShadow = true;
    group.add(ribcage);

    // Creamy-white ventral chest star/patch
    const chestPatch = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 14, 10),
      creamMat,
    );
    chestPatch.position.set(0, 0.32, 0.2);
    chestPatch.scale.set(0.85, 1.1, 0.7);
    group.add(chestPatch);

    // Tucked flank / abdomen (sighthound/pariah build)
    const abdomen = new THREE.Mesh(
      new THREE.CylinderGeometry(0.11, 0.085, 0.22, 16).rotateX(Math.PI / 2),
      furMat,
    );
    abdomen.position.set(0, 0.36, -0.14);
    group.add(abdomen);

    // Pelvic Croup
    const croup = new THREE.Mesh(
      new THREE.SphereGeometry(0.10, 14, 10),
      furMat,
    );
    croup.position.set(0, 0.36, -0.22);
    croup.scale.set(0.9, 0.85, 1.0);
    group.add(croup);

    // B. Muscular Canine Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.082, 0.115, 0.2, 16),
      furMat,
    );
    neck.position.set(0, 0.44, 0.23);
    neck.rotation.x = -0.46;
    neck.castShadow = true;
    group.add(neck);

    // C. Sculpted Canine Head Group (Pivoted at 0, 0.52, 0.34)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0.34);

    // Wedge-shaped skull with defined stop
    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.102, 18, 14),
      furMat,
    );
    skull.scale.set(0.88, 0.95, 1.12);
    skull.castShadow = true;
    headGroup.add(skull);

    // Slender, tapered anatomical muzzle
    const muzzle = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.074, 0.16, 14).rotateX(Math.PI / 2),
      furMat,
    );
    muzzle.position.set(0, -0.02, 0.125);
    headGroup.add(muzzle);

    // Lower jaw & natural mouth line
    const lowerJaw = new THREE.Mesh(
      new THREE.BoxGeometry(0.062, 0.032, 0.13),
      furMat,
    );
    lowerJaw.position.set(0, -0.05, 0.115);
    headGroup.add(lowerJaw);

    // Black Textured Rhinarium (Nose Pad) with Distinct Nostrils & Groove
    const nosePad = new THREE.Mesh(
      new THREE.SphereGeometry(0.024, 12, 10),
      darkMat,
    );
    nosePad.position.set(0, 0.006, 0.2);
    nosePad.scale.set(1.15, 0.85, 0.9);
    headGroup.add(nosePad);

    [-0.009, 0.009].forEach((nx) => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.006, 8, 6),
        darkMat,
      );
      nostril.position.set(nx, 0.003, 0.218);
      headGroup.add(nostril);
    });

    // Alert Amber Almond Eyes with Dark Indie Eyeliner
    [-0.046, 0.046].forEach((side) => {
      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 8),
        this.materials.humanEyesWhite,
      );
      eyeWhite.position.set(side, 0.038, 0.078);
      headGroup.add(eyeWhite);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 10, 8),
        this.materials.humanEyesIris,
      );
      iris.position.set(side * 1.05, 0.038, 0.092);
      headGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 8, 8),
        darkMat,
      );
      pupil.position.set(side * 1.06, 0.038, 0.102);
      headGroup.add(pupil);

      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.004, 6, 6),
        this.materials.humanEyeReflex,
      );
      hl.position.set(side * 1.05 + 0.003, 0.044, 0.106);
      headGroup.add(hl);
    });

    // Semi-Prick Triangular Indie Ears with Curved Cartilage & Inner Hollow
    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.075, 0.095, -0.02);
      earGroup.rotation.set(-0.24, 0, side * -0.5);

      const earFlap = new THREE.Mesh(
        new THREE.ConeGeometry(0.048, 0.13, 10),
        furMat,
      );
      earFlap.scale.set(0.9, 1.0, 0.45);
      earGroup.add(earFlap);

      const earCavity = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.11, 8),
        this.materials.humanSkinShadow,
      );
      earCavity.position.set(0, -0.01, 0.012);
      earCavity.scale.set(0.8, 0.95, 0.3);
      earGroup.add(earCavity);

      headGroup.add(earGroup);
    });
    group.add(headGroup);

    // D. Curled Sickle Tail (Carried proudly over croup)
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.38, -0.24);
    const tailPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.12, -0.08),
      new THREE.Vector3(0, 0.24, -0.06),
      new THREE.Vector3(0, 0.3, 0.03),
      new THREE.Vector3(0, 0.25, 0.09),
    ];
    const tailGeo = this.createTaperedTubeGeometry(
      new THREE.CatmullRomCurve3(tailPts),
      14,
      0.024,
      0.006,
      8,
      true,
    );
    tailGroup.add(new THREE.Mesh(tailGeo, furMat));
    group.add(tailGroup);

    // E. 4 Articulated Canine Limbs (Shoulders, Elbows, Pasterns, Digital Paw Pads)
    const legs = {};
    const legConfigs = [
      { name: "legFL", x: -0.082, z: 0.18, isFront: true },
      { name: "legFR", x: 0.082, z: 0.18, isFront: true },
      { name: "legBL", x: -0.082, z: -0.18, isFront: false },
      { name: "legBR", x: 0.082, z: -0.18, isFront: false },
    ];

    legConfigs.forEach((c) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.32, c.z);

      if (c.isFront) {
        // Foreleg: Shoulder blade -> Elbow -> Forearm -> Pastern -> Paw
        const shoulder = new THREE.Mesh(
          new THREE.SphereGeometry(0.048, 12, 10),
          furMat,
        );
        legPivot.add(shoulder);

        const forearm = new THREE.Mesh(
          new THREE.CylinderGeometry(0.03, 0.022, 0.22, 12),
          furMat,
        );
        forearm.position.set(0, -0.11, 0);
        forearm.castShadow = true;
        legPivot.add(forearm);

        // Anatomical Compact Paw with 4 Rounded Toe Pads
        const paw = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 12, 8),
          furMat,
        );
        paw.position.set(0, -0.23, 0.018);
        paw.scale.set(0.9, 0.65, 1.25);
        legPivot.add(paw);

        const claws = new THREE.Mesh(
          new THREE.BoxGeometry(0.042, 0.008, 0.014),
          darkMat,
        );
        claws.position.set(0, -0.245, 0.048);
        legPivot.add(claws);
      } else {
        // Hindleg: Muscular Haunch/Thigh -> Stifle Knee -> Gaskin -> Prominent Hock -> Paw
        const haunch = new THREE.Mesh(
          new THREE.CylinderGeometry(0.054, 0.038, 0.16, 14),
          furMat,
        );
        haunch.position.set(0, -0.07, 0.015);
        haunch.rotation.x = 0.25;
        legPivot.add(haunch);

        const hock = new THREE.Mesh(
          new THREE.CylinderGeometry(0.034, 0.022, 0.16, 12),
          furMat,
        );
        hock.position.set(0, -0.165, -0.018);
        hock.rotation.x = -0.28;
        hock.castShadow = true;
        legPivot.add(hock);

        const rearPaw = new THREE.Mesh(
          new THREE.SphereGeometry(0.032, 12, 8),
          furMat,
        );
        rearPaw.position.set(0, -0.23, 0.016);
        rearPaw.scale.set(0.9, 0.65, 1.25);
        legPivot.add(rearPaw);
      }

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = "dog";
    group.userData.headGroup = headGroup;
    group.userData.tail = tailGroup;
    group.userData.legs = legs;

    return group;
  }

  // ------------------------------------------------------------------
  // 2. Indian Zebu Cow / Desi Cattle (~360 kg > 150 kg -> NET LOCKED! Only Electricity)
  // Massive barrel ribs, prominent Zebu hump with organic curve, folding dewlap,
  // curved lyre horns, drooping leaf ears, almond eyes, cloven hooves & switch tail
  // ------------------------------------------------------------------
  buildCowMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedAnimal";

    const hideMat = this.materials.cowHideCream;
    const greyMat = this.materials.cowHideGrey;
    const hornMat = this.materials.cowHornsDark;
    const muzzleMat = this.materials.cowMuzzlePink;
    const darkMat = this.materials.dogNoseDark;
    const hoofMat = this.materials.hoofDark;

    // A. Massive Bovine Ribcage & Pelvis (Anatomical barrel torso)
    const ribcage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.4, 0.95, 20).rotateX(Math.PI / 2),
      hideMat,
    );
    ribcage.position.set(0, 1.05, 0.14);
    ribcage.castShadow = true;
    group.add(ribcage);

    const rump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.39, 0.36, 0.65, 18).rotateX(Math.PI / 2),
      hideMat,
    );
    rump.position.set(0, 1.04, -0.48);
    rump.castShadow = true;
    group.add(rump);

    // Prominent Bovine Hook Bones (Tuber Coxae) and Pin Bones (Tuber Ischii)
    [-0.36, 0.36].forEach((hx) => {
      const hookBone = new THREE.Mesh(
        new THREE.SphereGeometry(0.065, 10, 8),
        hideMat,
      );
      hookBone.position.set(hx, 1.18, -0.42);
      group.add(hookBone);
    });

    // B. Iconic Indian Zebu Thoracic Hump (Rising gracefully over withers)
    const humpGeo = new THREE.SphereGeometry(0.32, 22, 18);
    humpGeo.scale(0.8, 1.35, 1.08);
    const hump = new THREE.Mesh(humpGeo, greyMat);
    hump.position.set(0, 1.54, 0.34);
    hump.rotation.x = -0.15;
    hump.castShadow = true;
    group.add(hump);

    // C. Large Multi-Layered Undulating Throat Dewlap
    const dewlapUpper = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.54, 12).rotateX(Math.PI / 2),
      hideMat,
    );
    dewlapUpper.position.set(0, 0.98, 0.72);
    dewlapUpper.scale.set(0.65, 3.2, 1.0);
    group.add(dewlapUpper);

    const dewlapBrisket = new THREE.Mesh(
      new THREE.CylinderGeometry(0.04, 0.05, 0.42, 12).rotateX(Math.PI / 2),
      hideMat,
    );
    dewlapBrisket.position.set(0, 0.75, 0.42);
    dewlapBrisket.scale.set(0.65, 2.5, 1.0);
    group.add(dewlapBrisket);

    // D. Bovine Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.26, 0.36, 0.46, 16),
      hideMat,
    );
    neck.position.set(0, 1.2, 0.68);
    neck.rotation.x = -0.48;
    neck.castShadow = true;
    group.add(neck);

    // E. Sculpted Bovine Head Group (Pivoted at 0, 1.32, 0.96)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.32, 0.96);

    // Anatomical skull: broad forehead curving smoothly into nasal bridge
    const forehead = new THREE.Mesh(
      new THREE.SphereGeometry(0.19, 18, 14),
      hideMat,
    );
    forehead.position.set(0, 0.08, 0.06);
    forehead.scale.set(0.95, 0.9, 1.15);
    forehead.castShadow = true;
    headGroup.add(forehead);

    const nasalBridge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.165, 0.34, 14).rotateX(Math.PI / 2),
      hideMat,
    );
    nasalBridge.position.set(0, -0.04, 0.26);
    headGroup.add(nasalBridge);

    // Broad Slate-Pink Wet Muzzle with Distinct Open Nostrils
    const muzzle = new THREE.Mesh(
      new THREE.SphereGeometry(0.14, 16, 12),
      muzzleMat,
    );
    muzzle.position.set(0, -0.12, 0.4);
    muzzle.scale.set(1.15, 0.8, 0.85);
    headGroup.add(muzzle);

    [-0.058, 0.058].forEach((nx) => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.024, 10, 8),
        darkMat,
      );
      nostril.position.set(nx, -0.11, 0.48);
      headGroup.add(nostril);
    });

    // Soulful Almond Bovine Eyes with Orbital Eyelids
    [-0.17, 0.17].forEach((side) => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side, 0.06, 0.12);
      eyeGroup.rotation.y = side * 0.35;

      const orbital = new THREE.Mesh(
        new THREE.SphereGeometry(0.046, 12, 8),
        hideMat,
      );
      orbital.scale.set(0.6, 1.1, 1.2);
      eyeGroup.add(orbital);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 12, 10),
        darkMat,
      );
      eye.scale.set(0.5, 1.0, 1.0);
      eyeGroup.add(eye);

      const catchlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 6, 6),
        this.materials.humanEyesWhite,
      );
      catchlight.position.set(side * 0.015, 0.012, 0.022);
      eyeGroup.add(catchlight);

      headGroup.add(eyeGroup);
    });

    // Iconic Pendulous Drooping Zebu / Gir Ears (Leaf-shaped, hanging downward)
    [-1, 1].forEach((side) => {
      const earGroup = new THREE.Group();
      earGroup.position.set(side * 0.21, -0.05, -0.04);
      earGroup.rotation.set(-0.35, 0, side * 0.88);

      const earCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(0, 0, 0),
        new THREE.Vector3(side * 0.08, -0.12, 0.02),
        new THREE.Vector3(side * 0.14, -0.26, 0.01),
        new THREE.Vector3(side * 0.12, -0.34, -0.01),
      ]);
      const earGeo = this.createTaperedTubeGeometry(
        earCurve,
        14,
        0.055,
        0.012,
        8,
        true,
      );
      earGroup.add(new THREE.Mesh(earGeo, hideMat));

      headGroup.add(earGroup);
    });

    // Magnificent Lyre / Swept Horns (CatmullRom curve sweeping outward, upward & backward)
    [-1, 1].forEach((side) => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.12, 0.18, -0.05),
        new THREE.Vector3(side * 0.28, 0.28, -0.02),
        new THREE.Vector3(side * 0.26, 0.44, 0.04),
        new THREE.Vector3(side * 0.2, 0.54, 0.08),
      ]);
      const hornGeo = this.createTaperedTubeGeometry(
        hornCurve,
        16,
        0.044,
        0.006,
        10,
        true,
      );
      const hornMesh = new THREE.Mesh(hornGeo, hornMat);
      hornMesh.castShadow = true;
      headGroup.add(hornMesh);
    });
    group.add(headGroup);

    // F. Long Tail with Generous Dark Hair Switch
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.22, -0.74);
    const tailPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.3, -0.04),
      new THREE.Vector3(0, -0.62, -0.02),
    ];
    const tailRope = this.createTaperedTubeGeometry(
      new THREE.CatmullRomCurve3(tailPts),
      12,
      0.022,
      0.014,
      8,
      true,
    );
    tailGroup.add(new THREE.Mesh(tailRope, hideMat));

    const tailTuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.065, 0.24, 10),
      darkMat,
    );
    tailTuft.position.set(0, -0.74, -0.02);
    tailGroup.add(tailTuft);
    group.add(tailGroup);

    // G. 4 Columnar Bovine Legs with Defined Knees & True Cloven Hooves
    const legs = {};
    const legConfigs = [
      { name: "legFL", x: -0.22, z: 0.46, isFront: true },
      { name: "legFR", x: 0.22, z: 0.46, isFront: true },
      { name: "legBL", x: -0.22, z: -0.46, isFront: false },
      { name: "legBR", x: 0.22, z: -0.46, isFront: false },
    ];

    legConfigs.forEach((c) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 1.02, c.z);

      const upperLimb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.11, 0.082, 0.44, 14),
        hideMat,
      );
      upperLimb.position.set(0, -0.22, 0);
      upperLimb.castShadow = true;
      legPivot.add(upperLimb);

      const joint = new THREE.Mesh(
        new THREE.SphereGeometry(0.082, 12, 10),
        hideMat,
      );
      joint.position.set(0, -0.44, 0);
      legPivot.add(joint);

      const cannon = new THREE.Mesh(
        new THREE.CylinderGeometry(0.076, 0.065, 0.46, 12),
        hideMat,
      );
      cannon.position.set(0, -0.67, 0);
      cannon.castShadow = true;
      legPivot.add(cannon);

      // True Cloven Hoof: Two Distinct Keratin Digits with Interdigital Cleft & Dewclaws
      [-0.038, 0.038].forEach((hx) => {
        const hoofClaw = new THREE.Mesh(
          new THREE.BoxGeometry(0.068, 0.072, 0.14),
          hoofMat,
        );
        hoofClaw.position.set(hx, -0.93, 0.015);
        legPivot.add(hoofClaw);
      });

      const dewclaw = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.024, 0.03),
        hoofMat,
      );
      dewclaw.position.set(0, -0.86, -0.06);
      legPivot.add(dewclaw);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = "cow";
    group.userData.headGroup = headGroup;
    group.userData.tail = tailGroup;
    group.userData.hump = hump;
    group.userData.legs = legs;

    return group;
  }

  // ------------------------------------------------------------------
  // 3. Asian Wild Elephant / Elephas maximus (~3,800 kg > 150 kg -> NET LOCKED! Quad E-Shock)
  // Convex arched back, twin cranial domes, weathered wrinkled hide, authentic Asian fan ears
  // with depigmentation mottling, prehensile trunk with finger, ivory tusks & 5/4-toenail feet
  // ------------------------------------------------------------------
  buildElephantMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedAnimal";

    const hideMat = this.materials.elephantHideGrey;
    const earMat = this.materials.elephantEar || hideMat;
    const ivoryMat = this.materials.elephantIvory;
    const darkMat = this.materials.dogNoseDark;
    const toeMat = this.materials.humanShoeSole;

    // A. Massive Colossal Torso with Asian Elephant Convex / Arched Spine
    const centralTorso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.96, 0.92, 1.45, 24).rotateX(Math.PI / 2),
      hideMat,
    );
    centralTorso.position.set(0, 1.88, 0);
    centralTorso.castShadow = true;
    group.add(centralTorso);

    // Arched dorsal spine ridge (the highest point of the Asian elephant's back)
    const spineRidge = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.42, 1.35, 16).rotateX(Math.PI / 2),
      hideMat,
    );
    spineRidge.position.set(0, 2.58, 0.05);
    spineRidge.scale.set(0.85, 0.6, 1.0);
    spineRidge.castShadow = true;
    group.add(spineRidge);

    // Massive Shoulders / Withers
    const shoulder = new THREE.Mesh(
      new THREE.SphereGeometry(0.96, 22, 18),
      hideMat,
    );
    shoulder.position.set(0, 1.92, 0.72);
    shoulder.scale.set(0.95, 1.05, 1.0);
    shoulder.castShadow = true;
    group.add(shoulder);

    // Massive Rump / Pelvis
    const rump = new THREE.Mesh(
      new THREE.SphereGeometry(0.93, 22, 18),
      hideMat,
    );
    rump.position.set(0, 1.84, -0.72);
    rump.scale.set(0.92, 1.02, 1.0);
    rump.castShadow = true;
    group.add(rump);

    // Dropped sagging wrinkled belly
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.94, 0.88, 1.25, 22).rotateX(Math.PI / 2),
      hideMat,
    );
    belly.position.set(0, 1.48, 0.05);
    belly.scale.set(0.96, 0.72, 1.0);
    belly.castShadow = true;
    group.add(belly);

    // Concentric neck collar skin roll connecting withers
    const neckCollar = new THREE.Mesh(
      new THREE.TorusGeometry(0.72, 0.14, 12, 24),
      hideMat,
    );
    neckCollar.position.set(0, 1.96, 1.12);
    neckCollar.rotation.x = 0.28;
    neckCollar.castShadow = true;
    group.add(neckCollar);

    // B. Sculpted Asian Elephant Head Group (Pivoted at 0, 2.15, 1.55)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.15, 1.55);

    // Hallmark Asian Elephant Twin Cranial Domes (Biparietal Domes with Deep Medial Groove)
    [-0.28, 0.28].forEach((side) => {
      const cranialDome = new THREE.Mesh(
        new THREE.SphereGeometry(0.42, 20, 16),
        hideMat,
      );
      cranialDome.position.set(side, 0.24, 0.02);
      cranialDome.scale.set(0.92, 1.1, 1.0);
      cranialDome.castShadow = true;
      headGroup.add(cranialDome);
    });

    // Sloping Frontal Forehead & Temples
    const skull = new THREE.Mesh(
      new THREE.CylinderGeometry(0.38, 0.32, 0.65, 18).rotateX(Math.PI / 2),
      hideMat,
    );
    skull.position.set(0, 0, 0.22);
    headGroup.add(skull);

    // Sunken Temporal Fossae (Depression behind the eye)
    [-0.34, 0.34].forEach((side) => {
      const fossa = new THREE.Mesh(
        new THREE.SphereGeometry(0.14, 12, 10),
        this.materials.humanSkinShadow || hideMat,
      );
      fossa.position.set(side, 0.14, -0.02);
      fossa.scale.set(0.42, 0.88, 0.72);
      headGroup.add(fossa);
    });

    // Deep-set Eyes inside Wrinkled Orbital Folds
    [-0.38, 0.38].forEach((side) => {
      const orbit = new THREE.Mesh(
        new THREE.TorusGeometry(0.065, 0.022, 10, 18),
        hideMat,
      );
      orbit.position.set(side, 0.08, 0.31);
      orbit.rotation.y = side * 0.35;
      headGroup.add(orbit);

      const eyeWhite = new THREE.Mesh(
        new THREE.SphereGeometry(0.040, 12, 10),
        this.materials.humanEyesWhite,
      );
      eyeWhite.position.set(side * 1.01, 0.08, 0.32);
      headGroup.add(eyeWhite);

      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.034, 12, 10),
        this.materials.humanEyesIris,
      );
      eye.position.set(side * 1.02, 0.08, 0.34);
      headGroup.add(eye);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        darkMat,
      );
      pupil.position.set(side * 1.03, 0.08, 0.36);
      headGroup.add(pupil);

      const hl = new THREE.Mesh(
        new THREE.SphereGeometry(0.007, 6, 6),
        this.materials.humanEyeReflex,
      );
      hl.position.set(side * 1.03 + 0.008, 0.09, 0.37);
      headGroup.add(hl);
    });

    // Asian Elephant Pointed Lower Lip / Chin (Mentum)
    const lowerLip = new THREE.Mesh(
      new THREE.ConeGeometry(0.14, 0.32, 14).rotateX(Math.PI / 2),
      hideMat,
    );
    lowerLip.position.set(0, -0.38, 0.38);
    lowerLip.scale.set(0.85, 0.65, 1.0);
    headGroup.add(lowerLip);

    // Authentic Asian Fan Ears (Trapezoidal with lateral curl and pink depigmentation mottling)
    const earShapeL = new THREE.Shape();
    earShapeL.moveTo(0, 0.35);
    earShapeL.bezierCurveTo(-0.15, 0.45, -0.35, 0.42, -0.48, 0.36);
    earShapeL.bezierCurveTo(-0.58, 0.28, -0.62, 0.15, -0.60, 0.02);
    earShapeL.bezierCurveTo(-0.58, -0.15, -0.52, -0.32, -0.42, -0.45);
    earShapeL.bezierCurveTo(-0.32, -0.58, -0.18, -0.62, -0.08, -0.55);
    earShapeL.bezierCurveTo(-0.02, -0.42, -0.01, -0.18, 0, 0);
    earShapeL.closePath();

    const earGeoL = new THREE.ExtrudeGeometry(earShapeL, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    const earL = new THREE.Mesh(earGeoL, earMat);
    earL.position.set(-0.56, -0.05, -0.12);
    earL.rotation.set(-0.1, 0.45, -0.1);
    earL.castShadow = true;
    headGroup.add(earL);

    const earShapeR = new THREE.Shape();
    earShapeR.moveTo(0, 0.35);
    earShapeR.bezierCurveTo(0.15, 0.45, 0.35, 0.42, 0.48, 0.36);
    earShapeR.bezierCurveTo(0.58, 0.28, 0.62, 0.15, 0.60, 0.02);
    earShapeR.bezierCurveTo(0.58, -0.15, 0.52, -0.32, 0.42, -0.45);
    earShapeR.bezierCurveTo(0.32, -0.58, 0.18, -0.62, 0.08, -0.55);
    earShapeR.bezierCurveTo(0.02, -0.42, 0.01, -0.18, 0, 0);
    earShapeR.closePath();

    const earGeoR = new THREE.ExtrudeGeometry(earShapeR, {
      depth: 0.025,
      bevelEnabled: true,
      bevelSegments: 3,
      steps: 1,
      bevelSize: 0.015,
      bevelThickness: 0.015,
    });
    const earR = new THREE.Mesh(earGeoR, earMat);
    earR.position.set(0.56, -0.05, -0.12);
    earR.rotation.set(-0.1, -0.45, 0.1);
    earR.castShadow = true;
    headGroup.add(earR);

    // Articulated Curved Prehensile Trunk with Horizontal Wrinkle Ridges & Single Finger Tip
    const trunkGroup = new THREE.Group();
    trunkGroup.position.set(0, -0.22, 0.42);

    const trunkPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.38, 0.14),
      new THREE.Vector3(0, -0.78, 0.35),
      new THREE.Vector3(0, -1.12, 0.52),
      new THREE.Vector3(0, -1.38, 0.68),
    ];
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPts);
    const trunkGeo = this.createTaperedTubeGeometry(
      trunkCurve,
      28,
      0.165,
      0.040,
      16,
      true,
    );
    const trunkMesh = new THREE.Mesh(trunkGeo, hideMat);
    trunkMesh.castShadow = true;
    trunkGroup.add(trunkMesh);

    // Transverse Wrinkle Rings along trunk (12 rings with tapering radii)
    [0.12, 0.24, 0.36, 0.48, 0.60, 0.72, 0.84, 0.96, 1.08, 1.20].forEach((tVal) => {
      const u = tVal / 1.38;
      const pt = trunkCurve.getPoint(u);
      const ringR = 0.165 * (1 - u) + 0.040 * u + 0.007;
      const ring = new THREE.Mesh(
        new THREE.TorusGeometry(ringR, 0.008, 8, 14),
        hideMat,
      );
      ring.position.copy(pt);
      ring.rotation.x = Math.PI / 2;
      trunkGroup.add(ring);
    });

    // Asian Elephant Single Prehensile Dorsal Finger on Trunk Tip
    const trunkFinger = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.045, 0.045),
      hideMat,
    );
    trunkFinger.position.set(0, -1.38, 0.68);
    trunkFinger.rotation.x = -0.3;
    trunkGroup.add(trunkFinger);

    [-0.014, 0.014].forEach((nx) => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.008, 8, 6),
        darkMat,
      );
      nostril.position.set(nx, -1.395, 0.65);
      trunkGroup.add(nostril);
    });

    headGroup.add(trunkGroup);

    // Magnificent Curved Ivory Tusks with Tusk Sheaths
    [-1, 1].forEach((side) => {
      const tuskSheath = new THREE.Mesh(
        new THREE.SphereGeometry(0.12, 12, 10),
        hideMat,
      );
      tuskSheath.position.set(side * 0.22, -0.22, 0.30);
      tuskSheath.scale.set(0.9, 1.2, 1.2);
      headGroup.add(tuskSheath);

      const tuskCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.22, -0.26, 0.34),
        new THREE.Vector3(side * 0.30, -0.65, 0.68),
        new THREE.Vector3(side * 0.34, -0.72, 1.05),
      ]);
      const tuskGeo = this.createTaperedTubeGeometry(
        tuskCurve,
        18,
        0.055,
        0.008,
        10,
        true,
      );
      const tuskMesh = new THREE.Mesh(tuskGeo, ivoryMat);
      tuskMesh.castShadow = true;
      headGroup.add(tuskMesh);
    });
    group.add(headGroup);

    // C. 4 Colossal Columnar Pillar Legs with Broad Foot Cushions & Accurate Toenails
    const legs = {};
    const legConfigs = [
      { name: "legFL", x: -0.54, z: 0.78, isFront: true },
      { name: "legFR", x: 0.54, z: 0.78, isFront: true },
      { name: "legBL", x: -0.54, z: -0.78, isFront: false },
      { name: "legBR", x: 0.54, z: -0.78, isFront: false },
    ];

    legConfigs.forEach((c) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 1.7, c.z);

      const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.22, 1.68, 20),
        hideMat,
      );
      limb.position.set(0, -0.84, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      // Elbow joint bulge (front legs) / Stifle knee bulge (rear legs)
      if (c.isFront) {
        const elbow = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 12, 10),
          hideMat,
        );
        elbow.position.set(0, -0.58, -0.16);
        elbow.scale.set(0.9, 1.2, 0.8);
        legPivot.add(elbow);
      } else {
        const stifle = new THREE.Mesh(
          new THREE.SphereGeometry(0.14, 12, 10),
          hideMat,
        );
        stifle.position.set(0, -0.62, 0.16);
        stifle.scale.set(0.9, 1.2, 0.8);
        legPivot.add(stifle);
      }

      // Ankle skin wrinkle roll
      const ankleRoll = new THREE.Mesh(
        new THREE.TorusGeometry(0.23, 0.024, 8, 16),
        hideMat,
      );
      ankleRoll.position.set(0, -1.52, 0);
      ankleRoll.rotation.x = Math.PI / 2;
      legPivot.add(ankleRoll);

      const footPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.25, 0.12, 20),
        hideMat,
      );
      footPad.position.set(0, -1.62, 0);
      legPivot.add(footPad);

      // Authentic Asian Elephant Toenail Layout: 5 on front feet, 4 on rear feet
      const nailAngles = c.isFront
        ? [-0.65, -0.32, 0, 0.32, 0.65]
        : [-0.5, -0.18, 0.18, 0.5];

      nailAngles.forEach((ang) => {
        const nail = new THREE.Mesh(
          new THREE.SphereGeometry(0.044, 10, 8),
          toeMat,
        );
        const nx = Math.sin(ang) * 0.24;
        const nz = Math.cos(ang) * 0.24;
        nail.position.set(nx, -1.64, nz);
        nail.scale.set(0.9, 0.65, 0.9);
        legPivot.add(nail);
      });

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    // D. Long Rope Tail with Bristled Coarse Hair Switch
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.82, -1.18);
    const tailPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.5, -0.05),
      new THREE.Vector3(0, -1.05, -0.02),
    ];
    const tailGeo = this.createTaperedTubeGeometry(
      new THREE.CatmullRomCurve3(tailPts),
      14,
      0.035,
      0.016,
      8,
      true,
    );
    tailGroup.add(new THREE.Mesh(tailGeo, hideMat));

    const switchTuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.08, 0.35, 10),
      darkMat,
    );
    switchTuft.position.set(0, -1.2, -0.02);
    tailGroup.add(switchTuft);
    group.add(tailGroup);

    group.userData.type = "elephant";
    group.userData.headGroup = headGroup;
    group.userData.trunk = trunkGroup;
    group.userData.earL = earL;
    group.userData.earR = earR;
    group.userData.legs = legs;

    return group;
  }

  // ------------------------------------------------------------------
  // 4. Indian Spotted Deer / Chital (~48 kg < 150 kg -> Net Scoopable)
  // Slender elegant cervid anatomy, multi-tined branched antlers, doe eyes, spotted coat
  // ------------------------------------------------------------------
  buildDeerMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedAnimal";

    const furMat = this.materials.deerFurFawn;
    const creamMat = this.materials.deerSpotsCream;
    const antlerMat = this.materials.deerAntlersDark;
    const darkMat = this.materials.dogNoseDark;
    const hoofMat = this.materials.hoofDark;

    // A. Elegant Slender Cervid Torso
    const ribcage = new THREE.Mesh(
      new THREE.CylinderGeometry(0.19, 0.16, 0.76, 18).rotateX(Math.PI / 2),
      furMat,
    );
    ribcage.position.set(0, 0.72, 0);
    ribcage.castShadow = true;
    group.add(ribcage);

    // Cream ventral belly bib
    const bellyBib = new THREE.Mesh(
      new THREE.CylinderGeometry(0.14, 0.12, 0.55, 16).rotateX(Math.PI / 2),
      creamMat,
    );
    bellyBib.position.set(0, 0.65, 0);
    bellyBib.scale.set(0.7, 0.5, 1.0);
    group.add(bellyBib);

    // Scattered Crisp White Spots along flanks
    [-1, 1].forEach((side) => {
      for (let s = 0; s < 8; s++) {
        const spot = new THREE.Mesh(
          new THREE.SphereGeometry(0.025, 8, 6),
          creamMat,
        );
        spot.position.set(
          side * 0.185,
          0.72 + (s % 2) * 0.05,
          -0.28 + s * 0.08,
        );
        group.add(spot);
      }
    });

    // B. Long Graceful Cervid Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.095, 0.135, 0.44, 14),
      furMat,
    );
    neck.position.set(0, 0.94, 0.38);
    neck.rotation.x = -0.55;
    neck.castShadow = true;
    group.add(neck);

    // White throat patch
    const throatPatch = new THREE.Mesh(
      new THREE.SphereGeometry(0.065, 10, 8),
      creamMat,
    );
    throatPatch.position.set(0, 0.98, 0.46);
    throatPatch.scale.set(0.6, 1.2, 0.7);
    group.add(throatPatch);

    // C. Deer Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.15, 0.54);

    const skull = new THREE.Mesh(
      new THREE.SphereGeometry(0.11, 16, 12),
      furMat,
    );
    skull.scale.set(0.85, 0.95, 1.2);
    skull.castShadow = true;
    headGroup.add(skull);

    // Slender Tapered Muzzle & Black Rhinarium
    const muzzle = new THREE.Mesh(
      new THREE.ConeGeometry(0.075, 0.22, 12).rotateX(Math.PI / 2),
      furMat,
    );
    muzzle.position.set(0, -0.035, 0.14);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.025, 10, 8),
      darkMat,
    );
    nose.position.set(0, -0.035, 0.25);
    headGroup.add(nose);

    // Large Doe Eyes with Dark Rims & Catchlight
    [-0.062, 0.062].forEach((side) => {
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.028, 12, 8),
        darkMat,
      );
      eye.position.set(side, 0.038, 0.08);
      headGroup.add(eye);

      const catchlight = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 6, 6),
        this.materials.humanEyesWhite,
      );
      catchlight.position.set(side * 1.05, 0.046, 0.102);
      headGroup.add(catchlight);
    });

    // Alert Cupped Ears with White Inner Fur
    [-1, 1].forEach((side) => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), furMat);
      ear.position.set(side * 0.11, 0.13, -0.03);
      ear.rotation.set(-0.35, 0, side * -0.65);
      headGroup.add(ear);

      const earInner = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.15, 8),
        creamMat,
      );
      earInner.position.set(side * 0.105, 0.13, -0.02);
      earInner.rotation.set(-0.35, 0, side * -0.65);
      headGroup.add(earInner);
    });

    // Multi-Tined Chital Antlers (Main beam, brow tine, trez tine)
    [-1, 1].forEach((side) => {
      const mainBeam = new THREE.Mesh(
        new THREE.CylinderGeometry(0.015, 0.022, 0.44, 8),
        antlerMat,
      );
      mainBeam.position.set(side * 0.068, 0.25, 0.02);
      mainBeam.rotation.set(-0.32, side * 0.1, side * 0.22);
      mainBeam.castShadow = true;
      headGroup.add(mainBeam);

      const browTine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.009, 0.013, 0.15, 8),
        antlerMat,
      );
      browTine.position.set(side * 0.105, 0.26, 0.07);
      browTine.rotation.set(0.42, 0, side * 0.35);
      headGroup.add(browTine);

      const trezTine = new THREE.Mesh(
        new THREE.CylinderGeometry(0.008, 0.011, 0.12, 8),
        antlerMat,
      );
      trezTine.position.set(side * 0.12, 0.42, 0.02);
      trezTine.rotation.set(-0.15, 0, side * 0.45);
      headGroup.add(trezTine);
    });
    group.add(headGroup);

    // D. 4 Slender Articulated Legs with Cloven Hooves
    const legs = {};
    const legConfigs = [
      { name: "legFL", x: -0.11, z: 0.26 },
      { name: "legFR", x: 0.11, z: 0.26 },
      { name: "legBL", x: -0.11, z: -0.26 },
      { name: "legBR", x: 0.11, z: -0.26 },
    ];

    legConfigs.forEach((c) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.7, c.z);

      const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.034, 0.022, 0.68, 10),
        furMat,
      );
      limb.position.set(0, -0.32, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      const hoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.046, 0.046, 0.068),
        hoofMat,
      );
      hoof.position.set(0, -0.67, 0.01);
      legPivot.add(hoof);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = "deer";
    group.userData.headGroup = headGroup;
    group.userData.legs = legs;

    return group;
  }

  // ------------------------------------------------------------------
  // 5. Indian Wild Boar / Sus scrofa cristatus (~95 kg < 150 kg -> Net Scoopable)
  // Stocky muscular barrel, coarse bristle coat, dorsal crest mane, wedge snout & tusks
  // ------------------------------------------------------------------
  buildBoarMesh(poseMode = "mid", config = {}) {
    const group = new THREE.Group();
    group.name = "stylizedAnimal";

    const bristleMat = this.materials.boarBristleDark;
    const darkMat = this.materials.dogNoseDark;
    const ivoryMat = this.materials.elephantIvory;
    const hoofMat = this.materials.hoofDark;

    // A. Muscular Stocky Barrel Torso
    const torso = new THREE.Mesh(
      new THREE.CylinderGeometry(0.24, 0.20, 0.65, 16).rotateX(Math.PI / 2),
      bristleMat,
    );
    torso.position.set(0, 0.46, 0);
    torso.castShadow = true;
    group.add(torso);

    // Bristled Dorsal Crest (Mane along the spine)
    const mane = new THREE.Mesh(
      new THREE.BoxGeometry(0.04, 0.10, 0.60),
      bristleMat,
    );
    mane.position.set(0, 0.64, 0.02);
    group.add(mane);

    // B. Wedge-Shaped Head & Powerful Snout
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.52, 0.36);

    const skull = new THREE.Mesh(
      new THREE.ConeGeometry(0.16, 0.38, 14).rotateX(Math.PI / 2),
      bristleMat,
    );
    skull.position.set(0, -0.04, 0.12);
    headGroup.add(skull);

    // Cartilaginous Snout Disc (Rhinarium)
    const snoutDisc = new THREE.Mesh(
      new THREE.CylinderGeometry(0.048, 0.052, 0.03, 12).rotateX(Math.PI / 2),
      darkMat,
    );
    snoutDisc.position.set(0, -0.04, 0.31);
    headGroup.add(snoutDisc);

    // Upturned White Tusks (Canines)
    [-1, 1].forEach((side) => {
      const tuskCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.05, -0.06, 0.22),
        new THREE.Vector3(side * 0.08, -0.02, 0.24),
        new THREE.Vector3(side * 0.07, 0.04, 0.23),
      ]);
      const tuskGeo = this.createTaperedTubeGeometry(
        tuskCurve,
        10,
        0.016,
        0.004,
        8,
        true,
      );
      headGroup.add(new THREE.Mesh(tuskGeo, ivoryMat));

      // Small Dark Eyes
      const eye = new THREE.Mesh(
        new THREE.SphereGeometry(0.018, 10, 8),
        darkMat,
      );
      eye.position.set(side * 0.09, 0.03, 0.08);
      headGroup.add(eye);

      // Bristled Small Triangular Ears
      const ear = new THREE.Mesh(
        new THREE.ConeGeometry(0.036, 0.10, 8),
        bristleMat,
      );
      ear.position.set(side * 0.10, 0.10, -0.04);
      ear.rotation.set(-0.35, 0, side * -0.55);
      headGroup.add(ear);
    });
    group.add(headGroup);

    // C. 4 Sturdy Stocky Limbs with Cloven Hooves
    const legs = {};
    const legConfigs = [
      { name: "legFL", x: -0.12, z: 0.22 },
      { name: "legFR", x: 0.12, z: 0.22 },
      { name: "legBL", x: -0.12, z: -0.22 },
      { name: "legBR", x: 0.12, z: -0.22 },
    ];

    legConfigs.forEach((c) => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.42, c.z);

      const limb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.055, 0.042, 0.42, 12),
        bristleMat,
      );
      limb.position.set(0, -0.21, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      const hoof = new THREE.Mesh(
        new THREE.BoxGeometry(0.055, 0.045, 0.075),
        hoofMat,
      );
      hoof.position.set(0, -0.42, 0.01);
      legPivot.add(hoof);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    // D. Short Tufted Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.48, -0.32);
    const tailPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.14, -0.04),
      new THREE.Vector3(0, -0.24, -0.02),
    ];
    const tailGeo = this.createTaperedTubeGeometry(
      new THREE.CatmullRomCurve3(tailPts),
      10,
      0.016,
      0.008,
      8,
      true,
    );
    tailGroup.add(new THREE.Mesh(tailGeo, bristleMat));
    group.add(tailGroup);

    group.userData.type = "boar";
    group.userData.headGroup = headGroup;
    group.userData.legs = legs;
    group.userData.tail = tailGroup;

    return group;
  }

  // ------------------------------------------------------------------
  // Programmatic Obstacle Spawner (Supports Human & Animals in Multiple States)
  // ------------------------------------------------------------------
  spawnObstacle(
    type = "human",
    trackProgress = 0,
    moveOffTrack = null,
    lateralOffset = null,
    customMass = null,
    customName = null,
    humanPose = "mid",
  ) {
    let mesh;
    let name = customName;
    let mass = customMass;

    // Check if photorealistic GLTF model is available
    const hasGLTF = !!this.loadedModels[type];
    let gltfMixer = null;
    if (hasGLTF) {
      const gltf = this.loadedModels[type];
      mesh = gltf.scene.clone(true);
      mesh.name = "gltfObstacle";
      mesh.userData.type = type;
      mesh.userData.isGLTF = true;
      if (gltf.animations && gltf.animations.length > 0) {
        gltfMixer = new THREE.AnimationMixer(mesh);
        gltfMixer.clipAction(gltf.animations[0]).play();
        mesh.userData.mixer = gltfMixer;
      }
    }

    if (type === "human") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildHumanMesh(pose);
      if (mass === null || mass === undefined) mass = 72;
      if (lateralOffset === null || lateralOffset === undefined) {
        if (pose === "enter" || pose === 1) lateralOffset = 0.98;
        else if (pose === "exit" || pose === 2) lateralOffset = 1.05;
        else if (pose === "sudden" || pose === 4) lateralOffset = 3.2;
        else lateralOffset = 0.0;
      }
      if (!name) {
        if (pose === "enter" || pose === 1)
          name = "1. Human Entering Track (Leg on Rail, Leg on Ground)";
        else if (pose === "exit" || pose === 2)
          name = "2. Human Exiting Track (Leg on Ground, Leg on Rail)";
        else if (pose === "sudden" || pose === 4)
          name = "4. Sudden Jaywalker on Track (Emergency Dash)";
        else name = "3. Human Mid-Track (Between Rails)";
      }
    } else if (type === "dog") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildDogMesh(pose);
      if (mass === null || mass === undefined) mass = 22; // Small animal (22kg < 150kg)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = pose === "sudden" || pose === 4 ? 2.8 : 0.0;
      }
      if (!name) name = "Indian Stray Dog (22 kg)";
    } else if (type === "deer") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildDeerMesh(pose);
      if (mass === null || mass === undefined) mass = 48; // Medium animal (48kg < 150kg)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = pose === "sudden" || pose === 4 ? 3.0 : 0.0;
      }
      if (!name) name = "Indian Spotted Deer (48 kg)";
    } else if (type === "cow") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildCowMesh(pose);
      if (mass === null || mass === undefined) mass = 360; // Heavy livestock (360kg > 150kg -> Net Locked!)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = pose === "sudden" || pose === 4 ? 3.2 : 0.0;
      }
      if (!name) name = "Indian Zebu Cow (360 kg)";
    } else if (type === "elephant") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildElephantMesh(pose);
      if (mass === null || mass === undefined) mass = 3800; // Giant wildlife (3,800kg > 150kg -> Net Locked!)
      if (lateralOffset === null || lateralOffset === undefined)
        lateralOffset = 0.0;
      if (!name) name = "Wild Asian Elephant (3,800 kg)";
    } else if (type === "boar") {
      const pose = humanPose || "mid";
      if (!hasGLTF) mesh = this.buildBoarMesh(pose);
      if (mass === null || mass === undefined) mass = 95;
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = pose === "sudden" || pose === 4 ? 3.0 : 0.0;
      }
      if (!name) name = "Indian Wild Boar (95 kg)";
    } else {
      if (!hasGLTF) mesh = new THREE.Object3D();
      if (!name) name = "Track Target";
      if (mass === null || mass === undefined) mass = 40;
      if (lateralOffset === null || lateralOffset === undefined)
        lateralOffset = 0;
    }

    const transform = this.track.getTrackTransform(trackProgress, 0);
    mesh.position.copy(transform.position);
    if (lateralOffset !== 0 && transform.normal) {
      mesh.position.add(transform.normal.clone().multiplyScalar(lateralOffset));
    }
    mesh.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      transform.tangent,
    );

    // Realistic orientation relative to track & rails
    const pose = humanPose || "mid";
    if (type === "human") {
      if (pose === "enter" || pose === 1) {
        mesh.rotateY(-Math.PI * 0.45);
      } else if (pose === "exit" || pose === 2) {
        mesh.rotateY(Math.PI * 0.55);
      } else if (pose === "sudden" || pose === 4) {
        mesh.rotateY(-Math.PI * 0.5);
      } else {
        mesh.rotateY(Math.PI);
      }
    } else {
      // Animals
      if (pose === "sudden" || pose === 4) {
        mesh.rotateY(-Math.PI * 0.5); // Facing dash path into track
      } else {
        mesh.rotateY(Math.PI * 0.75); // Diagonally standing across tracks
      }
    }

    const obstacleObj = {
      id: this.nextId++,
      type,
      name,
      mass,
      mesh,
      progress: trackProgress,
      lateralOffset: lateralOffset || 0,
      humanPose: humanPose || "mid",
      isSuddenEmerging: humanPose === "sudden" || humanPose === 4,
      startLateralOffset:
        humanPose === "sudden" || humanPose === 4 ? lateralOffset || 3.0 : 0,
      suddenTimer: 0,
      isCollected: false,
      isDeterred: false,
      hasBeenShocked: false,
      shockTime: 0,
      isCleared: false,
      isSideShocked: false,
      lastSideShockTime: 0,
      isSideRepelled: false,
      sideRepelStartTime: 0,
      sideRepelDir: null,
      moveOffTrackOnShock: moveOffTrack !== null ? moveOffTrack : true,
    };

    this.scene.add(mesh);
    this.obstacles.push(obstacleObj);
    return obstacleObj;
  }

  // Convenience helper to spawn a human in one of the 4 modes
  spawnHuman(
    mode = "mid",
    trackProgress = 0,
    lateralOffset = null,
    moveOffTrack = null,
    customMass = 72,
    customName = null,
  ) {
    return this.spawnObstacle(
      "human",
      trackProgress,
      moveOffTrack,
      lateralOffset,
      customMass,
      customName,
      mode,
    );
  }

  // Spawns a human obstacle ahead of the moving train
  spawnHumanAhead(
    mode = "mid",
    trainProgress = 0,
    trackLength = 3600,
    distanceMeters = null,
    moveOffTrack = null,
  ) {
    const actualTrackLength =
      trackLength || (this.track && this.track.totalLength) || 3600;
    let dist = distanceMeters;
    if (dist === null || dist === undefined) {
      dist = mode === "sudden" || mode === 4 ? 75 : 600;
    }
    const deltaProgress = dist / actualTrackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(
      "human",
      targetProgress,
      moveOffTrack,
      null,
      72,
      null,
      mode,
    );
  }

  spawnBesideCoach(
    trainProgress,
    trackLength,
    coachIndex = 1,
    distFromPowerSource = 2.4, // Distance in meters from Power Source tip
    type = "human",
    customMass = null,
    customName = null,
  ) {
    const locoLen = 20.5;
    const coachLen = 23.5;
    const couplerGap = 0.8;
    const distBack =
      locoLen / 2 +
      couplerGap +
      coachLen / 2 +
      coachIndex * (coachLen + couplerGap);
    const actualTrackLength =
      trackLength || (this.track && this.track.totalLength) || 3600;
    const coachProgress =
      (trainProgress - distBack / actualTrackLength + 1.0) % 1.0;
    const defaultMass = type === "cow" ? 360 : type === "elephant" ? 3800 : type === "dog" ? 22 : 72;
    const defaultName = customName || (type === "human" ? `Coach #${coachIndex + 1} Flank Human (${distFromPowerSource.toFixed(1)}m in 2-3M Zone)` : `Coach #${coachIndex + 1} Flank ${type.toUpperCase()} (${distFromPowerSource.toFixed(1)}m in 2-3M Zone)`);
    // Emitter tip is at ~1.87m from track center, so lateralOffset from centerline = 1.87 + distFromPowerSource
    const lateralOffset = 1.87 + distFromPowerSource;
    return this.spawnObstacle(
      type,
      coachProgress,
      true,
      lateralOffset,
      customMass || defaultMass,
      defaultName,
      type === "human" ? "enter" : "mid",
    );
  }

  // Clear all obstacles from track
  clearAllObstacles() {
    while (this.obstacles.length > 0) {
      const obs = this.obstacles.pop();
      if (obs.mesh && obs.mesh.parent) obs.mesh.parent.remove(obs.mesh);
    }
    this.cleanupSceneObstacles();
    this.telemetry.targetDetected = false;
    this.telemetry.name = "NONE (TRACK CLEAR)";
    this.telemetry.distance = null;
    this.telemetry.mass = null;
    this.telemetry.action =
      "TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)";
    this.telemetry.alertMessage = null;
    this.telemetry.alertType = "info";
  }

  // ------------------------------------------------------------------
  // One-by-One Scenario Execution Suite (Human 4 States + Animals of Different Size & Weight)
  // Protocols:
  // - Sudden Appearance (80m - 0m): CAPTURE NET OPENS ONLY FOR MAX 150KG, NO ELECTRICITY.
  // - Other Scenarios: DISTANT DETECTION (800m - 80m) USE ONLY ELECTRICITY.
  // ------------------------------------------------------------------
  applyScenario(index = 1, trainProgress = 0, trackLength = 3600) {
    this.clearAllObstacles();
    const actualTrackLength =
      trackLength || (this.track && this.track.totalLength) || 3600;

    let type = "human";
    let mode = "enter";
    let dist = 600; // 800m-80m Electricity Only zone
    let moveOffTrack = true;
    let latOffset = 0.98;
    let name = "1. Human Entering Track (Leg on Rail, Leg on Ground)";
    let mass = 72;
    let isSuddenScenario = false;

    switch (index) {
      case 1:
        // Scenario 1: Human Enter (Rail/Ground) - 800m-80m Electricity Only
        type = "human";
        mode = "enter";
        dist = 600;
        latOffset = 0.98;
        name = "1. Human Entering Track (Leg on Rail, Leg on Ground)";
        mass = 72;
        isSuddenScenario = false;
        break;

      case 2:
        // Scenario 2: Human Exit (Ground/Rail) - 800m-80m Electricity Only
        type = "human";
        mode = "exit";
        dist = 600;
        latOffset = 1.05;
        name = "2. Human Exiting Track (Leg on Ground, Leg on Rail)";
        mass = 70;
        isSuddenScenario = false;
        break;

      case 3:
        // Scenario 3: Human Mid-Track (Between Rails) - 800m-80m Electricity Only
        type = "human";
        mode = "mid";
        dist = 600;
        latOffset = 0.0;
        name = "3. Human Mid-Track (Between Rails)";
        mass = 74;
        isSuddenScenario = false;
        break;

      case 4:
        // Scenario 4: Sudden Human Dash (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 72kg <= 150kg)
        type = "human";
        mode = "sudden";
        dist = 75; // Inside 80m-0m window!
        latOffset = 3.2;
        name = "4. Sudden Jaywalker on Track (80m-0m Net Rescue)";
        mass = 72;
        isSuddenScenario = true;
        break;

      case 5:
        // Scenario 5: Stray Dog Sudden Dash (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 22kg <= 150kg)
        type = "dog";
        mode = "sudden";
        dist = 72; // Inside 80m-0m window!
        latOffset = 2.6;
        name = "5. Stray Dog Sudden Intrusion (22kg < 150kg Net Scoop)";
        mass = 22;
        isSuddenScenario = true;
        break;

      case 6:
        // Scenario 6: Spotted Deer Sudden Bound (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 48kg <= 150kg)
        type = "deer";
        mode = "sudden";
        dist = 76; // Inside 80m-0m window!
        latOffset = 3.0;
        name = "6. Spotted Deer Sudden Bound (48kg < 150kg Net Scoop)";
        mass = 48;
        isSuddenScenario = true;
        break;

      case 7:
        // Scenario 7: Indian Zebu Cow on Track (800m-80m) -> ONLY ELECTRICITY (360kg > 150kg Net Locked)
        type = "cow";
        mode = "mid";
        dist = 650; // Inside 800m-80m window!
        latOffset = 0.0;
        name = "7. Indian Cow on Track (360kg: 800m-80m Electricity Only)";
        mass = 360;
        isSuddenScenario = false;
        break;

      case 8:
        // Scenario 8: Wild Asian Elephant on Track (800m-80m) -> QUAD ELECTRICITY ONLY (3,800kg > 150kg Net Locked)
        type = "elephant";
        mode = "mid";
        dist = 720; // Inside 800m-80m window!
        latOffset = 0.0;
        name = "8. Wild Elephant on Track (3,800kg: Quad Electricity Only)";
        mass = 3800;
        isSuddenScenario = false;
        break;

      case 9:
        // Scenario 9: Indian Cow Sudden Appear (80m-0m) -> TEST WEIGHT LIMIT: NET LOCKED (360kg > 150kg)! NO ELECTRICITY!
        type = "cow";
        mode = "sudden";
        dist = 75; // Inside 80m-0m window!
        latOffset = 3.2;
        name = "9. Cow Sudden Intrusion (360kg > 150kg: Net Locked Hazard)";
        mass = 360;
        isSuddenScenario = true;
        break;

      case 10:
        // Scenario 10: Flank Human & Animal Intrusion in 2-3M Danger Zone
        type = "human";
        mode = "enter";
        name = "10. Flank Human & Animal (2-3M Guard)";
        mass = 72;
        break;
    }

    if (index === 10) {
      // SCENARIO 10: BOTH HUMAN AND ANIMAL simultaneously in the 2-3M danger zone!
      const obsHuman = this.spawnBesideCoach(
        trainProgress,
        actualTrackLength,
        1, // Coach #2
        2.3, // 2.3m from Coach #2 Power Source (inside 2-3M zone)
        "human",
        72,
        "Coach #2 Flank Human (2.3m in 2-3M Zone)"
      );
      obsHuman.scenarioIndex = 10;
      obsHuman.isScenario = true;

      const obsAnimal = this.spawnBesideCoach(
        trainProgress,
        actualTrackLength,
        2, // Coach #3
        2.5, // 2.5m from Coach #3 Power Source (inside 2-3M zone)
        "cow",
        360,
        "Coach #3 Flank Cow (2.5m in 2-3M Zone)"
      );
      obsAnimal.scenarioIndex = 10;
      obsAnimal.isScenario = true;

      this.activeScenarioIndex = 10;
      return obsHuman;
    }

    const deltaProgress = dist / actualTrackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;

    const obs = this.spawnObstacle(
      type,
      targetProgress,
      moveOffTrack,
      latOffset,
      mass,
      name,
      mode,
    );
    obs.scenarioIndex = index;
    obs.isScenario = true;
    obs.isSuddenScenario = isSuddenScenario;
    obs.initialDist = dist;

    // Reset capture net state
    if (this.train && this.train.captureNet && this.train.captureNet.reset) {
      this.train.captureNet.reset();
    }

    this.activeScenarioIndex = index;
    return obs;
  }

  // Initial track obstacles: Applies Scenario 1 (Enter) so scene is active on load
  initDefaultObstacles() {
    this.applyScenario(1, 0, (this.track && this.track.totalLength) || 3600);
  }

  // ------------------------------------------------------------------
  // Active Non-Lethal Electric Shock Protocol (Track Clearance)
  // ------------------------------------------------------------------
  setDeterrenceMode(mode) {
    this.activeDeterrenceMode = "electric_shock";
    this.telemetry.deterrenceMode = "electric_shock";
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceSpecs(mode) {
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceTickerData(mode) {
    return {
      arch: "E-SHOCK (RDSO)",
      polarization: "PULSED GRADIENT",
      carrier: "IEC 60335 COMPLIANT",
      focusState: "CONTACT SWEEP ARMED",
      safety: "100% NON-LETHAL (ZERO HARM)",
    };
  }

  // Weight-Tiered Electric Shock Specifications (1 to 4 Power Sources)
  getTailoredShockSpecs(obs) {
    const mass = obs && obs.mass !== undefined ? obs.mass : 72;

    if (mass < 150) {
      return {
        tier: 1,
        powerSourcesCount: 1,
        activeIndices: [2],
        activeLabels: ["Down-Left (Preferred Ground Angle)"],
        voltage: "2.0 kV",
        current: "1.2 mA",
        energy: "0.04 J",
        compliance: "IEC 60479-1 / RDSO Protocol",
        typeLabel: "HUMAN / LIGHT HAZARD (<150KG)",
        badge: "1x POWER SOURCE: 2.0 kV / 1.2 mA",
        color: "#38bdf8",
        desc: `Under 150 kg (${mass} kg): 1 power source active (Down-Left preferred ground angle).`,
      };
    } else if (mass >= 150 && mass < 250) {
      return {
        tier: 2,
        powerSourcesCount: 2,
        activeIndices: [2, 3],
        activeLabels: ["Down-Left", "Down-Right"],
        voltage: "6.0 kV",
        current: "3.0 mA",
        energy: "0.95 J",
        compliance: "IEC 60335-2-76 / RDSO Track Deterrence",
        typeLabel: "MEDIUM HAZARD (150-250KG)",
        badge: "2x POWER SOURCES: 6.0 kV / 3.0 mA",
        color: "#f97316",
        desc: `150-250 kg (${mass} kg): 2 power sources active (Down-Left + Down-Right bilateral sweep).`,
      };
    } else if (mass >= 250 && mass < 350) {
      return {
        tier: 3,
        powerSourcesCount: 3,
        activeIndices: [0, 1, 2],
        activeLabels: ["Top-Left", "Top-Right", "Down-Left"],
        voltage: "7.2 kV",
        current: "3.5 mA",
        energy: "1.25 J",
        compliance: "RDSO Safety Tier 3",
        typeLabel: "HEAVY HAZARD (250-350KG)",
        badge: "3x POWER SOURCES: 7.2 kV / 3.5 mA",
        color: "#e11d48",
        desc: `250-350 kg (${mass} kg): 3 power sources active (Top-Left + Top-Right + Down-Left tri-channel beam).`,
      };
    } else {
      return {
        tier: 4,
        powerSourcesCount: 4,
        activeIndices: [0, 1, 2, 3],
        activeLabels: ["Top-Left", "Top-Right", "Down-Left", "Down-Right"],
        voltage: "7.8 kV",
        current: "3.8 mA",
        energy: "1.40 J",
        compliance: "RDSO Tech Circular 129 / IEC 60335-2-76",
        typeLabel: "CRITICAL HAZARD (≥350KG)",
        badge: "4x POWER SOURCES: 7.8 kV / 3.8 mA",
        color: "#ec4899",
        desc: `350 kg and above (${mass} kg): All 4 power sources active (Quad full-power convergence).`,
      };
    }
  }

  triggerDeterrence(obs, audio, train = null) {
    if (!obs || obs.isDeterred) return;
    if (train) this.train = train;

    obs.isDeterred = true;
    obs.hasBeenShocked = true;
    obs.shockTime = this.animTime;
    obs.deterMode = "electric_shock";
    obs.fleeStartTime = this.animTime;
    obs.fleeDirection = Math.random() > 0.5 ? 1 : -1;
    obs.isCleared = false;
    this.fxTimer = 1.2;

    if (audio) {
      audio.playElectricShockDischarge(obs.type || "human", obs.mass);
    }

    this.spawnDeterrenceFX(obs, this.train);
  }

  triggerAnimalDeterrence(obs, audio, train = null) {
    this.triggerDeterrence(obs, audio, train);
  }

  spawnDeterrenceFX(obs, train = null) {
    if (train) this.train = train;
    while (this.fxGroup.children.length > 0) {
      const c = this.fxGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      this.fxGroup.remove(c);
    }

    const shockSpecs = this.getTailoredShockSpecs(obs);
    this.activePowerSourceIndices = shockSpecs.activeIndices;

    const trainEmitters = (this.train && this.train.shockEmitters) || [];
    let activeEmitters = [];
    shockSpecs.activeIndices.forEach((idx) => {
      if (trainEmitters[idx]) {
        activeEmitters.push({ emitter: trainEmitters[idx], index: idx });
      }
    });

    const fallbackOrigin = new THREE.Vector3();
    if (this.train && this.train.mesh) {
      fallbackOrigin.copy(this.train.mesh.position);
      fallbackOrigin.y += 0.5;
      fallbackOrigin.z += 10.5;
    } else {
      fallbackOrigin
        .copy(this.track.getTrackTransform(obs.progress, 0).position)
        .sub(
          this.track
            .getTrackTransform(obs.progress, 0)
            .tangent.clone()
            .normalize()
            .multiplyScalar(obs.forwardMeters || 60),
        );
      fallbackOrigin.y += 0.5;
    }

    const targetPos = new THREE.Vector3();
    if (obs.mesh) {
      obs.mesh.getWorldPosition(targetPos);
      targetPos.y += 0.6;
    }

    if (activeEmitters.length === 0) {
      activeEmitters.push({ emitter: null, index: 2 });
    }

    activeEmitters.forEach((item) => {
      const segs = 18;
      const points = [];
      const eTip = item.emitter && item.emitter.tip ? item.emitter.tip : null;
      const origin = new THREE.Vector3();
      if (eTip) eTip.getWorldPosition(origin);
      else origin.copy(fallbackOrigin);

      const targetOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.4,
        (Math.random() - 0.5) * 0.35,
      );
      const effectiveEnd = targetPos.clone().add(targetOffset);

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = origin.clone().lerp(effectiveEnd, t);
        if (i > 0 && i < segs) {
          const envelope = Math.sin(t * Math.PI);
          p.x += (Math.random() - 0.5) * 0.55 * envelope;
          p.y += (Math.random() - 0.5) * 0.4 * envelope;
          p.z += (Math.random() - 0.5) * 0.55 * envelope;
        }
        points.push(p);
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: shockSpecs.color || 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.95,
      });
      const line = new THREE.Line(geom, mat);
      line.userData = {
        isLightning: true,
        emitterTip: eTip,
        fallbackOrigin: origin.clone(),
        obs: obs,
        targetOffset: targetOffset,
        segs: segs,
      };
      this.fxGroup.add(line);

      const flare = new THREE.PointLight(0x38bdf8, 4.0, 12);
      flare.position.copy(origin);
      flare.userData = { isNozzleFlare: true, emitterTip: eTip };
      this.fxGroup.add(flare);
    });

    const targetFlash = new THREE.PointLight(0x38bdf8, 5.0, 15);
    targetFlash.position.copy(targetPos);
    this.fxGroup.add(targetFlash);
  }

  // Coach Side Electric Shock FX for perimeter repulsion (2-3m flank clearance)
  spawnCoachSideShockFX(obs, nearest) {
    if (!this.train || !nearest || !nearest.emitter) return;

    this.activeCoachIndex = nearest.emitter.coachIndex;
    this.activeCoachSide = nearest.emitter.side;

    const eTip = nearest.emitter.tip;
    const origin = new THREE.Vector3();
    if (eTip) eTip.getWorldPosition(origin);
    else origin.copy(this.train.mesh.position);

    const targetPos = new THREE.Vector3();
    if (obs.mesh) {
      obs.mesh.getWorldPosition(targetPos);
      targetPos.y += 0.5;
    }

    const pulseDir = targetPos.clone().sub(origin).normalize();

    // 1. Dual High-Voltage Lightning Arc tendrils
    for (let fork = 0; fork < 2; fork++) {
      const segs = 16;
      const points = [];
      const targetOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.28,
        (Math.random() - 0.5) * 0.32,
        (Math.random() - 0.5) * 0.28,
      );
      const effectiveEnd = targetPos.clone().add(targetOffset);

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = origin.clone().lerp(effectiveEnd, t);
        if (i > 0 && i < segs) {
          const envelope = Math.sin(t * Math.PI);
          p.x += (Math.random() - 0.5) * 0.45 * envelope;
          p.y += (Math.random() - 0.5) * 0.35 * envelope;
          p.z += (Math.random() - 0.5) * 0.45 * envelope;
        }
        points.push(p);
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: fork === 0 ? 0x38bdf8 : 0x00f0ff,
        linewidth: 2,
        transparent: true,
        opacity: 0.95,
      });
      const line = new THREE.Line(geom, mat);
      line.userData = {
        isLightning: true,
        isSideLightning: true,
        emitterTip: eTip,
        fallbackOrigin: origin.clone(),
        obs: obs,
        targetOffset: targetOffset,
        segs: segs,
      };
      this.fxGroup.add(line);
    }

    // 2. Kinetic Force Shockwave Ring (Expanding electric repulsive pulse pushing away)
    const ringGeo = new THREE.TorusGeometry(0.24, 0.025, 8, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.92,
      wireframe: false,
    });
    const shockwave = new THREE.Mesh(ringGeo, ringMat);
    shockwave.position.copy(origin);
    shockwave.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pulseDir);
    shockwave.userData = {
      isShockwaveRing: true,
      origin: origin.clone(),
      target: targetPos.clone(),
    };
    this.fxGroup.add(shockwave);

    // 3. Emitter Nozzle Flare PointLight
    const flare = new THREE.PointLight(0x38bdf8, 5.5, 10);
    flare.position.copy(origin);
    flare.userData = { isSideNozzleFlare: true, emitterTip: eTip };
    this.fxGroup.add(flare);

    // 4. Target Flash PointLight
    const targetFlash = new THREE.PointLight(0x38bdf8, 6.5, 12);
    targetFlash.position.copy(targetPos);
    targetFlash.userData = {
      isSideTargetLight: true,
      obs: obs,
      targetOffset: new THREE.Vector3(0, 0, 0),
    };
    this.fxGroup.add(targetFlash);
  }

  // Coach Side Electric Shock Perimeter Guard: checks 2-3m proximity alongside coaches
  checkCoachSideProximity(train, audio) {
    if (
      !train ||
      !train.coachSideEmitters ||
      train.coachSideEmitters.length === 0
    )
      return;

    const obsWorldPos = new THREE.Vector3();

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.isCollected || !obs.mesh || obs.isCleared) continue;

      obs.mesh.getWorldPosition(obsWorldPos);

      const nearest = train.getNearestCoachSideEmitter
        ? train.getNearestCoachSideEmitter(obsWorldPos)
        : null;

      if (!nearest) continue;

      // STRICT 2-3M PERIMETER GUARD: Works ONLY up to 3.0M, strictly NOT above 3.0M
      if (nearest.dist <= 3.0 && nearest.dist >= 0.1) {
        const now = this.animTime;
        if (!obs.lastSideShockTime || now - obs.lastSideShockTime > 1.0) {
          obs.isSideShocked = true;
          obs.lastSideShockTime = now;
          this.fxTimer = 0.85;

          const coachNum = nearest.emitter.coachIndex;
          const sideName = nearest.emitter.side.toUpperCase();
          if (train.pulseCoachSideEmitters) {
            train.pulseCoachSideEmitters(coachNum, nearest.emitter.side, 1.0);
          }

          this.spawnCoachSideShockFX(obs, nearest);
          if (audio) {
            audio.playElectricShockDischarge(obs.type || "human", obs.mass);
          }

          // Compute strong outward push vector away from the coach
          const emitterQuat = new THREE.Quaternion();
          if (nearest.emitter.group) {
            nearest.emitter.group.getWorldQuaternion(emitterQuat);
          }
          const outVector = new THREE.Vector3(0, 0, 1).applyQuaternion(emitterQuat).setY(0).normalize();

          let repelDir = obsWorldPos
            .clone()
            .sub(nearest.worldPos)
            .setY(0);
          if (repelDir.lengthSq() < 0.01) {
            repelDir = outVector.clone();
          } else {
            repelDir.normalize();
            // Guarantee strong repulsive outward clearance away from coach
            repelDir.add(outVector.clone().multiplyScalar(1.5)).setY(0).normalize();
          }

          obs.isSideRepelled = true;
          obs.sideRepelStartTime = now;
          obs.sideRepelDir = repelDir;

          this.telemetry.alertType = "deploy";
          this.telemetry.alertMessage = `⚡ SIDE POWER SOURCE: COACH #${coachNum + 1} [${sideName}] FIRED! PUSHING ${obs.name.toUpperCase()} AWAY (${nearest.dist.toFixed(1)}M ≤ 3.0M)!`;
          this.telemetry.action = `⚡ COACH #${coachNum + 1} POWER PULSE FIRED (PROXIMITY: ${nearest.dist.toFixed(1)}M IN 2-3M ZONE)`;
        }
      } else if (nearest.dist > 3.0 && nearest.dist <= 5.5) {
        // Distance is above 3.0M — Strictly outside 2-3M perimeter guard: NO POWER FIRED
        if (!obs.isSideRepelled && !this.telemetry.alertMessage) {
          this.telemetry.action = `🟢 PERIMETER STANDBY: ${obs.name.toUpperCase()} AT ${nearest.dist.toFixed(1)}M (> 3.0M SAFE DISTANCE — NO POWER FIRED)`;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Living Organic Animations for Human Obstacles:
  // - Eye Blinking via dynamic canvas
  // - Breathing & vital signs
  // - Sudden Emergence Dash (Mode 4)
  // - Mode 1: Weight balance stepping on rail vs ground
  // - Mode 2: Push rhythm exiting to ground
  // - Mode 3: Center track ambient glance left/right
  // - Train Alert Alarm & panic crouch (< 95m)
  // - Shock reflex jump & high-speed fleeing
  // ------------------------------------------------------------------
  animateLivingObstacles(dt, trainSpeedMs) {
    this.animTime += dt;
    const t = this.animTime;

    this.obstacles.forEach((obs) => {
      if (obs.isCollected || !obs.mesh || !obs.mesh.userData) return;
      const ud = obs.mesh.userData;

      if (ud.mixer) {
        ud.mixer.update(dt);
      }

      const dist = obs.forwardMeters !== undefined ? obs.forwardMeters : 100;
      const isTrainClose = dist < 95;
      const isUrgent = dist < 50;

      if (ud.type === "human") {
        const seed = obs.id * 2.3;
        const localT = t + seed;

        // A. Dynamic Eye Blinking
        if (ud.faceData && ud.faceData.tex) {
          const blinkCycle = (localT * 0.32) % 1.0;
          let blinkFactor = 0;
          if (blinkCycle < 0.04) {
            blinkFactor =
              0.5 + 0.5 * Math.cos((blinkCycle / 0.04 - 0.5) * 2 * Math.PI);
          }
          if (
            ud.faceData.lastBlink === undefined ||
            Math.abs(ud.faceData.lastBlink - blinkFactor) > 0.05 ||
            (blinkFactor === 0 && ud.faceData.lastBlink !== 0)
          ) {
            ud.faceData.drawFace(blinkFactor);
            ud.faceData.tex.needsUpdate = true;
            ud.faceData.lastBlink = blinkFactor;
          }
          if (ud.eyelidL && ud.eyelidR) {
            ud.eyelidL.rotation.x = 0.2 + blinkFactor * 0.7;
            ud.eyelidR.rotation.x = 0.2 + blinkFactor * 0.7;
          }
        }

        // B. Mode 4: Sudden Emergence Dash into track center
        if (obs.isSuddenEmerging) {
          obs.suddenTimer = (obs.suddenTimer || 0) + dt;
          const duration = 0.45;
          const p = Math.min(1.0, obs.suddenTimer / duration);
          const curOffset = THREE.MathUtils.lerp(
            obs.startLateralOffset || 2.4,
            0.0,
            p,
          );
          obs.lateralOffset = curOffset;

          const transform = this.track.getTrackTransform(obs.progress, 0);
          const normal = transform.normal
            ? transform.normal.clone()
            : new THREE.Vector3(1, 0, 0);
          obs.mesh.position
            .copy(transform.position)
            .add(normal.multiplyScalar(curOffset));

          if (p < 1.0) {
            const runCycle = obs.suddenTimer * 18.0;
            if (ud.legL) ud.legL.rotation.x = Math.sin(runCycle) * 0.75;
            if (ud.lowerLegL)
              ud.lowerLegL.rotation.x = -Math.max(0.15, -Math.sin(runCycle) * 1.1);
            if (ud.legR) ud.legR.rotation.x = -Math.sin(runCycle) * 0.75;
            if (ud.lowerLegR)
              ud.lowerLegR.rotation.x = -Math.max(0.15, Math.sin(runCycle) * 1.1);
            if (ud.armL) ud.armL.rotation.x = -Math.sin(runCycle) * 0.85;
            if (ud.forearmL) ud.forearmL.rotation.x = -1.45;
            if (ud.armR) ud.armR.rotation.x = Math.sin(runCycle) * 0.85;
            if (ud.forearmR) ud.forearmR.rotation.x = -1.35;
            if (ud.torsoGroup) ud.torsoGroup.rotation.x = 0.28;
          } else {
            obs.isSuddenEmerging = false;
            this.applyHumanPose(obs.mesh, "sudden");
            obs.mesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              transform.tangent,
            );
            obs.mesh.rotateY(Math.PI); // Snap to face oncoming headlights
          }
          return;
        }

        // C. Coach Side Proximity Repulsion (When shocked by Coach Side Mechanism within 2-3m)
        if (obs.isSideRepelled && obs.sideRepelDir) {
          const repelT = this.animTime - obs.sideRepelStartTime;
          obs.mesh.position.add(
            obs.sideRepelDir.clone().multiplyScalar(4.0 * dt),
          );

          if (repelT < 0.4) {
            obs.mesh.position.y += Math.sin((repelT / 0.4) * Math.PI) * 0.18;
            if (ud.headGroup) ud.headGroup.rotation.x = -0.35;
            if (ud.armL) ud.armL.rotation.set(-1.1, 0, -0.6);
            if (ud.armR) ud.armR.rotation.set(-1.1, 0, 0.6);
          } else {
            obs.mesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              obs.sideRepelDir,
            );
            const runCycle = (this.animTime * 14) % (Math.PI * 2);
            if (ud.armL) ud.armL.rotation.x = Math.sin(runCycle) * 0.9;
            if (ud.armR) ud.armR.rotation.x = -Math.sin(runCycle) * 0.9;
            if (ud.legL) ud.legL.rotation.x = -Math.sin(runCycle) * 1.1;
            if (ud.legR) ud.legR.rotation.x = Math.sin(runCycle) * 1.1;
          }

          if (repelT > 1.4) {
            obs.isSideRepelled = false;
            obs.isCleared = true;
          }
          return;
        }

        // D. Electric Shock Reaction
        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;
          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(
            -tangent.z,
            0,
            tangent.x,
          ).normalize();

          if (obs.moveOffTrackOnShock) {
            // Human escapes track safely
            const fleeDist = Math.min(5.5, fleeT * 4.2);
            const lateralPos = transform.position
              .clone()
              .add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(
              0.05,
              transform.position.y - Math.min(0.28, fleeDist * 0.08),
            );
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.5) {
              obs.isCleared = true;
            }

            if (fleeT < 0.35) {
              // 1. Initial Shock Reflex Jump!
              obs.mesh.position.y += Math.sin((fleeT / 0.35) * Math.PI) * 0.22;
              if (ud.headGroup) ud.headGroup.rotation.x = -0.3;
              if (ud.armL) ud.armL.rotation.set(-0.8, 0, -0.6);
              if (ud.armR) ud.armR.rotation.set(-0.8, 0, 0.6);
            } else if (fleeT < 2.5) {
              // 2. High-speed running sprint off the track
              const fleeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                fleeHeading,
              );

              const runCycle = (fleeT - 0.35) * 14.0;
              if (ud.legL) ud.legL.rotation.x = Math.sin(runCycle) * 0.75;
              if (ud.lowerLegL)
                ud.lowerLegL.rotation.x = -Math.max(
                  0.15,
                  -Math.sin(runCycle) * 1.1,
                );
              if (ud.legR) ud.legR.rotation.x = -Math.sin(runCycle) * 0.75;
              if (ud.lowerLegR)
                ud.lowerLegR.rotation.x = -Math.max(
                  0.15,
                  Math.sin(runCycle) * 1.1,
                );

              if (ud.armL) ud.armL.rotation.x = -Math.sin(runCycle) * 0.85;
              if (ud.forearmL) ud.forearmL.rotation.x = -1.4;
              if (ud.armR) ud.armR.rotation.x = Math.sin(runCycle) * 0.85;
              if (ud.forearmR) ud.forearmR.rotation.x = -1.4;
              if (ud.torsoGroup) ud.torsoGroup.rotation.x = 0.26;
              if (ud.headGroup) ud.headGroup.rotation.x = 0.08;
            } else {
              // 3. Safe on the grassy shoulder, turning to watch the train pass safely
              const safeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                safeHeading,
              );
              if (ud.headGroup) {
                ud.headGroup.rotation.y = -fleeDir * 0.8;
                ud.headGroup.rotation.x = -0.1;
              }
              if (ud.armL) ud.armL.rotation.set(0.1, 0, -0.15);
              if (ud.armR) ud.armR.rotation.set(0.1, 0, 0.15);
              if (ud.legL) ud.legL.rotation.set(0, 0, 0);
              if (ud.legR) ud.legR.rotation.set(0, 0, 0);
              if (ud.lowerLegL) ud.lowerLegL.rotation.set(0, 0, 0);
              if (ud.lowerLegR) ud.lowerLegR.rotation.set(0, 0, 0);
            }
          } else {
            // Human shocked but remains on track (frozen in shock) -> Scoop Net rescue!
            obs.isCleared = false;
            const basePos = transform.position.clone();
            if (obs.lateralOffset !== 0 && transform.normal) {
              basePos.add(
                transform.normal.clone().multiplyScalar(obs.lateralOffset),
              );
            }
            if (fleeT < 0.35) {
              basePos.y += Math.sin((fleeT / 0.35) * Math.PI) * 0.18;
            }
            obs.mesh.position.copy(basePos);

            const shiver = Math.sin(localT * 25.0) * 0.04;
            if (ud.headGroup) {
              ud.headGroup.rotation.set(
                -0.25 + shiver,
                Math.sin(localT * 8.0) * 0.08,
                0,
              );
            }
            if (ud.torsoGroup) {
              ud.torsoGroup.rotation.x = -0.15 + shiver;
              ud.torsoGroup.rotation.z = Math.sin(localT * 12.0) * 0.03;
            }
            if (ud.armL)
              ud.armL.rotation.set(
                -0.75 + Math.sin(localT * 14.0) * 0.1,
                0,
                -0.25,
              );
            if (ud.forearmL) ud.forearmL.rotation.x = -1.2;
            if (ud.armR)
              ud.armR.rotation.set(
                -0.65 + Math.sin(localT * 8.0) * 0.08,
                0,
                0.25,
              );
            if (ud.forearmR) ud.forearmR.rotation.x = -1.1;
            if (ud.legL) ud.legL.rotation.x = 0.38 + shiver * 0.5;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.65;
            if (ud.legR) ud.legR.rotation.x = 0.3 - shiver * 0.5;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.55;
          }
          return;
        }

        // E. Living Biomechanical Animations for the 4 Distinct Scenarios
        const breath = Math.sin(localT * 2.2);
        if (ud.torsoGroup) {
          ud.torsoGroup.scale.set(
            1.0 + 0.015 * breath,
            1.0 + 0.008 * breath,
            1.0 + 0.015 * breath,
          );
        }

        const pose = obs.humanPose;

        if (pose === "enter" || pose === 1) {
          // SCENARIO 1: ENTER ON TRACK (Runner stepping/running over elevated rail)
          const stepRhythm = localT * 2.2;
          const sway = Math.sin(stepRhythm);

          // Lead leg (Left): high knee drive stepping over the rail
          if (ud.legL) ud.legL.rotation.x = 0.62 + sway * 0.08;
          if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.80 + Math.cos(stepRhythm) * 0.06;

          // Trailing leg (Right): driving off the outer ground
          if (ud.legR) ud.legR.rotation.x = -0.42 - sway * 0.06;
          if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.25 - Math.sin(stepRhythm) * 0.04;

          // Torso running lean & bob
          if (ud.torsoGroup) {
            ud.torsoGroup.position.y = 0.94 + Math.abs(sway) * 0.015;
            ud.torsoGroup.rotation.x = 0.20 + sway * 0.03;
            ud.torsoGroup.rotation.z = -0.04 + sway * 0.02;
          }

          // Arms running pump with 90-degree bent elbows
          if (ud.armR) ud.armR.rotation.x = 0.65 + sway * 0.12;
          if (ud.forearmR) ud.forearmR.rotation.x = -1.42;
          if (ud.armL) ud.armL.rotation.x = -0.70 - sway * 0.12;
          if (ud.forearmL) ud.forearmL.rotation.x = -1.32;

          // Head glance
          if (isTrainClose) {
            if (ud.headGroup) ud.headGroup.rotation.set(0.04, -0.65, 0);
          } else {
            if (ud.headGroup)
              ud.headGroup.rotation.set(
                0.08,
                0.22 + Math.sin(localT * 0.8) * 0.1,
                0,
              );
          }
        } else if (pose === "exit" || pose === 2) {
          // SCENARIO 2: EXIT TO TRACK (Runner leaping/running off rail toward ground)
          const stepRhythm = localT * 2.2;
          const sway = Math.sin(stepRhythm);

          // Outside lead leg (Right): driving forward
          if (ud.legR) ud.legR.rotation.x = 0.58 + sway * 0.08;
          if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.75 + Math.cos(stepRhythm) * 0.06;

          // Inside trailing leg (Left): pushing off rail
          if (ud.legL) ud.legL.rotation.x = -0.45 - sway * 0.06;
          if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.28 - Math.sin(stepRhythm) * 0.04;

          // Torso running lean
          if (ud.torsoGroup) {
            ud.torsoGroup.position.y = 0.94 + Math.abs(sway) * 0.015;
            ud.torsoGroup.rotation.x = 0.22 + sway * 0.03;
            ud.torsoGroup.rotation.z = 0.06 + sway * 0.02;
          }

          // Arms running pump
          if (ud.armL) ud.armL.rotation.x = 0.60 + sway * 0.12;
          if (ud.forearmL) ud.forearmL.rotation.x = -1.38;
          if (ud.armR) ud.armR.rotation.x = -0.68 - sway * 0.12;
          if (ud.forearmR) ud.forearmR.rotation.x = -1.30;

          if (isTrainClose) {
            if (ud.headGroup) ud.headGroup.rotation.set(0.04, -0.75, 0);
          } else {
            if (ud.headGroup)
              ud.headGroup.rotation.set(
                0.08,
                -0.30 + Math.sin(localT * 0.8) * 0.1,
                0,
              );
          }
        } else if (pose === "sudden" || pose === 4) {
          // SCENARIO 4: SUDDEN EMERGENCE DASH (High-speed running sprint across track)
          const sprintCycle = localT * 12.0;
          const legDrive = Math.sin(sprintCycle) * 0.75;

          if (ud.legR) ud.legR.rotation.x = legDrive;
          if (ud.lowerLegR) ud.lowerLegR.rotation.x = -Math.max(0.15, legDrive * 1.2);
          if (ud.legL) ud.legL.rotation.x = -legDrive;
          if (ud.lowerLegL) ud.lowerLegL.rotation.x = -Math.max(0.15, -legDrive * 1.2);

          // Arms pumping in rapid sprint opposition
          if (ud.armL) ud.armL.rotation.set(-legDrive * 0.9, 0, -0.15);
          if (ud.forearmL) ud.forearmL.rotation.x = -1.45;
          if (ud.armR) ud.armR.rotation.set(legDrive * 0.9, 0, 0.15);
          if (ud.forearmR) ud.forearmR.rotation.x = -1.35;

          if (ud.torsoGroup) {
            ud.torsoGroup.rotation.x = 0.28 + Math.abs(Math.sin(sprintCycle)) * 0.04;
            ud.torsoGroup.position.y = 0.94 + Math.abs(Math.sin(sprintCycle)) * 0.02;
          }
          if (ud.headGroup) ud.headGroup.rotation.set(0.10, 0, 0);
        } else {
          // SCENARIO 3: MID-TRACK (The iconic running stride of Image 2)
          const runCycle = localT * 2.0;
          const bob = Math.sin(runCycle);

          if (!isTrainClose) {
            // Elegant runner stride in motion matching Image 2
            if (ud.legR) ud.legR.rotation.x = 0.68 + bob * 0.06;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.85 + Math.cos(runCycle) * 0.05;
            if (ud.legL) ud.legL.rotation.x = -0.48 - bob * 0.05;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.35 - Math.sin(runCycle) * 0.04;

            if (ud.armL) ud.armL.rotation.x = 0.65 + bob * 0.08;
            if (ud.forearmL) ud.forearmL.rotation.x = -1.45;
            if (ud.armR) ud.armR.rotation.x = -0.75 - bob * 0.08;
            if (ud.forearmR) ud.forearmR.rotation.x = -1.35;

            if (ud.torsoGroup) {
              ud.torsoGroup.rotation.x = 0.26 + bob * 0.02;
              ud.torsoGroup.position.y = 0.94 + Math.abs(bob) * 0.015;
            }
            if (ud.headGroup) {
              ud.headGroup.rotation.set(
                0.06,
                Math.sin(localT * 0.5) * 0.15,
                0,
              );
            }
          } else {
            // Alarmed: sprint to escape!
            const panicSprint = localT * 14.0;
            const panicDrive = Math.sin(panicSprint) * 0.85;

            if (ud.legR) ud.legR.rotation.x = panicDrive;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -Math.max(0.2, panicDrive * 1.3);
            if (ud.legL) ud.legL.rotation.x = -panicDrive;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -Math.max(0.2, -panicDrive * 1.3);

            if (ud.armL) ud.armL.rotation.set(-panicDrive, 0, -0.2);
            if (ud.forearmL) ud.forearmL.rotation.x = -1.5;
            if (ud.armR) ud.armR.rotation.set(panicDrive, 0, 0.2);
            if (ud.forearmR) ud.forearmR.rotation.x = -1.4;

            if (ud.torsoGroup) ud.torsoGroup.rotation.x = 0.32;
            if (ud.headGroup) ud.headGroup.rotation.set(0.12, 0, 0);
          }
        }
      } else if (["dog", "deer", "cow", "elephant", "boar"].includes(ud.type)) {
        // Living Organic Animations for Quadruped Animals
        const seed = obs.id * 3.1;
        const localT = t + seed;

        // A. Sudden Emergence Dash into track
        if (obs.isSuddenEmerging) {
          obs.suddenTimer = (obs.suddenTimer || 0) + dt;
          const duration = 0.52;
          const p = Math.min(1.0, obs.suddenTimer / duration);
          const easeP = Math.sin(p * Math.PI * 0.5);
          const curOffset = THREE.MathUtils.lerp(
            obs.startLateralOffset || 3.0,
            0.0,
            easeP,
          );
          obs.lateralOffset = curOffset;

          const transform = this.track.getTrackTransform(obs.progress, 0);
          const normal = transform.normal
            ? transform.normal.clone()
            : new THREE.Vector3(1, 0, 0);
          obs.mesh.position
            .copy(transform.position)
            .add(normal.multiplyScalar(curOffset));

          if (p < 1.0) {
            const speedScale =
              ud.type === "dog"
                ? 22.0
                : ud.type === "deer"
                  ? 18.0
                  : ud.type === "cow"
                    ? 14.0
                    : 8.0;
            const runCycle = obs.suddenTimer * speedScale;
            if (ud.legs) {
              if (ud.legs.legFL)
                ud.legs.legFL.rotation.x = Math.sin(runCycle) * 0.6;
              if (ud.legs.legBR)
                ud.legs.legBR.rotation.x = Math.sin(runCycle) * 0.6;
              if (ud.legs.legFR)
                ud.legs.legFR.rotation.x = -Math.sin(runCycle) * 0.6;
              if (ud.legs.legBL)
                ud.legs.legBL.rotation.x = -Math.sin(runCycle) * 0.6;
            }
          } else {
            obs.isSuddenEmerging = false;
            obs.mesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              transform.tangent,
            );
            obs.mesh.rotateY(Math.PI * 0.75); // Turn to face incoming track
            if (ud.legs) {
              Object.values(ud.legs).forEach((l) => {
                if (l) l.rotation.x = 0;
              });
            }
          }
          return;
        }

        // B. Coach Side Proximity Repulsion (When shocked by Coach Side Power Source within 2-3m)
        if (obs.isSideRepelled && obs.sideRepelDir) {
          const repelT = this.animTime - obs.sideRepelStartTime;
          const pushSpeed = Math.max(3.8, 6.4 - Math.min(2.5, (obs.mass || 100) / 800));
          obs.mesh.position.add(
            obs.sideRepelDir.clone().multiplyScalar(pushSpeed * dt),
          );

          if (repelT < 0.35) {
            obs.mesh.position.y += Math.sin((repelT / 0.35) * Math.PI) * 0.28;
            if (ud.headGroup) ud.headGroup.rotation.y = (Math.random() - 0.5) * 0.4;
            if (ud.trunk) ud.trunk.rotation.x = -0.65;
            if (ud.tail) ud.tail.rotation.z = Math.sin(this.animTime * 15) * 0.6;
          } else {
            obs.mesh.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              obs.sideRepelDir,
            );
            const speedScale =
              ud.type === "dog"
                ? 24.0
                : ud.type === "deer"
                  ? 20.0
                  : ud.type === "cow"
                    ? 14.0
                    : 10.0;
            const runCycle = (this.animTime * speedScale) % (Math.PI * 2);
            if (ud.legs) {
              if (ud.legs.legFL)
                ud.legs.legFL.rotation.x = Math.sin(runCycle) * 0.75;
              if (ud.legs.legBR)
                ud.legs.legBR.rotation.x = Math.sin(runCycle) * 0.75;
              if (ud.legs.legFR)
                ud.legs.legFR.rotation.x = -Math.sin(runCycle) * 0.75;
              if (ud.legs.legBL)
                ud.legs.legBL.rotation.x = -Math.sin(runCycle) * 0.75;
            }
          }

          if (repelT > 1.6) {
            obs.isSideRepelled = false;
            obs.isCleared = true;
          }
          return;
        }

        // C. Electric Shock Reaction & Fleeing Off Track
        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;
          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(
            -tangent.z,
            0,
            tangent.x,
          ).normalize();

          if (obs.moveOffTrackOnShock) {
            const fleeDist = Math.min(6.8, fleeT * 5.0);
            const lateralPos = transform.position
              .clone()
              .add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(
              0.05,
              transform.position.y - Math.min(0.28, fleeDist * 0.08),
            );
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.8) {
              obs.isCleared = true;
            }

            if (fleeT < 0.35) {
              obs.mesh.position.y += Math.sin((fleeT / 0.35) * Math.PI) * 0.25;
              if (ud.headGroup) ud.headGroup.rotation.y = -fleeDir * 0.4;
            } else if (fleeT < 2.5) {
              const fleeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(
                new THREE.Vector3(0, 0, 1),
                fleeHeading,
              );

              const runCycle =
                (fleeT - 0.35) *
                (ud.type === "dog" ? 24.0 : ud.type === "deer" ? 20.0 : 12.0);
              if (ud.legs) {
                if (ud.legs.legFL)
                  ud.legs.legFL.rotation.x = Math.sin(runCycle) * 0.75;
                if (ud.legs.legBR)
                  ud.legs.legBR.rotation.x = Math.sin(runCycle) * 0.75;
                if (ud.legs.legFR)
                  ud.legs.legFR.rotation.x = -Math.sin(runCycle) * 0.75;
                if (ud.legs.legBL)
                  ud.legs.legBL.rotation.x = -Math.sin(runCycle) * 0.75;
              }
            } else {
              if (ud.legs) {
                Object.values(ud.legs).forEach((l) => {
                  if (l) l.rotation.x = 0;
                });
              }
            }
          }
          return;
        }

        // C. Ambient Idle Animations (Breathing, Tail, Ears, Trunk)
        if (ud.type === "dog") {
          if (ud.tail) ud.tail.rotation.y = Math.sin(localT * 8.0) * 0.35;
          if (ud.headGroup)
            ud.headGroup.rotation.y = Math.sin(localT * 1.5) * 0.2;
          if (isTrainClose && ud.headGroup) ud.headGroup.rotation.x = -0.25;
        } else if (ud.type === "deer") {
          if (ud.headGroup) {
            ud.headGroup.rotation.set(0.04, Math.sin(localT * 0.8) * 0.25, 0);
          }
        } else if (ud.type === "cow") {
          if (ud.tail) ud.tail.rotation.z = Math.sin(localT * 2.2) * 0.4;
          if (ud.headGroup) {
            ud.headGroup.rotation.set(
              Math.sin(localT * 1.2) * 0.08,
              Math.sin(localT * 0.6) * 0.12,
              0,
            );
          }
        } else if (ud.type === "elephant") {
          if (ud.trunk) {
            ud.trunk.rotation.x = -0.28 + Math.sin(localT * 1.2) * 0.25;
            ud.trunk.rotation.z = Math.sin(localT * 0.9) * 0.1;
          }
          if (ud.earL) ud.earL.rotation.y = 0.45 + Math.sin(localT * 1.0) * 0.2;
          if (ud.earR)
            ud.earR.rotation.y = -0.45 - Math.sin(localT * 1.0) * 0.2;
          if (ud.headGroup) {
            ud.headGroup.rotation.y = Math.sin(localT * 0.5) * 0.1;
          }
        }
      }
    });
  }

  updateDeterrenceFX(dt) {
    if (this.fxTimer > 0) {
      this.fxTimer -= dt;
      const progress = Math.max(0, this.fxTimer / 1.2);

      if (this.train && this.train.pulseShockEmitters) {
        this.train.pulseShockEmitters(progress, this.activePowerSourceIndices);
      }
      if (this.activeCoachIndex !== undefined && this.activeCoachIndex !== null) {
        if (this.train && this.train.pulseCoachSideEmitters) {
          this.train.pulseCoachSideEmitters(this.activeCoachIndex, this.activeCoachSide, progress);
        }
      }

      const tempStart = new THREE.Vector3();
      const tempEnd = new THREE.Vector3();

      this.fxGroup.children.forEach((child) => {
        if (child.userData && child.userData.isShockwaveRing) {
          const ud = child.userData;
          const p = Math.min(1.0, Math.max(0, 1.0 - (this.fxTimer / 0.85)));
          const ringScale = 0.3 + p * 3.8;
          child.scale.set(ringScale, ringScale, ringScale);
          if (child.material) {
            child.material.opacity = Math.max(0, (1.0 - p) * 0.95);
          }
          child.position.copy(ud.origin).lerp(ud.target, p * 0.85);
        } else if (child.isLine && child.userData.isLightning) {
          const ud = child.userData;
          if (ud.emitterTip) {
            ud.emitterTip.getWorldPosition(tempStart);
          } else {
            tempStart.copy(ud.fallbackOrigin);
          }

          if (ud.obs && ud.obs.mesh) {
            ud.obs.mesh.getWorldPosition(tempEnd);
            tempEnd.add(ud.targetOffset);
          }

          const posAttr = child.geometry.attributes.position;
          const arr = posAttr.array;
          const segs = ud.segs || 16;
          const dist = tempStart.distanceTo(tempEnd);
          const jitterAmp =
            Math.min(1.2, Math.max(0.18, dist * 0.015)) * progress;

          for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const p = tempStart.clone().lerp(tempEnd, t);
            if (i > 0 && i < segs) {
              const envelope = Math.sin(t * Math.PI);
              p.x += (Math.random() - 0.5) * jitterAmp * envelope;
              p.y += (Math.random() - 0.5) * jitterAmp * 0.75 * envelope;
              p.z += (Math.random() - 0.5) * jitterAmp * envelope;
            }
            arr[i * 3] = p.x;
            arr[i * 3 + 1] = p.y;
            arr[i * 3 + 2] = p.z;
          }
          posAttr.needsUpdate = true;
          child.material.opacity = 0.95 * progress;
        } else if (child.isPointLight) {
          if (child.userData.isNozzleFlare && child.userData.emitterTip) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 4.0 : 1.5) * progress;
          } else if (
            child.userData.isSideNozzleFlare &&
            child.userData.emitterTip
          ) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 5.0 : 2.0) * progress;
          } else if (
            child.userData.isSideTargetLight &&
            child.userData.obs &&
            child.userData.obs.mesh
          ) {
            child.userData.obs.mesh
              .getWorldPosition(child.position)
              .add(child.userData.targetOffset);
            child.intensity = (Math.random() > 0.2 ? 6.0 : 2.0) * progress;
          } else {
            child.intensity = (Math.random() > 0.2 ? 7.5 : 2.0) * progress;
          }
        }
      });

      if (this.fxTimer <= 0) {
        this.activeCoachIndex = null;
        this.activeCoachSide = null;
        if (this.train && this.train.pulseShockEmitters) {
          this.train.pulseShockEmitters(0);
        }
        if (this.train && this.train.pulseCoachSideEmitters) {
          this.train.pulseCoachSideEmitters(null, "all", 0);
        }
        this.activePowerSourceIndices = null;
        while (this.fxGroup.children.length > 0) {
          const c = this.fxGroup.children[0];
          if (c.geometry) c.geometry.dispose();
          this.fxGroup.remove(c);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Main Obstacle & Safety Recovery Frame Update
  // ------------------------------------------------------------------
  update(
    dt,
    trainProgress,
    trainSpeedMs,
    captureNet,
    audio,
    physics,
    trackLength,
    aiSensorAuto = true,
    train = null,
  ) {
    if (train) this.train = train;

    let closestObstacle = null;
    let minForwardDist = Infinity;
    const actualTrackLength =
      trackLength || (this.track && this.track.totalLength) || 3600;

    // Evaluate distance to each obstacle ahead of train
    this.obstacles.forEach((obs) => {
      if (obs.isCollected) return;

      let forwardProgress = obs.progress - trainProgress;
      if (forwardProgress < -0.5) forwardProgress += 1.0;
      if (forwardProgress > 0.5) forwardProgress -= 1.0;

      const forwardMeters = forwardProgress * actualTrackLength;
      obs.forwardMeters = forwardMeters;

      if (
        forwardMeters > 0 &&
        forwardMeters <= 1000 &&
        forwardMeters < minForwardDist
      ) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    if (this.obstacles.length > 0) {
      this.animateLivingObstacles(dt, trainSpeedMs);
    }

    if (this.fxTimer > 0) {
      this.updateDeterrenceFX(dt);
    }

    this.checkCoachSideProximity(this.train, audio);

    if (closestObstacle && minForwardDist <= 1000) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;
      this.telemetry.mass = closestObstacle.mass;

      const tailored = this.getTailoredShockSpecs(closestObstacle);
      const isSudden =
        closestObstacle.isSuddenScenario ||
        closestObstacle.humanPose === "sudden" ||
        closestObstacle.humanPose === 4 ||
        closestObstacle.isSuddenEmerging;
      const isUnder150kg = closestObstacle.mass <= 150;
      this.telemetry.canCollect = isUnder150kg;

      if (isSudden) {
        // ===================================================================
        // SCENARIO RULE 1: SUDDEN APPEARANCE (DISTANCE 80M - 0M)
        // - NO ELECTRICITY FOR THIS SCENARIO
        // - CAPTURE NET WILL OPEN ONLY FOR MAX 150KG, OTHERWISE NOT
        // ===================================================================
        if (minForwardDist <= 80) {
          if (isUnder150kg) {
            // Under/Equal 150kg: Capture Net opens! No electricity.
            this.telemetry.tailoredSpec =
              "🪤 NET OPEN (≤150KG) • NO ELECTRICITY";
            this.telemetry.tailoredLabel = "SUDDEN 80M-0M CAPTURE NET";

            if (aiSensorAuto && captureNet && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
            }

            if (minForwardDist <= 14.0) {
              // Capture and scoop into net cradle
              if (closestObstacle.mesh && closestObstacle.mesh.parent) {
                closestObstacle.mesh.parent.remove(closestObstacle.mesh);
              }
              if (captureNet)
                captureNet.collectObstacle(
                  closestObstacle.mesh,
                  closestObstacle,
                );
              closestObstacle.isCollected = true;
              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG ≤ 150KG) — RESCUE SUCCESS!`;
              this.telemetry.alertType = "success";
            } else {
              this.telemetry.action = `🪤 SUDDEN APPEARANCE (${Math.round(minForwardDist)}M): CAPTURE NET OPEN (${closestObstacle.mass}KG ≤ 150KG) — NO ELECTRICITY!`;
              this.telemetry.alertType = "deploy";
            }
          } else {
            // OVER 150KG: Capture Net CANNOT open! Net stays stowed/retracted!
            if (captureNet && captureNet.isDeployed) {
              captureNet.setDeployed(false);
            }
            // NO ELECTRICITY for sudden scenario
            // Emergency brake engaged immediately
            if (physics && !physics.emergencyBrake) {
              physics.setEmergencyBrake(true);
            }
            if (audio) {
              audio.startHorn();
            }
            this.telemetry.tailoredSpec =
              "⚠️ NET LOCKED (>150KG) • NO ELECTRICITY";
            this.telemetry.tailoredLabel = "OVERLOAD HAZARD (>150KG)";
            this.telemetry.action = `⚠️ SUDDEN HAZARD: WEIGHT ${closestObstacle.mass}KG > 150KG (NET LOCKED) — NO ELECTRICITY — EMERGENCY BRAKE ENGAGED!`;
            this.telemetry.alertType = "hazard";
          }
        } else {
          // Approaching 80m sudden zone
          this.telemetry.tailoredSpec = isUnder150kg
            ? "NET ARMED (80M-0M)"
            : "EMERGENCY BRAKE ARMED (>150KG)";
          this.telemetry.tailoredLabel = "SUDDEN INTRUSION";
          this.telemetry.action = `⚡ SCAN: SUDDEN ${closestObstacle.name.toUpperCase()} AT ${Math.round(minForwardDist)}M — NET ARMED (OPENS AT 80M IF ≤150KG, NO ELECTRICITY)`;
          this.telemetry.alertType = "info";
        }
      } else {
        // ===================================================================
        // SCENARIO RULE 2: OTHER SCENARIOS (DISTANCE 800M - 80M)
        // - USE ONLY ELECTRICITY FOR ALL
        // - ELECTRICITY STARTS FROM 800M TO 80M
        // - NO CAPTURE NET IN 800M-80M ZONE
        // ===================================================================
        // Net must remain retracted between 800m and 80m
        if (captureNet && captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }

        if (closestObstacle.isCleared) {
          this.telemetry.tailoredSpec = "TARGET MOVED OFF TRACK";
          this.telemetry.tailoredLabel = "TRACK CLEAR";
          this.telemetry.action = `✅ TARGET MOVED OFF TRACK VIA ELECTRIC SHOCK (800M-80M) — TRACK CLEAR (NO NET)`;
          this.telemetry.alertType = "success";
        } else if (minForwardDist <= 800 && minForwardDist >= 80) {
          // Inside 800m - 80m: USE ONLY ELECTRICITY!
          this.telemetry.tailoredSpec = `${tailored.badge} (800M-80M ONLY ELECTRICITY)`;
          this.telemetry.tailoredLabel = tailored.typeLabel;

          const shouldAutoShock =
            aiSensorAuto && !closestObstacle.hasBeenShocked;
          if (shouldAutoShock) {
            this.triggerDeterrence(closestObstacle, audio, this.train);
            if (audio) audio.playTargetAcquiredBeep(false);
            this.telemetry.alertType = "deploy";
            this.telemetry.alertMessage = `⚡ 800M-80M ONLY ELECTRICITY: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) AT ${Math.round(minForwardDist)}M! ${tailored.powerSourcesCount}X POWER SOURCE(S) FIRING ELECTRIC SHOCK!`;
          }

          this.telemetry.action = `⚡ 800M-80M ONLY ELECTRICITY ACTIVE: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) — NON-LETHAL PULSE DELIVERED (NO NET)`;
          this.telemetry.alertType = closestObstacle.hasBeenShocked
            ? "deploy"
            : "info";
        } else if (minForwardDist < 80) {
          // Target did not move off track and train reaches < 80m:
          if (isUnder150kg) {
            if (minForwardDist <= 40) {
              if (aiSensorAuto && captureNet && !captureNet.isDeployed) {
                captureNet.triggerSolenoidDeploy(audio);
              }
              if (minForwardDist <= 14.0) {
                if (closestObstacle.mesh && closestObstacle.mesh.parent) {
                  closestObstacle.mesh.parent.remove(closestObstacle.mesh);
                }
                if (captureNet)
                  captureNet.collectObstacle(
                    closestObstacle.mesh,
                    closestObstacle,
                  );
                closestObstacle.isCollected = true;
                if (audio) audio.playRescueSuccessChime();
                this.telemetry.collectedCount++;
                this.telemetry.collectedWeight += closestObstacle.mass;
                this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG) — RESCUE SUCCESS!`;
                this.telemetry.alertType = "success";
              } else {
                this.telemetry.action = `🪤 TARGET STILL ON TRACK (<80M) — BACKUP CAPTURE NET DEPLOYED (${closestObstacle.mass}KG ≤ 150KG)`;
                this.telemetry.alertType = "deploy";
              }
            } else {
              this.telemetry.action = `⚡ 800M-80M SHOCK FIRED — TARGET APPROACHING 40M: NET READY (${closestObstacle.mass}KG ≤ 150KG)`;
              this.telemetry.alertType = "deploy";
            }
          } else {
            // Over 150kg: Net NEVER opens!
            if (captureNet && captureNet.isDeployed) {
              captureNet.setDeployed(false);
            }
            if (physics && !physics.emergencyBrake) {
              physics.setEmergencyBrake(true);
            }
            if (audio) audio.startHorn();
            this.telemetry.action = `⚠️ HEAVY OBSTACLE STILL ON TRACK (<80M) — ${closestObstacle.mass}KG > 150KG: NET LOCKED! EMERGENCY BRAKE ENGAGED`;
            this.telemetry.alertType = "hazard";
          }
        } else {
          // minForwardDist > 800m
          this.telemetry.tailoredSpec = `${tailored.badge} (SCAN 1KM)`;
          this.telemetry.tailoredLabel = tailored.typeLabel;
          this.telemetry.action = `📡 1KM SCAN: ${closestObstacle.name.toUpperCase()} AT ${Math.round(minForwardDist)}M — ELECTRICITY STARTS AT 800M`;
          this.telemetry.alertType = "info";
        }
      }
    } else {
      this.telemetry.targetDetected = false;
      this.telemetry.type = null;
      this.telemetry.name = "NONE (TRACK CLEAR)";
      this.telemetry.distance = null;
      this.telemetry.mass = null;
      this.telemetry.tailoredSpec = "STANDBY (1 km)";
      this.telemetry.tailoredLabel = "CLEAR LINE";
      this.telemetry.canCollect = false;
      this.telemetry.action =
        "TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)";
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = "info";

      if (
        captureNet &&
        captureNet.isDeployed &&
        captureNet.collectedList.length === 0
      ) {
        captureNet.setDeployed(false);
      }
    }

    return this.telemetry;
  }

  resetCollected(captureNet) {
    if (captureNet) {
      captureNet.clearCradle();
    }
    this.telemetry.collectedCount = 0;
    this.telemetry.collectedWeight = 0;
  }
}
