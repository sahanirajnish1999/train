// ====================================================================
// Indian Railways Real-Time AI Obstacle & Safety Recovery System
// Detects: Humans (Track Workers/Pedestrians), Animals (Stray Wildlife),
// Heavy Cattle (Bulls > 150kg), and Track Debris
// Interacts directly with the ObstacleCaptureNet AI Safety Controller:
// - If Mass <= 150 kg: Deploys inflatable capture net & safely scoops into cradle
// - If Mass > 150 kg: Commands emergency braking + horn (Overweight hazard)
// ====================================================================

import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.obstacles = [];
    this.nextId = 1;

    // Active Non-Lethal Electric Shock Suite (Track Clearance)
    this.activeDeterrenceMode = 'electric_shock';
    this.deterrenceSpecs = {
      electric_shock: {
        id: 'electric_shock',
        name: 'Track Electric Shock (Non-Lethal Track Clearance)',
        shortTitle: 'TRACK ELECTRIC SHOCK',
        badge: 'E-SHOCK PULSE',
        color: '#38bdf8',
        detail: 'Discharges non-lethal pulsed electrical gradient across track rails and forward contact sweepers (compliant with IEC 60335-2-76 / RDSO). Prompts immediate flight off track without burns or physical injury.'
      }
    };

    // 3D Visual Effects Group for Active Deterrence Discharges
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
    this.activeFX = null;
    this.fxTimer = 0;

    // Detection telemetry fed to HUD and Safety Controller
    this.telemetry = {
      targetDetected: false,
      type: null,
      name: 'NONE (TRACK CLEAR)',
      distance: null,
      mass: null,
      tailoredSpec: null,
      tailoredLabel: null,
      canCollect: false,
      action: 'STANDBY',
      alertMessage: null,
      alertType: 'info', // 'info' | 'deploy' | 'hazard' | 'success'
      collectedCount: 0,
      collectedWeight: 0,
      deterrenceActive: false,
      deterrenceMode: 'electric_shock'
    };

    this.animTime = 0;

    // High-Fidelity Anatomical & Industrial Obstacle Materials
    this.materials = {
      // Modern Stylized Human Character Materials (Exact match to media_1793819995371_c74a70f7.png)
      humanSkinPeach: new THREE.MeshStandardMaterial({ color: 0xfcc7a7, roughness: 0.62 }), // Warm peach skin tone
      humanSkinShadow: new THREE.MeshStandardMaterial({ color: 0xebad8b, roughness: 0.68 }),
      humanBlush: new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55, transparent: true, opacity: 0.85 }), // Rosy blush cheeks
      humanHairGinger: new THREE.MeshStandardMaterial({ color: 0xd9572b, roughness: 0.78 }), // Auburn / ginger swept quiff hair
      humanEyesWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      humanEyesIris: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.2 }), // Deep dark friendly cartoon pupil
      humanEyeReflex: new THREE.MeshBasicMaterial({ color: 0xffffff }), // Specular catchlight dot
      humanBrow: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.7 }), // Arched brows
      humanSmile: new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.6 }), // Sweet curved mouth
      humanPoloCream: new THREE.MeshStandardMaterial({ color: 0xf4eee4, roughness: 0.72 }), // Beige / cream polo shirt
      humanPoloCollar: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), // Crisp white folded collar
      humanPantsBrown: new THREE.MeshStandardMaterial({ color: 0x784a32, roughness: 0.75 }), // Tailored warm brown chinos
      humanShoesDark: new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.65 }), // Dark casual loafers

      // Indian Elephant Materials (Exact match to media_1793820037213_e448b2e7.jpg)
      elephantSkin: new THREE.MeshStandardMaterial({ color: 0x606f7b, roughness: 0.70 }), // Natural slate grey-blue body skin
      elephantSkinDark: new THREE.MeshStandardMaterial({ color: 0x45525c, roughness: 0.75 }), // Dark contour accents & creases
      elephantEarInner: new THREE.MeshStandardMaterial({ color: 0x566570, roughness: 0.78 }), // Ear contour / inner face
      elephantTusk: new THREE.MeshStandardMaterial({ color: 0xfffae5, roughness: 0.28, metalness: 0.05 }), // Smooth ivory tusks
      elephantTuskTip: new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.32 }), // Warm golden tusk tip
      elephantNails: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.38 }), // Cute yellow toenails per foot
      elephantEyeWhite: new THREE.MeshBasicMaterial({ color: 0xf8fafc }), // Big cartoon white sclera
      elephantEyePupil: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.15 }), // Deep dark cartoon pupil
      elephantEyeCatchlight: new THREE.MeshBasicMaterial({ color: 0xffffff }), // Eye specular highlight
      elephantSmile: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 }), // Curved smile line
      elephantTailBrush: new THREE.MeshStandardMaterial({ color: 0x22323d, roughness: 0.85 }), // Dark brush tuft

      // Legacy Trackman / Industrial Materials
      humanSkin: new THREE.MeshStandardMaterial({ color: 0xbd7b54, roughness: 0.72 }),
      humanShirt: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 }),
      humanVest: new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.45 }),
      humanVestTrim: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.6 }),
      humanReflective: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.5 }),
      humanPants: new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.75 }),
      humanBoots: new THREE.MeshStandardMaterial({ color: 0x2e2017, roughness: 0.52 }),
      bootSole: new THREE.MeshStandardMaterial({ color: 0x111215, roughness: 0.95 }),
      humanBelt: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.75 }),
      leatherGlove: new THREE.MeshStandardMaterial({ color: 0x483222, roughness: 0.65 }),
      helmetYellow: new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.22, metalness: 0.1 }),
      radioPlastic: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 }),
      darkHousing: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 }),
      glassLens: new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.05, transmission: 0.85, thickness: 0.1 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.88 }),

      // Wildlife / Spotted Deer / Calf Materials
      animalFur: new THREE.MeshStandardMaterial({ color: 0xb85d19, roughness: 0.74 }),
      animalFurDark: new THREE.MeshStandardMaterial({ color: 0x7c340a, roughness: 0.78 }),
      animalUnderbelly: new THREE.MeshStandardMaterial({ color: 0xfdf6e2, roughness: 0.82 }),
      animalSpot: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.88 }),
      animalMuzzle: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.35 }),
      animalEyeWhite: new THREE.MeshBasicMaterial({ color: 0xe2e8f0 }),
      animalEye: new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.08, metalness: 0.1 }),
      animalEyeReflex: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      animalEarInner: new THREE.MeshStandardMaterial({ color: 0xdfa394, roughness: 0.85 }),
      animalAntler: new THREE.MeshStandardMaterial({ color: 0xd6c2a4, roughness: 0.45 }),
      animalHoof: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.75 }), // Dark cloven hooves

      // Heavy Cattle & Debris Materials
      cattleHide: new THREE.MeshStandardMaterial({ color: 0x948b7e, roughness: 0.72 }), // Authentic Indian Desi Zebu Dun Hide
      cattleDark: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 }),
      cattleHorn: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.35, metalness: 0.08 }),
      cattleEye: new THREE.MeshBasicMaterial({ color: 0x09090b }),
      woodCrate: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }), // Weathered Railway Teak Wood
      industrialSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 }),
      hazardYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
    };

    // Spawn scenic track obstacles along the route
    this.initDefaultObstacles();
  }

  // ------------------------------------------------------------------
  // 3D Model Builders for Human, Animal, Heavy Cattle, Debris
  // ------------------------------------------------------------------

  // ------------------------------------------------------------------
  // Canvas Texture Generators for Living Expressive Facial Features
  // (Prevents disconnected geometric primitives, clipping, and z-fighting)
  // ------------------------------------------------------------------

  createHumanFaceTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const drawFace = (blinkFactor = 0) => {
      ctx.clearRect(0, 0, 1024, 1024);

      // Base skin tone (peach)
      ctx.fillStyle = '#fcd5ba';
      ctx.fillRect(0, 0, 1024, 1024);

      // Upper back / hair transition on sphere (Canvas Y < 320 represents top of head)
      const hairGrad = ctx.createLinearGradient(0, 180, 0, 320);
      hairGrad.addColorStop(0, '#d9572b');
      hairGrad.addColorStop(0.85, '#d9572b');
      hairGrad.addColorStop(1, 'rgba(217, 87, 43, 0)');
      ctx.fillStyle = hairGrad;
      ctx.fillRect(0, 0, 1024, 320);

      // Back of head hair coverage (sides of canvas map to back of head on sphere)
      ctx.fillStyle = '#d9572b';
      ctx.fillRect(0, 0, 160, 1024);
      ctx.fillRect(864, 0, 160, 1024);

      // Rosy Airbrushed Blush on Cheeks (Exact match to Reference Image 1)
      [-1, 1].forEach(side => {
        const cx = 512 + side * 115;
        const cy = 540;
        const grad = ctx.createRadialGradient(cx, cy, 10, cx, cy, 85);
        grad.addColorStop(0, 'rgba(244, 114, 182, 0.85)');
        grad.addColorStop(0.5, 'rgba(251, 113, 133, 0.40)');
        grad.addColorStop(1, 'rgba(252, 213, 186, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 85, 0, Math.PI * 2);
        ctx.fill();
      });

      // Expressive Cartoon Eyes with Specular Highlights & Blinking (Center at X=512, Y=460)
      [-1, 1].forEach(side => {
        const ex = 512 + side * 75;
        const ey = 460;
        const ew = 28;
        const eh = 38;

        // Clean white sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark Iris & Pupil
        ctx.fillStyle = '#1c1917';
        ctx.beginPath();
        ctx.ellipse(ex + side * 3, ey, ew * 0.72, eh * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Catchlight Highlight Dots
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + side * 3 + 8, ey - 10, 8.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + side * 3 - 8, ey + 10, 4.5, 0, Math.PI * 2);
        ctx.fill();

        // Dynamic Eyelid blink
        if (blinkFactor > 0.02) {
          ctx.fillStyle = '#fcd5ba';
          ctx.beginPath();
          const lidHeight = eh * 2 * blinkFactor;
          ctx.rect(ex - ew - 5, ey - eh - 5, (ew + 5) * 2, lidHeight);
          ctx.fill();

          // Eyelash line
          ctx.strokeStyle = '#27272a';
          ctx.lineWidth = 4;
          ctx.beginPath();
          ctx.moveTo(ex - ew, ey - eh + lidHeight);
          ctx.lineTo(ex + ew, ey - eh + lidHeight);
          ctx.stroke();
        }

        // Arched Gentle Eyebrow
        ctx.strokeStyle = '#27272a';
        ctx.lineWidth = 8;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - ew * 1.15, ey - eh - 16);
        ctx.quadraticCurveTo(ex, ey - eh - 32, ex + ew * 1.15, ey - eh - 14);
        ctx.stroke();
      });

      // Cute subtle peach nose button / contour
      ctx.strokeStyle = '#e09f7a';
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(512, 515, 14, 0.2 * Math.PI, 0.8 * Math.PI);
      ctx.stroke();

      // Sweet Friendly Smile Line
      ctx.strokeStyle = '#9a3412';
      ctx.lineWidth = 7;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(512, 565, 36, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.stroke();
    };

    drawFace(0);
    const tex = new THREE.CanvasTexture(canvas);
    return { tex, canvas, ctx, drawFace };
  }

  createElephantFaceTexture() {
    if (typeof document === 'undefined') return null;
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    const drawFace = (blinkFactor = 0) => {
      ctx.clearRect(0, 0, 1024, 1024);

      // Base slate blue-grey tone
      ctx.fillStyle = '#567b8d';
      ctx.fillRect(0, 0, 1024, 1024);

      // Expressive Cartoon Elephant Eyes matching Reference Image 2
      [-1, 1].forEach(side => {
        const ex = 512 + side * 125;
        const ey = 425;
        const ew = 48;
        const eh = 64;

        // White Sclera
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.ellipse(ex, ey, ew, eh, 0, 0, Math.PI * 2);
        ctx.fill();

        // Dark Iris / Pupil
        ctx.fillStyle = '#18181b';
        ctx.beginPath();
        ctx.ellipse(ex + side * 5, ey, ew * 0.72, eh * 0.82, 0, 0, Math.PI * 2);
        ctx.fill();

        // Specular Catchlight Highlights (Disney / Pixar cartoon style)
        ctx.fillStyle = '#ffffff';
        ctx.beginPath();
        ctx.arc(ex + side * 5 + 12, ey - 15, 12, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(ex + side * 5 - 12, ey + 15, 6.5, 0, Math.PI * 2);
        ctx.fill();

        // Eyelid on blink
        if (blinkFactor > 0.02) {
          ctx.fillStyle = '#567b8d';
          ctx.beginPath();
          const lidHeight = eh * 2 * blinkFactor;
          ctx.rect(ex - ew - 5, ey - eh - 5, (ew + 5) * 2, lidHeight);
          ctx.fill();

          ctx.strokeStyle = '#2d4554';
          ctx.lineWidth = 5;
          ctx.beginPath();
          ctx.moveTo(ex - ew, ey - eh + lidHeight);
          ctx.lineTo(ex + ew, ey - eh + lidHeight);
          ctx.stroke();
        }

        // Curved Friendly Eyebrow
        ctx.strokeStyle = '#1e293b';
        ctx.lineWidth = 9;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(ex - ew * 1.1, ey - eh - 18);
        ctx.quadraticCurveTo(ex, ey - eh - 36, ex + ew * 1.1, ey - eh - 16);
        ctx.stroke();
      });

      // Sweet Curved Smile Creases on both cheeks under tusks
      [-1, 1].forEach(side => {
        ctx.strokeStyle = '#2d4554';
        ctx.lineWidth = 7;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.arc(512 + side * 95, 560, 34, (side > 0 ? 0.8 : 0.0) * Math.PI, (side > 0 ? 1.4 : 0.6) * Math.PI);
        ctx.stroke();
      });

      // Center Trunk Root Wrinkle Creases
      ctx.strokeStyle = '#3d5c6b';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      [490, 525, 560].forEach(wy => {
        ctx.beginPath();
        ctx.arc(512, wy, 48, 0.2 * Math.PI, 0.8 * Math.PI);
        ctx.stroke();
      });
    };

    drawFace(0);
    const tex = new THREE.CanvasTexture(canvas);
    return { tex, canvas, ctx, drawFace };
  }

  // Parametric tapered tube geometry with closed rounded caps (Ideal for hair locks, horns, tusks)
  createTaperedTubeGeometry(curve, tubularSegments = 16, rStart = 0.024, rEnd = 0.003, radialSegments = 8, cap = true) {
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
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 1. Modern Stylized Human Character (Mass: 72 kg <= 150 kg -> SCOOPABLE)
  // Exact anatomical & aesthetic match to media_1793819995371_c74a70f7.png:
  // Auburn/ginger swept-crest quiff hair, warm peach skin, blushing rosy cheeks, friendly eyes with catchlights,
  // cream short-sleeve polo shirt with crisp white collar, warm brown chinos, and dark casual loafers
  buildHumanMesh() {
    const group = new THREE.Group();
    group.name = 'stylizedHuman';

    const faceData = this.createHumanFaceTexture();

    // A. Pelvis / Hips in Mocha Brown Chinos (Root of body at y = 0.88)
    const pelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.150, 0.138, 0.16, 24),
      this.materials.humanPantsBrown
    );
    pelvis.position.y = 0.88;
    pelvis.scale.set(1.04, 1.0, 0.78);
    pelvis.castShadow = true;
    group.add(pelvis);

    // Subtle dark brown belt with silver buckle
    const belt = new THREE.Mesh(
      new THREE.CylinderGeometry(0.153, 0.151, 0.035, 24),
      new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.6 })
    );
    belt.position.set(0, 0.945, 0);
    belt.scale.set(1.05, 1.0, 0.79);
    group.add(belt);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.030, 0.012),
      new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 })
    );
    buckle.position.set(0, 0.945, 0.122);
    group.add(buckle);

    // B. Torso Group (Cream Polo Shirt + Collar) pivoted at y = 0.94
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.94, 0);

    // Athletic Tapered Polo Shirt Chest & Waist (Natural V-taper)
    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.160, 0.24, 24),
      this.materials.humanPoloCream
    );
    chest.position.y = 0.28;
    chest.scale.set(1.08, 1.0, 0.76);
    chest.castShadow = true;
    torsoGroup.add(chest);

    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.160, 0.146, 0.18, 24),
      this.materials.humanPoloCream
    );
    waist.position.y = 0.10;
    waist.scale.set(1.04, 1.0, 0.76);
    waist.castShadow = true;
    torsoGroup.add(waist);

    // Overlapping Polo Hem (Covers waistband smoothly to eliminate any clipping gap)
    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.154, 0.158, 0.045, 24),
      this.materials.humanPoloCream
    );
    hem.position.y = 0.01;
    hem.scale.set(1.05, 1.0, 0.78);
    torsoGroup.add(hem);

    // Smooth Deltoid Shoulder Caps
    [-0.18, 0.18].forEach(sx => {
      const deltoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.070, 18, 14),
        this.materials.humanPoloCream
      );
      deltoid.position.set(sx, 0.33, 0);
      deltoid.scale.set(1.0, 0.85, 0.95);
      torsoGroup.add(deltoid);
    });

    // Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.052, 0.12, 18),
      this.materials.humanSkinPeach
    );
    neck.position.y = 0.42;
    torsoGroup.add(neck);

    // Crisp Folded White Polo Collar (Neckband + Folded Lapels in stylish open V)
    const collarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.070, 0.045, 20),
      this.materials.humanPoloCollar
    );
    collarBand.position.y = 0.39;
    torsoGroup.add(collarBand);

    [-1, 1].forEach(side => {
      const lapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.090, 0.012),
        this.materials.humanPoloCollar
      );
      lapel.position.set(side * 0.046, 0.36, 0.078);
      lapel.rotation.set(-0.35, side * 0.28, side * -0.36);
      torsoGroup.add(lapel);
    });

    // Center Placket with Pearl Buttons
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.14, 0.012),
      this.materials.humanPoloCollar
    );
    placket.position.set(0, 0.26, 0.114);
    torsoGroup.add(placket);

    [0.30, 0.24].forEach(by => {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
      );
      button.position.set(0, by, 0.121);
      torsoGroup.add(button);
    });

    // C. Sculpted Head Group pivoted at neck top (y = 0.50 on torso)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0.010);

    // Sculpted Cranium & Jaw
    const cranium = new THREE.Mesh(
      new THREE.SphereGeometry(0.122, 28, 22),
      this.materials.humanSkinPeach
    );
    cranium.scale.set(0.92, 1.05, 0.96);
    cranium.castShadow = true;
    headGroup.add(cranium);

    const chin = new THREE.Mesh(
      new THREE.SphereGeometry(0.066, 18, 14),
      this.materials.humanSkinPeach
    );
    chin.position.set(0, -0.065, 0.038);
    chin.scale.set(1.10, 0.88, 1.08);
    headGroup.add(chin);

    // 3D Pixar-Style Expressive Eyes with Specular Highlights & Brows
    [-1, 1].forEach(side => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.045, 0.014, 0.108);
      eyeGroup.rotation.y = side * 0.15;

      // Glossy White Sclera
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 16, 12),
        this.materials.humanEyesWhite
      );
      sclera.scale.set(0.95, 1.25, 0.40);
      eyeGroup.add(sclera);

      // Deep Hazel/Espresso Iris
      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.20 })
      );
      iris.position.set(side * 0.002, 0, 0.009);
      iris.scale.set(0.92, 1.15, 0.30);
      eyeGroup.add(iris);

      // Dark Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.010, 12, 8),
        this.materials.humanEyesIris
      );
      pupil.position.set(side * 0.002, 0, 0.014);
      pupil.scale.set(0.85, 1.10, 0.25);
      eyeGroup.add(pupil);

      // Dual Specular Twinkle Dots
      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), this.materials.humanEyeReflex);
      hl1.position.set(side * 0.004, 0.007, 0.016);
      eyeGroup.add(hl1);

      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), this.materials.humanEyeReflex);
      hl2.position.set(side * -0.004, -0.005, 0.016);
      eyeGroup.add(hl2);

      // Curved Eyebrow
      const brow = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.003, 0.052, 8).rotateZ(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x7c2d12, roughness: 0.75 })
      );
      brow.position.set(0, 0.038, 0.006);
      brow.rotation.z = side * -0.15;
      brow.rotation.x = -0.25;
      eyeGroup.add(brow);

      headGroup.add(eyeGroup);
    });

    // Cute Sculpted Nose Tip
    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 12, 10),
      this.materials.humanSkinPeach
    );
    nose.position.set(0, -0.014, 0.126);
    nose.scale.set(0.9, 0.75, 1.1);
    headGroup.add(nose);

    // Soft Smile Curve
    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.0035, 8, 16, Math.PI * 0.65),
      this.materials.humanSmile
    );
    smile.position.set(0, -0.046, 0.114);
    smile.rotation.set(0.2, 0, Math.PI * 1.18);
    headGroup.add(smile);

    // Airbrushed Pink Blush Discs
    [-1, 1].forEach(side => {
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 8),
        this.materials.humanBlush
      );
      blush.position.set(side * 0.072, -0.020, 0.096);
      blush.scale.set(1.0, 0.65, 0.25);
      headGroup.add(blush);
    });

    // Sculpted Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 14, 10),
        this.materials.humanSkinPeach
      );
      ear.scale.set(0.35, 1.15, 0.75);
      ear.position.set(side * 0.115, -0.008, -0.005);
      ear.rotation.y = side * 0.18;
      headGroup.add(ear);
    });

    // D. STYLISH SCULPTED GINGER / AUBURN HAIR (Matching Reference Image 1)
    // 1. Fitted cranial hair cap (zero gaps, perfectly hugs cranium)
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      this.materials.humanHairGinger
    );
    hairCap.position.set(0, 0.015, -0.012);
    hairCap.scale.set(0.95, 1.06, 1.02);
    headGroup.add(hairCap);

    // 2. Main Voluminous Crest Quiff (Curving up from front-left across crown to right)
    const quiffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.12, 0.06),
      new THREE.Vector3(-0.01, 0.155, 0.02),
      new THREE.Vector3( 0.03, 0.15, -0.04),
      new THREE.Vector3( 0.06, 0.12, -0.08)
    ]);
    const quiffGeo = this.createTaperedTubeGeometry(quiffCurve, 16, 0.032, 0.004, 10, true);
    const quiff = new THREE.Mesh(quiffGeo, this.materials.humanHairGinger);
    headGroup.add(quiff);

    // 3. Side Crest Accent Lock (Gives the stylish flick in Reference Image 1)
    const crestFlickCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.13, 0.05),
      new THREE.Vector3( 0.02, 0.165, 0.01),
      new THREE.Vector3( 0.05, 0.155, -0.03)
    ]);
    const crestFlickGeo = this.createTaperedTubeGeometry(crestFlickCurve, 14, 0.024, 0.003, 8, true);
    const crestFlick = new THREE.Mesh(crestFlickGeo, this.materials.humanHairGinger);
    headGroup.add(crestFlick);

    // 4. Layered Side-Swept Fringe / Bangs sweeping across forehead
    const bang1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.11, 0.07),
      new THREE.Vector3(-0.02, 0.10, 0.11),
      new THREE.Vector3( 0.05, 0.075, 0.118),
      new THREE.Vector3( 0.09, 0.025, 0.095)
    ]);
    const bang1Geo = this.createTaperedTubeGeometry(bang1Curve, 16, 0.026, 0.003, 10, true);
    const bang1 = new THREE.Mesh(bang1Geo, this.materials.humanHairGinger);
    headGroup.add(bang1);

    const bang2Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.06, 0.13, 0.06),
      new THREE.Vector3(-0.025, 0.09, 0.11),
      new THREE.Vector3( 0.02, 0.045, 0.115)
    ]);
    const bang2Geo = this.createTaperedTubeGeometry(bang2Curve, 14, 0.020, 0.003, 8, true);
    const bang2 = new THREE.Mesh(bang2Geo, this.materials.humanHairGinger);
    headGroup.add(bang2);

    const bang3Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.09, 0.075),
      new THREE.Vector3(-0.065, 0.05, 0.10),
      new THREE.Vector3(-0.045, 0.01, 0.105)
    ]);
    const bang3Geo = this.createTaperedTubeGeometry(bang3Curve, 12, 0.016, 0.003, 8, true);
    const bang3 = new THREE.Mesh(bang3Geo, this.materials.humanHairGinger);
    headGroup.add(bang3);

    // 5. Tapered Sideburns framing the ears
    [-1, 1].forEach(side => {
      const sideburn = new THREE.Mesh(
        new THREE.CylinderGeometry(0.010, 0.004, 0.055, 8),
        this.materials.humanHairGinger
      );
      sideburn.position.set(side * 0.108, 0.015, 0.020);
      sideburn.rotation.x = -0.15;
      headGroup.add(sideburn);
    });

    torsoGroup.add(headGroup);

    // D. Articulated Arms (Short polo sleeves + peach bare arms + relaxed hands)
    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.17, 0.33, 0);

      // Sleeve Cylinder wrapping around the upper bicep
      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.054, 0.15, 18),
        this.materials.humanPoloCream
      );
      sleeve.position.set(side * 0.008, -0.07, 0);
      sleeve.rotation.z = side * -0.06;
      armGroup.add(sleeve);

      const sleeveCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.02, 18),
        this.materials.humanPoloCream
      );
      sleeveCuff.position.set(side * 0.014, -0.14, 0);
      armGroup.add(sleeveCuff);

      // Bare Peach Upper Arm below sleeve
      const bareBicep = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.14, 16),
        this.materials.humanSkinPeach
      );
      bareBicep.position.set(side * 0.014, -0.15, 0);
      armGroup.add(bareBicep);

      // Elbow Pivot Group at y = -0.22
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(side * 0.014, -0.22, 0.005);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.043, 14, 10),
        this.materials.humanSkinPeach
      );
      forearmGroup.add(elbow);

      // Bare Peach Skin Forearm
      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.034, 0.22, 16),
        this.materials.humanSkinPeach
      );
      forearm.position.set(0, -0.11, 0.008);
      forearm.rotation.x = -0.08;
      forearmGroup.add(forearm);

      // Sculpted Stylized Hand matching Reference Image 1
      const handGroup = new THREE.Group();
      handGroup.position.set(0, -0.22, 0.015);

      const wrist = new THREE.Mesh(
        new THREE.SphereGeometry(0.033, 12, 10),
        this.materials.humanSkinPeach
      );
      handGroup.add(wrist);

      const palm = new THREE.Mesh(
        new THREE.BoxGeometry(0.042, 0.065, 0.028),
        this.materials.humanSkinPeach
      );
      palm.position.set(0, -0.032, 0);
      handGroup.add(palm);

      // Thumb
      const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.009, 0.036, 8),
        this.materials.humanSkinPeach
      );
      thumb.position.set(-side * 0.022, -0.022, 0.012);
      thumb.rotation.set(-0.35, 0, -side * 0.45);
      handGroup.add(thumb);

      // 4 Tapered Fingers
      [-0.014, -0.005, 0.005, 0.014].forEach(fx => {
        const finger = new THREE.Mesh(
          new THREE.CylinderGeometry(0.009, 0.007, 0.042, 8),
          this.materials.humanSkinPeach
        );
        finger.position.set(fx, -0.075, 0.003);
        finger.rotation.x = 0.20;
        handGroup.add(finger);
      });

      forearmGroup.add(handGroup);
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

    // E. Articulated Legs in Tailored Warm Brown Chinos & Dark Casual Loafers
    [-1, 1].forEach(side => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.074, 0.86, 0);

      // Spherical Hip Joint connecting seamlessly into pelvis
      const hip = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 16, 12),
        this.materials.humanPantsBrown
      );
      legGroup.add(hip);

      // Brown Chinos Thigh
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.056, 0.40, 20),
        this.materials.humanPantsBrown
      );
      thigh.position.set(0, -0.20, 0.005);
      thigh.rotation.x = 0.02;
      legGroup.add(thigh);

      // Spherical Knee Joint
      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 16, 12),
        this.materials.humanPantsBrown
      );
      knee.position.set(0, -0.40, 0.012);
      legGroup.add(knee);

      // Lower Leg Group (Knee joint at y = -0.40)
      const lowerLegGroup = new THREE.Group();
      lowerLegGroup.position.set(0, -0.40, 0.012);

      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.048, 0.38, 20),
        this.materials.humanPantsBrown
      );
      calf.position.set(0, -0.19, -0.006);
      lowerLegGroup.add(calf);

      // Chinos Trouser Cuff
      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.025, 20),
        this.materials.humanPantsBrown
      );
      cuff.position.set(0, -0.37, -0.006);
      lowerLegGroup.add(cuff);

      // Stylish Casual Oxford Sneaker (White rubber sole rim + toe cap + dark espresso body)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.41, 0.035);

      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.074, 0.065, 0.17),
        this.materials.humanShoesDark
      );
      shoeGroup.add(shoeBody);

      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.078, 0.022, 0.175),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
      );
      sole.position.y = -0.032;
      shoeGroup.add(sole);

      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 })
      );
      toeCap.position.set(0, -0.012, 0.075);
      toeCap.scale.set(1.0, 0.65, 0.85);
      shoeGroup.add(toeCap);

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

    group.userData.type = 'human';
    group.userData.torsoGroup = torsoGroup;
    group.userData.headGroup = headGroup;
    group.userData.faceData = faceData;

    return group;
  }

  // Seamless organic elephant body geometry generator (No flat cylinder cuts, continuous natural curves)
  createElephantBodyGeometry() {
    const rings = 24;
    const segments = 24;

    const profile = [
      [ 0.62, 0.68, 0.001, 0.001], // Closed front cap meeting neck
      [ 0.58, 0.70, 0.20, 0.22],   // Neck junction
      [ 0.50, 0.73, 0.35, 0.38],   // Front brisket
      [ 0.38, 0.80, 0.45, 0.49],   // High shoulder withers hump
      [ 0.25, 0.79, 0.48, 0.52],   // Shoulder crest
      [ 0.12, 0.76, 0.50, 0.54],   // Mid-back dip
      [ 0.00, 0.75, 0.51, 0.56],   // Deep belly center
      [-0.14, 0.77, 0.50, 0.54],   // Lumbar rise
      [-0.28, 0.79, 0.48, 0.52],   // Pelvic haunch peak
      [-0.42, 0.74, 0.42, 0.46],   // Rump slope
      [-0.54, 0.69, 0.30, 0.33],   // Tail root base
      [-0.62, 0.65, 0.12, 0.14],   // Rear haunch curve
      [-0.65, 0.63, 0.001, 0.001]  // Closed rear cap
    ];

    const positions = [];
    const uvs = [];
    const indices = [];

    for (let i = 0; i <= rings; i++) {
      const t = i / rings;
      const pIdx = t * (profile.length - 1);
      const i0 = Math.floor(pIdx);
      const i1 = Math.min(profile.length - 1, i0 + 1);
      const blend = pIdx - i0;

      const z = profile[i0][0] * (1 - blend) + profile[i1][0] * blend;
      const y = profile[i0][1] * (1 - blend) + profile[i1][1] * blend;
      const rx = profile[i0][2] * (1 - blend) + profile[i1][2] * blend;
      const ry = profile[i0][3] * (1 - blend) + profile[i1][3] * blend;

      for (let j = 0; j <= segments; j++) {
        const theta = (j / segments) * Math.PI * 2;
        const x = Math.cos(theta) * rx;
        const vertY = y + Math.sin(theta) * ry;

        positions.push(x, vertY, z);
        uvs.push(j / segments, t);
      }
    }

    for (let i = 0; i < rings; i++) {
      for (let j = 0; j < segments; j++) {
        const a = i * (segments + 1) + j;
        const b = (i + 1) * (segments + 1) + j;
        const c = (i + 1) * (segments + 1) + (j + 1);
        const d = i * (segments + 1) + (j + 1);

        indices.push(a, b, d);
        indices.push(b, c, d);
      }
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    return geo;
  }

  // 2. Indian Elephant (Mass: 110 kg <= 150 kg -> SCOOPABLE IN RESCUE NET)
  // Exact anatomical & artistic match to media_1793820037213_e448b2e7.jpg:
  // Plump rounded seamless body, twin cranial domes, expressive 3D Pixar eyes,
  // articulated curling trunk, upward curved ivory tusks, flapping leaf ears,
  // 4 sturdy pillar legs with rounded foot pads & cute toenails, and tufted tail.
  buildAnimalMesh() {
    const group = new THREE.Group();
    group.name = 'indianElephant';

    const elephantFaceData = this.createElephantFaceTexture();

    // A. 100% Seamless Organic Body (Withers hump, saddle dip, rounded haunches & plump belly)
    const bodyGeo = this.createElephantBodyGeometry();
    const body = new THREE.Mesh(bodyGeo, this.materials.elephantSkin);
    body.castShadow = true;
    group.add(body);

    // B. Expressive Elephant Head Group (Pivoted at y = 0.78, z = 0.58)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.78, 0.58);

    // Indian Elephant Twin Cranial Domes
    [-1, 1].forEach(side => {
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(0.16, 20, 16),
        this.materials.elephantSkin
      );
      dome.position.set(side * 0.11, 0.14, -0.04);
      dome.scale.set(1.0, 1.15, 0.95);
      headGroup.add(dome);
    });

    // Central Forehead & Cheeks
    const forehead = new THREE.Mesh(
      new THREE.SphereGeometry(0.24, 24, 18),
      this.materials.elephantSkin
    );
    forehead.position.set(0, 0.04, 0.02);
    forehead.scale.set(1.05, 1.12, 1.02);
    forehead.castShadow = true;
    headGroup.add(forehead);

    // 3D Expressive Cartoon Eyes (Glossy sclera, dark pupil, dual catchlights, soft eyelid)
    [-1, 1].forEach(side => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.17, 0.08, 0.15);
      eyeGroup.rotation.y = side * 0.42;

      // Glossy White Sclera
      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.052, 16, 12),
        this.materials.elephantEyeWhite
      );
      sclera.scale.set(0.85, 1.15, 0.45);
      eyeGroup.add(sclera);

      // Deep Dark Pupil
      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 14, 10),
        this.materials.elephantEyePupil
      );
      pupil.position.set(side * 0.005, -0.002, 0.018);
      pupil.scale.set(0.82, 1.08, 0.35);
      eyeGroup.add(pupil);

      // Dual Specular Twinkle Highlights
      const h1 = new THREE.Mesh(new THREE.SphereGeometry(0.010, 8, 8), this.materials.elephantEyeCatchlight);
      h1.position.set(side * 0.012, 0.016, 0.030);
      eyeGroup.add(h1);

      const h2 = new THREE.Mesh(new THREE.SphereGeometry(0.005, 8, 8), this.materials.elephantEyeCatchlight);
      h2.position.set(side * -0.008, -0.010, 0.030);
      eyeGroup.add(h2);

      // Slate Blue Eyelid
      const eyelid = new THREE.Mesh(
        new THREE.SphereGeometry(0.054, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.45),
        this.materials.elephantSkin
      );
      eyelid.position.set(0, 0.008, 0.002);
      eyelid.scale.set(0.88, 1.18, 0.48);
      eyeGroup.add(eyelid);

      headGroup.add(eyeGroup);
    });

    // Organic Leaf-Shaped Flapping Fan Ears (Angled naturally back over shoulders)
    const earL = new THREE.Group();
    earL.position.set(-0.20, 0.06, -0.04);

    const earShapeL = new THREE.Shape();
    earShapeL.moveTo(0, 0.05);
    earShapeL.bezierCurveTo(-0.10, 0.24, -0.30, 0.22, -0.36, 0.08);
    earShapeL.bezierCurveTo(-0.42, -0.06, -0.38, -0.22, -0.26, -0.32);
    earShapeL.bezierCurveTo(-0.14, -0.42, -0.06, -0.30, 0, -0.18);
    earShapeL.closePath();

    const earMeshL = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeL, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.012,
        bevelSegments: 3
      }),
      this.materials.elephantSkin
    );
    earL.add(earMeshL);

    const innerEarL = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeL, { depth: 0.005, bevelEnabled: false }),
      this.materials.elephantEarInner
    );
    innerEarL.scale.set(0.82, 0.82, 1.0);
    innerEarL.position.set(-0.02, 0, 0.026);
    earL.add(innerEarL);

    const earR = new THREE.Group();
    earR.position.set(0.20, 0.06, -0.04);

    const earShapeR = new THREE.Shape();
    earShapeR.moveTo(0, 0.05);
    earShapeR.bezierCurveTo(0.10, 0.24, 0.30, 0.22, 0.36, 0.08);
    earShapeR.bezierCurveTo(0.42, -0.06, 0.38, -0.22, 0.26, -0.32);
    earShapeR.bezierCurveTo(0.14, -0.42, 0.06, -0.30, 0, -0.18);
    earShapeR.closePath();

    const earMeshR = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeR, {
        depth: 0.025,
        bevelEnabled: true,
        bevelThickness: 0.015,
        bevelSize: 0.012,
        bevelSegments: 3
      }),
      this.materials.elephantSkin
    );
    earR.add(earMeshR);

    const innerEarR = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeR, { depth: 0.005, bevelEnabled: false }),
      this.materials.elephantEarInner
    );
    innerEarR.scale.set(0.82, 0.82, 1.0);
    innerEarR.position.set(0.02, 0, 0.026);
    earR.add(innerEarR);

    earL.rotation.set(-0.15, -0.45, -0.10);
    earR.rotation.set(-0.15, 0.45, 0.10);

    headGroup.add(earL);
    headGroup.add(earR);

    // Upward-Curved Ivory Tusks with Golden Tips (Smooth 3D Catmull-Rom Tube Curves)
    [-1, 1].forEach(side => {
      const tuskCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.09, -0.10, 0.18),
        new THREE.Vector3(side * 0.14, -0.20, 0.32),
        new THREE.Vector3(side * 0.18, -0.16, 0.46),
        new THREE.Vector3(side * 0.20, -0.08, 0.56)
      ]);
      const tuskGeo = new THREE.TubeGeometry(tuskCurve, 18, 0.028, 12, false);
      const tuskMesh = new THREE.Mesh(tuskGeo, this.materials.elephantTusk);
      headGroup.add(tuskMesh);

      const tuskTip = new THREE.Mesh(
        new THREE.SphereGeometry(0.020, 10, 8),
        this.materials.elephantTuskTip
      );
      tuskTip.position.set(side * 0.20, -0.08, 0.56);
      headGroup.add(tuskTip);
    });

    // Articulated 5-Segment Flexible Waving Trunk (Negative rotations arch trunk forward & up)
    const trunkSegments = [];

    // Segment 0: Trunk Base (Root at front of face)
    const trunkRoot = new THREE.Group();
    trunkRoot.position.set(0, -0.05, 0.25);
    trunkRoot.rotation.x = -0.42;
    const m0 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.102, 0.088, 0.16, 18),
      this.materials.elephantSkin
    );
    m0.position.y = -0.08;
    trunkRoot.add(m0);

    // Segment 1
    const trunkSeg1 = new THREE.Group();
    trunkSeg1.position.set(0, -0.15, 0);
    trunkSeg1.rotation.x = -0.36;
    const m1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.088, 0.074, 0.16, 18),
      this.materials.elephantSkin
    );
    m1.position.y = -0.08;
    trunkSeg1.add(m1);

    // Segment 2
    const trunkSeg2 = new THREE.Group();
    trunkSeg2.position.set(0, -0.15, 0);
    trunkSeg2.rotation.x = -0.28;
    const m2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.074, 0.062, 0.16, 18),
      this.materials.elephantSkin
    );
    m2.position.y = -0.08;
    trunkSeg2.add(m2);

    // Segment 3: Curls upward
    const trunkSeg3 = new THREE.Group();
    trunkSeg3.position.set(0, -0.14, 0);
    trunkSeg3.rotation.x = 0.70;
    const m3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.050, 0.14, 16),
      this.materials.elephantSkin
    );
    m3.position.y = -0.07;
    trunkSeg3.add(m3);

    // Segment 4: Curled Trunk Tip with Nostrils
    const trunkTip = new THREE.Group();
    trunkTip.position.set(0, -0.13, 0);
    trunkTip.rotation.x = 0.75;
    const m4 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.050, 0.040, 0.12, 14),
      this.materials.elephantSkin
    );
    m4.position.y = -0.06;
    trunkTip.add(m4);

    const tipBulb = new THREE.Mesh(
      new THREE.SphereGeometry(0.044, 14, 10),
      this.materials.elephantSkin
    );
    tipBulb.position.set(0, -0.11, 0.025);
    tipBulb.scale.set(0.9, 0.8, 1.2);
    trunkTip.add(tipBulb);

    [-0.012, 0.012].forEach(nx => {
      const nostril = new THREE.Mesh(
        new THREE.SphereGeometry(0.009, 8, 8),
        this.materials.elephantSkinDark
      );
      nostril.position.set(nx, -0.11, 0.062);
      trunkTip.add(nostril);
    });

    trunkSeg3.add(trunkTip);
    trunkSeg2.add(trunkSeg3);
    trunkSeg1.add(trunkSeg2);
    trunkRoot.add(trunkSeg1);
    headGroup.add(trunkRoot);

    trunkSegments.push(trunkRoot, trunkSeg1, trunkSeg2, trunkSeg3, trunkTip);
    group.add(headGroup);

    // C. 4 Sturdy Pillar Legs with 4 Cute Rounded Cream/Yellow Toenails Each
    const legs = [];
    [
      { x: -0.25, z:  0.28, isFront: true },
      { x:  0.25, z:  0.28, isFront: true },
      { x: -0.25, z: -0.28, isFront: false },
      { x:  0.25, z: -0.28, isFront: false }
    ].forEach((pos, idx) => {
      const legGroup = new THREE.Group();
      legGroup.position.set(pos.x, 0.38, pos.z);

      // Upper shoulder/hip taper
      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.140, 0.125, 0.24, 18),
        this.materials.elephantSkin
      );
      thigh.position.y = 0.12;
      thigh.castShadow = true;
      legGroup.add(thigh);

      // Lower calf & knee
      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.125, 0.138, 0.26, 18),
        this.materials.elephantSkin
      );
      calf.position.y = -0.13;
      calf.castShadow = true;
      legGroup.add(calf);

      // Foot pad
      const footPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.140, 0.145, 0.06, 18),
        this.materials.elephantSkin
      );
      footPad.position.y = -0.27;
      legGroup.add(footPad);

      // 4 Rounded Cream Toenails along the forward foot rim
      for (let tn = 0; tn < 4; tn++) {
        const nailAngle = (tn - 1.5) * 0.40;
        const nx = Math.sin(nailAngle) * 0.142;
        const nz = Math.cos(nailAngle) * 0.142;

        const toenail = new THREE.Mesh(
          new THREE.SphereGeometry(0.020, 10, 8),
          this.materials.elephantNails
        );
        toenail.position.set(nx, -0.27, nz);
        toenail.scale.set(1.0, 0.8, 1.2);
        legGroup.add(toenail);
      }

      group.add(legGroup);
      legs.push(legGroup);
    });

    // D. Slender Tail with Brush Tuft
    const tail = new THREE.Group();
    tail.position.set(0, 0.68, -0.56);

    const tailCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.16, -0.06),
      new THREE.Vector3(0, -0.32, -0.08),
      new THREE.Vector3(0, -0.42, -0.06)
    ]);
    const tailGeo = new THREE.TubeGeometry(tailCurve, 12, 0.018, 8, false);
    const tailCord = new THREE.Mesh(tailGeo, this.materials.elephantSkin);
    tail.add(tailCord);

    const tailTuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.040, 0.12, 10),
      this.materials.elephantTailBrush
    );
    tailTuft.position.set(0, -0.46, -0.05);
    tailTuft.rotation.x = 0.25;
    tail.add(tailTuft);

    group.add(tail);

    group.userData = {
      type: 'animal',
      body,
      chest: body,
      rump: body,
      headGroup,
      faceData: elephantFaceData,
      trunkSegments,
      earL,
      earR,
      legs,
      tail
    };

    return group;
  }

  // 3. Heavy Cattle / Stray Indian Zebu Bull (Mass: 480 kg > 150 kg -> OVERWEIGHT HAZARD)
  // Features prominent Indian Zebu dorsal hump, pendulous throat dewlap, curved horns, and cloven hooves
  buildHeavyCattleMesh() {
    const group = new THREE.Group();
    group.name = 'desiCattleZebu';

    // A. Main Torso Barrel & Ribcage
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.44, 1.35, 14).rotateX(Math.PI / 2), this.materials.cattleHide);
    barrel.position.set(0, 1.05, 0);
    barrel.scale.set(0.95, 1.15, 1.0);
    barrel.castShadow = true;
    group.add(barrel);

    // Rear Haunches / Rump
    const haunches = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), this.materials.cattleHide);
    haunches.position.set(0, 1.08, -0.62);
    haunches.scale.set(0.92, 1.08, 0.95);
    group.add(haunches);

    // Shoulder Girdle / Withers
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), this.materials.cattleHide);
    shoulders.position.set(0, 1.08, 0.58);
    shoulders.scale.set(0.96, 1.12, 0.95);
    group.add(shoulders);

    // B. Prominent Indian Zebu Dorsal Hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), this.materials.cattleHide);
    hump.position.set(0, 1.52, 0.42);
    hump.scale.set(0.72, 1.15, 1.35);
    hump.castShadow = true;
    group.add(hump);

    // C. Muscular Neck & Throat Dewlap (Gala-Kambal)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.65, 12), this.materials.cattleHide);
    neck.position.set(0, 1.25, 0.95);
    neck.rotation.x = -0.55;
    neck.castShadow = true;
    group.add(neck);

    const dewlap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.55), this.materials.cattleHide);
    dewlap.position.set(0, 0.92, 0.98);
    dewlap.rotation.x = -0.45;
    group.add(dewlap);

    // D. Sculpted Bovine Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.35, 1.32);
    headGroup.rotation.x = 0.25;

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.38), this.materials.cattleHide);
    cranium.position.set(0, 0.05, 0);
    headGroup.add(cranium);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.32), this.materials.cattleHide);
    muzzle.position.set(0, -0.06, 0.25);
    headGroup.add(muzzle);

    const nosePad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.08), this.materials.cattleDark);
    nosePad.position.set(0, -0.08, 0.41);
    headGroup.add(nosePad);

    [-0.055, 0.055].forEach(nx => {
      const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 8).rotateX(Math.PI / 2), this.materials.cattleDark);
      nostril.position.set(nx, -0.07, 0.45);
      headGroup.add(nostril);
    });

    [-0.17, 0.17].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), this.materials.cattleEye);
      eye.position.set(side, 0.08, 0.08);
      headGroup.add(eye);
    });

    const cattleEars = [];
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 8), this.materials.cattleHide);
      ear.position.set(side * 0.22, 0.05, -0.05);
      ear.rotation.z = side * -1.15;
      ear.rotation.x = -0.3;
      ear.scale.set(1.0, 1.0, 0.35);
      headGroup.add(ear);
      cattleEars.push(ear);
    });

    // Elegant Swept Curved Horns
    [-1, 1].forEach(side => {
      const hornCurvePts = [
        new THREE.Vector3(side * 0.12, 0.18, -0.05),
        new THREE.Vector3(side * 0.28, 0.38, -0.08),
        new THREE.Vector3(side * 0.32, 0.58, 0.02),
        new THREE.Vector3(side * 0.24, 0.68, 0.12)
      ];
      const hornCurve = new THREE.CatmullRomCurve3(hornCurvePts);
      const hornGeo = new THREE.TubeGeometry(hornCurve, 12, 0.042, 8, false);
      const horn = new THREE.Mesh(hornGeo, this.materials.cattleHorn);
      headGroup.add(horn);

      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.10, 8), this.materials.cattleDark);
      hornTip.position.copy(hornCurvePts[3]);
      hornTip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-side * 0.4, 0.8, 0.4).normalize());
      headGroup.add(hornTip);
    });

    group.add(headGroup);

    // E. 4 Articulated Quadruped Legs with Anatomical Shoulder/Hip Pivots & Cloven Hooves
    const cattleLegs = [];
    [
      { x: -0.28, z: 0.52, isFront: true },
      { x:  0.28, z: 0.52, isFront: true },
      { x: -0.26, z: -0.55, isFront: false },
      { x:  0.26, z: -0.55, isFront: false }
    ].forEach(leg => {
      // Hip / Shoulder Pivot Group at y = 0.95
      const legGroup = new THREE.Group();
      legGroup.position.set(leg.x, 0.95, leg.z);

      const upperRadius = leg.isFront ? 0.11 : 0.13;
      const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(upperRadius, 0.085, 0.45, 10), this.materials.cattleHide);
      upperLeg.position.y = -0.22;
      legGroup.add(upperLeg);

      // Knee / Hock Pivot Group at y = -0.45
      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.45, leg.isFront ? 0.01 : -0.03);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), this.materials.cattleHide);
      kneeGroup.add(knee);

      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 10), this.materials.cattleHide);
      lowerLeg.position.y = -0.19;
      kneeGroup.add(lowerLeg);

      const pastern = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.08, 10), this.materials.cattleDark);
      pastern.position.set(0, -0.40, 0.01);
      kneeGroup.add(pastern);

      [-0.024, 0.024].forEach(hx => {
        const hoofClaw = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.065, 0.10), this.materials.cattleDark);
        hoofClaw.position.set(hx, -0.45, 0.02);
        kneeGroup.add(hoofClaw);
      });

      legGroup.add(kneeGroup);
      cattleLegs.push({ group: legGroup, kneeGroup: kneeGroup, isFront: leg.isFront });
      group.add(legGroup);
    });

    // F. Long Tail with Tufted Switch
    const tailPts = [
      new THREE.Vector3(0, 1.10, -0.88),
      new THREE.Vector3(0.02, 0.85, -0.92),
      new THREE.Vector3(-0.02, 0.60, -0.90),
      new THREE.Vector3(0, 0.42, -0.86)
    ];
    const tailCurve = new THREE.CatmullRomCurve3(tailPts);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.024, 6, false), this.materials.cattleHide);
    group.add(tailMesh);

    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 8), this.materials.cattleDark);
    tailTuft.position.set(0, 0.32, -0.85);
    tailTuft.rotation.x = 0.2;
    group.add(tailTuft);

    group.userData = {
      type: 'cow',
      barrel,
      haunches,
      dewlap,
      neck,
      headGroup,
      legs: cattleLegs,
      tail: tailMesh,
      ears: cattleEars
    };

    return group;
  }

  // 4. Industrial Railway Maintenance Tool Chest / Track Obstacle (Mass: 40 kg <= 150 kg -> SCOOPABLE)
  // Heavy timber gang chest with galvanized steel angles, rivets, padlock, and hazard stripes
  buildDebrisMesh() {
    const group = new THREE.Group();
    group.name = 'trackCargoDebris';

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.65), this.materials.woodCrate);
    chest.position.y = 0.26;
    chest.castShadow = true;
    group.add(chest);

    // Steel Edge Reinforcement Angles with Rivets
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.06, 0.67), this.materials.industrialSteel);
    strapTop.position.y = 0.48;
    group.add(strapTop);

    const strapBot = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.06, 0.67), this.materials.industrialSteel);
    strapBot.position.y = 0.05;
    group.add(strapBot);

    // Center Steel Clasp & Cast Brass Padlock
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.03), this.materials.industrialSteel);
    clasp.position.set(0, 0.32, 0.33);
    group.add(clasp);

    const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), this.materials.brass);
    padlock.position.set(0, 0.25, 0.35);
    group.add(padlock);

    // Yellow/Black Hazard Striped Decal Plate
    const hazardPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.02), this.materials.hazardYellow);
    hazardPlate.position.set(0, 0.16, 0.33);
    group.add(hazardPlate);

    // Heavy Steel Drop Handles on Sides
    [-0.435, 0.435].forEach(hx => {
      const handlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.10, 0.14), this.materials.industrialSteel);
      handlePlate.position.set(hx, 0.28, 0);
      group.add(handlePlate);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), this.materials.industrialSteel);
      ring.position.set(hx + (hx > 0 ? 0.015 : -0.015), 0.26, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    });

    group.userData = {
      type: 'crate'
    };

    return group;
  }

  // ------------------------------------------------------------------
  // Spawn and Positioning Logic
  // ------------------------------------------------------------------
  spawnObstacle(type, trackProgress, moveOffTrack = null) {
    let mesh, name, mass;
    switch (type) {
      case 'human':
        mesh = this.buildHumanMesh();
        name = 'Human (Trackside Pedestrian)';
        mass = 72; // kg <= 150 kg SCOOPABLE
        break;
      case 'animal':
        mesh = this.buildAnimalMesh();
        name = 'Wildlife (Indian Elephant)';
        mass = 110; // kg <= 150 kg SCOOPABLE
        break;
      case 'cattle':
        mesh = this.buildHeavyCattleMesh();
        name = 'Heavy Cattle (Stray Bull)';
        mass = 480; // kg - OVERWEIGHT
        break;
      case 'debris':
      default:
        mesh = this.buildDebrisMesh();
        name = 'Track Debris (Cargo Crate)';
        mass = 40; // kg
        break;
    }

    const transform = this.track.getTrackTransform(trackProgress, 0); // Placed directly on Track 1
    mesh.position.copy(transform.position);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);

    const obstacleObj = {
      id: this.nextId++,
      type,
      name,
      mass,
      mesh,
      progress: trackProgress,
      isCollected: false,
      isDeterred: false,
      hasBeenShocked: false,
      shockTime: 0,
      isCleared: false,
      moveOffTrackOnShock: moveOffTrack !== null ? moveOffTrack : (type === 'cattle')
    };

    this.scene.add(mesh);
    this.obstacles.push(obstacleObj);
    return obstacleObj;
  }

  // Initial scenic obstacles along the route
  initDefaultObstacles() {
    // 1. Human Track Worker right ahead (65-75m from spawn) -> E-shock fires -> Stays on track -> Weight 72kg <= 150kg -> Scoop Net rescue!
    this.spawnObstacle('human', 0.045, false);
    // 2. Stray Elephant (<150kg) -> E-shock fires -> Scrambles off track into pasture -> Track clear!
    this.spawnObstacle('animal', 0.12, true);
    // 3. Track Pedestrian Human -> E-shock fires -> Flees track -> Track clear!
    this.spawnObstacle('human', 0.28, true);
    // 4. Heavy Stray Bull (>150kg Overweight Hazard) -> E-shock fires -> Gallops off track!
    this.spawnObstacle('cattle', 0.45, true);
    // 5. Elephant Calf -> E-shock fires -> Stays on track -> Weight 110kg <= 150kg -> Net scoop rescue!
    this.spawnObstacle('animal', 0.60, false);
    // 6. Stubborn Heavy Bull -> E-shock fires -> Stays on track -> 480kg > 150kg -> Net stowed, emergency brake!
    this.spawnObstacle('cattle', 0.85, false);
  }

  // Spawn immediately ahead of the train on demand (via HUD test buttons)
  spawnAheadOfTrain(trainProgress, trackLength, type = 'human', distanceMeters = 85, moveOffTrack = null) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(type, targetProgress, moveOffTrack);
  }

  // ------------------------------------------------------------------
  // Active Non-Lethal Electric Shock Protocol (Track Clearance)
  // ------------------------------------------------------------------
  setDeterrenceMode(mode) {
    this.activeDeterrenceMode = 'electric_shock';
    this.telemetry.deterrenceMode = 'electric_shock';
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceSpecs(mode) {
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceTickerData(mode) {
    return {
      arch: 'E-SHOCK (RDSO)',
      polarization: 'PULSED GRADIENT',
      carrier: 'IEC 60335 COMPLIANT',
      focusState: 'CONTACT SWEEP ARMED',
      safety: '100% NON-LETHAL (ZERO HARM)'
    };
  }

  // ------------------------------------------------------------------
  // Subject-Tailored Electric Shock Specifications (Human vs Animal)
  // Requirement: Calibrated to subject's size & type to compel moving off track safely
  // ------------------------------------------------------------------
  getTailoredShockSpecs(obs) {
    if (!obs) return { voltage: '2.0 kV', current: '1.2 mA', energy: '0.04 J', typeLabel: 'HUMAN SAFE', badge: '2.0 kV / 1.2 mA', desc: 'Mild sensory pulse' };

    if (obs.type === 'human') {
      return {
        voltage: '2.0 kV',
        current: '1.2 mA',
        energy: '0.04 J',
        compliance: 'IEC 60479-1 (Safe Sensory Perception)',
        typeLabel: 'HUMAN (PERSON)',
        badge: '2.0 kV / 1.2 mA',
        color: '#38bdf8',
        desc: 'Low-energy non-lethal sensory tactile pulse (2.0 kV, 1.2 mA, 0.04 J). Induces an instantaneous harmless startle reflex at boots to prompt moving off track with ZERO burns or injury.'
      };
    } else if (obs.type === 'animal') {
      // Elephant calf / wildlife ~110kg
      return {
        voltage: '5.5 kV',
        current: '2.8 mA',
        energy: '0.80 J',
        compliance: 'IEC 60335-2-76 / RDSO Wildlife Protocol',
        typeLabel: 'ANIMAL (WILDLIFE CALF)',
        badge: '5.5 kV / 2.8 mA',
        color: '#f59e0b',
        desc: 'Veterinary pulsed fence gradient (5.5 kV, 2.8 mA, 0.8 J). Tailored for quadruped wildlife hooves to induce an involuntary flight trot into the meadow without harm.'
      };
    } else if (obs.type === 'cattle') {
      // Heavy Bull ~480kg
      return {
        voltage: '7.8 kV',
        current: '3.8 mA',
        energy: '1.40 J',
        compliance: 'RDSO Tech Circular 129 / IEC 60335-2-76',
        typeLabel: 'ANIMAL (HEAVY BULL)',
        badge: '7.8 kV / 3.8 mA',
        color: '#ec4899',
        desc: 'High-impedance cattle pulsed flight gradient (7.8 kV, 3.8 mA, 1.4 J). Overcomes thick keratin hooves to prompt immediate jump reflex off ballast.'
      };
    } else {
      return {
        voltage: '2.5 kV',
        current: '1.5 mA',
        energy: '0.05 J',
        compliance: 'RDSO Track Sensor Pulse',
        typeLabel: 'CARGO DEBRIS',
        badge: '2.5 kV / 1.5 mA',
        color: '#94a3b8',
        desc: 'Calibrated diagnostic pulse across track circuit.'
      };
    }
  }

  triggerDeterrence(obs, audio) {
    if (!obs || obs.isDeterred) return;

    obs.isDeterred = true;
    obs.hasBeenShocked = true;
    obs.shockTime = this.animTime;
    obs.deterMode = 'electric_shock';
    obs.fleeStartTime = this.animTime;
    obs.fleeDirection = (Math.random() > 0.5 ? 1 : -1);
    obs.isCleared = false;
    this.fxTimer = 1.2;

    // Trigger procedural Web Audio electric shock discharge tailored to mass & type
    if (audio) {
      audio.playElectricShockDischarge(obs.type, obs.mass);
    }

    // Spawn 3D Visual FX in world scene
    this.spawnDeterrenceFX(obs);
  }

  // Alias for backward compatibility
  triggerAnimalDeterrence(obs, audio) {
    return this.triggerDeterrence(obs, audio);
  }

  spawnDeterrenceFX(obs) {
    // Clear previous FX
    while (this.fxGroup.children.length > 0) {
      const c = this.fxGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      this.fxGroup.remove(c);
    }

    const obsPos = obs.mesh.position.clone();
    const transform = this.track.getTrackTransform(obs.progress, 0);
    const tangent = transform.tangent.clone().normalize();
    const forwardMeters = Math.max(15, Math.min(obs.forwardMeters || 65, 80));
    const trainFrontPos = obsPos.clone().sub(tangent.clone().multiplyScalar(forwardMeters));

    const isHuman = obs.type === 'human';

    // Tailored spark color: softer cyan for human, intense azure electric for animals
    const sparkColor = isHuman ? 0xa5f3fc : 0x38bdf8;
    const arcOffsets = isHuman
      ? [
          { pA: new THREE.Vector3(-0.45, 0.30, 0), pB: new THREE.Vector3(-0.15, 0.15, 0) },
          { pA: new THREE.Vector3( 0.45, 0.30, 0), pB: new THREE.Vector3( 0.15, 0.15, 0) },
          { pA: new THREE.Vector3(-0.35, 0.25, -1), pB: new THREE.Vector3(-0.10, 0.18, 0.5) },
          { pA: new THREE.Vector3( 0.35, 0.25, -1), pB: new THREE.Vector3( 0.10, 0.18, 0.5) }
        ]
      : [
          { pA: new THREE.Vector3(-0.84, 0.35, 0), pB: new THREE.Vector3(-0.35, 0.35, 0) },
          { pA: new THREE.Vector3( 0.84, 0.35, 0), pB: new THREE.Vector3( 0.35, 0.35, 0) },
          { pA: new THREE.Vector3(-0.60, 0.38, -2), pB: new THREE.Vector3(-0.25, 0.40, 1) },
          { pA: new THREE.Vector3( 0.60, 0.38, -2), pB: new THREE.Vector3( 0.25, 0.40, 1) }
        ];

    arcOffsets.forEach(arc => {
      const p1 = trainFrontPos.clone().add(arc.pA);
      const p2 = obsPos.clone().add(arc.pB);
      const pts = [];
      const segs = 10;
      const jitter = isHuman ? 0.25 : 0.45;
      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = p1.clone().lerp(p2, t);
        if (i > 0 && i < segs) {
          p.x += (Math.random() - 0.5) * jitter;
          p.y += (Math.random() - 0.5) * (jitter * 0.8);
        }
        pts.push(p);
      }
      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({ color: sparkColor, transparent: true, opacity: isHuman ? 0.85 : 0.98 });
      const line = new THREE.Line(geo, mat);
      line.userData = { isLightning: true, pA: p1, pB: p2, isHuman };
      this.fxGroup.add(line);
    });

    // Flashing discharge point light (Tailored intensity)
    const sparkLight = new THREE.PointLight(sparkColor, isHuman ? 3.5 : 7.0, isHuman ? 18 : 28);
    sparkLight.position.copy(obsPos.clone().add(new THREE.Vector3(0, isHuman ? 0.45 : 0.75, 0)));
    this.fxGroup.add(sparkLight);

    // Spark particles at ground hooves / boots (Tailored density and spread)
    const sparkCount = isHuman ? 14 : 32;
    const sparkGeo = new THREE.BufferGeometry();
    const sPos = [];
    const spread = isHuman ? 0.6 : 1.2;
    for (let s = 0; s < sparkCount; s++) {
      sPos.push(
        obsPos.x + (Math.random() - 0.5) * spread,
        obsPos.y + Math.random() * (isHuman ? 0.35 : 0.6),
        obsPos.z + (Math.random() - 0.5) * spread
      );
    }
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    const sparkMat = new THREE.PointsMaterial({ color: 0xe0f2fe, size: isHuman ? 0.05 : 0.08, transparent: true, opacity: 0.9 });
    this.fxGroup.add(new THREE.Points(sparkGeo, sparkMat));
  }

  updateDeterrenceFX(dt) {
    if (this.fxTimer > 0) {
      this.fxTimer -= dt;
      this.fxGroup.children.forEach(child => {
        if (child.isLine && child.userData.isLightning) {
          const pA = child.userData.pA;
          const pB = child.userData.pB;
          const posAttr = child.geometry.attributes.position;
          const arr = posAttr.array;
          const segs = 10;
          for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const p = pA.clone().lerp(pB, t);
            if (i > 0 && i < segs) {
              p.x += (Math.random() - 0.5) * 0.45;
              p.y += (Math.random() - 0.5) * 0.35;
            }
            arr[i * 3]     = p.x;
            arr[i * 3 + 1] = p.y;
            arr[i * 3 + 2] = p.z;
          }
          posAttr.needsUpdate = true;
        } else if (child.isPointLight) {
          child.intensity = (Math.random() > 0.2 ? 6 : 1) * (this.fxTimer / 1.2);
        }
      });

      if (this.fxTimer <= 0) {
        while (this.fxGroup.children.length > 0) {
          const c = this.fxGroup.children[0];
          if (c.geometry) c.geometry.dispose();
          this.fxGroup.remove(c);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Living On-Track Obstacle Animation Loop
  // Simulates breathing, head scanning, contrapposto weight-shifts,
  // grazing, tail swishes, ear twitches, and startled train-avoidance panic
  // ------------------------------------------------------------------
  animateLivingObstacles(dt, trainSpeedMs) {
    this.animTime += dt;
    const t = this.animTime;

    this.obstacles.forEach(obs => {
      if (obs.isCollected || !obs.mesh || !obs.mesh.userData) return;
      const ud = obs.mesh.userData;

      // Distance from oncoming train
      const dist = obs.forwardMeters !== undefined ? obs.forwardMeters : 100;
      const isTrainClose = dist < 95;  // Reacts when train enters 95m line-of-sight
      const isUrgent = dist < 50;      // Desperate panic when train is < 50m

      // ----------------------------------------------------------------
      // 1. MODERN CASUAL HUMAN (Living, Breathing, Blinking, Fluid Motion)
      // ----------------------------------------------------------------
      if (ud.type === 'human') {
        const seed = obs.id * 2.3;
        const localT = t + seed;

        // A. Natural Periodic Eye Blinking via Dynamic Canvas Texture
        if (ud.faceData) {
          const blinkCycle = (localT * 0.32) % 1.0;
          let blinkFactor = 0;
          if (blinkCycle < 0.04) {
            blinkFactor = 0.5 + 0.5 * Math.cos((blinkCycle / 0.04 - 0.5) * 2 * Math.PI);
          }
          if (ud.faceData.lastBlink === undefined || Math.abs(ud.faceData.lastBlink - blinkFactor) > 0.05 || (blinkFactor === 0 && ud.faceData.lastBlink !== 0)) {
            ud.faceData.drawFace(blinkFactor);
            ud.faceData.tex.needsUpdate = true;
            ud.faceData.lastBlink = blinkFactor;
          }
        } else if (ud.eyelids && ud.eyelids.length > 0) {
          const blinkCycle = (localT * 0.32) % 1.0;
          let blinkScale = 0.05; // Open eyes
          if (blinkCycle < 0.04) {
            blinkScale = 0.5 + 0.5 * Math.cos((blinkCycle / 0.04 - 0.5) * 2 * Math.PI);
          }
          ud.eyelids.forEach(el => {
            el.scale.y = blinkScale;
          });
        }

        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;

          // Track lateral offset calculation (perpendicular to track tangent)
          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          if (obs.moveOffTrackOnShock) {
            // ==============================================================
            // A. HUMAN ESCAPES TRACK SAFELY (Compelled by non-lethal E-shock)
            // ==============================================================
            const fleeDist = Math.min(5.5, fleeT * 4.2);
            const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(0.05, transform.position.y - Math.min(0.25, fleeDist * 0.06));
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.5) {
              obs.isCleared = true;
            }

            if (fleeT < 0.35) {
              // 1. Initial Shock Reflex Jump!
              obs.mesh.position.y += Math.sin(fleeT / 0.35 * Math.PI) * 0.22;
              if (ud.headGroup) ud.headGroup.rotation.x = -0.3;
              if (ud.armL) ud.armL.rotation.set(-0.8, 0, -0.6);
              if (ud.armR) ud.armR.rotation.set(-0.8, 0, 0.6);
            } else if (fleeT < 2.5) {
              // 2. High-speed running sprint off the track
              const fleeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fleeHeading);

              const runCycle = (fleeT - 0.35) * 14.0;
              if (ud.legL) ud.legL.rotation.x = Math.sin(runCycle) * 0.75;
              if (ud.lowerLegL) ud.lowerLegL.rotation.x = -Math.max(0, -Math.sin(runCycle) * 1.1);
              if (ud.legR) ud.legR.rotation.x = -Math.sin(runCycle) * 0.75;
              if (ud.lowerLegR) ud.lowerLegR.rotation.x = -Math.max(0, Math.sin(runCycle) * 1.1);

              if (ud.armL) ud.armL.rotation.x = -Math.sin(runCycle) * 0.85;
              if (ud.armR) ud.armR.rotation.x = Math.sin(runCycle) * 0.85;
              if (ud.torsoGroup) ud.torsoGroup.rotation.x = 0.22;
              if (ud.headGroup) ud.headGroup.rotation.x = 0.1;
            } else {
              // 3. Safe on the grassy shoulder, turning to watch the train pass safely
              const safeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), safeHeading);
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
            // ==============================================================
            // B. HUMAN SHOCKED BUT REMAINS FROZEN ON TRACK
            // ("If he not move it . then calculate to weaght , if under 150KG collect in net")
            // ==============================================================
            obs.isCleared = false;
            const basePos = transform.position.clone();
            if (fleeT < 0.35) {
              basePos.y += Math.sin(fleeT / 0.35 * Math.PI) * 0.18;
            }
            obs.mesh.position.copy(basePos);

            const shiver = Math.sin(localT * 25.0) * 0.04;
            if (ud.headGroup) {
              ud.headGroup.rotation.set(-0.25 + shiver, Math.sin(localT * 8.0) * 0.08, 0);
            }
            if (ud.torsoGroup) {
              ud.torsoGroup.rotation.x = -0.15 + shiver;
              ud.torsoGroup.rotation.z = Math.sin(localT * 12.0) * 0.03;
            }
            if (ud.armL) {
              ud.armL.rotation.set(-0.75 + Math.sin(localT * 14.0) * 0.10, 0, -0.25);
            }
            if (ud.forearmL) ud.forearmL.rotation.x = -1.2;
            if (ud.armR) {
              ud.armR.rotation.set(-0.65 + Math.sin(localT * 8.0) * 0.08, 0, 0.25);
            }
            if (ud.forearmR) ud.forearmR.rotation.x = -1.1;

            if (ud.legL) ud.legL.rotation.x = 0.38 + shiver * 0.5;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.65;
            if (ud.legR) ud.legR.rotation.x = 0.30 - shiver * 0.5;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.55;
          }
        } else if (!isTrainClose) {
          // B. Natural Idling: Chest Breathing & Gentle Contrapposto Weight Shift
          const breath = Math.sin(localT * 2.2);
          if (ud.torsoGroup) {
            ud.torsoGroup.scale.set(1.0 + 0.018 * breath, 1.0 + 0.010 * breath, 1.0 + 0.018 * breath);
            const weightShift = Math.sin(localT * 0.4);
            ud.torsoGroup.rotation.z = weightShift * 0.035;
            ud.torsoGroup.rotation.y = Math.sin(localT * 0.3) * 0.08;
            ud.torsoGroup.rotation.x = 0.03 + Math.sin(localT * 0.5) * 0.02;
          }

          // Natural Ambient Head Glancing (Checking tracks, scenery, casual tilt)
          if (ud.headGroup) {
            const headPitch = 0.10 + Math.sin(localT * 0.6) * 0.16;
            const headYaw = Math.sin(localT * 0.35) * 0.25 + Math.sin(localT * 0.9) * 0.10;
            const headTilt = Math.sin(localT * 0.4) * 0.05;
            ud.headGroup.rotation.set(headPitch, headYaw, headTilt);
          }

          // Natural Arm Sway & Hand Idling
          if (ud.armL) {
            ud.armL.rotation.x = 0.05 + Math.sin(localT * 0.8) * 0.06;
            ud.armL.rotation.z = -0.12 - Math.cos(localT * 0.4) * 0.04;
          }
          if (ud.forearmL) {
            ud.forearmL.rotation.x = -0.22 + Math.sin(localT * 0.8) * 0.05;
          }
          if (ud.armR) {
            ud.armR.rotation.x = 0.05 - Math.sin(localT * 0.7) * 0.06;
            ud.armR.rotation.z = 0.12 + Math.cos(localT * 0.4) * 0.04;
          }
          if (ud.forearmR) {
            ud.forearmR.rotation.x = -0.20 - Math.sin(localT * 0.7) * 0.05;
          }

          // Smooth Contrapposto Leg Micro-Weight Adjustments
          const legShift = Math.sin(localT * 0.4);
          if (ud.legL) {
            ud.legL.rotation.x = 0.02 + legShift * 0.03;
            ud.legL.rotation.z = legShift * 0.02;
          }
          if (ud.lowerLegL) {
            ud.lowerLegL.rotation.x = -Math.max(0, legShift * 0.06);
          }
          if (ud.legR) {
            ud.legR.rotation.x = 0.02 - legShift * 0.03;
            ud.legR.rotation.z = legShift * 0.02;
          }
          if (ud.lowerLegR) {
            ud.lowerLegR.rotation.x = -Math.max(0, -legShift * 0.06);
          }

        } else {
          // C. Reactive Train Alarm / Panic Reaction (Locomotive within line-of-sight!)
          const panicLerp = isUrgent ? 1.0 : Math.min(1.0, (95 - dist) / 45);

          // Head snaps directly up to lock eyes onto train
          if (ud.headGroup) {
            ud.headGroup.rotation.x = THREE.MathUtils.lerp(0.10, -0.25, panicLerp);
            ud.headGroup.rotation.y = THREE.MathUtils.lerp(0, Math.sin(localT * 12.0) * 0.08, panicLerp);
            ud.headGroup.rotation.z = 0;
          }

          // Rapid panicked hyperventilating breathing
          if (ud.torsoGroup) {
            ud.torsoGroup.rotation.x = THREE.MathUtils.lerp(0.03, -0.22, panicLerp);
            ud.torsoGroup.rotation.z = 0;
            const fastBreath = Math.sin(localT * 8.0) * 0.05;
            ud.torsoGroup.scale.set(1.0 + fastBreath, 1.0 + fastBreath * 0.5, 1.0 + fastBreath);
          }

          // Left arm held protectively in front of chest
          if (ud.armL) {
            const waveX = THREE.MathUtils.lerp(0.05, -0.85 + Math.sin(localT * 12.0) * 0.15, panicLerp);
            const waveZ = THREE.MathUtils.lerp(-0.12, -0.35 + Math.cos(localT * 12.0) * 0.10, panicLerp);
            ud.armL.rotation.set(waveX, 0, waveZ);
          }
          if (ud.forearmL) {
            ud.forearmL.rotation.x = THREE.MathUtils.lerp(-0.22, -1.25, panicLerp);
          }

          // Right arm held defensively in front of chest
          if (ud.armR) {
            const defX = THREE.MathUtils.lerp(0.05, -0.70 + Math.sin(localT * 6.0) * 0.08, panicLerp);
            const defZ = THREE.MathUtils.lerp(0.12, 0.30, panicLerp);
            ud.armR.rotation.set(defX, 0, defZ);
          }
          if (ud.forearmR) {
            ud.forearmR.rotation.x = THREE.MathUtils.lerp(-0.20, -1.15, panicLerp);
          }

          // Athletic evasive crouch
          if (ud.legL) ud.legL.rotation.x = THREE.MathUtils.lerp(0.02, 0.38, panicLerp);
          if (ud.lowerLegL) ud.lowerLegL.rotation.x = THREE.MathUtils.lerp(0, -0.65, panicLerp);
          if (ud.legR) ud.legR.rotation.x = THREE.MathUtils.lerp(0.02, 0.28, panicLerp);
          if (ud.lowerLegR) ud.lowerLegR.rotation.x = THREE.MathUtils.lerp(0, -0.55, panicLerp);
        }
      }

      // ----------------------------------------------------------------
      // 2. INDIAN ELEPHANT (Trunk Waving, Ear Flapping, Breathing, Trumpeting)
      // ----------------------------------------------------------------
      else if (ud.type === 'animal') {
        const seed = obs.id * 3.1;
        const localT = t + seed;

        // A. Natural Periodic Eye Blinking via Dynamic Canvas Texture
        if (ud.faceData) {
          const blinkCycle = (localT * 0.25) % 1.0;
          let blinkFactor = 0;
          if (blinkCycle < 0.05) {
            blinkFactor = 0.5 + 0.5 * Math.cos((blinkCycle / 0.05 - 0.5) * 2 * Math.PI);
          }
          if (ud.faceData.lastBlink === undefined || Math.abs(ud.faceData.lastBlink - blinkFactor) > 0.05 || (blinkFactor === 0 && ud.faceData.lastBlink !== 0)) {
            ud.faceData.drawFace(blinkFactor);
            ud.faceData.tex.needsUpdate = true;
            ud.faceData.lastBlink = blinkFactor;
          }
        } else if (ud.eyelids && ud.eyelids.length > 0) {
          const blinkCycle = (localT * 0.25) % 1.0;
          let blinkScale = 0.05;
          if (blinkCycle < 0.05) {
            blinkScale = 0.5 + 0.5 * Math.cos((blinkCycle / 0.05 - 0.5) * 2 * Math.PI);
          }
          ud.eyelids.forEach(el => { el.scale.y = blinkScale; });
        }

        // B. Deep Belly Breathing (Natural subtle breathing without distortion)
        const breath = Math.sin(localT * 1.8);
        if (ud.body) {
          ud.body.scale.set(1.0 + 0.018 * breath, 1.0 + 0.018 * breath, 1.0 + 0.012 * breath);
        }

        // C. Rhythmic Big Ear Flapping (Keeping cool and attentive, anchored to resting -0.45 / +0.45 baseline)
        const earFlap = Math.sin(localT * 2.2);
        if (!isTrainClose) {
          if (ud.earL) {
            ud.earL.rotation.y = -0.45 + earFlap * 0.16;
          }
          if (ud.earR) {
            ud.earR.rotation.y = 0.45 - earFlap * 0.16;
          }
        }

        // D. Tail Swishing
        if (ud.tail) {
          ud.tail.rotation.z = Math.sin(localT * 3.5) * 0.45;
          ud.tail.rotation.x = 0.30 + Math.abs(Math.sin(localT * 1.6)) * 0.20;
        }

        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;

          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          if (obs.moveOffTrackOnShock) {
            // ==============================================================
            // ELEPHANT ESCAPES TRACK INTO FIELD VIA E-SHOCK
            // ==============================================================
            const fleeDist = Math.min(6.0, fleeT * 3.2);
            const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(0.05, transform.position.y - Math.min(0.25, fleeDist * 0.06));
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.8) {
              obs.isCleared = true;
            }

            if (fleeT < 0.40) {
              obs.mesh.position.y += Math.sin(fleeT / 0.40 * Math.PI) * 0.20;
              if (ud.headGroup) ud.headGroup.rotation.x = -0.4;
              if (ud.earL) ud.earL.rotation.y = 0.5;
              if (ud.earR) ud.earR.rotation.y = -0.5;
            } else if (fleeT < 3.2) {
              const trotHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), trotHeading);

              const trotCycle = (fleeT - 0.40) * 8.0;
              if (ud.legs && ud.legs.length >= 4) {
                ud.legs[0].rotation.x = Math.sin(trotCycle) * 0.45;
                ud.legs[1].rotation.x = -Math.sin(trotCycle) * 0.45;
                ud.legs[2].rotation.x = -Math.sin(trotCycle + 0.4) * 0.40;
                ud.legs[3].rotation.x = Math.sin(trotCycle + 0.4) * 0.40;
              }
              if (ud.headGroup) ud.headGroup.rotation.x = -0.15 + Math.sin(trotCycle) * 0.12;
              if (ud.trunkSegments && ud.trunkSegments.length >= 5) {
                ud.trunkSegments[0].rotation.x = -0.6;
                ud.trunkSegments[1].rotation.x = -0.4;
              }
            } else {
              const safeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), safeHeading);
              if (ud.headGroup) {
                ud.headGroup.rotation.y = -fleeDir * 0.7;
                ud.headGroup.rotation.x = 0.05;
              }
            }
          } else {
            // ==============================================================
            // ELEPHANT CALF SHOCKED BUT REMAINS FROZEN ON TRACK
            // ("If he not move it . then calculate to weaght , if under 150KG collect in net")
            // ==============================================================
            obs.isCleared = false;
            const basePos = transform.position.clone();
            if (fleeT < 0.40) {
              basePos.y += Math.sin(fleeT / 0.40 * Math.PI) * 0.18;
            }
            obs.mesh.position.copy(basePos);

            if (ud.headGroup) {
              ud.headGroup.rotation.x = -0.38 + Math.sin(localT * 15.0) * 0.05;
              ud.headGroup.rotation.y = Math.sin(localT * 8.0) * 0.08;
            }
            if (ud.earL) ud.earL.rotation.y = 0.45;
            if (ud.earR) ud.earR.rotation.y = -0.45;
            if (ud.trunkSegments && ud.trunkSegments.length >= 5) {
              ud.trunkSegments[0].rotation.x = -0.85;
              ud.trunkSegments[1].rotation.x = -0.70;
              ud.trunkSegments[2].rotation.x = -0.55;
              ud.trunkSegments[3].rotation.x = -0.25;
              ud.trunkSegments[4].rotation.x = -0.35;
            }
            if (ud.legs) {
              const shudder = Math.sin(localT * 20.0) * 0.02;
              ud.legs.forEach(leg => { leg.rotation.z = shudder; });
            }
          }
        } else if (!isTrainClose) {
          // E. Normal Idling: Fluid Traveling Sinusoidal Wave along 5 Trunk Segments!
          // (Forward & upward arching wave extending proud over the track)
          if (ud.trunkSegments && ud.trunkSegments.length >= 5) {
            const trunkWaveTime = localT * 2.0;
            // Segment 0 (Root): gentle forward arch with breathing dip & side sweep
            ud.trunkSegments[0].rotation.x = -0.42 + Math.sin(trunkWaveTime) * 0.08;
            ud.trunkSegments[0].rotation.y = Math.cos(trunkWaveTime * 0.7) * 0.10;

            // Segment 1: curving forward and downward
            ud.trunkSegments[1].rotation.x = -0.36 + Math.sin(trunkWaveTime - 0.5) * 0.10;
            ud.trunkSegments[1].rotation.y = Math.cos(trunkWaveTime * 0.7 - 0.3) * 0.08;

            // Segment 2: bottom curve arc
            ud.trunkSegments[2].rotation.x = -0.28 + Math.sin(trunkWaveTime - 1.0) * 0.12;
            ud.trunkSegments[2].rotation.z = Math.sin(trunkWaveTime * 0.8) * 0.10;

            // Segment 3: curling upward
            ud.trunkSegments[3].rotation.x = 0.70 + Math.sin(trunkWaveTime - 1.5) * 0.15;

            // Segment 4 (Tip): graceful upward curl
            ud.trunkSegments[4].rotation.x = 0.75 + Math.sin(trunkWaveTime - 2.0) * 0.18;
          }

          // Gentle Head Bobbing in harmony with trunk
          if (ud.headGroup) {
            const headPitch = 0.05 + Math.sin(localT * 1.2) * 0.06;
            const headYaw = Math.sin(localT * 0.6) * 0.15;
            ud.headGroup.rotation.set(headPitch, headYaw, 0);
          }

          // Subtle Quadruped Stance Weight Shifting on pillar legs
          if (ud.legs) {
            const legShift = Math.sin(localT * 0.8) * 0.03;
            ud.legs.forEach((leg, idx) => {
              leg.rotation.x = (idx % 2 === 0 ? legShift : -legShift);
            });
          }

        } else {
          // F. Startled / Alarmed Trumpet Pose (Train Approaches!)
          const alarmLerp = isUrgent ? 1.0 : Math.min(1.0, (95 - dist) / 45);

          // Head raises high
          if (ud.headGroup) {
            ud.headGroup.rotation.x = THREE.MathUtils.lerp(0.05, -0.35, alarmLerp);
            ud.headGroup.rotation.y = THREE.MathUtils.lerp(0, Math.sin(localT * 10.0) * 0.08, alarmLerp);
          }

          // Ears flare wide forward in defensive threat display
          if (ud.earL) {
            ud.earL.rotation.y = THREE.MathUtils.lerp(-0.45, 0.40, alarmLerp);
          }
          if (ud.earR) {
            ud.earR.rotation.y = THREE.MathUtils.lerp(0.45, -0.40, alarmLerp);
          }

          // Magnificent Alarmed Trumpet Trunk Curl (Rearing trunk high into the air forward!)
          if (ud.trunkSegments && ud.trunkSegments.length >= 5) {
            ud.trunkSegments[0].rotation.x = THREE.MathUtils.lerp(-0.42, -0.85, alarmLerp);
            ud.trunkSegments[1].rotation.x = THREE.MathUtils.lerp(-0.36, -0.70, alarmLerp);
            ud.trunkSegments[2].rotation.x = THREE.MathUtils.lerp(-0.28, -0.55, alarmLerp);
            ud.trunkSegments[3].rotation.x = THREE.MathUtils.lerp(0.70, -0.25, alarmLerp);
            ud.trunkSegments[4].rotation.x = THREE.MathUtils.lerp(0.75, -0.35, alarmLerp);
          }

          // Sturdy startle stance
          if (ud.legs) {
            ud.legs.forEach((leg, idx) => {
              leg.rotation.x = (idx < 2 ? -0.10 : 0.08) * alarmLerp;
            });
          }
        }
      }

      // ----------------------------------------------------------------
      // 3. DESI COW / ZEBU BULL (Authentic cattle behavior & Active Escape)
      // ----------------------------------------------------------------
      else if (ud.type === 'cow' || ud.type === 'cattle') {
        const localT = t + obs.id * 1.6;
        const breath = Math.sin(localT * 1.8);

        // Barrel breathing
        if (ud.barrel) {
          ud.barrel.scale.set(0.95 + 0.02 * breath, 1.15 + 0.02 * breath, 1.0);
        }

        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;

          // Track lateral offset calculation (perpendicular to track tangent)
          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          if (obs.moveOffTrackOnShock) {
            // ==============================================================
            // ACTIVE NON-LETHAL ESCAPE REACTION (Fleeing the track safely!)
            // ==============================================================
            const fleeDist = Math.min(6.5, fleeT * 3.5);
            const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(0.05, transform.position.y - Math.min(0.30, fleeDist * 0.08));
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.6) {
              obs.isCleared = true;
            }

            if (fleeT < 0.35) {
              // A. Initial Jump / Muscular Shock Reflex
              obs.mesh.position.y += Math.sin(fleeT / 0.35 * Math.PI) * 0.24;
              if (ud.headGroup) ud.headGroup.rotation.x = -0.45;
              if (ud.tail) ud.tail.rotation.x = 0.95;
              if (ud.ears) ud.ears.forEach(ear => { ear.rotation.x = 0.6; });
            } else if (fleeT < 3.2) {
              // B. High-Speed Quadruped Gallop off the track
              const fleeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fleeHeading);

              const gallopFreq = 7.5 * Math.PI;
              const gallopCycle = (fleeT - 0.35) * gallopFreq;

              // Vigorous 4-leg gallop kinematics
              if (ud.legs && ud.legs.length === 4) {
                ud.legs[0].group.rotation.x = Math.sin(gallopCycle) * 0.60;
                ud.legs[1].group.rotation.x = -Math.sin(gallopCycle) * 0.60;
                ud.legs[2].group.rotation.x = -Math.sin(gallopCycle + 0.3) * 0.55;
                ud.legs[3].group.rotation.x = Math.sin(gallopCycle + 0.3) * 0.55;

                ud.legs.forEach(leg => {
                  if (leg.kneeGroup) {
                    leg.kneeGroup.rotation.x = Math.max(0, -leg.group.rotation.x * 0.9);
                  }
                });
              }

              // Head galloping bob & dewlap whip
              if (ud.headGroup) {
                ud.headGroup.rotation.x = -0.15 + Math.sin(gallopCycle * 2.0) * 0.22;
                ud.headGroup.rotation.y = Math.sin(gallopCycle) * 0.12;
              }
              if (ud.dewlap) {
                ud.dewlap.rotation.z = Math.sin(gallopCycle) * 0.45;
              }
              if (ud.tail) {
                ud.tail.rotation.x = 0.85;
                ud.tail.rotation.z = Math.sin(gallopCycle) * 0.40;
              }
            } else {
              // C. Safe in Meadow Pasture (Watching train pass safely from 6.5m distance)
              const safeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), safeHeading);

              if (ud.headGroup) {
                ud.headGroup.rotation.y = -fleeDir * 0.75;
                ud.headGroup.rotation.x = -0.10;
              }
              if (ud.legs) {
                ud.legs.forEach(leg => {
                  leg.group.rotation.x = 0;
                  if (leg.kneeGroup) leg.kneeGroup.rotation.x = 0;
                });
              }
              if (ud.tail) {
                ud.tail.rotation.z = Math.sin(localT * 3.0) * 0.40;
              }
            }
          } else {
            // Overweight bull remains stubborn / frozen on track (Overweight hazard!)
            obs.isCleared = false;
            const basePos = transform.position.clone();
            if (fleeT < 0.35) {
              basePos.y += Math.sin(fleeT / 0.35 * Math.PI) * 0.20;
            }
            obs.mesh.position.copy(basePos);
            if (ud.headGroup) {
              ud.headGroup.rotation.x = -0.40 + Math.sin(localT * 16.0) * 0.06;
              ud.headGroup.rotation.y = Math.sin(localT * 8.0) * 0.12;
            }
          }
        } else {
          // NORMAL / GRAZING CATTLE BEHAVIOR (When not yet deterred)
          // Characteristic cattle fly-swatting tail swish
          if (ud.tail) {
            ud.tail.rotation.z = Math.sin(localT * 3.2) * 0.60 + Math.sin(localT * 7.5) * 0.20;
            ud.tail.rotation.x = 0.15 + Math.abs(Math.sin(localT * 1.6)) * 0.25;
          }

          // Natural heavy leg weight shifting
          if (ud.legs) {
            const cowShift = Math.sin(localT * 0.6) * 0.03;
            ud.legs.forEach((leg, idx) => {
              leg.group.rotation.x = (idx % 2 === 0 ? cowShift : -cowShift);
            });
          }

          // Chewing / Rumination & Dewlap sway
          if (ud.headGroup) {
            const chew = Math.sin(localT * 4.5) * 0.05;
            const headYaw = Math.sin(localT * 0.4) * 0.22;
            const headPitch = isTrainClose ? -0.38 : (0.12 + Math.sin(localT * 0.5) * 0.22);
            ud.headGroup.rotation.set(headPitch + chew, headYaw, 0);
          }

          if (ud.dewlap) {
            ud.dewlap.rotation.z = Math.sin(localT * 2.0) * 0.18;
          }

          // Ear droop and flick
          if (ud.ears) {
            ud.ears.forEach((ear, idx) => {
              ear.rotation.z = (idx === 0 ? -1.15 : 1.15) + Math.sin(localT * 4.0 + idx * 3.0) * 0.18;
            });
          }
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // Main Detection, AI Decision Matrix & Obstacle Scoop Loop
  // Enforces: Collect ONLY when Mass <= 150 kg AND Speed <= 150 km/h
  // Net defaults to CLOSED / STOWED; Opens with animation upon detection
  // ------------------------------------------------------------------
  update(dt, trainProgress, trainSpeedMs, captureNet, audio, physics, trackLength, aiSensorAuto = true) {
    let closestObstacle = null;
    let minForwardDist = Infinity;
    const speedKmh = trainSpeedMs * 3.6;
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;

    // Evaluate track spline distance to all uncollected obstacles ahead of train
    this.obstacles.forEach(obs => {
      if (obs.isCollected) return;

      // Forward distance calculation on circular track spline
      let diff = obs.progress - trainProgress;
      if (diff < 0) diff += 1.0;
      const forwardMeters = diff * actualTrackLength;
      obs.forwardMeters = forwardMeters;

      // Only consider obstacles within 1 km (1000m) scanning range ahead
      if (forwardMeters < minForwardDist && forwardMeters <= 1000) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    // Run dynamic living on-track organic animations for all obstacles
    this.animateLivingObstacles(dt, trainSpeedMs);

    // Update 3D visual FX for deterrence discharges
    this.updateDeterrenceFX(dt);

    // If an obstacle is detected within 1 km (1000m) Camera & LiDAR range
    if (closestObstacle && minForwardDist <= 1000) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;

      // Obtain subject-tailored electric shock specifications (Human vs Animal)
      const tailored = this.getTailoredShockSpecs(closestObstacle);
      this.telemetry.tailoredSpec = `⚡ ACTIVE [${tailored.badge}]`;
      this.telemetry.tailoredLabel = tailored.typeLabel;

      // ================================================================
      // STAGE 1: DELIVER ELECTRIC SHOCK TO MOVE TARGET OFF TRACK
      // "We will deliver an electric shock to everyone so that they move off the track"
      // ================================================================
      if (aiSensorAuto && !closestObstacle.hasBeenShocked) {
        this.triggerDeterrence(closestObstacle, audio);
        if (audio) audio.playTargetAcquiredBeep(false);
        this.telemetry.alertType = 'deploy';
        this.telemetry.alertMessage = `⚡ 1KM DETECTION: ${closestObstacle.name.toUpperCase()} ON TRACK AT ${Math.round(minForwardDist)}M! DELIVERING ELECTRIC SHOCK TO MOVE OFF TRACK!`;
      }

      // Continuous repeat electric shock pulse every 1.4s while target remains on track
      if (aiSensorAuto && !closestObstacle.isCleared && this.fxTimer <= 0) {
        this.spawnDeterrenceFX(closestObstacle);
        if (audio) audio.playElectricShockDischarge(closestObstacle.type, closestObstacle.mass);
        this.fxTimer = 1.0;
      }

      // ================================================================
      // EVALUATION: DID TARGET MOVE OFF TRACK?
      // ================================================================
      if (closestObstacle.isCleared) {
        // Target successfully moved off track!
        if (captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = false;
        this.telemetry.tailoredSpec = 'TARGET MOVED OFF TRACK';
        this.telemetry.action = `✅ TARGET MOVED OFF TRACK VIA ELECTRIC SHOCK — TRACK CLEAR (NO NET NEEDED)`;
        this.telemetry.alertType = 'success';
        this.telemetry.alertMessage = `🎯 TRACK CLEAR! ${closestObstacle.name.toUpperCase()} MOVED SAFELY OFF TRACK VIA ELECTRIC SHOCK! ZERO CASUALTIES!`;

        if (physics && physics.emergencyBrake) {
          physics.setEmergencyBrake(false);
        }
      } else if (closestObstacle.isDeterred && closestObstacle.moveOffTrackOnShock) {
        // Actively moving off track
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.action = `⚡ ELECTRIC SHOCK DELIVERED — TARGET MOVING OFF TRACK (${Math.round(minForwardDist)}M)`;
        this.telemetry.alertType = 'deploy';
      }
      // ================================================================
      // STAGE 2: TARGET STILL DOES NOT MOVE -> DEPLOY CAPTURE NET IF WEIGHT < 150 KG
      // "if they still do not move, we will deploy a capture net for those weighing under 150 kg. Nothing beyond this ."
      // ================================================================
      else {
        const isUnder150kg = closestObstacle.mass < 150;
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = isUnder150kg;

        // CASE A: WEIGHT < 150 KG (e.g. Person 72kg, Wildlife 110kg)
        if (isUnder150kg) {
          if (minForwardDist <= 40) {
            // Automatically deploy net at 30-40 meters
            this.telemetry.action = `🪤 TARGET NOT MOVED (30-40M) — CAPTURE NET DEPLOYED (${closestObstacle.mass}KG < 150KG)`;
            this.telemetry.alertType = 'deploy';

            if (aiSensorAuto && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
              this.telemetry.alertMessage = `🪤 TARGET ON TRACK WITHIN 30-40M (${Math.round(minForwardDist)}M)! WEIGHT ${closestObstacle.mass}KG < 150KG: CAPTURE NET AUTOMATICALLY DEPLOYED!`;
            }

            // Scoop collection at <= 14.0m
            if (minForwardDist <= 14.0) {
              this.scene.remove(closestObstacle.mesh);
              captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
              closestObstacle.isCollected = true;

              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG) — RESCUE SUCCESS!`;
              this.telemetry.alertType = 'success';
              this.telemetry.alertMessage = `🎯 OBSTACLE SAFELY SECURED: ${closestObstacle.name} (${closestObstacle.mass} kg) in capture net cradle. Zero harm!`;
            }
          } else {
            // Target is > 40m away: E-shock delivered, target not moving, net armed for 30-40m
            this.telemetry.action = `⚡ E-SHOCK DELIVERED (NOT MOVED) — WEIGHT ${closestObstacle.mass}KG < 150KG: NET WILL DEPLOY AT 30-40M`;
            this.telemetry.alertType = 'deploy';
          }
        }
        // CASE B: WEIGHT >= 150 KG (e.g. Heavy Bull 480kg)
        // Net is ONLY for under 150 kg! Net remains stowed, emergency brake engages!
        else {
          if (captureNet.isDeployed) {
            captureNet.setDeployed(false);
          }

          if (minForwardDist <= 40) {
            this.telemetry.action = `⚠️ TARGET NOT MOVED — WEIGHT ${closestObstacle.mass}KG ≥ 150KG: NET STOWED (UNDER 150KG ONLY)! EMERGENCY BRAKE ENGAGED`;
            this.telemetry.alertType = 'hazard';
            this.telemetry.alertMessage = `⚠️ OVERWEIGHT HAZARD (${closestObstacle.mass}KG ≥ 150KG)! NET STOWED! EMERGENCY BRAKE ENGAGED!`;

            if (minForwardDist <= 35) {
              if (physics && !physics.emergencyBrake) {
                physics.setEmergencyBrake(true);
              }
              if (audio) {
                audio.startHorn();
              }
            }
          } else {
            this.telemetry.action = `⚡ E-SHOCK DELIVERED (NOT MOVED) — WEIGHT ${closestObstacle.mass}KG ≥ 150KG: NET STOWED (OVER 150KG)! BRAKE ARMED`;
            this.telemetry.alertType = 'hazard';
          }
        }
      }
    } else {
      // Clear target telemetry
      this.telemetry.targetDetected = false;
      this.telemetry.type = null;
      this.telemetry.name = 'NONE (TRACK CLEAR)';
      this.telemetry.distance = null;
      this.telemetry.mass = null;
      this.telemetry.tailoredSpec = null;
      this.telemetry.tailoredLabel = null;
      this.telemetry.canCollect = false;
      this.telemetry.action = 'TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)';
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = 'info';

      if (captureNet.isDeployed && captureNet.collectedList.length === 0) {
        captureNet.setDeployed(false);
      }
    }

    return this.telemetry;
  }

  // Clear all collected obstacles from the net
  resetCollected(captureNet) {
    if (captureNet) {
      captureNet.clearCradle();
    }
    this.telemetry.collectedCount = 0;
    this.telemetry.collectedWeight = 0;
  }
}

