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

    // Active Non-Lethal Deterrence Suite for Over-150kg Animals (Track Clearance)
    this.activeDeterrenceMode = 'electric_shock';
    this.deterrenceSpecs = {
      electric_shock: {
        id: 'electric_shock',
        name: 'Track Electric Shock (High-Voltage Safety Analysis)',
        shortTitle: 'TRACK ELECTRIC SHOCK',
        badge: '6.5kV PULSE',
        color: '#38bdf8',
        detail: 'Discharges non-lethal pulsed electrical gradient (6.5 kV, < 3.8 mA, micro-joule duration) across track rails and forward contact sweepers (compliant with IEC 60335-2-76 / RDSO). Induces involuntary muscular jump reflex through hooves to compel immediate flight off track without tissue burns or physical injury.'
      },
      bio_acoustic: {
        id: 'bio_acoustic',
        name: 'Bio-Acoustic Swarm (Zero-Harm Repellent)',
        shortTitle: 'PLAN BEE BIO-SWARM',
        badge: '380Hz SWARM',
        color: '#f59e0b',
        detail: "Indian Railways 'Plan Bee' award-winning acoustic deterrent. Broadcasts directional 280–420 Hz audio signature replicating swarming honeybees. Triggers innate evolutionary flight response in heavy cattle and elephants fearing bee stings to sensitive snouts and eyes."
      },
      lrad: {
        id: 'lrad',
        name: 'Acoustic LRAD (Directional Sound 1-1.5km)',
        shortTitle: 'ACOUSTIC LRAD',
        badge: '138dB BEAM',
        color: '#06b6d4',
        detail: 'Long Range Acoustic Device emitting focused 138 dB directional acoustic wave front (2.5 kHz siren pulses) penetrating wind noise up to 1.5 km ahead. Projects clear auditory alarm exclusively along rail corridor to disperse wildlife.'
      },
      mmw_denial: {
        id: 'mmw_denial',
        name: 'Pulsed Millimeter Wave (Active Denial)',
        shortTitle: 'PULSED MMW DENIAL',
        badge: '95GHz PULSE',
        color: '#ec4899',
        detail: '95 GHz directed electromagnetic micro-pulses penetrating only 0.4 mm of epidermal moisture. Rapidly excites surface water molecules, inducing an instantaneous, harmless surface heat sensation that triggers an instinctive retreat reflex without tissue damage.'
      },
      holographic_mimo: {
        id: 'holographic_mimo',
        name: 'Holographic MIMO (Continuous Metasurface)',
        shortTitle: 'HOLOGRAPHIC MIMO',
        badge: 'METASURFACE',
        color: '#10b981',
        detail: 'Reconfigurable Intelligent Surface (RIS) holographic metasurface antenna. Dynamically synthesizes targeted electromagnetic wavefronts focused on the animal\'s exact spatial coordinates to guide it away from the track.'
      },
      retrodirective: {
        id: 'retrodirective',
        name: 'Retrodirective (Zero-Latency Conjugate)',
        shortTitle: 'RETRODIRECTIVE',
        badge: 'PHASE-CONJUGATE',
        color: '#8b5cf6',
        detail: 'Phase-conjugate retrodirective array. Automatically steers non-lethal deterrence pulses along the exact received radar line-of-sight vector with zero digital processing latency, continuously tracking the obstacle as the train approaches.'
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
      elephantSkin: new THREE.MeshStandardMaterial({ color: 0x567b8d, roughness: 0.74 }), // Slate blue-grey body skin
      elephantSkinDark: new THREE.MeshStandardMaterial({ color: 0x3d5c6b, roughness: 0.78 }), // Dark contour accents & creases
      elephantEarInner: new THREE.MeshStandardMaterial({ color: 0x4a6b7a, roughness: 0.82 }), // Ear contour / inner face
      elephantTusk: new THREE.MeshStandardMaterial({ color: 0xfffae5, roughness: 0.32, metalness: 0.05 }), // Smooth ivory tusks
      elephantTuskTip: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.35 }), // Warm golden tusk tip
      elephantNails: new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.42 }), // 3 cute yellow toenails per foot
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

  // 1. Modern Stylized Human Character (Mass: 72 kg <= 150 kg -> SCOOPABLE)
  // Exact anatomical & aesthetic match to media_1793819995371_c74a70f7.png:
  // Auburn/ginger swept-crest quiff hair, warm peach skin, blushing rosy cheeks, friendly eyes with catchlights,
  // cream short-sleeve polo shirt with crisp white collar, warm brown chinos, and dark casual loafers
  buildHumanMesh() {
    const group = new THREE.Group();
    group.name = 'stylizedHuman';

    const faceData = this.createHumanFaceTexture();

    // A. Pelvis / Hips in Warm Brown Chinos (Root of body at y = 0.88)
    const pelvis = new THREE.Mesh(
      new THREE.CylinderGeometry(0.150, 0.138, 0.16, 22),
      this.materials.humanPantsBrown
    );
    pelvis.position.y = 0.88;
    pelvis.scale.set(1.02, 1.0, 0.76);
    pelvis.castShadow = true;
    group.add(pelvis);

    const saddle = new THREE.Mesh(
      new THREE.SphereGeometry(0.142, 18, 14),
      this.materials.humanPantsBrown
    );
    saddle.position.set(0, 0.84, 0);
    saddle.scale.set(1.02, 0.85, 0.76);
    group.add(saddle);

    // B. Torso Group (Cream Polo Shirt + Folded White Collar) pivoted at y = 0.94
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.94, 0);

    // Athletic Tapered Polo Shirt Chest & Waist
    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.165, 0.22, 24),
      this.materials.humanPoloCream
    );
    chest.position.y = 0.29;
    chest.scale.set(1.08, 1.0, 0.75);
    chest.castShadow = true;
    torsoGroup.add(chest);

    const midriff = new THREE.Mesh(
      new THREE.CylinderGeometry(0.165, 0.148, 0.20, 24),
      this.materials.humanPoloCream
    );
    midriff.position.y = 0.11;
    midriff.scale.set(1.04, 1.0, 0.75);
    midriff.castShadow = true;
    torsoGroup.add(midriff);

    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.152, 0.152, 0.04, 24),
      this.materials.humanPoloCream
    );
    hem.position.y = 0.01;
    hem.scale.set(1.04, 1.0, 0.76);
    torsoGroup.add(hem);

    // Smooth Rounded Deltoid Caps (Connecting shoulders smoothly into arms)
    [-0.17, 0.17].forEach(sx => {
      const deltoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 18, 14),
        this.materials.humanPoloCream
      );
      deltoid.position.set(sx, 0.33, 0);
      deltoid.scale.set(1.0, 0.85, 0.95);
      torsoGroup.add(deltoid);
    });

    // Center Button Placket on Chest with Pearl Buttons
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.026, 0.16, 0.012),
      this.materials.humanPoloCollar
    );
    placket.position.set(0, 0.26, 0.112);
    torsoGroup.add(placket);

    [0.30, 0.24].forEach(by => {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.3 })
      );
      button.position.set(0, by, 0.119);
      torsoGroup.add(button);
    });

    // Peach Skin Neck
    const neck = new THREE.Mesh(
      new THREE.CylinderGeometry(0.046, 0.052, 0.12, 18),
      this.materials.humanSkinPeach
    );
    neck.position.y = 0.42;
    torsoGroup.add(neck);

    // Crisp Folded White Polo Collar (Neckband + Flat Folded Collar Wings)
    const collarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.060, 0.072, 0.045, 20),
      this.materials.humanPoloCollar
    );
    collarBand.position.y = 0.39;
    torsoGroup.add(collarBand);

    [-1, 1].forEach(side => {
      const collarWing = new THREE.Mesh(
        new THREE.BoxGeometry(0.070, 0.085, 0.014),
        this.materials.humanPoloCollar
      );
      collarWing.position.set(side * 0.048, 0.36, 0.076);
      collarWing.rotation.set(-0.35, side * 0.28, side * -0.36);
      torsoGroup.add(collarWing);
    });

    // C. Sculpted Head Group pivoted at neck top (y = 0.50 on torso)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0.010);

    // Seamless Head Sphere with Integrated Canvas Texture (Zero clipping, zero planes!)
    const headGeo = new THREE.SphereGeometry(0.122, 32, 24);
    headGeo.rotateY(-Math.PI / 2); // Aligns center UV to face forward (+Z)

    const headMesh = new THREE.Mesh(
      headGeo,
      new THREE.MeshStandardMaterial({
        map: faceData.tex,
        roughness: 0.65
      })
    );
    headMesh.scale.set(0.94, 1.05, 0.96);
    headMesh.castShadow = true;
    headGroup.add(headMesh);

    // Auburn / Ginger Sculpted 3D Quiff Hair (Volumetric sweep on top/back, zero face clipping!)
    const hairShape = new THREE.Shape();
    hairShape.moveTo(-0.09, 0);
    hairShape.bezierCurveTo(-0.13, 0.08, -0.07, 0.20, 0.05, 0.22);
    hairShape.bezierCurveTo(0.14, 0.23, 0.18, 0.14, 0.14, 0.05);
    hairShape.bezierCurveTo(0.09, -0.01, 0.02, -0.02, -0.09, 0);
    hairShape.closePath();

    const hairQuiff = new THREE.Mesh(
      new THREE.ExtrudeGeometry(hairShape, {
        depth: 0.14,
        bevelEnabled: true,
        bevelThickness: 0.025,
        bevelSize: 0.020,
        bevelSegments: 4
      }),
      this.materials.humanHairGinger
    );
    hairQuiff.position.set(0, 0.05, 0.015);
    hairQuiff.rotation.set(-0.30, 0.15, -0.10);
    headGroup.add(hairQuiff);

    // Crown & Back Hair Volume Cap (Covers top and back only, leaving face clear)
    const backHair = new THREE.Mesh(
      new THREE.SphereGeometry(0.124, 24, 16, -Math.PI * 0.70, Math.PI * 1.40, 0, Math.PI * 0.65),
      this.materials.humanHairGinger
    );
    backHair.position.set(0, 0.015, -0.015);
    backHair.scale.set(0.96, 1.05, 1.0);
    headGroup.add(backHair);

    // Sideburns & Stylized Ears
    [-1, 1].forEach(side => {
      const sideburn = new THREE.Mesh(
        new THREE.BoxGeometry(0.016, 0.055, 0.032),
        this.materials.humanHairGinger
      );
      sideburn.position.set(side * 0.108, 0.012, 0.018);
      headGroup.add(sideburn);

      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 14, 10),
        this.materials.humanSkinPeach
      );
      ear.scale.set(0.35, 1.15, 0.75);
      ear.position.set(side * 0.115, -0.008, -0.005);
      ear.rotation.y = side * 0.18;
      headGroup.add(ear);
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

      // Dark Casual Slip-On Loafer / Shoe (Exact match to Reference Image 1)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.40, 0.025);

      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.076, 0.046, 0.17),
        this.materials.humanShoesDark
      );
      shoeBody.position.set(0, 0, 0.01);
      shoeGroup.add(shoeBody);

      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.038, 14, 10),
        this.materials.humanShoesDark
      );
      toeCap.scale.set(1.0, 0.65, 1.0);
      toeCap.position.set(0, 0, 0.085);
      shoeGroup.add(toeCap);

      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.082, 0.016, 0.185),
        this.materials.humanShoesDark
      );
      sole.position.set(0, -0.028, 0.015);
      shoeGroup.add(sole);

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

  // 2. Indian Elephant (Mass: 110 kg <= 150 kg -> SCOOPABLE IN RESCUE NET)
  // Exact anatomical & artistic match to media_1793820037213_e448b2e7.jpg:
  // Plump slate blue-grey rounded body, big floppy flapping fan ears with dark contours,
  // multi-segment articulated flexible curling/raising trunk, upward curved ivory tusks with golden tips,
  // friendly cartoon eyes with white sclera and specular catchlights, sweet smile,
  // 4 sturdy pillar legs with 3 cute yellow semi-circular toenails per foot, and brush-tufted tail
  buildAnimalMesh() {
    const group = new THREE.Group();
    group.name = 'indianElephant';

    const elephantFaceData = this.createElephantFaceTexture();

    // A. Plump Rounded Slate Blue-Grey Body Barrel & Spine Contours
    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(0.44, 0.46, 0.92, 24).rotateX(Math.PI / 2),
      this.materials.elephantSkin
    );
    body.position.set(0, 0.65, 0);
    body.scale.set(1.05, 1.18, 1.0);
    body.castShadow = true;
    group.add(body);

    // Front Chest Brisket / Withers
    const chest = new THREE.Mesh(
      new THREE.SphereGeometry(0.45, 22, 18),
      this.materials.elephantSkin
    );
    chest.position.set(0, 0.70, 0.32);
    chest.scale.set(0.98, 1.15, 0.92);
    chest.castShadow = true;
    group.add(chest);

    // Arched Back Spine Hump (Signature Indian Elephant Profile)
    const spineHump = new THREE.Mesh(
      new THREE.CylinderGeometry(0.28, 0.35, 0.78, 18).rotateX(Math.PI / 2),
      this.materials.elephantSkin
    );
    spineHump.position.set(0, 0.88, 0.02);
    spineHump.scale.set(0.75, 0.85, 1.0);
    spineHump.castShadow = true;
    group.add(spineHump);

    // Rounded Pelvic Rump Haunches
    const rump = new THREE.Mesh(
      new THREE.SphereGeometry(0.43, 22, 18),
      this.materials.elephantSkin
    );
    rump.position.set(0, 0.70, -0.34);
    rump.scale.set(0.95, 1.12, 0.92);
    rump.castShadow = true;
    group.add(rump);

    // Deep Rounded Underbelly
    const belly = new THREE.Mesh(
      new THREE.CylinderGeometry(0.36, 0.40, 0.64, 18).rotateX(Math.PI / 2),
      this.materials.elephantSkin
    );
    belly.position.set(0, 0.50, 0);
    belly.scale.set(0.90, 0.72, 1.0);
    group.add(belly);

    // B. Expressive Elephant Head Group (Pivoted at y = 0.88, z = 0.45)
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.88, 0.45);

    // Seamless Domed Elephant Head with Integrated Canvas Texture (Zero planes, zero clipping!)
    const headGeo = new THREE.SphereGeometry(0.28, 32, 24);
    headGeo.rotateY(-Math.PI / 2); // Aligns center UV to face forward (+Z)

    const cranium = new THREE.Mesh(
      headGeo,
      new THREE.MeshStandardMaterial({
        map: elephantFaceData.tex,
        roughness: 0.68
      })
    );
    cranium.scale.set(0.94, 1.06, 1.04);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Twin Forehead Bumps (Distinct Indian Elephant cranial profile)
    [-0.095, 0.095].forEach(bx => {
      const bump = new THREE.Mesh(
        new THREE.SphereGeometry(0.095, 16, 12),
        this.materials.elephantSkin
      );
      bump.position.set(bx, 0.22, 0.03);
      bump.scale.set(0.95, 1.0, 1.1);
      headGroup.add(bump);
    });

    // Big Floppy Fan Ears with Extruded Wavy Contours (Exact match to Reference Image 2)
    const earL = new THREE.Group();
    earL.position.set(-0.24, 0.06, -0.04);
    const earR = new THREE.Group();
    earR.position.set(0.24, 0.06, -0.04);

    // Left Ear Extruded Shape
    const earShapeL = new THREE.Shape();
    earShapeL.moveTo(0, 0.05);
    earShapeL.bezierCurveTo(-0.08, 0.22, -0.26, 0.28, -0.36, 0.16);
    earShapeL.bezierCurveTo(-0.44, 0.06, -0.42, -0.14, -0.32, -0.28);
    earShapeL.bezierCurveTo(-0.20, -0.40, -0.08, -0.32, 0, -0.18);
    earShapeL.closePath();

    const earGeoL = new THREE.ExtrudeGeometry(earShapeL, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 4
    });
    const earMeshL = new THREE.Mesh(earGeoL, this.materials.elephantSkin);
    earL.add(earMeshL);

    const innerEarL = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeL, { depth: 0.005, bevelEnabled: false }),
      this.materials.elephantEarInner
    );
    innerEarL.scale.set(0.82, 0.82, 1.0);
    innerEarL.position.set(-0.02, 0, 0.026);
    earL.add(innerEarL);

    // Right Ear Extruded Shape (Mirrored)
    const earShapeR = new THREE.Shape();
    earShapeR.moveTo(0, 0.05);
    earShapeR.bezierCurveTo(0.08, 0.22, 0.26, 0.28, 0.36, 0.16);
    earShapeR.bezierCurveTo(0.44, 0.06, 0.42, -0.14, 0.32, -0.28);
    earShapeR.bezierCurveTo(0.20, -0.40, 0.08, -0.32, 0, -0.18);
    earShapeR.closePath();

    const earGeoR = new THREE.ExtrudeGeometry(earShapeR, {
      depth: 0.025,
      bevelEnabled: true,
      bevelThickness: 0.018,
      bevelSize: 0.015,
      bevelSegments: 4
    });
    const earMeshR = new THREE.Mesh(earGeoR, this.materials.elephantSkin);
    earR.add(earMeshR);

    const innerEarR = new THREE.Mesh(
      new THREE.ExtrudeGeometry(earShapeR, { depth: 0.005, bevelEnabled: false }),
      this.materials.elephantEarInner
    );
    innerEarR.scale.set(0.82, 0.82, 1.0);
    innerEarR.position.set(0.02, 0, 0.026);
    earR.add(innerEarR);

    // Resting rotation: naturally angled back over shoulders
    earL.rotation.set(-0.15, -0.45, -0.10);
    earR.rotation.set(-0.15, 0.45, 0.10);

    headGroup.add(earL);
    headGroup.add(earR);

    // Upward-Curved Ivory Tusks with Golden Tips (Smooth 3D Catmull-Rom Tube Curves)
    const tuskCurveL = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.13, -0.14, 0.22),
      new THREE.Vector3(-0.19, -0.25, 0.38),
      new THREE.Vector3(-0.24, -0.10, 0.54)
    ]);
    const tuskGeoL = new THREE.TubeGeometry(tuskCurveL, 20, 0.035, 12, false);
    const tuskMeshL = new THREE.Mesh(tuskGeoL, this.materials.elephantTusk);
    headGroup.add(tuskMeshL);

    const tuskTipL = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      this.materials.elephantTuskTip
    );
    tuskTipL.position.set(-0.24, -0.10, 0.54);
    headGroup.add(tuskTipL);

    const tuskCurveR = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.13, -0.14, 0.22),
      new THREE.Vector3(0.19, -0.25, 0.38),
      new THREE.Vector3(0.24, -0.10, 0.54)
    ]);
    const tuskGeoR = new THREE.TubeGeometry(tuskCurveR, 20, 0.035, 12, false);
    const tuskMeshR = new THREE.Mesh(tuskGeoR, this.materials.elephantTusk);
    headGroup.add(tuskMeshR);

    const tuskTipR = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 10, 8),
      this.materials.elephantTuskTip
    );
    tuskTipR.position.set(0.24, -0.10, 0.54);
    headGroup.add(tuskTipR);

    // Articulated 5-Segment Forward-Curling Flexible Trunk
    // (Negative rotations arch trunk FORWARD and UP gracefully over the track)
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

    // Segment 3
    const trunkSeg3 = new THREE.Group();
    trunkSeg3.position.set(0, -0.14, 0);
    trunkSeg3.rotation.x = 0.70; // Curls UPWARD
    const m3 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.062, 0.050, 0.14, 16),
      this.materials.elephantSkin
    );
    m3.position.y = -0.07;
    trunkSeg3.add(m3);

    // Segment 4: Curled Trunk Tip with Nostrils
    const trunkTip = new THREE.Group();
    trunkTip.position.set(0, -0.13, 0);
    trunkTip.rotation.x = 0.75; // Upward-pointing tip
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

    // C. 4 Sturdy Pillar Legs with 3 Cute Yellow Toenails Each (Exact match to Reference Image 2)
    const legs = [];
    [
      { x: -0.25, z:  0.30, isFront: true },
      { x:  0.25, z:  0.30, isFront: true },
      { x: -0.23, z: -0.30, isFront: false },
      { x:  0.23, z: -0.30, isFront: false }
    ].forEach(lp => {
      const legGroup = new THREE.Group();
      legGroup.position.set(lp.x, 0.62, lp.z);

      // Spherical Shoulder/Hip Socket blending smoothly into body
      const hipSocket = new THREE.Mesh(
        new THREE.SphereGeometry(0.145, 18, 14),
        this.materials.elephantSkin
      );
      legGroup.add(hipSocket);

      // Upper Pillar Leg
      const pillarUpper = new THREE.Mesh(
        new THREE.CylinderGeometry(0.138, 0.122, 0.34, 20),
        this.materials.elephantSkin
      );
      pillarUpper.position.y = -0.16;
      legGroup.add(pillarUpper);

      // Knee Joint Bulge
      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.124, 16, 12),
        this.materials.elephantSkin
      );
      knee.position.y = -0.34;
      legGroup.add(knee);

      // Lower Pillar Foot
      const lowerPillar = new THREE.Mesh(
        new THREE.CylinderGeometry(0.122, 0.140, 0.26, 20),
        this.materials.elephantSkin
      );
      lowerPillar.position.y = -0.48;
      legGroup.add(lowerPillar);

      // Round Padded Foot Base
      const footPad = new THREE.Mesh(
        new THREE.CylinderGeometry(0.140, 0.145, 0.06, 20),
        this.materials.elephantSkin
      );
      footPad.position.y = -0.59;
      legGroup.add(footPad);

      // 3 Cute Yellow Semi-Circular Toenails along the front curve
      const nailRadius = 0.144;
      [-0.060, 0.0, 0.060].forEach((nx) => {
        const nail = new THREE.Mesh(
          new THREE.CylinderGeometry(0.028, 0.028, 0.044, 12).rotateX(Math.PI / 2),
          this.materials.elephantNails
        );
        const nz = Math.sqrt(Math.max(0, nailRadius * nailRadius - nx * nx));
        nail.position.set(nx, -0.61, nz);
        nail.scale.set(1.0, 0.65, 0.85);
        legGroup.add(nail);
      });

      group.add(legGroup);
      legs.push(legGroup);
    });

    // D. Cute Slender Tail with Dark Brush Tuft
    const tail = new THREE.Group();
    tail.position.set(0, 0.66, -0.44);

    const tailCord = new THREE.Mesh(
      new THREE.CylinderGeometry(0.022, 0.015, 0.34, 10),
      this.materials.elephantSkin
    );
    tailCord.position.set(0, -0.16, -0.06);
    tailCord.rotation.x = 0.35;
    tail.add(tailCord);

    const tailTuft = new THREE.Mesh(
      new THREE.ConeGeometry(0.042, 0.12, 10),
      this.materials.elephantTailBrush
    );
    tailTuft.position.set(0, -0.32, -0.12);
    tailTuft.rotation.x = 0.35;
    tail.add(tailTuft);

    group.add(tail);

    group.userData = {
      type: 'animal',
      body,
      chest,
      rump,
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
    // 2. Stray Elephant -> E-shock fires -> Scrambles off track into pasture -> Track clear!
    this.spawnObstacle('animal', 0.12, true);
    // 3. Track Inspector Human -> E-shock fires -> Stays on track -> Net scoop rescue!
    this.spawnObstacle('human', 0.28, false);
    // 4. Heavy Stray Bull (>150kg Overweight Hazard) -> E-shock fires -> Gallops off track!
    this.spawnObstacle('cattle', 0.45, true);
    // 5. Elephant Calf -> E-shock fires -> Stays on track -> Weight 110kg <= 150kg -> Net scoop rescue!
    this.spawnObstacle('animal', 0.60, false);
    // 6. Track Cargo Debris -> Inanimate crate 40kg -> Net scoop rescue!
    this.spawnObstacle('debris', 0.74, false);
    // 7. Stubborn Heavy Bull -> E-shock fires -> Stays on track -> 480kg > 150kg -> Net stowed, emergency brake!
    this.spawnObstacle('cattle', 0.88, false);
  }

  // Spawn immediately ahead of the train on demand (via HUD test buttons)
  spawnAheadOfTrain(trainProgress, trackLength, type = 'human', distanceMeters = 85, moveOffTrack = null) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(type, targetProgress, moveOffTrack);
  }

  // ------------------------------------------------------------------
  // Active Non-Lethal Animal Deterrence Protocol (>150kg Obstacles)
  // ------------------------------------------------------------------
  setDeterrenceMode(mode) {
    if (this.deterrenceSpecs[mode]) {
      this.activeDeterrenceMode = mode;
      this.telemetry.deterrenceMode = mode;
      return this.deterrenceSpecs[mode];
    }
    return this.deterrenceSpecs[this.activeDeterrenceMode];
  }

  getDeterrenceSpecs(mode) {
    return this.deterrenceSpecs[mode] || this.deterrenceSpecs[this.activeDeterrenceMode];
  }

  getDeterrenceTickerData(mode) {
    const m = mode || this.activeDeterrenceMode;
    switch (m) {
      case 'holographic_mimo':
        return {
          arch: 'HMIMO',
          polarization: 'CIRCULAR / METASURFACE',
          carrier: '10.00 CM',
          focusState: 'COLLIMATED',
          safety: '100% SAFE (99.9% CLEARANCE)'
        };
      case 'retrodirective':
        return {
          arch: 'RETRODIRECTIVE',
          polarization: 'DUAL-LINEAR / CONJUGATE',
          carrier: '5.00 CM',
          focusState: 'PHASE-LOCKED',
          safety: '100% SAFE (99.8% CLEARANCE)'
        };
      case 'lrad':
        return {
          arch: 'ACOUSTIC LRAD',
          polarization: 'DIRECTIONAL 138dB',
          carrier: '13.6 CM (2.5 kHz)',
          focusState: 'BEAM FOCUS 1.5KM',
          safety: '100% SAFE (99.9% CLEARANCE)'
        };
      case 'bio_acoustic':
        return {
          arch: 'BIO-SWARM',
          polarization: 'PLAN BEE AURA',
          carrier: '380 Hz SWARM',
          focusState: 'DISPERSION AURA',
          safety: '100% SAFE (100% CLEARANCE)'
        };
      case 'mmw_denial':
        return {
          arch: 'PULSED MMW',
          polarization: '95 GHz ACTIVE',
          carrier: '3.16 MM',
          focusState: 'COLLIMATED BEAM',
          safety: '100% SAFE (99.7% CLEARANCE)'
        };
      case 'electric_shock':
      default:
        return {
          arch: 'E-SHOCK (RDSO)',
          polarization: 'PULSED GRADIENT',
          carrier: '6.5 kV / 3.8 mA',
          focusState: 'CONTACT SWEEP ARMED',
          safety: '100% SAFE (99.9% CLEARANCE)'
        };
    }
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
    obs.deterMode = this.activeDeterrenceMode;
    obs.fleeStartTime = this.animTime;
    obs.fleeDirection = (Math.random() > 0.5 ? 1 : -1);
    obs.isCleared = false;
    this.fxTimer = 1.2;

    // Trigger procedural Web Audio synthesis with tailored parameters
    if (audio) {
      if (this.activeDeterrenceMode === 'electric_shock') {
        audio.playElectricShockDischarge(obs.type, obs.mass);
      } else if (this.activeDeterrenceMode === 'bio_acoustic') {
        audio.playBeeSwarmSound();
      } else if (this.activeDeterrenceMode === 'lrad') {
        audio.playLRADSirenSound();
      } else if (this.activeDeterrenceMode === 'mmw_denial') {
        audio.playActiveDenialHum();
      } else {
        audio.playElectricShockDischarge(obs.type, obs.mass);
      }
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

    if (this.activeDeterrenceMode === 'electric_shock') {
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

    } else if (this.activeDeterrenceMode === 'bio_acoustic') {
      // 2. Plan Bee - Concentric amber acoustic wavefront rings pulsing forward
      const ringGeo = new THREE.TorusGeometry(0.85, 0.04, 8, 24);
      const ringMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b, transparent: true, opacity: 0.85 });
      for (let r = 1; r <= 4; r++) {
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.position.copy(trainFrontPos.clone().lerp(obsPos, r * 0.22));
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
        ring.userData = { isAcousticRing: true };
        this.fxGroup.add(ring);
      }
    } else if (this.activeDeterrenceMode === 'lrad') {
      // 3. Acoustic LRAD - Focused directional sound shockwave cone
      const coneLength = Math.max(10, forwardMeters);
      const coneGeo = new THREE.ConeGeometry(2.2, coneLength, 16, 4, true);
      coneGeo.rotateX(Math.PI / 2);
      const coneMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4, wireframe: true, transparent: true, opacity: 0.65 });
      const cone = new THREE.Mesh(coneGeo, coneMat);
      cone.position.copy(trainFrontPos.clone().lerp(obsPos, 0.5));
      cone.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.fxGroup.add(cone);
    } else if (this.activeDeterrenceMode === 'mmw_denial') {
      // 4. Pulsed Millimeter Wave - Shimmering directed energy ray
      const beamGeo = new THREE.CylinderGeometry(0.08, 0.18, forwardMeters, 12);
      beamGeo.rotateX(Math.PI / 2);
      const beamMat = new THREE.MeshBasicMaterial({ color: 0xec4899, transparent: true, opacity: 0.75 });
      const beam = new THREE.Mesh(beamGeo, beamMat);
      beam.position.copy(trainFrontPos.clone().lerp(obsPos, 0.5));
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.fxGroup.add(beam);
    } else {
      // 5. Holographic MIMO / Retrodirective - Multi-beam phase-conjugate laser targeting
      [-1, 1].forEach(side => {
        const p1 = trainFrontPos.clone().add(new THREE.Vector3(side * 0.9, 1.8, 0));
        const p2 = obsPos.clone().add(new THREE.Vector3(0, 1.2, 0));
        const pts = [p1, p2];
        const lineGeo = new THREE.BufferGeometry().setFromPoints(pts);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x10b981, transparent: true, opacity: 0.9 });
        this.fxGroup.add(new THREE.Line(lineGeo, lineMat));
      });
      // Reticle targeting ring around animal
      const reticle = new THREE.Mesh(new THREE.TorusGeometry(0.9, 0.03, 8, 24), new THREE.MeshBasicMaterial({ color: 0x10b981 }));
      reticle.position.copy(obsPos.clone().add(new THREE.Vector3(0, 1.1, 0)));
      reticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      this.fxGroup.add(reticle);
    }
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
        } else if (child.isMesh && child.userData.isAcousticRing) {
          child.scale.multiplyScalar(1.0 + dt * 1.8);
          if (child.material) child.material.opacity = Math.max(0, this.fxTimer / 1.2);
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
              ud.armL.rotation.set(-2.1 + Math.sin(localT * 14.0) * 0.3, 0, -0.45);
            }
            if (ud.forearmL) ud.forearmL.rotation.x = -0.85;
            if (ud.armR) {
              ud.armR.rotation.set(-1.6 + Math.sin(localT * 8.0) * 0.15, 0, 0.35);
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

          // Left arm frantically waving overhead to signal oncoming train
          if (ud.armL) {
            const waveX = THREE.MathUtils.lerp(0.05, -1.95 + Math.sin(localT * 14.0) * 0.35, panicLerp);
            const waveZ = THREE.MathUtils.lerp(-0.12, -0.55 + Math.cos(localT * 14.0) * 0.25, panicLerp);
            ud.armL.rotation.set(waveX, 0, waveZ);
          }
          if (ud.forearmL) {
            ud.forearmL.rotation.x = THREE.MathUtils.lerp(-0.22, -0.85, panicLerp);
          }

          // Right arm held defensively in front
          if (ud.armR) {
            const defX = THREE.MathUtils.lerp(0.05, -1.55 + Math.sin(localT * 6.0) * 0.12, panicLerp);
            const defZ = THREE.MathUtils.lerp(0.12, 0.40, panicLerp);
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

        // B. Deep Belly Breathing
        const breath = Math.sin(localT * 1.8);
        if (ud.body) {
          ud.body.scale.set(1.05 + 0.025 * breath, 1.18 + 0.020 * breath, 1.0);
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
      this.telemetry.tailoredSpec = tailored.badge;
      this.telemetry.tailoredLabel = tailored.typeLabel;

      // ================================================================
      // STAGE 1: 1 KM CAMERA & LIDAR DETECTION & TAILORED ELECTRIC SHOCK DELIVERY
      // User requirement: "when our camera and LiDAR detect a person or an animal on the track within a range of 1 km,
      // we will deliver an electric shock—tailored to the subject's size and type (human or animal)—to prompt them to move off the track."
      // ================================================================
      if (aiSensorAuto && !closestObstacle.hasBeenShocked) {
        this.triggerDeterrence(closestObstacle, audio);
        if (audio) audio.playTargetAcquiredBeep(false);
        this.telemetry.action = `⚡ 1KM LIDAR: ${tailored.typeLabel} E-SHOCK (${tailored.voltage}) FIRED`;
        this.telemetry.alertType = 'deploy';
        this.telemetry.alertMessage = `⚡ 1KM CAMERA & LIDAR: ${closestObstacle.name.toUpperCase()} DETECTED AT ${Math.round(minForwardDist)}M! TAILORED ${tailored.voltage} E-SHOCK FIRED!`;
      }

      // ================================================================
      // STAGE 2: TRACK CLEARANCE EVALUATION
      // Check if target has scrambled off the track following the tailored shock
      // ================================================================
      if (closestObstacle.isCleared) {
        // Target successfully moved off the track into pasture / grass verge!
        if (captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = false;
        this.telemetry.action = `TARGET CLEARED VIA TAILORED ${tailored.voltage} E-SHOCK - TRACK CLEAR`;
        this.telemetry.alertType = 'success';
        this.telemetry.alertMessage = `🎯 TRACK CLEARED! ${closestObstacle.name.toUpperCase()} MOVED SAFELY OFF TRACK VIA TAILORED E-SHOCK! ZERO CASUALTIES!`;

        // Release emergency brake if tripped earlier
        if (physics && physics.emergencyBrake) {
          physics.setEmergencyBrake(false);
        }
      } else if (closestObstacle.isDeterred && closestObstacle.moveOffTrackOnShock) {
        // Obstacle is actively in motion fleeing the track
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.action = `⚡ TAILORED E-SHOCK ACTIVE - TARGET MOVING OFF TRACK (${Math.round(minForwardDist)}M)`;
        this.telemetry.alertType = 'deploy';
      }
      // ================================================================
      // STAGE 3: IF TARGET STILL DOES NOT MOVE AWAY -> CAPTURE NET DEPLOYS AT 30-40 METERS
      // User requirement: "If they still do not move away following the electric shock,
      // a capture net will automatically deploy when they are within a distance of 30–40 meters."
      // ================================================================
      else {
        // Calculate / verify mass:
        const isWeightSafe = closestObstacle.mass <= 150;
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = isWeightSafe;

        // ----------------------------------------------------------------
        // CASE A: WEIGHT <= 150 KG (Person: 72kg, Wildlife Calf: 110kg, Debris: 40kg)
        // -> Capture net automatically deploys when within 30-40 meters!
        // ----------------------------------------------------------------
        if (isWeightSafe) {
          if (minForwardDist <= 40) {
            this.telemetry.action = `TARGET ON TRACK (30-40M) - AIRBAG CAPTURE NET DEPLOYED (${closestObstacle.mass}KG ≤ 150KG)`;
            this.telemetry.alertType = 'deploy';

            // Automatically deploy capture net when within 30-40 meters
            if (aiSensorAuto && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
              this.telemetry.alertMessage = `🪤 TARGET ON TRACK WITHIN 30-40M (${Math.round(minForwardDist)}M)! AIRBAG CAPTURE NET AUTOMATICALLY DEPLOYED!`;
            }

            // Physical scoop collection event right as scoop tip meets obstacle (<= 14.0m)
            if (minForwardDist <= 14.0) {
              this.scene.remove(closestObstacle.mesh);
              captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
              closestObstacle.isCollected = true;

              // Sound celebratory rescue confirmation audio
              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.alertType = 'success';
              this.telemetry.alertMessage = `🎯 OBSTACLE SAFELY COLLECTED: ${closestObstacle.name} (${closestObstacle.mass} kg) secured in net cradle. Zero casualties!`;
            }
          } else {
            // Target is still > 40m away: Tailored E-shock delivered, approaching 30-40m deployment zone
            this.telemetry.action = `TARGET ON TRACK (${Math.round(minForwardDist)}M) - NET ARMED FOR AUTO-DEPLOY AT 30-40M`;
            this.telemetry.alertType = 'deploy';
          }
        }
        // ----------------------------------------------------------------
        // CASE B: OVERWEIGHT (> 150 kg, e.g. 480kg Heavy Bull)
        // -> Net stays CLOSED / STOWED to prevent damage. Repeat E-shock + Horn + Emergency Brake at 30-40m!
        // ----------------------------------------------------------------
        else {
          // Ensure net remains CLOSED/STOWED to avoid structural damage
          if (captureNet.isDeployed) {
            captureNet.setDeployed(false);
          }

          // Continuous repeat electric shock pulses if still on track
          if (this.fxTimer <= 0) {
            this.spawnDeterrenceFX(closestObstacle);
            if (audio) audio.playElectricShockDischarge('cattle', closestObstacle.mass);
            this.fxTimer = 0.8;
          }

          if (minForwardDist <= 40) {
            this.telemetry.action = `OVERWEIGHT (${closestObstacle.mass}KG > 150KG) AT ${Math.round(minForwardDist)}M - NET STOWED! EMERGENCY BRAKE ACTIVE`;
            this.telemetry.alertType = 'hazard';
            this.telemetry.alertMessage = `⚠️ OVERWEIGHT HAZARD WITHIN 30-40M (${Math.round(minForwardDist)}M)! NET STOWED! EMERGENCY BRAKE ENGAGED!`;

            // Fail-safe emergency brake and horn only if animal is dangerously close (<= 35m) and still on track
            if (minForwardDist <= 35) {
              if (physics && !physics.emergencyBrake) {
                physics.setEmergencyBrake(true);
              }
              if (audio) {
                audio.startHorn();
              }
            }
          } else {
            this.telemetry.action = `OVERWEIGHT TARGET (${Math.round(minForwardDist)}M) - REPEAT ${tailored.voltage} HOOF PULSES ACTIVE`;
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
      this.telemetry.action = 'STANDBY - SCANNING (1 km LiDAR / 4K / RADAR)';
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = 'info';

      // Auto-retract net to default CLOSED state if cradle is empty
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

