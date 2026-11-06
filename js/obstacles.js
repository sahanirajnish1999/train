// ====================================================================
// Indian Railways Real-Time AI Obstacle & Safety Recovery System
// Manages Track Clearance, 1km LiDAR / Camera Scanning,
// Weight-Tiered Electric Shock Deterrence, Inflatable Scoop Net,
// and 3D Stylized Human Obstacles (Enter Track, Exit Track, Mid-Track, Sudden Appear)
// ====================================================================

import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.train = null;
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
        detail: 'Discharges non-lethal pulsed electrical gradient across track rails and forward contact sweepers (compliant with IEC 60335-2-76 / RDSO). Prompts immediate clearance off track without burns or physical injury.'
      }
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
      name: 'NONE (TRACK CLEAR)',
      distance: null,
      mass: null,
      tailoredSpec: null,
      tailoredLabel: null,
      canCollect: false,
      action: 'STANDBY',
      alertMessage: null,
      alertType: 'info',
      collectedCount: 0,
      collectedWeight: 0,
      deterrenceActive: false,
      deterrenceMode: 'electric_shock'
    };

    this.animTime = 0;

    // Materials for 3D Human & Animal Characters
    this.materials = {
      humanSkinPeach: new THREE.MeshStandardMaterial({ color: 0xfcc7a7, roughness: 0.62 }), // Warm peach skin tone
      humanSkinShadow: new THREE.MeshStandardMaterial({ color: 0xebad8b, roughness: 0.68 }),
      humanBlush: new THREE.MeshStandardMaterial({ color: 0xf472b6, roughness: 0.55, transparent: true, opacity: 0.85 }), // Rosy blush cheeks
      humanHairGinger: new THREE.MeshStandardMaterial({ color: 0xd9572b, roughness: 0.78 }), // Auburn / ginger swept quiff hair
      humanHairDark: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.82 }),
      humanEyesWhite: new THREE.MeshBasicMaterial({ color: 0xffffff }),
      humanEyesIris: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.20 }), // Deep dark friendly pupil
      humanEyeReflex: new THREE.MeshBasicMaterial({ color: 0xffffff }), // Specular catchlight dot
      humanBrow: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.70 }), // Arched brows
      humanSmile: new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.60 }), // Sweet curved mouth
      humanPoloCream: new THREE.MeshStandardMaterial({ color: 0xf4eee4, roughness: 0.72 }), // Beige / cream polo shirt
      humanPoloCollar: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.55 }), // Crisp white folded collar
      humanPantsBrown: new THREE.MeshStandardMaterial({ color: 0x784a32, roughness: 0.75 }), // Tailored warm brown chinos
      humanShoesDark: new THREE.MeshStandardMaterial({ color: 0x1f1f23, roughness: 0.65 }), // Dark casual loafers
      humanBeltLeather: new THREE.MeshStandardMaterial({ color: 0x3e2723, roughness: 0.60 }),
      humanBuckleSilver: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, metalness: 0.85, roughness: 0.25 }),
      humanButtonPearl: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.30 }),
      humanShoeSole: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.35 }),
      humanVestOrange: new THREE.MeshStandardMaterial({ color: 0xff5500, roughness: 0.45 }),
      humanReflectiveSilver: new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.15, metalness: 0.70 }),
      // Animal Specific Materials (Multiple Species with Realistic Tones)
      dogFurTan: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.78 }), // Indian Pariah Dog Golden/Tan Fur
      dogNoseDark: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.35 }),
      dogCollarRed: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.50 }),
      deerFurFawn: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }), // Spotted Deer / Chital Fawn Fur
      deerSpotsCream: new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.70 }),
      deerAntlersDark: new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.55 }),
      cowHideCream: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.75 }), // Indian Zebu Cattle Off-White Hide
      cowHideGrey: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.80 }), // Zebu Shoulder Hump Shading
      cowHornsDark: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35, metalness: 0.15 }),
      cowMuzzlePink: new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.60 }),
      elephantHideGrey: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.88 }), // Wild Asian Elephant Weathered Hide
      elephantIvory: new THREE.MeshStandardMaterial({ color: 0xfef9c3, roughness: 0.30, metalness: 0.10 }), // Elephant Ivory Tusks
      boarBristleDark: new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.85 }),
      hoofDark: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.50 })
    };

    // Initialize track obstacles with the scenario suite
    this.initDefaultObstacles();
  }

  setTrain(train) {
    this.train = train;
  }

  // Remove any leftover human / animal / debris meshes from the scene
  cleanupSceneObstacles() {
    const toRemove = [];
    this.scene.traverse(child => {
      if (child.name === 'stylizedHuman' || child.name === 'stylizedAnimal' || child.name === 'trackCargoDebris' || (child.userData && (child.userData.type === 'human' || child.userData.type === 'dog' || child.userData.type === 'deer' || child.userData.type === 'cow' || child.userData.type === 'elephant' || child.userData.type === 'boar' || child.userData.type === 'crate'))) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
      obj.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
    });
  }

  // ------------------------------------------------------------------
  // Canvas Texture Generator for Living Expressive Human Facial Features
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

      // Back of head hair coverage
      ctx.fillStyle = '#d9572b';
      ctx.fillRect(0, 0, 160, 1024);
      ctx.fillRect(864, 0, 160, 1024);

      // Rosy Airbrushed Blush on Cheeks
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

      // Expressive Cartoon Eyes with Specular Highlights & Blinking
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

        // Specular Catchlight Highlights
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

  // Parametric tapered tube geometry with closed rounded caps (Used for stylized hair quiff locks)
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

  // ------------------------------------------------------------------
  // 3D Human Character Model Builder (Fully Articulated Anatomy & Clothing)
  // Auburn/ginger quiff hair, peach skin, blushing cheeks, cream polo shirt,
  // brown chinos, casual dark loafers, articulated arms and legs
  // ------------------------------------------------------------------
  buildHumanMesh(poseMode = 'mid', config = {}) {
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
      this.materials.humanBeltLeather
    );
    belt.position.set(0, 0.945, 0);
    belt.scale.set(1.05, 1.0, 0.79);
    group.add(belt);

    const buckle = new THREE.Mesh(
      new THREE.BoxGeometry(0.032, 0.030, 0.012),
      this.materials.humanBuckleSilver
    );
    buckle.position.set(0, 0.945, 0.122);
    group.add(buckle);

    // B. Torso Group (Polo Shirt / Jacket) pivoted at y = 0.94
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.94, 0);

    const shirtMat = config.shirtMat || this.materials.humanPoloCream;
    const collarMat = config.collarMat || this.materials.humanPoloCollar;

    const chest = new THREE.Mesh(
      new THREE.CylinderGeometry(0.185, 0.160, 0.24, 24),
      shirtMat
    );
    chest.position.y = 0.28;
    chest.scale.set(1.08, 1.0, 0.76);
    chest.castShadow = true;
    torsoGroup.add(chest);

    const waist = new THREE.Mesh(
      new THREE.CylinderGeometry(0.160, 0.146, 0.18, 24),
      shirtMat
    );
    waist.position.y = 0.10;
    waist.scale.set(1.04, 1.0, 0.76);
    waist.castShadow = true;
    torsoGroup.add(waist);

    const hem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.154, 0.158, 0.045, 24),
      shirtMat
    );
    hem.position.y = 0.01;
    hem.scale.set(1.05, 1.0, 0.78);
    torsoGroup.add(hem);

    // Smooth Deltoid Shoulder Caps
    [-0.18, 0.18].forEach(sx => {
      const deltoid = new THREE.Mesh(
        new THREE.SphereGeometry(0.070, 18, 14),
        shirtMat
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

    // Crisp Folded White Polo Collar (Neckband + Folded Lapels in open V)
    const collarBand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.058, 0.070, 0.045, 20),
      collarMat
    );
    collarBand.position.y = 0.39;
    torsoGroup.add(collarBand);

    [-1, 1].forEach(side => {
      const lapel = new THREE.Mesh(
        new THREE.BoxGeometry(0.065, 0.090, 0.012),
        collarMat
      );
      lapel.position.set(side * 0.046, 0.36, 0.078);
      lapel.rotation.set(-0.35, side * 0.28, side * -0.36);
      torsoGroup.add(lapel);
    });

    // Center Placket with Pearl Buttons
    const placket = new THREE.Mesh(
      new THREE.BoxGeometry(0.024, 0.14, 0.012),
      collarMat
    );
    placket.position.set(0, 0.26, 0.114);
    torsoGroup.add(placket);

    [0.30, 0.24].forEach(by => {
      const button = new THREE.Mesh(
        new THREE.CylinderGeometry(0.005, 0.005, 0.006, 8).rotateX(Math.PI / 2),
        this.materials.humanButtonPearl
      );
      button.position.set(0, by, 0.121);
      torsoGroup.add(button);
    });

    // C. Head Group pivoted at y = 0.50 on torso
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0.010);

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

    // Expressive 3D Eyes with Specular Highlights & Brows
    [-1, 1].forEach(side => {
      const eyeGroup = new THREE.Group();
      eyeGroup.position.set(side * 0.045, 0.014, 0.108);
      eyeGroup.rotation.y = side * 0.15;

      const sclera = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 16, 12),
        this.materials.humanEyesWhite
      );
      sclera.scale.set(0.95, 1.25, 0.40);
      eyeGroup.add(sclera);

      const iris = new THREE.Mesh(
        new THREE.SphereGeometry(0.017, 14, 10),
        new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.20 })
      );
      iris.position.set(side * 0.002, 0, 0.009);
      iris.scale.set(0.92, 1.15, 0.30);
      eyeGroup.add(iris);

      const pupil = new THREE.Mesh(
        new THREE.SphereGeometry(0.010, 12, 8),
        this.materials.humanEyesIris
      );
      pupil.position.set(side * 0.002, 0, 0.014);
      pupil.scale.set(0.85, 1.10, 0.25);
      eyeGroup.add(pupil);

      const hl1 = new THREE.Mesh(new THREE.SphereGeometry(0.0045, 8, 8), this.materials.humanEyeReflex);
      hl1.position.set(side * 0.004, 0.007, 0.016);
      eyeGroup.add(hl1);

      const hl2 = new THREE.Mesh(new THREE.SphereGeometry(0.0025, 8, 8), this.materials.humanEyeReflex);
      hl2.position.set(side * -0.004, -0.005, 0.016);
      eyeGroup.add(hl2);

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

    const nose = new THREE.Mesh(
      new THREE.SphereGeometry(0.015, 12, 10),
      this.materials.humanSkinPeach
    );
    nose.position.set(0, -0.014, 0.126);
    nose.scale.set(0.9, 0.75, 1.1);
    headGroup.add(nose);

    const smile = new THREE.Mesh(
      new THREE.TorusGeometry(0.025, 0.0035, 8, 16, Math.PI * 0.65),
      this.materials.humanSmile
    );
    smile.position.set(0, -0.046, 0.114);
    smile.rotation.set(0.2, 0, Math.PI * 1.18);
    headGroup.add(smile);

    [-1, 1].forEach(side => {
      const blush = new THREE.Mesh(
        new THREE.SphereGeometry(0.022, 10, 8),
        this.materials.humanBlush
      );
      blush.position.set(side * 0.072, -0.020, 0.096);
      blush.scale.set(1.0, 0.65, 0.25);
      headGroup.add(blush);

      const ear = new THREE.Mesh(
        new THREE.SphereGeometry(0.026, 14, 10),
        this.materials.humanSkinPeach
      );
      ear.scale.set(0.35, 1.15, 0.75);
      ear.position.set(side * 0.115, -0.008, -0.005);
      ear.rotation.y = side * 0.18;
      headGroup.add(ear);
    });

    // Sculpted Hair Cap & Crest Quiff
    const hairCap = new THREE.Mesh(
      new THREE.SphereGeometry(0.126, 28, 20, 0, Math.PI * 2, 0, Math.PI * 0.58),
      this.materials.humanHairGinger
    );
    hairCap.position.set(0, 0.015, -0.012);
    hairCap.scale.set(0.95, 1.06, 1.02);
    headGroup.add(hairCap);

    const quiffCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.05, 0.12, 0.06),
      new THREE.Vector3(-0.01, 0.155, 0.02),
      new THREE.Vector3( 0.03, 0.15, -0.04),
      new THREE.Vector3( 0.06, 0.12, -0.08)
    ]);
    const quiffGeo = this.createTaperedTubeGeometry(quiffCurve, 16, 0.032, 0.004, 10, true);
    headGroup.add(new THREE.Mesh(quiffGeo, this.materials.humanHairGinger));

    const crestFlickCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.02, 0.13, 0.05),
      new THREE.Vector3( 0.02, 0.165, 0.01),
      new THREE.Vector3( 0.05, 0.155, -0.03)
    ]);
    const crestFlickGeo = this.createTaperedTubeGeometry(crestFlickCurve, 14, 0.024, 0.003, 8, true);
    headGroup.add(new THREE.Mesh(crestFlickGeo, this.materials.humanHairGinger));

    const bang1Curve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.08, 0.11, 0.07),
      new THREE.Vector3(-0.02, 0.10, 0.11),
      new THREE.Vector3( 0.05, 0.075, 0.118),
      new THREE.Vector3( 0.09, 0.025, 0.095)
    ]);
    headGroup.add(new THREE.Mesh(this.createTaperedTubeGeometry(bang1Curve, 16, 0.026, 0.003, 10, true), this.materials.humanHairGinger));

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

    // D. Articulated Arms (Polo sleeves + peach bare bicep & forearms + hands)
    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.17, 0.33, 0);

      const sleeve = new THREE.Mesh(
        new THREE.CylinderGeometry(0.066, 0.054, 0.15, 18),
        shirtMat
      );
      sleeve.position.set(side * 0.008, -0.07, 0);
      sleeve.rotation.z = side * -0.06;
      armGroup.add(sleeve);

      const sleeveCuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.056, 0.02, 18),
        shirtMat
      );
      sleeveCuff.position.set(side * 0.014, -0.14, 0);
      armGroup.add(sleeveCuff);

      const bareBicep = new THREE.Mesh(
        new THREE.CylinderGeometry(0.048, 0.042, 0.14, 16),
        this.materials.humanSkinPeach
      );
      bareBicep.position.set(side * 0.014, -0.15, 0);
      armGroup.add(bareBicep);

      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(side * 0.014, -0.22, 0.005);

      const elbow = new THREE.Mesh(
        new THREE.SphereGeometry(0.043, 14, 10),
        this.materials.humanSkinPeach
      );
      forearmGroup.add(elbow);

      const forearm = new THREE.Mesh(
        new THREE.CylinderGeometry(0.042, 0.034, 0.22, 16),
        this.materials.humanSkinPeach
      );
      forearm.position.set(0, -0.11, 0.008);
      forearm.rotation.x = -0.08;
      forearmGroup.add(forearm);

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

      const thumb = new THREE.Mesh(
        new THREE.CylinderGeometry(0.011, 0.009, 0.036, 8),
        this.materials.humanSkinPeach
      );
      thumb.position.set(-side * 0.022, -0.022, 0.012);
      thumb.rotation.set(-0.35, 0, -side * 0.45);
      handGroup.add(thumb);

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

    // E. Articulated Legs in Chinos & Loafers (Hips -> Thighs -> Knees -> Calves -> Shoes)
    const pantsMat = config.pantsMat || this.materials.humanPantsBrown;
    [-1, 1].forEach(side => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.074, 0.86, 0);

      const hip = new THREE.Mesh(
        new THREE.SphereGeometry(0.068, 16, 12),
        pantsMat
      );
      legGroup.add(hip);

      const thigh = new THREE.Mesh(
        new THREE.CylinderGeometry(0.068, 0.056, 0.40, 20),
        pantsMat
      );
      thigh.position.set(0, -0.20, 0.005);
      thigh.rotation.x = 0.02;
      legGroup.add(thigh);

      const knee = new THREE.Mesh(
        new THREE.SphereGeometry(0.056, 16, 12),
        pantsMat
      );
      knee.position.set(0, -0.40, 0.012);
      legGroup.add(knee);

      const lowerLegGroup = new THREE.Group();
      lowerLegGroup.position.set(0, -0.40, 0.012);

      const calf = new THREE.Mesh(
        new THREE.CylinderGeometry(0.056, 0.048, 0.38, 20),
        pantsMat
      );
      calf.position.set(0, -0.19, -0.006);
      lowerLegGroup.add(calf);

      const cuff = new THREE.Mesh(
        new THREE.CylinderGeometry(0.052, 0.052, 0.025, 20),
        pantsMat
      );
      cuff.position.set(0, -0.37, -0.006);
      lowerLegGroup.add(cuff);

      // Casual Oxford Loafer (Dark espresso shoe + white rubber sole rim + toe cap)
      const shoeGroup = new THREE.Group();
      shoeGroup.position.set(0, -0.41, 0.035);

      const shoeBody = new THREE.Mesh(
        new THREE.BoxGeometry(0.074, 0.065, 0.17),
        this.materials.humanShoesDark
      );
      shoeGroup.add(shoeBody);

      const sole = new THREE.Mesh(
        new THREE.BoxGeometry(0.078, 0.022, 0.175),
        this.materials.humanShoeSole
      );
      sole.position.y = -0.032;
      shoeGroup.add(sole);

      const toeCap = new THREE.Mesh(
        new THREE.SphereGeometry(0.036, 12, 10),
        this.materials.humanShoeSole
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
    group.userData.humanPose = poseMode;
    group.userData.torsoGroup = torsoGroup;
    group.userData.headGroup = headGroup;
    group.userData.faceData = faceData;

    // Apply the initial biomechanical posture for the requested mode
    this.applyHumanPose(group, poseMode);

    return group;
  }

  // ------------------------------------------------------------------
  // Configure Human Biomechanical Poses for the 4 User Scenarios:
  // 1. Enter on track: first leg on track (elevated rail) and second on ground (lower ballast)
  // 2. Exit to track: first leg on ground (lower ballast) & second on track (elevated rail)
  // 3. Mid in track: symmetrical center stance between rails
  // 4. Suddenly appear on track: panicked emergency recoil / braking skid
  // ------------------------------------------------------------------
  applyHumanPose(group, poseMode) {
    if (!group || !group.userData) return;
    const ud = group.userData;
    ud.humanPose = poseMode;

    switch (poseMode) {
      case 'enter':
      case 1:
        // 1. Enter on track: First leg on track (lead inside leg) and second on ground (trailing outside leg)
        // Inside lead leg (Left) steps UP onto the elevated rail head (+0.32m)
        if (ud.legL) ud.legL.rotation.set(0.52, 0.05, -0.06);
        if (ud.lowerLegL) {
          ud.lowerLegL.rotation.set(-0.65, 0, 0);
          ud.lowerLegL.position.set(0, -0.40, 0.012); // Perched on rail head (+32cm)
        }
        // Outside trailing leg (Right) remains planted down on the ground level slope (0.0m)
        if (ud.legR) ud.legR.rotation.set(-0.30, -0.05, 0.08);
        if (ud.lowerLegR) {
          ud.lowerLegR.rotation.set(-0.10, 0, 0);
          ud.lowerLegR.position.set(0, -0.66, 0.012); // Extends down to meet lower ground level
        }
        // Torso & head lean into the step onto track
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.86, 0);
          ud.torsoGroup.rotation.set(0.14, 0, -0.06);
        }
        if (ud.armR) ud.armR.rotation.set(-0.45, 0, 0.12);
        if (ud.forearmR) ud.forearmR.rotation.set(-0.45, 0, 0);
        if (ud.armL) ud.armL.rotation.set(0.35, 0, -0.12);
        if (ud.forearmL) ud.forearmL.rotation.set(-0.25, 0, 0);
        if (ud.headGroup) ud.headGroup.rotation.set(0.10, 0.28, 0);
        break;

      case 'exit':
      case 2:
        // 2. Exit to track: First leg on ground (lead outside leg) & second on track (trailing inside leg)
        // Outside lead leg (Right) steps DOWN off the ballast onto ground level
        if (ud.legR) ud.legR.rotation.set(0.42, 0.05, 0.08);
        if (ud.lowerLegR) {
          ud.lowerLegR.rotation.set(-0.55, 0, 0);
          ud.lowerLegR.position.set(0, -0.66, 0.012); // Reaches down to meet ground level
        }
        // Inside trailing leg (Left) still on the elevated rail head pushing off
        if (ud.legL) ud.legL.rotation.set(-0.35, -0.05, -0.05);
        if (ud.lowerLegL) {
          ud.lowerLegL.rotation.set(-0.15, 0, 0);
          ud.lowerLegL.position.set(0, -0.40, 0.012); // Pushing off elevated rail head (+32cm)
        }
        // Torso leans in direction of exit toward safe ground
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.86, 0);
          ud.torsoGroup.rotation.set(0.14, 0, 0.08);
        }
        if (ud.armL) ud.armL.rotation.set(-0.20, 0, -0.32);
        if (ud.forearmL) ud.forearmL.rotation.set(-0.30, 0, 0);
        if (ud.armR) ud.armR.rotation.set(-0.15, 0, 0.35);
        if (ud.forearmR) ud.forearmR.rotation.set(-0.35, 0, 0);
        if (ud.headGroup) ud.headGroup.rotation.set(0.10, -0.35, 0);
        break;

      case 'sudden':
      case 4:
        // 4. Suddenly appear on track: Startled emergency panic recoil / defensive flail
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.84, 0);
          ud.torsoGroup.rotation.set(-0.30, 0, 0);
        }
        if (ud.headGroup) ud.headGroup.rotation.set(-0.32, 0, 0);
        if (ud.armL) ud.armL.rotation.set(-1.20, 0.15, -0.55);
        if (ud.forearmL) ud.forearmL.rotation.set(-0.80, 0, 0);
        if (ud.armR) ud.armR.rotation.set(-1.15, -0.15, 0.55);
        if (ud.forearmR) ud.forearmR.rotation.set(-0.75, 0, 0);
        if (ud.legL) ud.legL.rotation.set(0.48, 0, -0.08);
        if (ud.lowerLegL) {
          ud.lowerLegL.rotation.set(-0.85, 0, 0);
          ud.lowerLegL.position.set(0, -0.40, 0.012);
        }
        if (ud.legR) ud.legR.rotation.set(0.40, 0, 0.08);
        if (ud.lowerLegR) {
          ud.lowerLegR.rotation.set(-0.75, 0, 0);
          ud.lowerLegR.position.set(0, -0.40, 0.012);
        }
        break;

      case 'mid':
      case 3:
      default:
        // 3. Mid in track: Symmetrical stance centered between the two rails
        if (ud.legL) ud.legL.rotation.set(0.02, 0, -0.02);
        if (ud.lowerLegL) {
          ud.lowerLegL.rotation.set(-0.04, 0, 0);
          ud.lowerLegL.position.set(0, -0.40, 0.012);
        }
        if (ud.legR) ud.legR.rotation.set(-0.02, 0, 0.02);
        if (ud.lowerLegR) {
          ud.lowerLegR.rotation.set(-0.04, 0, 0);
          ud.lowerLegR.position.set(0, -0.40, 0.012);
        }
        if (ud.torsoGroup) {
          ud.torsoGroup.position.set(0, 0.86, 0);
          ud.torsoGroup.rotation.set(0.02, 0, 0);
        }
        if (ud.armL) ud.armL.rotation.set(0.05, 0, -0.10);
        if (ud.forearmL) ud.forearmL.rotation.set(-0.20, 0, 0);
        if (ud.armR) ud.armR.rotation.set(0.05, 0, 0.10);
        if (ud.forearmR) ud.forearmR.rotation.set(-0.20, 0, 0);
        if (ud.headGroup) ud.headGroup.rotation.set(0.05, 0, 0);
        break;
    }
  }

  // ------------------------------------------------------------------
  // 3D Animal Model Builders (Multiple Species: Dog, Deer, Cow, Elephant)
  // Accurate anatomies, distinctive species traits, sizes, and weights
  // ------------------------------------------------------------------

  // 1. Indian Desi Dog (Small Canine ~22 kg < 150 kg -> Net Scoopable)
  buildDogMesh(poseMode = 'mid', config = {}) {
    const group = new THREE.Group();
    group.name = 'stylizedAnimal';

    const furMat = this.materials.dogFurTan;
    const darkMat = this.materials.dogNoseDark;
    const collarMat = this.materials.dogCollarRed;

    // A. Torso Body
    const bodyGeo = new THREE.CylinderGeometry(0.12, 0.10, 0.44, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.set(0, 0.32, 0);
    body.castShadow = true;
    group.add(body);

    // B. Chest & Neck
    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.13, 14, 10), furMat);
    chest.position.set(0, 0.33, 0.20);
    group.add(chest);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.11, 0.18, 12), furMat);
    neck.position.set(0, 0.42, 0.24);
    neck.rotation.x = -0.42;
    group.add(neck);

    // Red safety collar
    const collar = new THREE.Mesh(new THREE.TorusGeometry(0.085, 0.014, 8, 16), collarMat);
    collar.position.set(0, 0.44, 0.25);
    collar.rotation.x = -0.42;
    group.add(collar);

    // C. Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.50, 0.32);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.10, 14, 12), furMat);
    headGroup.add(skull);

    // Muzzle & Wet Dark Nose
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.07, 0.13), furMat);
    muzzle.position.set(0, -0.02, 0.11);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.024, 10, 8), darkMat);
    nose.position.set(0, 0.01, 0.17);
    headGroup.add(nose);

    // Eyes
    [-0.045, 0.045].forEach(side => {
      const eyeWhite = new THREE.Mesh(new THREE.SphereGeometry(0.022, 10, 8), this.materials.humanEyesWhite);
      eyeWhite.position.set(side, 0.035, 0.075);
      headGroup.add(eyeWhite);

      const pupil = new THREE.Mesh(new THREE.SphereGeometry(0.015, 10, 8), darkMat);
      pupil.position.set(side * 1.05, 0.035, 0.092);
      headGroup.add(pupil);
    });

    // Alert / Folded Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.10, 0.02), furMat);
      ear.position.set(side * 0.08, 0.075, -0.02);
      ear.rotation.set(-0.25, 0, side * -0.55);
      headGroup.add(ear);
    });
    group.add(headGroup);

    // D. Curved Wagging Tail
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 0.36, -0.22);
    const tailPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0.08, -0.08),
      new THREE.Vector3(0, 0.18, -0.12),
      new THREE.Vector3(0, 0.26, -0.06)
    ];
    const tailCurve = new THREE.CatmullRomCurve3(tailPts);
    const tail = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 12, 0.020, 8, false), furMat);
    tailGroup.add(tail);
    group.add(tailGroup);

    // E. 4 Articulated Legs with Paws
    const legGeo = new THREE.CylinderGeometry(0.032, 0.026, 0.30, 10);
    const pawGeo = new THREE.BoxGeometry(0.055, 0.030, 0.075);

    const legs = {};
    const legConfigs = [
      { name: 'legFL', x: -0.08, z:  0.16 },
      { name: 'legFR', x:  0.08, z:  0.16 },
      { name: 'legBL', x: -0.08, z: -0.16 },
      { name: 'legBR', x:  0.08, z: -0.16 }
    ];

    legConfigs.forEach(c => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.30, c.z);

      const limb = new THREE.Mesh(legGeo, furMat);
      limb.position.set(0, -0.14, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      const paw = new THREE.Mesh(pawGeo, furMat);
      paw.position.set(0, -0.29, 0.015);
      legPivot.add(paw);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = 'dog';
    group.userData.headGroup = headGroup;
    group.userData.tail = tailGroup;
    group.userData.legs = legs;

    return group;
  }

  // 2. Indian Spotted Deer / Chital (~48 kg < 150 kg -> Net Scoopable)
  buildDeerMesh(poseMode = 'mid', config = {}) {
    const group = new THREE.Group();
    group.name = 'stylizedAnimal';

    const furMat = this.materials.deerFurFawn;
    const creamMat = this.materials.deerSpotsCream;
    const antlerMat = this.materials.deerAntlersDark;
    const darkMat = this.materials.dogNoseDark;
    const hoofMat = this.materials.hoofDark;

    // A. Elegant Slender Torso
    const bodyGeo = new THREE.CylinderGeometry(0.19, 0.16, 0.76, 16);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, furMat);
    body.position.set(0, 0.70, 0);
    body.castShadow = true;
    group.add(body);

    // Cream spots along flank
    [-1, 1].forEach(side => {
      for (let s = 0; s < 5; s++) {
        const spot = new THREE.Mesh(new THREE.SphereGeometry(0.026, 8, 6), creamMat);
        spot.position.set(side * 0.18, 0.72 + (s % 2) * 0.04, -0.22 + s * 0.10);
        group.add(spot);
      }
    });

    // B. Long Graceful Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.14, 0.42, 14), furMat);
    neck.position.set(0, 0.92, 0.38);
    neck.rotation.x = -0.55;
    group.add(neck);

    // C. Deer Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.12, 0.52);

    const skull = new THREE.Mesh(new THREE.SphereGeometry(0.11, 14, 12), furMat);
    headGroup.add(skull);

    // Muzzle & Nose
    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.20, 12), furMat);
    muzzle.rotation.x = Math.PI / 2;
    muzzle.position.set(0, -0.035, 0.13);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.026, 10, 8), darkMat);
    nose.position.set(0, -0.035, 0.23);
    headGroup.add(nose);

    // Eyes
    [-0.065, 0.065].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.028, 10, 8), darkMat);
      eye.position.set(side, 0.035, 0.075);
      headGroup.add(eye);

      const catchlight = new THREE.Mesh(new THREE.SphereGeometry(0.009, 6, 6), this.materials.humanEyesWhite);
      catchlight.position.set(side * 1.05, 0.045, 0.098);
      headGroup.add(catchlight);
    });

    // Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.05, 0.18, 8), furMat);
      ear.position.set(side * 0.11, 0.13, -0.03);
      ear.rotation.set(-0.35, 0, side * -0.65);
      headGroup.add(ear);
    });

    // Antlers
    [-1, 1].forEach(side => {
      const antlerBeam = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.022, 0.40, 8), antlerMat);
      antlerBeam.position.set(side * 0.065, 0.24, 0.02);
      antlerBeam.rotation.set(-0.30, side * 0.10, side * 0.22);
      headGroup.add(antlerBeam);

      const tine = new THREE.Mesh(new THREE.CylinderGeometry(0.009, 0.013, 0.14, 8), antlerMat);
      tine.position.set(side * 0.10, 0.26, 0.07);
      tine.rotation.set(0.40, 0, side * 0.35);
      headGroup.add(tine);
    });
    group.add(headGroup);

    // D. 4 Slender Legs
    const legGeo = new THREE.CylinderGeometry(0.035, 0.024, 0.65, 10);
    const hoofGeo = new THREE.BoxGeometry(0.048, 0.048, 0.065);

    const legs = {};
    const legConfigs = [
      { name: 'legFL', x: -0.11, z:  0.26 },
      { name: 'legFR', x:  0.11, z:  0.26 },
      { name: 'legBL', x: -0.11, z: -0.26 },
      { name: 'legBR', x:  0.11, z: -0.26 }
    ];

    legConfigs.forEach(c => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.68, c.z);

      const limb = new THREE.Mesh(legGeo, furMat);
      limb.position.set(0, -0.31, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.set(0, -0.65, 0.01);
      legPivot.add(hoof);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = 'deer';
    group.userData.headGroup = headGroup;
    group.userData.legs = legs;

    return group;
  }

  // 3. Indian Zebu Cow / Desi Bull (~360 kg > 150 kg -> NET LOCKED! Only Electricity 800m-80m)
  buildCowMesh(poseMode = 'mid', config = {}) {
    const group = new THREE.Group();
    group.name = 'stylizedAnimal';

    const hideMat = this.materials.cowHideCream;
    const greyMat = this.materials.cowHideGrey;
    const hornMat = this.materials.cowHornsDark;
    const muzzleMat = this.materials.cowMuzzlePink;
    const darkMat = this.materials.dogNoseDark;
    const hoofMat = this.materials.hoofDark;

    // A. Massive Bovine Torso
    const bodyGeo = new THREE.CylinderGeometry(0.42, 0.38, 1.40, 18);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, hideMat);
    body.position.set(0, 1.02, 0);
    body.castShadow = true;
    group.add(body);

    // B. Prominent Indian Zebu Shoulder Hump
    const humpGeo = new THREE.SphereGeometry(0.26, 16, 14);
    humpGeo.scale(0.85, 1.25, 0.95);
    const hump = new THREE.Mesh(humpGeo, greyMat);
    hump.position.set(0, 1.48, 0.38);
    hump.castShadow = true;
    group.add(hump);

    // Dewlap throat fold
    const dewlap = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.30, 0.48), hideMat);
    dewlap.position.set(0, 0.86, 0.62);
    dewlap.rotation.x = -0.35;
    group.add(dewlap);

    // C. Bovine Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.33, 0.42, 14), hideMat);
    neck.position.set(0, 1.18, 0.66);
    neck.rotation.x = -0.45;
    group.add(neck);

    // D. Cow Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.30, 0.94);

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.32, 0.40), hideMat);
    headGroup.add(skull);

    // Muzzle & Nostrils
    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.20, 0.22), muzzleMat);
    muzzle.position.set(0, -0.09, 0.24);
    headGroup.add(muzzle);

    [-0.065, 0.065].forEach(side => {
      const nostril = new THREE.Mesh(new THREE.SphereGeometry(0.030, 10, 8), darkMat);
      nostril.position.set(side, -0.075, 0.34);
      headGroup.add(nostril);
    });

    // Eyes
    [-0.16, 0.16].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.038, 10, 8), darkMat);
      eye.position.set(side, 0.05, 0.08);
      headGroup.add(eye);
    });

    // Drooping Zebu Ears
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.20, 0.08), hideMat);
      ear.position.set(side * 0.20, -0.04, -0.05);
      ear.rotation.set(-0.35, 0, side * 0.85);
      headGroup.add(ear);
    });

    // Lyre Horns
    [-1, 1].forEach(side => {
      const hornCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.13, 0.15, -0.05),
        new THREE.Vector3(side * 0.26, 0.26, -0.02),
        new THREE.Vector3(side * 0.22, 0.40, 0.05)
      ]);
      const horn = new THREE.Mesh(new THREE.TubeGeometry(hornCurve, 12, 0.032, 8, false), hornMat);
      headGroup.add(horn);
    });
    group.add(headGroup);

    // E. Long Tail with Switch
    const tailGroup = new THREE.Group();
    tailGroup.position.set(0, 1.20, -0.68);
    const tailRope = new THREE.Mesh(new THREE.CylinderGeometry(0.020, 0.015, 0.62, 8), hideMat);
    tailRope.position.set(0, -0.30, -0.04);
    tailGroup.add(tailRope);

    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.042, 0.16, 8), darkMat);
    tailTuft.position.set(0, -0.62, -0.04);
    tailGroup.add(tailTuft);
    group.add(tailGroup);

    // F. 4 Sturdy Columnar Hooved Legs
    const legGeo = new THREE.CylinderGeometry(0.080, 0.065, 0.92, 12);
    const hoofGeo = new THREE.BoxGeometry(0.13, 0.075, 0.15);

    const legs = {};
    const legConfigs = [
      { name: 'legFL', x: -0.20, z:  0.45 },
      { name: 'legFR', x:  0.20, z:  0.45 },
      { name: 'legBL', x: -0.20, z: -0.45 },
      { name: 'legBR', x:  0.20, z: -0.45 }
    ];

    legConfigs.forEach(c => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 0.98, c.z);

      const limb = new THREE.Mesh(legGeo, hideMat);
      limb.position.set(0, -0.44, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      const hoof = new THREE.Mesh(hoofGeo, hoofMat);
      hoof.position.set(0, -0.93, 0.01);
      legPivot.add(hoof);

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = 'cow';
    group.userData.headGroup = headGroup;
    group.userData.tail = tailGroup;
    group.userData.legs = legs;
    group.userData.hump = hump;

    return group;
  }

  // 4. Asian Wild Elephant (~3,800 kg > 150 kg -> NET LOCKED! Quad E-Shock Only 800m-80m)
  buildElephantMesh(poseMode = 'mid', config = {}) {
    const group = new THREE.Group();
    group.name = 'stylizedAnimal';

    const hideMat = this.materials.elephantHideGrey;
    const ivoryMat = this.materials.elephantIvory;
    const darkMat = this.materials.dogNoseDark;
    const toeMat = this.materials.humanShoeSole;

    // A. Massive Columnar Torso
    const bodyGeo = new THREE.CylinderGeometry(0.90, 0.82, 2.30, 20);
    bodyGeo.rotateX(Math.PI / 2);
    const body = new THREE.Mesh(bodyGeo, hideMat);
    body.position.set(0, 1.82, 0);
    body.castShadow = true;
    group.add(body);

    const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.90, 16, 12), hideMat);
    shoulder.position.set(0, 1.83, 0.82);
    group.add(shoulder);

    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.85, 16, 12), hideMat);
    rump.position.set(0, 1.81, -0.82);
    group.add(rump);

    // B. Massive Elephant Head Group
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 2.10, 1.60);

    // Twin Asian cranial domes
    [-0.26, 0.26].forEach(side => {
      const dome = new THREE.Mesh(new THREE.SphereGeometry(0.40, 14, 10), hideMat);
      dome.position.set(side, 0.20, 0);
      headGroup.add(dome);
    });

    const skull = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.72, 0.68), hideMat);
    headGroup.add(skull);

    // Eyes
    [-0.38, 0.38].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.042, 10, 8), darkMat);
      eye.position.set(side, 0.08, 0.26);
      headGroup.add(eye);
    });

    // Large Flapping Fan Ears
    const earL = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.82, 0.62), hideMat);
    earL.position.set(-0.52, 0.05, -0.14);
    earL.rotation.y = 0.45;
    headGroup.add(earL);

    const earR = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.82, 0.62), hideMat);
    earR.position.set(0.52, 0.05, -0.14);
    earR.rotation.y = -0.45;
    headGroup.add(earR);

    // Articulated Curved Trunk
    const trunkGroup = new THREE.Group();
    trunkGroup.position.set(0, -0.20, 0.38);
    const trunkPts = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, -0.52, 0.14),
      new THREE.Vector3(0, -1.02, 0.16),
      new THREE.Vector3(0, -1.30, 0.32)
    ];
    const trunkCurve = new THREE.CatmullRomCurve3(trunkPts);
    const trunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 16, 0.13, 10, false), hideMat);
    trunkGroup.add(trunk);
    headGroup.add(trunkGroup);

    // Ivory Tusks
    [-1, 1].forEach(side => {
      const tuskCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(side * 0.22, -0.24, 0.32),
        new THREE.Vector3(side * 0.26, -0.62, 0.66),
        new THREE.Vector3(side * 0.30, -0.68, 0.90)
      ]);
      const tusk = new THREE.Mesh(new THREE.TubeGeometry(tuskCurve, 12, 0.042, 8, false), ivoryMat);
      headGroup.add(tusk);
    });
    group.add(headGroup);

    // C. 4 Pillar Tree-Trunk Legs
    const legGeo = new THREE.CylinderGeometry(0.23, 0.21, 1.65, 16);
    const legs = {};
    const legConfigs = [
      { name: 'legFL', x: -0.52, z:  0.78 },
      { name: 'legFR', x:  0.52, z:  0.78 },
      { name: 'legBL', x: -0.52, z: -0.78 },
      { name: 'legBR', x:  0.52, z: -0.78 }
    ];

    legConfigs.forEach(c => {
      const legPivot = new THREE.Group();
      legPivot.position.set(c.x, 1.65, c.z);

      const limb = new THREE.Mesh(legGeo, hideMat);
      limb.position.set(0, -0.82, 0);
      limb.castShadow = true;
      legPivot.add(limb);

      [-0.09, 0, 0.09].forEach(tx => {
        const nail = new THREE.Mesh(new THREE.SphereGeometry(0.042, 8, 6), toeMat);
        nail.position.set(tx, -1.61, 0.19);
        legPivot.add(nail);
      });

      group.add(legPivot);
      legs[c.name] = legPivot;
    });

    group.userData.type = 'elephant';
    group.userData.headGroup = headGroup;
    group.userData.trunk = trunkGroup;
    group.userData.earL = earL;
    group.userData.earR = earR;
    group.userData.legs = legs;

    return group;
  }

  // ------------------------------------------------------------------
  // Programmatic Obstacle Spawner (Supports Human & Animals in Multiple States)
  // ------------------------------------------------------------------
  spawnObstacle(type = 'human', trackProgress = 0, moveOffTrack = null, lateralOffset = null, customMass = null, customName = null, humanPose = 'mid') {
    let mesh;
    let name = customName;
    let mass = customMass;

    if (type === 'human') {
      const pose = humanPose || 'mid';
      mesh = this.buildHumanMesh(pose);
      if (mass === null || mass === undefined) mass = 72;
      if (lateralOffset === null || lateralOffset === undefined) {
        if (pose === 'enter' || pose === 1) lateralOffset = 0.98;
        else if (pose === 'exit' || pose === 2) lateralOffset = 1.05;
        else if (pose === 'sudden' || pose === 4) lateralOffset = 3.2;
        else lateralOffset = 0.0;
      }
      if (!name) {
        if (pose === 'enter' || pose === 1) name = '1. Human Entering Track (Leg on Rail, Leg on Ground)';
        else if (pose === 'exit' || pose === 2) name = '2. Human Exiting Track (Leg on Ground, Leg on Rail)';
        else if (pose === 'sudden' || pose === 4) name = '4. Sudden Jaywalker on Track (Emergency Dash)';
        else name = '3. Human Mid-Track (Between Rails)';
      }
    } else if (type === 'dog') {
      const pose = humanPose || 'mid';
      mesh = this.buildDogMesh(pose);
      if (mass === null || mass === undefined) mass = 22; // Small animal (22kg < 150kg)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = (pose === 'sudden' || pose === 4) ? 2.8 : 0.0;
      }
      if (!name) name = 'Indian Stray Dog (22 kg)';
    } else if (type === 'deer') {
      const pose = humanPose || 'mid';
      mesh = this.buildDeerMesh(pose);
      if (mass === null || mass === undefined) mass = 48; // Medium animal (48kg < 150kg)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = (pose === 'sudden' || pose === 4) ? 3.0 : 0.0;
      }
      if (!name) name = 'Indian Spotted Deer (48 kg)';
    } else if (type === 'cow') {
      const pose = humanPose || 'mid';
      mesh = this.buildCowMesh(pose);
      if (mass === null || mass === undefined) mass = 360; // Heavy livestock (360kg > 150kg -> Net Locked!)
      if (lateralOffset === null || lateralOffset === undefined) {
        lateralOffset = (pose === 'sudden' || pose === 4) ? 3.2 : 0.0;
      }
      if (!name) name = 'Indian Zebu Cow (360 kg)';
    } else if (type === 'elephant') {
      const pose = humanPose || 'mid';
      mesh = this.buildElephantMesh(pose);
      if (mass === null || mass === undefined) mass = 3800; // Giant wildlife (3,800kg > 150kg -> Net Locked!)
      if (lateralOffset === null || lateralOffset === undefined) lateralOffset = 0.0;
      if (!name) name = 'Wild Asian Elephant (3,800 kg)';
    } else {
      mesh = new THREE.Object3D();
      if (!name) name = 'Track Target';
      if (mass === null || mass === undefined) mass = 40;
      if (lateralOffset === null || lateralOffset === undefined) lateralOffset = 0;
    }

    const transform = this.track.getTrackTransform(trackProgress, 0);
    mesh.position.copy(transform.position);
    if (lateralOffset !== 0 && transform.normal) {
      mesh.position.add(transform.normal.clone().multiplyScalar(lateralOffset));
    }
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);

    // Realistic orientation relative to track & rails
    const pose = humanPose || 'mid';
    if (type === 'human') {
      if (pose === 'enter' || pose === 1) {
        mesh.rotateY(-Math.PI * 0.45);
      } else if (pose === 'exit' || pose === 2) {
        mesh.rotateY(Math.PI * 0.55);
      } else if (pose === 'sudden' || pose === 4) {
        mesh.rotateY(-Math.PI * 0.50);
      } else {
        mesh.rotateY(Math.PI);
      }
    } else {
      // Animals
      if (pose === 'sudden' || pose === 4) {
        mesh.rotateY(-Math.PI * 0.50); // Facing dash path into track
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
      humanPose: humanPose || 'mid',
      isSuddenEmerging: (humanPose === 'sudden' || humanPose === 4),
      startLateralOffset: (humanPose === 'sudden' || humanPose === 4) ? (lateralOffset || 3.0) : 0,
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
      moveOffTrackOnShock: moveOffTrack !== null ? moveOffTrack : true
    };

    this.scene.add(mesh);
    this.obstacles.push(obstacleObj);
    return obstacleObj;
  }

  // Convenience helper to spawn a human in one of the 4 modes
  spawnHuman(mode = 'mid', trackProgress = 0, lateralOffset = null, moveOffTrack = null, customMass = 72, customName = null) {
    return this.spawnObstacle('human', trackProgress, moveOffTrack, lateralOffset, customMass, customName, mode);
  }

  // Spawns a human obstacle ahead of the moving train
  spawnHumanAhead(mode = 'mid', trainProgress = 0, trackLength = 3600, distanceMeters = null, moveOffTrack = null) {
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;
    let dist = distanceMeters;
    if (dist === null || dist === undefined) {
      dist = (mode === 'sudden' || mode === 4) ? 75 : 600;
    }
    const deltaProgress = dist / actualTrackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle('human', targetProgress, moveOffTrack, null, 72, null, mode);
  }

  spawnAheadOfTrain(trainProgress, trackLength, type = 'human', distanceMeters = 85, moveOffTrack = null, customMass = null, customName = null) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(type, targetProgress, moveOffTrack, 0, customMass, customName, 'mid');
  }

  spawnBesideCoach(trainProgress, trackLength, coachIndex = 1, lateralOffset = 2.4) {
    const locoLen = 20.5;
    const coachLen = 23.5;
    const couplerGap = 0.8;
    const distBack = (locoLen / 2) + couplerGap + (coachLen / 2) + coachIndex * (coachLen + couplerGap);
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;
    const coachProgress = (trainProgress - (distBack / actualTrackLength) + 1.0) % 1.0;
    return this.spawnObstacle('human', coachProgress, true, lateralOffset, 72, 'Coach Flank Human (2-3m)', 'enter');
  }

  // Clear all obstacles from track
  clearAllObstacles() {
    while (this.obstacles.length > 0) {
      const obs = this.obstacles.pop();
      if (obs.mesh && obs.mesh.parent) obs.mesh.parent.remove(obs.mesh);
    }
    this.cleanupSceneObstacles();
    this.telemetry.targetDetected = false;
    this.telemetry.name = 'NONE (TRACK CLEAR)';
    this.telemetry.distance = null;
    this.telemetry.mass = null;
    this.telemetry.action = 'TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)';
    this.telemetry.alertMessage = null;
    this.telemetry.alertType = 'info';
  }

  // ------------------------------------------------------------------
  // One-by-One Scenario Execution Suite (Human 4 States + Animals of Different Size & Weight)
  // Protocols:
  // - Sudden Appearance (80m - 0m): CAPTURE NET OPENS ONLY FOR MAX 150KG, NO ELECTRICITY.
  // - Other Scenarios: DISTANT DETECTION (800m - 80m) USE ONLY ELECTRICITY.
  // ------------------------------------------------------------------
  applyScenario(index = 1, trainProgress = 0, trackLength = 3600) {
    this.clearAllObstacles();
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;

    let type = 'human';
    let mode = 'enter';
    let dist = 600; // 800m-80m Electricity Only zone
    let moveOffTrack = true;
    let latOffset = 0.98;
    let name = '1. Human Entering Track (Leg on Rail, Leg on Ground)';
    let mass = 72;
    let isSuddenScenario = false;

    switch (index) {
      case 1:
        // Scenario 1: Human Enter (Rail/Ground) - 800m-80m Electricity Only
        type = 'human';
        mode = 'enter';
        dist = 600;
        latOffset = 0.98;
        name = '1. Human Entering Track (Leg on Rail, Leg on Ground)';
        mass = 72;
        isSuddenScenario = false;
        break;

      case 2:
        // Scenario 2: Human Exit (Ground/Rail) - 800m-80m Electricity Only
        type = 'human';
        mode = 'exit';
        dist = 600;
        latOffset = 1.05;
        name = '2. Human Exiting Track (Leg on Ground, Leg on Rail)';
        mass = 70;
        isSuddenScenario = false;
        break;

      case 3:
        // Scenario 3: Human Mid-Track (Between Rails) - 800m-80m Electricity Only
        type = 'human';
        mode = 'mid';
        dist = 600;
        latOffset = 0.0;
        name = '3. Human Mid-Track (Between Rails)';
        mass = 74;
        isSuddenScenario = false;
        break;

      case 4:
        // Scenario 4: Sudden Human Dash (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 72kg <= 150kg)
        type = 'human';
        mode = 'sudden';
        dist = 75; // Inside 80m-0m window!
        latOffset = 3.2;
        name = '4. Sudden Jaywalker on Track (80m-0m Net Rescue)';
        mass = 72;
        isSuddenScenario = true;
        break;

      case 5:
        // Scenario 5: Stray Dog Sudden Dash (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 22kg <= 150kg)
        type = 'dog';
        mode = 'sudden';
        dist = 72; // Inside 80m-0m window!
        latOffset = 2.6;
        name = '5. Stray Dog Sudden Intrusion (22kg < 150kg Net Scoop)';
        mass = 22;
        isSuddenScenario = true;
        break;

      case 6:
        // Scenario 6: Spotted Deer Sudden Bound (80m-0m) -> CAPTURE NET OPENS (NO ELECTRICITY, 48kg <= 150kg)
        type = 'deer';
        mode = 'sudden';
        dist = 76; // Inside 80m-0m window!
        latOffset = 3.0;
        name = '6. Spotted Deer Sudden Bound (48kg < 150kg Net Scoop)';
        mass = 48;
        isSuddenScenario = true;
        break;

      case 7:
        // Scenario 7: Indian Zebu Cow on Track (800m-80m) -> ONLY ELECTRICITY (360kg > 150kg Net Locked)
        type = 'cow';
        mode = 'mid';
        dist = 650; // Inside 800m-80m window!
        latOffset = 0.0;
        name = '7. Indian Cow on Track (360kg: 800m-80m Electricity Only)';
        mass = 360;
        isSuddenScenario = false;
        break;

      case 8:
        // Scenario 8: Wild Asian Elephant on Track (800m-80m) -> QUAD ELECTRICITY ONLY (3,800kg > 150kg Net Locked)
        type = 'elephant';
        mode = 'mid';
        dist = 720; // Inside 800m-80m window!
        latOffset = 0.0;
        name = '8. Wild Elephant on Track (3,800kg: Quad Electricity Only)';
        mass = 3800;
        isSuddenScenario = false;
        break;

      case 9:
        // Scenario 9: Indian Cow Sudden Appear (80m-0m) -> TEST WEIGHT LIMIT: NET LOCKED (360kg > 150kg)! NO ELECTRICITY!
        type = 'cow';
        mode = 'sudden';
        dist = 75; // Inside 80m-0m window!
        latOffset = 3.2;
        name = '9. Cow Sudden Intrusion (360kg > 150kg: Net Locked Hazard)';
        mass = 360;
        isSuddenScenario = true;
        break;
    }

    const deltaProgress = dist / actualTrackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;

    const obs = this.spawnObstacle(type, targetProgress, moveOffTrack, latOffset, mass, name, mode);
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

  // Weight-Tiered Electric Shock Specifications (1 to 4 Power Sources)
  getTailoredShockSpecs(obs) {
    const mass = obs && obs.mass !== undefined ? obs.mass : 72;

    if (mass < 150) {
      return {
        tier: 1,
        powerSourcesCount: 1,
        activeIndices: [2],
        activeLabels: ['Down-Left (Preferred Ground Angle)'],
        voltage: '2.0 kV',
        current: '1.2 mA',
        energy: '0.04 J',
        compliance: 'IEC 60479-1 / RDSO Protocol',
        typeLabel: 'HUMAN / LIGHT HAZARD (<150KG)',
        badge: '1x POWER SOURCE: 2.0 kV / 1.2 mA',
        color: '#38bdf8',
        desc: `Under 150 kg (${mass} kg): 1 power source active (Down-Left preferred ground angle).`
      };
    } else if (mass >= 150 && mass < 250) {
      return {
        tier: 2,
        powerSourcesCount: 2,
        activeIndices: [2, 3],
        activeLabels: ['Down-Left', 'Down-Right'],
        voltage: '6.0 kV',
        current: '3.0 mA',
        energy: '0.95 J',
        compliance: 'IEC 60335-2-76 / RDSO Track Deterrence',
        typeLabel: 'MEDIUM HAZARD (150-250KG)',
        badge: '2x POWER SOURCES: 6.0 kV / 3.0 mA',
        color: '#f97316',
        desc: `150-250 kg (${mass} kg): 2 power sources active (Down-Left + Down-Right bilateral sweep).`
      };
    } else if (mass >= 250 && mass < 350) {
      return {
        tier: 3,
        powerSourcesCount: 3,
        activeIndices: [0, 1, 2],
        activeLabels: ['Top-Left', 'Top-Right', 'Down-Left'],
        voltage: '7.2 kV',
        current: '3.5 mA',
        energy: '1.25 J',
        compliance: 'RDSO Safety Tier 3',
        typeLabel: 'HEAVY HAZARD (250-350KG)',
        badge: '3x POWER SOURCES: 7.2 kV / 3.5 mA',
        color: '#e11d48',
        desc: `250-350 kg (${mass} kg): 3 power sources active (Top-Left + Top-Right + Down-Left tri-channel beam).`
      };
    } else {
      return {
        tier: 4,
        powerSourcesCount: 4,
        activeIndices: [0, 1, 2, 3],
        activeLabels: ['Top-Left', 'Top-Right', 'Down-Left', 'Down-Right'],
        voltage: '7.8 kV',
        current: '3.8 mA',
        energy: '1.40 J',
        compliance: 'RDSO Tech Circular 129 / IEC 60335-2-76',
        typeLabel: 'CRITICAL HAZARD (≥350KG)',
        badge: '4x POWER SOURCES: 7.8 kV / 3.8 mA',
        color: '#ec4899',
        desc: `350 kg and above (${mass} kg): All 4 power sources active (Quad full-power convergence).`
      };
    }
  }

  triggerDeterrence(obs, audio, train = null) {
    if (!obs || obs.isDeterred) return;
    if (train) this.train = train;

    obs.isDeterred = true;
    obs.hasBeenShocked = true;
    obs.shockTime = this.animTime;
    obs.deterMode = 'electric_shock';
    obs.fleeStartTime = this.animTime;
    obs.fleeDirection = (Math.random() > 0.5 ? 1 : -1);
    obs.isCleared = false;
    this.fxTimer = 1.2;

    if (audio) {
      audio.playElectricShockDischarge(obs.type || 'human', obs.mass);
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
    shockSpecs.activeIndices.forEach(idx => {
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
      fallbackOrigin.copy(
        this.track.getTrackTransform(obs.progress, 0).position
      ).sub(
        this.track.getTrackTransform(obs.progress, 0).tangent.clone().normalize().multiplyScalar(obs.forwardMeters || 60)
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

    activeEmitters.forEach(item => {
      const segs = 18;
      const points = [];
      const eTip = (item.emitter && item.emitter.tip) ? item.emitter.tip : null;
      const origin = new THREE.Vector3();
      if (eTip) eTip.getWorldPosition(origin);
      else origin.copy(fallbackOrigin);

      const targetOffset = new THREE.Vector3(
        (Math.random() - 0.5) * 0.35,
        (Math.random() - 0.5) * 0.40,
        (Math.random() - 0.5) * 0.35
      );
      const effectiveEnd = targetPos.clone().add(targetOffset);

      for (let i = 0; i <= segs; i++) {
        const t = i / segs;
        const p = origin.clone().lerp(effectiveEnd, t);
        if (i > 0 && i < segs) {
          const envelope = Math.sin(t * Math.PI);
          p.x += (Math.random() - 0.5) * 0.55 * envelope;
          p.y += (Math.random() - 0.5) * 0.40 * envelope;
          p.z += (Math.random() - 0.5) * 0.55 * envelope;
        }
        points.push(p);
      }

      const geom = new THREE.BufferGeometry().setFromPoints(points);
      const mat = new THREE.LineBasicMaterial({
        color: shockSpecs.color || 0x38bdf8,
        linewidth: 2,
        transparent: true,
        opacity: 0.95
      });
      const line = new THREE.Line(geom, mat);
      line.userData = {
        isLightning: true,
        emitterTip: eTip,
        fallbackOrigin: origin.clone(),
        obs: obs,
        targetOffset: targetOffset,
        segs: segs
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

    const eTip = nearest.emitter.tip;
    const origin = new THREE.Vector3();
    if (eTip) eTip.getWorldPosition(origin);
    else origin.copy(this.train.mesh.position);

    const targetPos = new THREE.Vector3();
    if (obs.mesh) {
      obs.mesh.getWorldPosition(targetPos);
      targetPos.y += 0.5;
    }

    const segs = 14;
    const points = [];
    const targetOffset = new THREE.Vector3(
      (Math.random() - 0.5) * 0.25,
      (Math.random() - 0.5) * 0.30,
      (Math.random() - 0.5) * 0.25
    );
    const effectiveEnd = targetPos.clone().add(targetOffset);

    for (let i = 0; i <= segs; i++) {
      const t = i / segs;
      const p = origin.clone().lerp(effectiveEnd, t);
      if (i > 0 && i < segs) {
        const envelope = Math.sin(t * Math.PI);
        p.x += (Math.random() - 0.5) * 0.35 * envelope;
        p.y += (Math.random() - 0.5) * 0.25 * envelope;
        p.z += (Math.random() - 0.5) * 0.35 * envelope;
      }
      points.push(p);
    }

    const geom = new THREE.BufferGeometry().setFromPoints(points);
    const mat = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      linewidth: 2,
      transparent: true,
      opacity: 0.95
    });
    const line = new THREE.Line(geom, mat);
    line.userData = {
      isLightning: true,
      isSideLightning: true,
      emitterTip: eTip,
      fallbackOrigin: origin.clone(),
      obs: obs,
      targetOffset: targetOffset,
      segs: segs
    };
    this.fxGroup.add(line);

    const flare = new THREE.PointLight(0x38bdf8, 4.0, 8);
    flare.position.copy(origin);
    flare.userData = { isSideNozzleFlare: true, emitterTip: eTip };
    this.fxGroup.add(flare);

    const targetFlash = new THREE.PointLight(0x38bdf8, 5.0, 10);
    targetFlash.position.copy(targetPos);
    targetFlash.userData = { isSideTargetLight: true, obs: obs, targetOffset: targetOffset };
    this.fxGroup.add(targetFlash);
  }

  // Coach Side Electric Shock Perimeter Guard: checks 2-3m proximity alongside coaches
  checkCoachSideProximity(train, audio) {
    if (!train || !train.coachSideEmitters || train.coachSideEmitters.length === 0) return;

    const obsWorldPos = new THREE.Vector3();

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.isCollected || !obs.mesh || obs.isCleared) continue;

      obs.mesh.getWorldPosition(obsWorldPos);

      const nearest = train.getNearestCoachSideEmitter ? train.getNearestCoachSideEmitter(obsWorldPos) : null;

      if (nearest && nearest.dist <= 3.0 && nearest.dist >= 0.1) {
        const now = this.animTime;
        if (!obs.lastSideShockTime || (now - obs.lastSideShockTime) > 1.2) {
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
            audio.playElectricShockDischarge(obs.type || 'human', obs.mass);
          }

          const repelDir = obsWorldPos.clone().sub(nearest.worldPos).setY(0).normalize();
          if (repelDir.lengthSq() < 0.01) {
            repelDir.set(nearest.emitter.side === 'left' ? -1 : 1, 0, 0);
          }
          obs.isSideRepelled = true;
          obs.sideRepelStartTime = now;
          obs.sideRepelDir = repelDir;

          this.telemetry.alertType = 'deploy';
          this.telemetry.alertMessage = `⚡ SIDE PROXIMITY GUARD: ${obs.name.toUpperCase()} WITHIN 2-3M (${nearest.dist.toFixed(1)}M) OF COACH #${coachNum} ${sideName}! DELIVERED ELECTRIC SHOCK!`;
          this.telemetry.action = `⚡ COACH #${coachNum} SIDE E-SHOCK DELIVERED (PROXIMITY: ${nearest.dist.toFixed(1)}M ≤ 3M)`;
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

    this.obstacles.forEach(obs => {
      if (obs.isCollected || !obs.mesh || !obs.mesh.userData) return;
      const ud = obs.mesh.userData;

      const dist = obs.forwardMeters !== undefined ? obs.forwardMeters : 100;
      const isTrainClose = dist < 95;
      const isUrgent = dist < 50;

      if (ud.type === 'human') {
        const seed = obs.id * 2.3;
        const localT = t + seed;

        // A. Dynamic Eye Blinking
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
        }

        // B. Mode 4: Sudden Emergence Dash into track center
        if (obs.isSuddenEmerging) {
          obs.suddenTimer = (obs.suddenTimer || 0) + dt;
          const duration = 0.45;
          const p = Math.min(1.0, obs.suddenTimer / duration);
          const curOffset = THREE.MathUtils.lerp(obs.startLateralOffset || 2.4, 0.0, p);
          obs.lateralOffset = curOffset;

          const transform = this.track.getTrackTransform(obs.progress, 0);
          const normal = transform.normal ? transform.normal.clone() : new THREE.Vector3(1, 0, 0);
          obs.mesh.position.copy(transform.position).add(normal.multiplyScalar(curOffset));

          if (p < 1.0) {
            const runCycle = obs.suddenTimer * 18.0;
            if (ud.legL) ud.legL.rotation.x = Math.sin(runCycle) * 0.75;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -Math.max(0, -Math.sin(runCycle) * 1.1);
            if (ud.legR) ud.legR.rotation.x = -Math.sin(runCycle) * 0.75;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -Math.max(0, Math.sin(runCycle) * 1.1);
            if (ud.armL) ud.armL.rotation.x = -Math.sin(runCycle) * 0.85;
            if (ud.armR) ud.armR.rotation.x = Math.sin(runCycle) * 0.85;
            if (ud.torsoGroup) ud.torsoGroup.rotation.x = 0.25;
          } else {
            obs.isSuddenEmerging = false;
            this.applyHumanPose(obs.mesh, 'sudden');
            obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);
            obs.mesh.rotateY(Math.PI); // Snap to face oncoming headlights
          }
          return;
        }

        // C. Coach Side Proximity Repulsion (When shocked by Coach Side Mechanism within 2-3m)
        if (obs.isSideRepelled && obs.sideRepelDir) {
          const repelT = this.animTime - obs.sideRepelStartTime;
          obs.mesh.position.add(obs.sideRepelDir.clone().multiplyScalar(4.0 * dt));

          if (repelT < 0.4) {
            obs.mesh.position.y += Math.sin(repelT / 0.4 * Math.PI) * 0.18;
            if (ud.headGroup) ud.headGroup.rotation.x = -0.35;
            if (ud.armL) ud.armL.rotation.set(-1.1, 0, -0.6);
            if (ud.armR) ud.armR.rotation.set(-1.1, 0, 0.6);
          } else {
            obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), obs.sideRepelDir);
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
          const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          if (obs.moveOffTrackOnShock) {
            // Human escapes track safely
            const fleeDist = Math.min(5.5, fleeT * 4.2);
            const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(0.05, transform.position.y - Math.min(0.28, fleeDist * 0.08));
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
            // Human shocked but remains on track (frozen in shock) -> Scoop Net rescue!
            obs.isCleared = false;
            const basePos = transform.position.clone();
            if (obs.lateralOffset !== 0 && transform.normal) {
              basePos.add(transform.normal.clone().multiplyScalar(obs.lateralOffset));
            }
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
            if (ud.armL) ud.armL.rotation.set(-0.75 + Math.sin(localT * 14.0) * 0.10, 0, -0.25);
            if (ud.forearmL) ud.forearmL.rotation.x = -1.2;
            if (ud.armR) ud.armR.rotation.set(-0.65 + Math.sin(localT * 8.0) * 0.08, 0, 0.25);
            if (ud.forearmR) ud.forearmR.rotation.x = -1.1;
            if (ud.legL) ud.legL.rotation.x = 0.38 + shiver * 0.5;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.65;
            if (ud.legR) ud.legR.rotation.x = 0.30 - shiver * 0.5;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.55;
          }
          return;
        }

        // E. Living Biomechanical Animations for the 4 Distinct Scenarios
        const breath = Math.sin(localT * 2.2);
        if (ud.torsoGroup) {
          ud.torsoGroup.scale.set(1.0 + 0.015 * breath, 1.0 + 0.008 * breath, 1.0 + 0.015 * breath);
        }

        const pose = obs.humanPose;

        if (pose === 'enter' || pose === 1) {
          // SCENARIO 1: ENTER ON TRACK (Lead leg on elevated rail, trailing leg on ground)
          const stepRhythm = localT * 1.6;
          const sway = Math.sin(stepRhythm);

          // Lead leg (Left) ON RAIL HEAD (+0.32m): dynamic stepping balance
          if (ud.legL) ud.legL.rotation.x = 0.52 + sway * 0.06;
          if (ud.lowerLegL) {
            ud.lowerLegL.rotation.x = -0.65 + Math.cos(stepRhythm) * 0.04;
            ud.lowerLegL.position.set(0, -0.40, 0.012); // PERCHED ON RAIL HEAD (+32cm)
          }

          // Trailing leg (Right) ON GROUND (0.0m): planted down on lower ballast slope
          if (ud.legR) ud.legR.rotation.x = -0.30 - sway * 0.04;
          if (ud.lowerLegR) {
            ud.lowerLegR.rotation.x = -0.10;
            ud.lowerLegR.position.set(0, -0.66, 0.012); // EXTENDED DOWN TO MEET GROUND (0cm)
          }

          // Pelvis & torso weight transfer bobbing
          if (ud.torsoGroup) {
            ud.torsoGroup.position.y = 0.86 + Math.abs(sway) * 0.015;
            ud.torsoGroup.rotation.z = -0.06 + sway * 0.025;
            ud.torsoGroup.rotation.x = 0.14 + sway * 0.02;
          }

          // Arms counterbalance the stepping stride
          if (ud.armL) ud.armL.rotation.x = 0.35 + sway * 0.08;
          if (ud.armR) ud.armR.rotation.x = -0.45 - sway * 0.08;

          // Head glance along tracks (reacts to oncoming train headlights)
          if (isTrainClose) {
            if (ud.headGroup) ud.headGroup.rotation.set(0.04, -0.65, 0);
          } else {
            if (ud.headGroup) ud.headGroup.rotation.set(0.10, 0.28 + Math.sin(localT * 0.6) * 0.12, 0);
          }

        } else if (pose === 'exit' || pose === 2) {
          // SCENARIO 2: EXIT TO TRACK (Lead leg on ground, trailing leg on rail)
          const stepRhythm = localT * 1.6;
          const sway = Math.sin(stepRhythm);

          // Outside lead leg (Right) ON GROUND (0.0m): reaching down onto ballast slope
          if (ud.legR) ud.legR.rotation.x = 0.42 + sway * 0.05;
          if (ud.lowerLegR) {
            ud.lowerLegR.rotation.x = -0.55 + Math.cos(stepRhythm) * 0.04;
            ud.lowerLegR.position.set(0, -0.66, 0.012); // PLANTED DOWN ON GROUND (0cm)
          }

          // Inside trailing leg (Left) ON RAIL (+0.32m): pushing off the rail head
          if (ud.legL) ud.legL.rotation.x = -0.35 - sway * 0.04;
          if (ud.lowerLegL) {
            ud.lowerLegL.rotation.x = -0.15;
            ud.lowerLegL.position.set(0, -0.40, 0.012); // PUSHING OFF RAIL HEAD (+32cm)
          }

          // Torso leans in direction of exit toward ground
          if (ud.torsoGroup) {
            ud.torsoGroup.position.y = 0.86 + Math.abs(sway) * 0.015;
            ud.torsoGroup.rotation.z = 0.08 + sway * 0.02;
            ud.torsoGroup.rotation.x = 0.14 + sway * 0.02;
          }

          // Arms balancing
          if (ud.armL) ud.armL.rotation.set(-0.20 - sway * 0.06, 0, -0.32);
          if (ud.armR) ud.armR.rotation.set(-0.15 + sway * 0.06, 0, 0.35);

          // Head glancing back over shoulder toward oncoming track
          if (isTrainClose) {
            if (ud.headGroup) ud.headGroup.rotation.set(0.04, -0.75, 0);
          } else {
            if (ud.headGroup) ud.headGroup.rotation.set(0.10, -0.35 + Math.sin(localT * 0.7) * 0.10, 0);
          }

        } else if (pose === 'sudden' || pose === 4) {
          // SCENARIO 4: SUDDEN EMERGENCE DASH (Panic Recoil & Flailing)
          const hyperBreath = Math.sin(localT * 10.0);
          if (ud.torsoGroup) {
            ud.torsoGroup.scale.set(1.0 + 0.03 * hyperBreath, 1.0 + 0.015 * hyperBreath, 1.0 + 0.03 * hyperBreath);
            ud.torsoGroup.rotation.x = -0.30 + Math.sin(localT * 14.0) * 0.02;
          }
          if (ud.headGroup) {
            ud.headGroup.rotation.x = -0.32 + Math.sin(localT * 12.0) * 0.03;
            ud.headGroup.rotation.y = Math.sin(localT * 6.0) * 0.06;
          }
          // Panicked flailing arms defensively in front of oncoming headlights
          if (ud.armL) ud.armL.rotation.set(-1.20 + Math.sin(localT * 8.0) * 0.12, 0.15, -0.55);
          if (ud.armR) ud.armR.rotation.set(-1.15 - Math.sin(localT * 8.0) * 0.12, -0.15, 0.55);
          if (ud.lowerLegL) ud.lowerLegL.position.set(0, -0.40, 0.012);
          if (ud.lowerLegR) ud.lowerLegR.position.set(0, -0.40, 0.012);

        } else {
          // SCENARIO 3: MID-TRACK (Center between rails on sleepers)
          if (!isTrainClose) {
            // Ambient idle walking / looking along tracks
            const lookYaw = Math.sin(localT * 0.35) * 0.35 + Math.sin(localT * 0.9) * 0.12;
            if (ud.headGroup) ud.headGroup.rotation.set(0.05 + Math.sin(localT * 0.6) * 0.05, lookYaw, 0);
            if (ud.armL) ud.armL.rotation.x = 0.05 + Math.sin(localT * 0.8) * 0.06;
            if (ud.armR) ud.armR.rotation.x = 0.05 - Math.sin(localT * 0.7) * 0.06;
            if (ud.legL) ud.legL.rotation.set(0.02 + Math.sin(localT * 1.2) * 0.03, 0, -0.02);
            if (ud.legR) ud.legR.rotation.set(-0.02 - Math.sin(localT * 1.2) * 0.03, 0, 0.02);
          } else {
            // Startled train alarm (< 65m): Panicked waving arms over head!
            const wave = Math.sin(localT * 9.0) * 0.45;
            if (ud.headGroup) ud.headGroup.rotation.set(-0.25, 0, 0);
            if (ud.torsoGroup) ud.torsoGroup.rotation.x = -0.15;
            if (ud.armL) ud.armL.rotation.set(-1.35 + wave, 0, -0.40);
            if (ud.armR) ud.armR.rotation.set(-1.35 - wave, 0, 0.40);
            if (ud.forearmL) ud.forearmL.rotation.x = -0.90;
            if (ud.forearmR) ud.forearmR.rotation.x = -0.90;
            // Shaking knees
            const shiver = Math.sin(localT * 24.0) * 0.03;
            if (ud.legL) ud.legL.rotation.x = 0.32 + shiver;
            if (ud.legR) ud.legR.rotation.x = 0.28 - shiver;
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -0.55;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -0.50;
          }
        }
      } else if (['dog', 'deer', 'cow', 'elephant', 'boar'].includes(ud.type)) {
        // Living Organic Animations for Quadruped Animals
        const seed = obs.id * 3.1;
        const localT = t + seed;

        // A. Sudden Emergence Dash into track
        if (obs.isSuddenEmerging) {
          obs.suddenTimer = (obs.suddenTimer || 0) + dt;
          const duration = 0.52;
          const p = Math.min(1.0, obs.suddenTimer / duration);
          const easeP = Math.sin(p * Math.PI * 0.5);
          const curOffset = THREE.MathUtils.lerp(obs.startLateralOffset || 3.0, 0.0, easeP);
          obs.lateralOffset = curOffset;

          const transform = this.track.getTrackTransform(obs.progress, 0);
          const normal = transform.normal ? transform.normal.clone() : new THREE.Vector3(1, 0, 0);
          obs.mesh.position.copy(transform.position).add(normal.multiplyScalar(curOffset));

          if (p < 1.0) {
            const speedScale = ud.type === 'dog' ? 22.0 : (ud.type === 'deer' ? 18.0 : (ud.type === 'cow' ? 14.0 : 8.0));
            const runCycle = obs.suddenTimer * speedScale;
            if (ud.legs) {
              if (ud.legs.legFL) ud.legs.legFL.rotation.x = Math.sin(runCycle) * 0.60;
              if (ud.legs.legBR) ud.legs.legBR.rotation.x = Math.sin(runCycle) * 0.60;
              if (ud.legs.legFR) ud.legs.legFR.rotation.x = -Math.sin(runCycle) * 0.60;
              if (ud.legs.legBL) ud.legs.legBL.rotation.x = -Math.sin(runCycle) * 0.60;
            }
          } else {
            obs.isSuddenEmerging = false;
            obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);
            obs.mesh.rotateY(Math.PI * 0.75); // Turn to face incoming track
            if (ud.legs) {
              Object.values(ud.legs).forEach(l => { if (l) l.rotation.x = 0; });
            }
          }
          return;
        }

        // B. Electric Shock Reaction & Fleeing Off Track
        if (obs.isDeterred) {
          const fleeT = this.animTime - obs.fleeStartTime;
          const fleeDir = obs.fleeDirection || 1;
          const transform = this.track.getTrackTransform(obs.progress, 0);
          const tangent = transform.tangent.clone().normalize();
          const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

          if (obs.moveOffTrackOnShock) {
            const fleeDist = Math.min(6.8, fleeT * 5.0);
            const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
            lateralPos.y = Math.max(0.05, transform.position.y - Math.min(0.28, fleeDist * 0.08));
            obs.mesh.position.copy(lateralPos);

            if (fleeDist >= 2.8) {
              obs.isCleared = true;
            }

            if (fleeT < 0.35) {
              obs.mesh.position.y += Math.sin(fleeT / 0.35 * Math.PI) * 0.25;
              if (ud.headGroup) ud.headGroup.rotation.y = -fleeDir * 0.4;
            } else if (fleeT < 2.5) {
              const fleeHeading = sideDir.clone().multiplyScalar(fleeDir);
              obs.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fleeHeading);

              const runCycle = (fleeT - 0.35) * (ud.type === 'dog' ? 24.0 : (ud.type === 'deer' ? 20.0 : 12.0));
              if (ud.legs) {
                if (ud.legs.legFL) ud.legs.legFL.rotation.x = Math.sin(runCycle) * 0.75;
                if (ud.legs.legBR) ud.legs.legBR.rotation.x = Math.sin(runCycle) * 0.75;
                if (ud.legs.legFR) ud.legs.legFR.rotation.x = -Math.sin(runCycle) * 0.75;
                if (ud.legs.legBL) ud.legs.legBL.rotation.x = -Math.sin(runCycle) * 0.75;
              }
            } else {
              if (ud.legs) {
                Object.values(ud.legs).forEach(l => { if (l) l.rotation.x = 0; });
              }
            }
          }
          return;
        }

        // C. Ambient Idle Animations (Breathing, Tail, Ears, Trunk)
        if (ud.type === 'dog') {
          if (ud.tail) ud.tail.rotation.y = Math.sin(localT * 8.0) * 0.35;
          if (ud.headGroup) ud.headGroup.rotation.y = Math.sin(localT * 1.5) * 0.20;
          if (isTrainClose && ud.headGroup) ud.headGroup.rotation.x = -0.25;
        } else if (ud.type === 'deer') {
          if (ud.headGroup) {
            ud.headGroup.rotation.set(0.04, Math.sin(localT * 0.8) * 0.25, 0);
          }
        } else if (ud.type === 'cow') {
          if (ud.tail) ud.tail.rotation.z = Math.sin(localT * 2.2) * 0.40;
          if (ud.headGroup) {
            ud.headGroup.rotation.set(Math.sin(localT * 1.2) * 0.08, Math.sin(localT * 0.6) * 0.12, 0);
          }
        } else if (ud.type === 'elephant') {
          if (ud.trunk) {
            ud.trunk.rotation.x = -0.28 + Math.sin(localT * 1.2) * 0.25;
            ud.trunk.rotation.z = Math.sin(localT * 0.9) * 0.10;
          }
          if (ud.earL) ud.earL.rotation.y = 0.45 + Math.sin(localT * 1.0) * 0.20;
          if (ud.earR) ud.earR.rotation.y = -0.45 - Math.sin(localT * 1.0) * 0.20;
          if (ud.headGroup) {
            ud.headGroup.rotation.y = Math.sin(localT * 0.5) * 0.10;
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

      const tempStart = new THREE.Vector3();
      const tempEnd = new THREE.Vector3();

      this.fxGroup.children.forEach(child => {
        if (child.isLine && child.userData.isLightning) {
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
          const jitterAmp = Math.min(1.2, Math.max(0.18, dist * 0.015)) * progress;

          for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const p = tempStart.clone().lerp(tempEnd, t);
            if (i > 0 && i < segs) {
              const envelope = Math.sin(t * Math.PI);
              p.x += (Math.random() - 0.5) * jitterAmp * envelope;
              p.y += (Math.random() - 0.5) * jitterAmp * 0.75 * envelope;
              p.z += (Math.random() - 0.5) * jitterAmp * envelope;
            }
            arr[i * 3]     = p.x;
            arr[i * 3 + 1] = p.y;
            arr[i * 3 + 2] = p.z;
          }
          posAttr.needsUpdate = true;
          child.material.opacity = 0.95 * progress;
        } else if (child.isPointLight) {
          if (child.userData.isNozzleFlare && child.userData.emitterTip) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 4.0 : 1.5) * progress;
          } else if (child.userData.isSideNozzleFlare && child.userData.emitterTip) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 5.0 : 2.0) * progress;
          } else if (child.userData.isSideTargetLight && child.userData.obs && child.userData.obs.mesh) {
            child.userData.obs.mesh.getWorldPosition(child.position).add(child.userData.targetOffset);
            child.intensity = (Math.random() > 0.2 ? 6.0 : 2.0) * progress;
          } else {
            child.intensity = (Math.random() > 0.2 ? 7.5 : 2.0) * progress;
          }
        }
      });

      if (this.fxTimer <= 0) {
        if (this.train && this.train.pulseShockEmitters) {
          this.train.pulseShockEmitters(0);
        }
        if (this.train && this.train.pulseCoachSideEmitters) {
          this.train.pulseCoachSideEmitters(null, 'all', 0);
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
  update(dt, trainProgress, trainSpeedMs, captureNet, audio, physics, trackLength, aiSensorAuto = true, train = null) {
    if (train) this.train = train;

    let closestObstacle = null;
    let minForwardDist = Infinity;
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;

    // Evaluate distance to each obstacle ahead of train
    this.obstacles.forEach(obs => {
      if (obs.isCollected) return;

      let forwardProgress = obs.progress - trainProgress;
      if (forwardProgress < -0.5) forwardProgress += 1.0;
      if (forwardProgress > 0.5) forwardProgress -= 1.0;

      const forwardMeters = forwardProgress * actualTrackLength;
      obs.forwardMeters = forwardMeters;

      if (forwardMeters > 0 && forwardMeters <= 1000 && forwardMeters < minForwardDist) {
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
      const isSudden = closestObstacle.isSuddenScenario || closestObstacle.humanPose === 'sudden' || closestObstacle.humanPose === 4 || closestObstacle.isSuddenEmerging;
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
            this.telemetry.tailoredSpec = '🪤 NET OPEN (≤150KG) • NO ELECTRICITY';
            this.telemetry.tailoredLabel = 'SUDDEN 80M-0M CAPTURE NET';

            if (aiSensorAuto && captureNet && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
            }

            if (minForwardDist <= 14.0) {
              // Capture and scoop into net cradle
              if (closestObstacle.mesh && closestObstacle.mesh.parent) {
                closestObstacle.mesh.parent.remove(closestObstacle.mesh);
              }
              if (captureNet) captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
              closestObstacle.isCollected = true;
              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG ≤ 150KG) — RESCUE SUCCESS!`;
              this.telemetry.alertType = 'success';
            } else {
              this.telemetry.action = `🪤 SUDDEN APPEARANCE (${Math.round(minForwardDist)}M): CAPTURE NET OPEN (${closestObstacle.mass}KG ≤ 150KG) — NO ELECTRICITY!`;
              this.telemetry.alertType = 'deploy';
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
            this.telemetry.tailoredSpec = '⚠️ NET LOCKED (>150KG) • NO ELECTRICITY';
            this.telemetry.tailoredLabel = 'OVERLOAD HAZARD (>150KG)';
            this.telemetry.action = `⚠️ SUDDEN HAZARD: WEIGHT ${closestObstacle.mass}KG > 150KG (NET LOCKED) — NO ELECTRICITY — EMERGENCY BRAKE ENGAGED!`;
            this.telemetry.alertType = 'hazard';
          }
        } else {
          // Approaching 80m sudden zone
          this.telemetry.tailoredSpec = isUnder150kg ? 'NET ARMED (80M-0M)' : 'EMERGENCY BRAKE ARMED (>150KG)';
          this.telemetry.tailoredLabel = 'SUDDEN INTRUSION';
          this.telemetry.action = `⚡ SCAN: SUDDEN ${closestObstacle.name.toUpperCase()} AT ${Math.round(minForwardDist)}M — NET ARMED (OPENS AT 80M IF ≤150KG, NO ELECTRICITY)`;
          this.telemetry.alertType = 'info';
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
          this.telemetry.tailoredSpec = 'TARGET MOVED OFF TRACK';
          this.telemetry.tailoredLabel = 'TRACK CLEAR';
          this.telemetry.action = `✅ TARGET MOVED OFF TRACK VIA ELECTRIC SHOCK (800M-80M) — TRACK CLEAR (NO NET)`;
          this.telemetry.alertType = 'success';
        } else if (minForwardDist <= 800 && minForwardDist >= 80) {
          // Inside 800m - 80m: USE ONLY ELECTRICITY!
          this.telemetry.tailoredSpec = `${tailored.badge} (800M-80M ONLY ELECTRICITY)`;
          this.telemetry.tailoredLabel = tailored.typeLabel;

          const shouldAutoShock = aiSensorAuto && !closestObstacle.hasBeenShocked;
          if (shouldAutoShock) {
            this.triggerDeterrence(closestObstacle, audio, this.train);
            if (audio) audio.playTargetAcquiredBeep(false);
            this.telemetry.alertType = 'deploy';
            this.telemetry.alertMessage = `⚡ 800M-80M ONLY ELECTRICITY: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) AT ${Math.round(minForwardDist)}M! ${tailored.powerSourcesCount}X POWER SOURCE(S) FIRING ELECTRIC SHOCK!`;
          }

          this.telemetry.action = `⚡ 800M-80M ONLY ELECTRICITY ACTIVE: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) — NON-LETHAL PULSE DELIVERED (NO NET)`;
          this.telemetry.alertType = closestObstacle.hasBeenShocked ? 'deploy' : 'info';

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
                if (captureNet) captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
                closestObstacle.isCollected = true;
                if (audio) audio.playRescueSuccessChime();
                this.telemetry.collectedCount++;
                this.telemetry.collectedWeight += closestObstacle.mass;
                this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG) — RESCUE SUCCESS!`;
                this.telemetry.alertType = 'success';
              } else {
                this.telemetry.action = `🪤 TARGET STILL ON TRACK (<80M) — BACKUP CAPTURE NET DEPLOYED (${closestObstacle.mass}KG ≤ 150KG)`;
                this.telemetry.alertType = 'deploy';
              }
            } else {
              this.telemetry.action = `⚡ 800M-80M SHOCK FIRED — TARGET APPROACHING 40M: NET READY (${closestObstacle.mass}KG ≤ 150KG)`;
              this.telemetry.alertType = 'deploy';
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
            this.telemetry.alertType = 'hazard';
          }
        } else {
          // minForwardDist > 800m
          this.telemetry.tailoredSpec = `${tailored.badge} (SCAN 1KM)`;
          this.telemetry.tailoredLabel = tailored.typeLabel;
          this.telemetry.action = `📡 1KM SCAN: ${closestObstacle.name.toUpperCase()} AT ${Math.round(minForwardDist)}M — ELECTRICITY STARTS AT 800M`;
          this.telemetry.alertType = 'info';
        }
      }
    } else {
      this.telemetry.targetDetected = false;
      this.telemetry.type = null;
      this.telemetry.name = 'NONE (TRACK CLEAR)';
      this.telemetry.distance = null;
      this.telemetry.mass = null;
      this.telemetry.tailoredSpec = 'STANDBY (1 km)';
      this.telemetry.tailoredLabel = 'CLEAR LINE';
      this.telemetry.canCollect = false;
      this.telemetry.action = 'TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)';
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = 'info';

      if (captureNet && captureNet.isDeployed && captureNet.collectedList.length === 0) {
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
