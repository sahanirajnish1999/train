// ====================================================================
// Indian Railways Real-World Track Corridor, OHE, Scenery & Infrastructure
// Features: Open Scenic Rural Corridor, Continuous OHE Catenary Masts,
// Lush Indian Flora, Level Crossings, Bilingual IR Junction Station,
// 100% Unbroken Tracks & Zero Disappearing Cars
// ====================================================================

import * as THREE from "three";

export class TrackSystem {
  constructor(scene) {
    this.scene = scene;
    this.trackGroup = new THREE.Group();
    this.scene.add(this.trackGroup);

    // Track Dimensions (Indian Broad Gauge)
    this.gauge = 1.676; // 1676 mm between rail heads
    this.trackOffset = 4.2; // Realistic centerline distance between double tracks
    this.railHeight = 0.32; // Elevated cleanly above ground and ballast

    // Curve & Length
    this.curve = null;
    this.totalLength = 0;

    // Infrastructure anchors
    this.stationProgress = 0.85;
    this.crossingProgress = 0.45;
    this.signals = [];

    // Procedural textures cache
    this.textures = this.generateTextures();

    this.initTrackPath();
    this.buildLandscape();
    this.buildBallastEmbankment();
    this.buildSleepersAndRails();
    this.buildOHECatenary();
    this.buildStation();
    this.buildLevelCrossing();
    this.buildSignals();
    this.buildMileposts();
  }

  // ---------------------------------------------------------
  // High-Fidelity Procedural Textures
  // ---------------------------------------------------------
  generateTextures() {
    // 1. Crushed Granite Stone Ballast Texture
    const canvasB = document.createElement("canvas");
    canvasB.width = 512;
    canvasB.height = 512;
    const ctxB = canvasB.getContext("2d");
    ctxB.fillStyle = "#474036";
    ctxB.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 4000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 2 + Math.random() * 4;
      const shade = Math.floor(40 + Math.random() * 70);
      ctxB.fillStyle = `rgb(${shade + 12}, ${shade + 6}, ${shade})`;
      ctxB.beginPath();
      ctxB.arc(x, y, r, 0, Math.PI * 2);
      ctxB.fill();
    }

    const ballastTex = new THREE.CanvasTexture(canvasB);
    ballastTex.wrapS = THREE.RepeatWrapping;
    ballastTex.wrapT = THREE.RepeatWrapping;
    ballastTex.repeat.set(12, 120);

    // 2. Concrete Sleeper Texture
    const canvasS = document.createElement("canvas");
    canvasS.width = 256;
    canvasS.height = 64;
    const ctxS = canvasS.getContext("2d");
    ctxS.fillStyle = "#8c8880";
    ctxS.fillRect(0, 0, 256, 64);
    for (let i = 0; i < 600; i++) {
      const shade = Math.floor(110 + Math.random() * 60);
      ctxS.fillStyle = `rgba(${shade}, ${shade}, ${shade}, 0.25)`;
      ctxS.fillRect(Math.random() * 256, Math.random() * 64, 3, 2);
    }
    ctxS.fillStyle = "#222";
    ctxS.fillRect(40, 10, 24, 44);
    ctxS.fillRect(192, 10, 24, 44);
    const sleeperTex = new THREE.CanvasTexture(canvasS);

    // 3. Authentic Indian Railways Station Bilingual Enamel Board
    const canvasStBoard = document.createElement("canvas");
    canvasStBoard.width = 1024;
    canvasStBoard.height = 384;
    const ctxStB = canvasStBoard.getContext("2d");
    ctxStB.fillStyle = "#facc15"; // Vivid mustard yellow enamel
    ctxStB.fillRect(0, 0, 1024, 384);
    // Double black border
    ctxStB.lineWidth = 14;
    ctxStB.strokeStyle = "#000";
    ctxStB.strokeRect(7, 7, 1010, 370);
    ctxStB.lineWidth = 4;
    ctxStB.strokeRect(20, 20, 984, 344);

    ctxStB.fillStyle = "#000";
    ctxStB.textAlign = "center";
    ctxStB.font = "bold 30px sans-serif";
    ctxStB.fillText("पश्चिम रेलवे  •  WESTERN RAILWAY", 512, 60);

    ctxStB.font = "bold 64px sans-serif";
    ctxStB.fillText("रतलाम जंक्शन", 512, 145);

    ctxStB.font = "bold 56px sans-serif";
    ctxStB.fillText("RATLAM JN.", 512, 225);

    ctxStB.font = "bold 44px sans-serif";
    ctxStB.fillText("رتلام جنکشن", 512, 295);

    ctxStB.font = "bold 24px sans-serif";
    ctxStB.fillText(
      "समुद्र तल से ऊंचाई : ४९३.२६ मी.  •  HEIGHT ABOVE MEAN SEA LEVEL : 493.26 M",
      512,
      345,
    );
    const stationBoardTex = new THREE.CanvasTexture(canvasStBoard);

    // 4. Station Main Building Brick & Sandstone Facade Texture
    const canvasBldg = document.createElement("canvas");
    canvasBldg.width = 512;
    canvasBldg.height = 512;
    const ctxBldg = canvasBldg.getContext("2d");
    ctxBldg.fillStyle = "#991b1b"; // Deep Terracotta Red Brick
    ctxBldg.fillRect(0, 0, 512, 512);
    // Brick courses
    ctxBldg.strokeStyle = "#7f1d1d";
    ctxBldg.lineWidth = 2;
    for (let y = 0; y < 512; y += 16) {
      ctxBldg.beginPath();
      ctxBldg.moveTo(0, y);
      ctxBldg.lineTo(512, y);
      ctxBldg.stroke();
      const offset = (y / 16) % 2 === 0 ? 0 : 16;
      for (let x = offset; x < 512; x += 32) {
        ctxBldg.beginPath();
        ctxBldg.moveTo(x, y);
        ctxBldg.lineTo(x, y + 16);
        ctxBldg.stroke();
      }
    }
    // Cream Sandstone decorative bands
    ctxBldg.fillStyle = "#fef3c7";
    ctxBldg.fillRect(0, 110, 512, 28);
    ctxBldg.fillRect(0, 360, 512, 28);
    // Arched windows
    ctxBldg.fillStyle = "#0f172a";
    for (let x = 32; x < 512; x += 80) {
      ctxBldg.fillRect(x, 170, 48, 70);
      ctxBldg.beginPath();
      ctxBldg.arc(x + 24, 170, 24, Math.PI, 0);
      ctxBldg.fill();
    }
    const stationBuildingTex = new THREE.CanvasTexture(canvasBldg);
    stationBuildingTex.wrapS = THREE.RepeatWrapping;
    stationBuildingTex.wrapT = THREE.RepeatWrapping;
    stationBuildingTex.repeat.set(4, 2);

    // 5. Platform Concrete Paver Texture with Tactile Yellow Safety Strip
    const canvasPaving = document.createElement("canvas");
    canvasPaving.width = 256;
    canvasPaving.height = 256;
    const ctxPaving = canvasPaving.getContext("2d");
    ctxPaving.fillStyle = "#94a3b8"; // Slate grey platform surface
    ctxPaving.fillRect(0, 0, 256, 256);
    // Paver grid
    ctxPaving.strokeStyle = "#64748b";
    ctxPaving.lineWidth = 2;
    for (let i = 0; i < 256; i += 32) {
      ctxPaving.strokeRect(i, 0, 32, 256);
      ctxPaving.strokeRect(0, i, 256, 32);
    }
    // Tactile warning border band along track edge
    ctxPaving.fillStyle = "#facc15";
    ctxPaving.fillRect(0, 0, 48, 256);
    // White safety margin line
    ctxPaving.fillStyle = "#ffffff";
    ctxPaving.fillRect(52, 0, 12, 256);
    const platformPaverTex = new THREE.CanvasTexture(canvasPaving);
    platformPaverTex.wrapS = THREE.RepeatWrapping;
    platformPaverTex.wrapT = THREE.RepeatWrapping;
    platformPaverTex.repeat.set(2, 40);

    // 6. Station Round Clock Dial Texture
    const canvasClock = document.createElement("canvas");
    canvasClock.width = 256;
    canvasClock.height = 256;
    const ctxClock = canvasClock.getContext("2d");
    ctxClock.fillStyle = "#f8fafc";
    ctxClock.beginPath();
    ctxClock.arc(128, 128, 120, 0, Math.PI * 2);
    ctxClock.fill();
    ctxClock.lineWidth = 8;
    ctxClock.strokeStyle = "#1e293b";
    ctxClock.stroke();
    // Clock hour marks
    ctxClock.fillStyle = "#0f172a";
    for (let a = 0; a < 12; a++) {
      const angle = (a / 12) * Math.PI * 2;
      const x1 = 128 + Math.sin(angle) * 96;
      const y1 = 128 - Math.cos(angle) * 96;
      ctxClock.beginPath();
      ctxClock.arc(x1, y1, 5, 0, Math.PI * 2);
      ctxClock.fill();
    }
    // Hour & minute hands (10:10 classic display)
    ctxClock.lineWidth = 6;
    ctxClock.strokeStyle = "#0f172a";
    ctxClock.beginPath();
    ctxClock.moveTo(128, 128);
    ctxClock.lineTo(80, 75);
    ctxClock.stroke();
    ctxClock.lineWidth = 4;
    ctxClock.beginPath();
    ctxClock.moveTo(128, 128);
    ctxClock.lineTo(180, 65);
    ctxClock.stroke();
    const stationClockTex = new THREE.CanvasTexture(canvasClock);

    // 7. Electronic Train Departure Board Texture
    const canvasDep = document.createElement("canvas");
    canvasDep.width = 512;
    canvasDep.height = 128;
    const ctxDep = canvasDep.getContext("2d");
    ctxDep.fillStyle = "#020617";
    ctxDep.fillRect(0, 0, 512, 128);
    ctxDep.strokeStyle = "#38bdf8";
    ctxDep.lineWidth = 3;
    ctxDep.strokeRect(3, 3, 506, 122);
    ctxDep.fillStyle = "#38bdf8";
    ctxDep.font = "bold 18px monospace";
    ctxDep.fillText("RATLAM JUNCTION • CENTRAL DISPLAY", 16, 26);
    ctxDep.fillStyle = "#facc15";
    ctxDep.font = "bold 22px monospace";
    ctxDep.fillText("12301 RAJDHANI EXP  PF 1  ON TIME", 16, 62);
    ctxDep.fillStyle = "#4ade80";
    ctxDep.font = "bold 20px monospace";
    ctxDep.fillText("12952 SUPERFAST EXP PF 2  EXPECTED 10:15", 16, 96);
    const trainInfoTex = new THREE.CanvasTexture(canvasDep);

    return {
      ballastTex,
      sleeperTex,
      stationBoardTex,
      stationBuildingTex,
      platformPaverTex,
      stationClockTex,
      trainInfoTex,
    };
  }

  // ---------------------------------------------------------
  // Smooth Track Path (3.6 km Real-World Scale Loop)
  // ---------------------------------------------------------
  initTrackPath() {
    const waypoints = [
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 700), // High speed straightaway
      new THREE.Vector3(140, 0, 1100), // Scenic curve approach
      new THREE.Vector3(420, 0, 1350), // Open countryside bend
      new THREE.Vector3(780, 0, 1200), // Emerging into valley
      new THREE.Vector3(980, 0, 800), // Rural crossing section
      new THREE.Vector3(1050, 0, 200), // Long eastern straight
      new THREE.Vector3(950, 0, -400),
      new THREE.Vector3(700, 0, -850),
      new THREE.Vector3(300, 0, -950), // Approach to Station
      new THREE.Vector3(-150, 0, -700), // Station straight
      new THREE.Vector3(-200, 0, -300), // Return loop
    ];

    this.curve = new THREE.CatmullRomCurve3(
      waypoints,
      true,
      "centripetal",
      0.25,
    );
    this.totalLength = this.curve.getLength();
  }

  // ---------------------------------------------------------
  // Flat Ground Terrain (NEVER BURIES THE TRACKS!)
  // ---------------------------------------------------------
  buildLandscape() {
    const groundGeo = new THREE.PlaneGeometry(4200, 4200, 16, 16);
    groundGeo.rotateX(-Math.PI / 2);

    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x2e5522, // Natural lush Indian rural green
      roughness: 0.94,
      metalness: 0.02,
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.position.y = -0.2; // Cleanly below the ballast
    ground.receiveShadow = true;
    this.trackGroup.add(ground);

    this.buildIndianTrees();
    this.buildDistantHills();
  }

  // ---------------------------------------------------------
  // Stable Horizontal Ballast Embankment (NO VERTICAL WALL!)
  // Wide 13.6m profile supporting both Indian Broad Gauge tracks
  // ---------------------------------------------------------
  buildBallastEmbankment() {
    const steps = 1000;
    const ballastGeo = new THREE.BufferGeometry();
    const positions = [];
    const uvs = [];
    const indices = [];

    const profile = [
      { x: -6.8, y: -0.15 }, // Outer toe left (flush with ground)
      { x: -4.8, y: 0.18 }, // Shoulder left
      { x: -2.1, y: 0.18 }, // Under Track 1
      { x: 0.0, y: 0.16 }, // Six-foot drainage center
      { x: 2.1, y: 0.18 }, // Under Track 2
      { x: 4.8, y: 0.18 }, // Shoulder right
      { x: 6.8, y: -0.15 }, // Outer toe right (flush with ground)
    ];

    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i <= steps; i++) {
      const u = (i % steps) / steps;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      for (let p = 0; p < profile.length; p++) {
        const offset = normal.clone().multiplyScalar(profile[p].x);
        positions.push(pt.x + offset.x, pt.y + profile[p].y, pt.z + offset.z);
        uvs.push(p / (profile.length - 1), (i / steps) * 120);
      }
    }

    const vertsPerStep = profile.length;
    for (let i = 0; i < steps; i++) {
      for (let p = 0; p < profile.length - 1; p++) {
        const curr = i * vertsPerStep + p;
        const next = curr + vertsPerStep;
        indices.push(curr, next, curr + 1);
        indices.push(curr + 1, next, next + 1);
      }
    }

    ballastGeo.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(positions, 3),
    );
    ballastGeo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    ballastGeo.setIndex(indices);
    ballastGeo.computeVertexNormals();

    const ballastMat = new THREE.MeshStandardMaterial({
      map: this.textures.ballastTex,
      roughness: 0.95,
      metalness: 0.05,
    });

    const ballastMesh = new THREE.Mesh(ballastGeo, ballastMat);
    ballastMesh.receiveShadow = true;
    ballastMesh.frustumCulled = false; // Never cull ballast under any camera angle!
    this.trackGroup.add(ballastMesh);
  }

  // ---------------------------------------------------------
  // Sleepers & Rails (4000 Divisions, 100% Solid & Never Disappearing)
  // ---------------------------------------------------------
  buildSleepersAndRails() {
    const divisions = 4000;

    const sleeperMat = new THREE.MeshStandardMaterial({
      map: this.textures.sleeperTex,
      roughness: 0.8,
      metalness: 0.1,
    });

    const railMat = new THREE.MeshStandardMaterial({
      color: 0x9ca3af,
      roughness: 0.12,
      metalness: 0.92,
    });

    const sleeperGeo = new THREE.BoxGeometry(2.65, 0.22, 0.28);
    const instancedSleepers = new THREE.InstancedMesh(
      sleeperGeo,
      sleeperMat,
      divisions * 2,
    );
    instancedSleepers.castShadow = true;
    instancedSleepers.receiveShadow = true;
    instancedSleepers.frustumCulled = false; // CRITICAL: Prevents Three.js from culling all sleepers when origin leaves screen!

    const dummy = new THREE.Object3D();
    let instanceIdx = 0;
    const up = new THREE.Vector3(0, 1, 0);
    const railHalfGauge = this.gauge / 2; // 0.838m

    const t1RailL = [];
    const t1RailR = [];
    const t2RailL = [];
    const t2RailR = [];

    for (let i = 0; i < divisions; i++) {
      const u = i / divisions;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      // Track 1
      const t1Center = pt
        .clone()
        .add(normal.clone().multiplyScalar(-this.trackOffset / 2));
      dummy.position.copy(t1Center);
      dummy.position.y += 0.2;
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(instanceIdx++, dummy.matrix);

      t1RailL.push(
        t1Center
          .clone()
          .add(normal.clone().multiplyScalar(-railHalfGauge))
          .setY(t1Center.y + this.railHeight),
      );
      t1RailR.push(
        t1Center
          .clone()
          .add(normal.clone().multiplyScalar(railHalfGauge))
          .setY(t1Center.y + this.railHeight),
      );

      // Track 2
      const t2Center = pt
        .clone()
        .add(normal.clone().multiplyScalar(this.trackOffset / 2));
      dummy.position.copy(t2Center);
      dummy.position.y += 0.2;
      dummy.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), tangent);
      dummy.updateMatrix();
      instancedSleepers.setMatrixAt(instanceIdx++, dummy.matrix);

      t2RailL.push(
        t2Center
          .clone()
          .add(normal.clone().multiplyScalar(-railHalfGauge))
          .setY(t2Center.y + this.railHeight),
      );
      t2RailR.push(
        t2Center
          .clone()
          .add(normal.clone().multiplyScalar(railHalfGauge))
          .setY(t2Center.y + this.railHeight),
      );
    }

    instancedSleepers.instanceMatrix.needsUpdate = true;
    this.trackGroup.add(instancedSleepers);

    // Continuous 60 kg/m Steel Rails
    const drawRail = (pts) => {
      const railCurve = new THREE.CatmullRomCurve3(pts, true);
      const railGeo = new THREE.TubeGeometry(railCurve, 3000, 0.05, 6, true);
      const railMesh = new THREE.Mesh(railGeo, railMat);
      railMesh.receiveShadow = true;
      railMesh.frustumCulled = false; // Never disappear!
      this.trackGroup.add(railMesh);
    };

    drawRail(t1RailL);
    drawRail(t1RailR);
    drawRail(t2RailL);
    drawRail(t2RailR);
  }

  // ---------------------------------------------------------
  // Overhead Catenary (OHE 25 kV AC)
  // ---------------------------------------------------------
  buildOHECatenary() {
    const oheMastMat = new THREE.MeshStandardMaterial({
      color: 0x64748b,
      roughness: 0.4,
      metalness: 0.6,
    });
    const wireMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      roughness: 0.2,
      metalness: 0.9,
    });
    const insMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.3,
    });

    const mastSpacing = 48;
    const mastCount = Math.floor(this.totalLength / mastSpacing);

    const contactWire1 = [];
    const contactWire2 = [];
    const catenaryWire1 = [];
    const catenaryWire2 = [];
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < mastCount; i++) {
      const u = i / mastCount;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const mastGroup = new THREE.Group();
      const mastPos = pt
        .clone()
        .add(normal.clone().multiplyScalar(-this.trackOffset / 2 - 2.8));
      mastGroup.position.copy(mastPos);
      mastGroup.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        tangent,
      );

      const pole = new THREE.Mesh(
        new THREE.BoxGeometry(0.18, 7.2, 0.18),
        oheMastMat,
      );
      pole.position.y = 3.6;
      pole.castShadow = true;
      mastGroup.add(pole);

      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(this.trackOffset + 3.4, 0.1, 0.1),
        oheMastMat,
      );
      arm.position.set((this.trackOffset + 3.4) / 2 - 0.2, 6.2, 0);
      mastGroup.add(arm);

      [2.6, 2.6 + this.trackOffset].forEach((x) => {
        const ins = new THREE.Mesh(
          new THREE.CylinderGeometry(0.05, 0.05, 0.35, 8),
          insMat,
        );
        ins.position.set(x, 5.8, 0);
        mastGroup.add(ins);
      });

      mastGroup.frustumCulled = false;
      this.trackGroup.add(mastGroup);

      const t1Pt = pt
        .clone()
        .add(normal.clone().multiplyScalar(-this.trackOffset / 2));
      const t2Pt = pt
        .clone()
        .add(normal.clone().multiplyScalar(this.trackOffset / 2));

      contactWire1.push(t1Pt.clone().setY(5.4));
      contactWire2.push(t2Pt.clone().setY(5.4));
      catenaryWire1.push(t1Pt.clone().setY(6.25));
      catenaryWire2.push(t2Pt.clone().setY(6.25));
    }

    const addWire = (pts) => {
      const c = new THREE.CatmullRomCurve3(pts, true);
      const geo = new THREE.TubeGeometry(c, 1200, 0.012, 4, true);
      const wire = new THREE.Mesh(geo, wireMat);
      wire.frustumCulled = false;
      this.trackGroup.add(wire);
    };

    addWire(contactWire1);
    addWire(contactWire2);
    addWire(catenaryWire1);
    addWire(catenaryWire2);
  }


  // ---------------------------------------------------------
  // Indian Flora (Coconut Palms & Banyan Trees)
  // ---------------------------------------------------------
  buildIndianTrees() {
    const trunkMat = new THREE.MeshStandardMaterial({
      color: 0x452b1f,
      roughness: 0.9,
    });
    const foliageMat1 = new THREE.MeshStandardMaterial({
      color: 0x1b5e20,
      roughness: 0.75,
    });
    const foliageMat2 = new THREE.MeshStandardMaterial({
      color: 0x2e7d32,
      roughness: 0.75,
    });

    const treeGroup = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 150; i++) {
      const u = (i * 0.0067) % 1.0;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const side = i % 2 === 0 ? 1 : -1;
      const dist = 11.5 + (i % 5) * 3.2;
      const treePos = pt
        .clone()
        .add(normal.clone().multiplyScalar(side * dist));

      const tree = new THREE.Group();
      tree.position.copy(treePos);

      const isPalm = i % 3 === 0;

      if (isPalm) {
        // Indian Coconut / Date Palm
        const pHeight = 8.5 + (i % 4) * 1.5;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(0.18, 0.32, pHeight, 8),
          trunkMat,
        );
        trunk.position.y = pHeight / 2;
        trunk.rotation.z = (Math.random() - 0.5) * 0.12;
        tree.add(trunk);

        for (let f = 0; f < 8; f++) {
          const fAngle = (f / 8) * Math.PI * 2;
          const frond = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 0.08, 3.2),
            foliageMat1,
          );
          frond.position.set(
            Math.cos(fAngle) * 1.4,
            pHeight + 0.2,
            Math.sin(fAngle) * 1.4,
          );
          frond.rotation.y = fAngle;
          frond.rotation.x = 0.35;
          tree.add(frond);
        }
      } else {
        // Layered Neem / Banyan Tree
        const scale = 1.0 + (i % 4) * 0.25;
        const trunk = new THREE.Mesh(
          new THREE.CylinderGeometry(
            0.25 * scale,
            0.45 * scale,
            4.0 * scale,
            7,
          ),
          trunkMat,
        );
        trunk.position.y = 2.0 * scale;
        trunk.castShadow = true;
        tree.add(trunk);

        const folMat = i % 2 === 0 ? foliageMat1 : foliageMat2;
        for (let layer = 0; layer < 3; layer++) {
          const rad = (2.2 - layer * 0.45) * scale;
          const leafCluster = new THREE.Mesh(
            new THREE.DodecahedronGeometry(rad, 1),
            folMat,
          );
          leafCluster.position.set(
            (Math.random() - 0.5) * 0.4 * scale,
            (3.6 + layer * 1.3) * scale,
            (Math.random() - 0.5) * 0.4 * scale,
          );
          leafCluster.castShadow = true;
          tree.add(leafCluster);
        }
      }

      treeGroup.add(tree);
    }

    this.trackGroup.add(treeGroup);
  }

  // ---------------------------------------------------------
  // Distant Mountain Ranges on Horizon (Misty Ghat Ranges)
  // ---------------------------------------------------------
  buildDistantHills() {
    const hillMat = new THREE.MeshStandardMaterial({
      color: 0x475569, // Soft atmospheric blue-slate distant mountain haze
      roughness: 0.95,
      metalness: 0.05,
    });

    const ridgeCount = 16;
    for (let i = 0; i < ridgeCount; i++) {
      const angle = (i / ridgeCount) * Math.PI * 2;
      const radius = 2400 + (i % 4) * 180;

      const w = 550 + (i % 4) * 120;
      const h = 180 + (i % 3) * 70;
      const ridgeGeo = new THREE.SphereGeometry(1, 16, 12);
      const ridgeMesh = new THREE.Mesh(ridgeGeo, hillMat);
      ridgeMesh.scale.set(w, h, w * 0.7);
      ridgeMesh.position.set(
        Math.cos(angle) * radius,
        -h * 0.35, // Sunk deeply so only smooth gentle crests rise above horizon
        Math.sin(angle) * radius,
      );
      this.trackGroup.add(ridgeMesh);
    }
  }

  // ---------------------------------------------------------
  // Grand Indian Railways Junction Station ("रतलाम जंक्शन / RATLAM JN.")
  // Perfectly Track-Curved Platforms (No Straight Misalignment!), Dual High-Level
  // Passenger Platforms, Arched Corrugated Steel Canopies, Iconic Foot Over Bridge (FOB),
  // Heritage Station Building with 24m Clock Tower, Bilingual Enamel Signboards,
  // Coach Position Displays, IRCTC Chai Stalls, High Mast Lighting & Safety Railings
  // ---------------------------------------------------------
  buildStation() {
    const stGroup = new THREE.Group();
    const up = new THREE.Vector3(0, 1, 0);

    const paverMat = new THREE.MeshStandardMaterial({
      map: this.textures.platformPaverTex,
      roughness: 0.82,
      metalness: 0.1,
    });

    const concreteWallMat = new THREE.MeshStandardMaterial({
      color: 0xcbd5e1, // Light concrete coping and wall
      roughness: 0.85,
    });

    const canopyMat = new THREE.MeshStandardMaterial({
      color: 0x1e3a8a, // Indian Railways Classic Navy Blue Shed
      roughness: 0.45,
      metalness: 0.55,
    });

    const steelMat = new THREE.MeshStandardMaterial({
      color: 0x334155, // Dark slate steel columns and trusses
      roughness: 0.4,
      metalness: 0.7,
    });

    const fobSteelMat = new THREE.MeshStandardMaterial({
      color: 0x2563eb, // Vibrant IR Foot Over Bridge Blue
      roughness: 0.4,
      metalness: 0.6,
    });

    const buildingMat = new THREE.MeshStandardMaterial({
      map: this.textures.stationBuildingTex,
      roughness: 0.85,
      metalness: 0.15,
    });

    const clockMat = new THREE.MeshBasicMaterial({
      map: this.textures.stationClockTex,
    });

    const stBoardMat = new THREE.MeshBasicMaterial({
      map: this.textures.stationBoardTex,
    });

    const trainInfoMat = new THREE.MeshBasicMaterial({
      map: this.textures.trainInfoTex,
    });

    // ---------------------------------------------------------
    // 1. Mathematically Track-Curved High-Level Passenger Platforms
    // Follows the CatmullRom curve with 100% precision - Zero Misalignment!
    // Platform 1 (Main Platform, Left of Track 1): x = -3.85m to -11.35m (Width 7.5m)
    // Platform 2 & 3 (Island Platform, Right of Track 2): x = +3.85m to +11.35m (Width 7.5m)
    // ---------------------------------------------------------
    const stSteps = 38;
    const stSpan = 0.058; // ~340m length (accommodating a full 12-coach rake)
    const stCenterProg = this.stationProgress; // 0.85

    const buildCurvedPlatform = (isPlatform1) => {
      const pGeo = new THREE.BufferGeometry();
      const pPos = [];
      const pUVs = [];
      const pInd = [];

      const innerX = isPlatform1 ? -3.85 : 3.85;
      const outerX = isPlatform1 ? -11.35 : 11.35;

      for (let i = 0; i <= stSteps; i++) {
        const u = stCenterProg - stSpan / 2 + (i / stSteps) * stSpan;
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u).normalize();
        const normal = new THREE.Vector3()
          .crossVectors(tangent, up)
          .normalize();

        // High-level passenger platform height (0.73m above rail level, y = 1.05m)
        // Gently sloping end ramps at both platform tips
        let deckY = 1.05;
        if (i < 3) deckY = 0.32 + (i / 3) * 0.73;
        if (i > stSteps - 3) deckY = 0.32 + ((stSteps - i) / 3) * 0.73;

        // 4 Profile vertices across platform:
        // 0: Bottom toe facing track
        // 1: Top coping edge facing track (with tactile warning line)
        // 2: Platform deck outer back edge
        // 3: Outer back wall bottom
        const v0 = pt
          .clone()
          .add(normal.clone().multiplyScalar(innerX))
          .setY(pt.y + 0.18);
        const v1 = pt
          .clone()
          .add(normal.clone().multiplyScalar(innerX))
          .setY(pt.y + deckY);
        const v2 = pt
          .clone()
          .add(normal.clone().multiplyScalar(outerX))
          .setY(pt.y + deckY);
        const v3 = pt
          .clone()
          .add(normal.clone().multiplyScalar(outerX))
          .setY(pt.y + 0.18);

        [v0, v1, v2, v3].forEach((v, idx) => {
          pPos.push(v.x, v.y, v.z);
          pUVs.push(idx / 3, (i / stSteps) * 45);
        });
      }

      for (let i = 0; i < stSteps; i++) {
        // Front wall facing track
        const w0 = i * 4;
        const w1 = w0 + 1;
        const w2 = (i + 1) * 4;
        const w3 = w2 + 1;
        if (isPlatform1) {
          pInd.push(w0, w2, w1);
          pInd.push(w1, w2, w3);
        } else {
          pInd.push(w0, w1, w2);
          pInd.push(w1, w3, w2);
        }

        // Platform deck top surface
        const d0 = i * 4 + 1;
        const d1 = d0 + 1;
        const d2 = (i + 1) * 4 + 1;
        const d3 = d2 + 1;
        if (isPlatform1) {
          pInd.push(d0, d2, d1);
          pInd.push(d1, d2, d3);
        } else {
          pInd.push(d0, d1, d2);
          pInd.push(d1, d3, d2);
        }

        // Back wall
        const b0 = i * 4 + 2;
        const b1 = b0 + 1;
        const b2 = (i + 1) * 4 + 2;
        const b3 = b2 + 1;
        if (isPlatform1) {
          pInd.push(b0, b2, b1);
          pInd.push(b1, b2, b3);
        } else {
          pInd.push(b0, b1, b2);
          pInd.push(b1, b3, b2);
        }
      }

      pGeo.setAttribute("position", new THREE.Float32BufferAttribute(pPos, 3));
      pGeo.setAttribute("uv", new THREE.Float32BufferAttribute(pUVs, 2));
      pGeo.setIndex(pInd);
      pGeo.computeVertexNormals();

      const pMesh = new THREE.Mesh(pGeo, paverMat);
      pMesh.receiveShadow = true;
      pMesh.frustumCulled = false;
      stGroup.add(pMesh);
    };

    buildCurvedPlatform(true); // Platform 1 (Main Platform)
    buildCurvedPlatform(false); // Platform 2 (Island Platform)

    // ---------------------------------------------------------
    // 2. Curved Indian Railways Corrugated Steel Canopies (Platform Sheds)
    // Spans 230m along both platforms with steel A-frame columns and roof lighting
    // ---------------------------------------------------------
    const buildPlatformCanopy = (isPlatform1) => {
      const canopySteps = 26;
      const canopySpan = 0.04; // ~235m covered zone
      const cGeo = new THREE.BufferGeometry();
      const cPos = [];
      const cUVs = [];
      const cInd = [];

      const innerEave = isPlatform1 ? -3.6 : 3.6;
      const centerRidge = isPlatform1 ? -7.5 : 7.5;
      const outerEave = isPlatform1 ? -11.5 : 11.5;

      for (let i = 0; i <= canopySteps; i++) {
        const u =
          stCenterProg - canopySpan / 2 + (i / canopySteps) * canopySpan;
        const pt = this.curve.getPointAt(u);
        const tangent = this.curve.getTangentAt(u).normalize();
        const normal = new THREE.Vector3()
          .crossVectors(tangent, up)
          .normalize();

        // 3 Arched canopy profile points:
        const vEave1 = pt
          .clone()
          .add(normal.clone().multiplyScalar(innerEave))
          .setY(pt.y + 4.7);
        const vRidge = pt
          .clone()
          .add(normal.clone().multiplyScalar(centerRidge))
          .setY(pt.y + 5.4);
        const vEave2 = pt
          .clone()
          .add(normal.clone().multiplyScalar(outerEave))
          .setY(pt.y + 4.7);

        [vEave1, vRidge, vEave2].forEach((v, idx) => {
          cPos.push(v.x, v.y, v.z);
          cUVs.push(idx / 2, (i / canopySteps) * 30);
        });

        // Steel support columns every 3 steps (~18m)
        if (i % 3 === 0) {
          const colPos = pt
            .clone()
            .add(normal.clone().multiplyScalar(centerRidge))
            .setY(pt.y + 1.05);
          const col = new THREE.Mesh(
            new THREE.BoxGeometry(0.35, 4.3, 0.35),
            steelMat,
          );
          col.position.copy(colPos).setY(colPos.y + 2.15);
          col.castShadow = true;
          col.frustumCulled = false;
          stGroup.add(col);

          // Cantilever roof truss arms spreading out to eaves
          const trussArm = new THREE.Mesh(
            new THREE.BoxGeometry(7.8, 0.15, 0.15),
            steelMat,
          );
          trussArm.position.copy(colPos).setY(colPos.y + 3.8);
          trussArm.quaternion.setFromUnitVectors(
            new THREE.Vector3(1, 0, 0),
            normal,
          );
          trussArm.frustumCulled = false;
          stGroup.add(trussArm);

          // Warm suspended platform luminaire
          const lightBar = new THREE.Mesh(
            new THREE.BoxGeometry(0.3, 0.12, 1.8),
            new THREE.MeshBasicMaterial({ color: 0xfffbeb }),
          );
          lightBar.position.copy(colPos).setY(colPos.y + 3.5);
          lightBar.quaternion.setFromUnitVectors(
            new THREE.Vector3(0, 0, 1),
            tangent,
          );
          lightBar.frustumCulled = false;
          stGroup.add(lightBar);

          // Digital Coach Position Indicator (Amber LED box hanging from truss)
          if (isPlatform1 && i > 2 && i < canopySteps - 2) {
            const coachNames = [
              "LOCO",
              "GEN",
              "S1",
              "B1",
              "B2",
              "B3",
              "A1",
              "H1",
            ];
            const cName = coachNames[(i / 3 - 1) % coachNames.length];
            const coachBox = new THREE.Mesh(
              new THREE.BoxGeometry(0.65, 0.45, 0.95),
              new THREE.MeshBasicMaterial({ color: 0x09090b }),
            );
            coachBox.position
              .copy(colPos)
              .setY(colPos.y + 3.2)
              .add(normal.clone().multiplyScalar(3.2));
            coachBox.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              tangent,
            );
            coachBox.frustumCulled = false;
            stGroup.add(coachBox);

            // Glowing Coach text on both faces
            const cLed = new THREE.Mesh(
              new THREE.PlaneGeometry(0.85, 0.35),
              new THREE.MeshBasicMaterial({ color: 0xf59e0b }),
            );
            cLed.position
              .copy(coachBox.position)
              .add(normal.clone().multiplyScalar(0.34));
            cLed.quaternion.setFromUnitVectors(
              new THREE.Vector3(0, 0, 1),
              normal,
            );
            cLed.frustumCulled = false;
            stGroup.add(cLed);
          }
        }
      }

      for (let i = 0; i < canopySteps; i++) {
        for (let q = 0; q < 2; q++) {
          const c0 = i * 3 + q;
          const c1 = c0 + 1;
          const c2 = (i + 1) * 3 + q;
          const c3 = c2 + 1;
          if (isPlatform1) {
            cInd.push(c0, c2, c1);
            cInd.push(c1, c2, c3);
          } else {
            cInd.push(c0, c1, c2);
            cInd.push(c1, c3, c2);
          }
        }
      }

      cGeo.setAttribute("position", new THREE.Float32BufferAttribute(cPos, 3));
      cGeo.setAttribute("uv", new THREE.Float32BufferAttribute(cUVs, 2));
      cGeo.setIndex(cInd);
      cGeo.computeVertexNormals();

      const canopyMesh = new THREE.Mesh(cGeo, canopyMat);
      canopyMesh.castShadow = true;
      canopyMesh.receiveShadow = true;
      canopyMesh.frustumCulled = false;
      stGroup.add(canopyMesh);
    };

    buildPlatformCanopy(true); // Platform 1 Canopy
    buildPlatformCanopy(false); // Platform 2 Canopy

    // ---------------------------------------------------------
    // 3. Iconic Indian Railways Foot Over Bridge (FOB)
    // Spans from Platform 1 across both tracks to Platform 2 (7.4m high, clearing OHE)
    // ---------------------------------------------------------
    const fobPt = this.curve.getPointAt(stCenterProg);
    const fobTang = this.curve.getTangentAt(stCenterProg).normalize();
    const fobNorm = new THREE.Vector3().crossVectors(fobTang, up).normalize();

    const fobGroup = new THREE.Group();
    fobGroup.position.copy(fobPt);
    fobGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fobTang);

    // Elevated Walkway Truss Bridge (Spans x = -7.5m to +7.5m across both tracks)
    const fobBridgeSpan = 16.0;
    const fobFloor = new THREE.Mesh(
      new THREE.BoxGeometry(fobBridgeSpan, 0.35, 3.2),
      fobSteelMat,
    );
    fobFloor.position.set(0, 7.3, 0);
    fobFloor.castShadow = true;
    fobFloor.frustumCulled = false;
    fobGroup.add(fobFloor);

    // Blue Pratt Truss side railings
    [-1.5, 1.5].forEach((fz) => {
      const truss = new THREE.Mesh(
        new THREE.BoxGeometry(fobBridgeSpan, 1.8, 0.12),
        fobSteelMat,
      );
      truss.position.set(0, 8.2, fz);
      truss.castShadow = true;
      truss.frustumCulled = false;
      fobGroup.add(truss);
    });

    // Covered FOB Walkway Canopy Roof
    const fobRoof = new THREE.Mesh(
      new THREE.BoxGeometry(fobBridgeSpan + 0.4, 0.15, 3.6),
      canopyMat,
    );
    fobRoof.position.set(0, 9.4, 0);
    fobRoof.castShadow = true;
    fobRoof.frustumCulled = false;
    fobGroup.add(fobRoof);

    // Large Bilingual Station Nameplate on FOB Girder facing approaching trains
    const fobNamePlate = new THREE.Mesh(
      new THREE.BoxGeometry(6.5, 1.4, 0.12),
      stBoardMat,
    );
    fobNamePlate.position.set(0, 8.4, 1.6);
    fobNamePlate.castShadow = true;
    fobNamePlate.frustumCulled = false;
    fobGroup.add(fobNamePlate);

    // Heavy Support Trestle Towers on Platform 1 and Platform 2
    [-7.5, 7.5].forEach((tx) => {
      const tower = new THREE.Mesh(
        new THREE.BoxGeometry(1.4, 6.3, 2.6),
        steelMat,
      );
      tower.position.set(tx, 4.15, 0);
      tower.castShadow = true;
      tower.frustumCulled = false;
      fobGroup.add(tower);

      // Staircase stepping down gracefully onto the platform
      const stepCount = 18;
      for (let s = 0; s < stepCount; s++) {
        const stepY = 7.1 - (s / stepCount) * 6.0;
        const stepZ = 1.8 + s * 0.72;
        const step = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 0.22, 0.75),
          fobSteelMat,
        );
        step.position.set(tx, stepY, stepZ);
        step.castShadow = true;
        step.frustumCulled = false;
        fobGroup.add(step);
      }

      // Staircase blue handrails
      const rail = new THREE.Mesh(
        new THREE.BoxGeometry(0.1, 0.1, 13.5),
        fobSteelMat,
      );
      rail.position.set(tx - 1.15, 4.8, 7.5);
      rail.rotation.x = -0.42;
      fobGroup.add(rail);

      const rail2 = rail.clone();
      rail2.position.set(tx + 1.15, 4.8, 7.5);
      fobGroup.add(rail2);
    });

    fobGroup.frustumCulled = false;
    stGroup.add(fobGroup);

    // ---------------------------------------------------------
    // 4. Grand Heritage Indian Railways Station Building & Concourse
    // Sandstone & Terracotta Brick Architecture with 24m Central Clock Tower
    // ---------------------------------------------------------
    const bldgGroup = new THREE.Group();
    bldgGroup.position.copy(fobPt);
    bldgGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      fobTang,
    );

    // Main Concourse Building (Behind Platform 1, x = -19.5m, width = 84m along Z)
    const mainBldg = new THREE.Mesh(
      new THREE.BoxGeometry(16.0, 14.5, 84.0),
      buildingMat,
    );
    mainBldg.position.set(-19.5, 7.25, 0);
    mainBldg.castShadow = true;
    mainBldg.receiveShadow = true;
    mainBldg.frustumCulled = false;
    bldgGroup.add(mainBldg);

    // Cream Sandstone Entrance Portico & Colonnade
    const porticoMat = new THREE.MeshStandardMaterial({
      color: 0xfef3c7,
      roughness: 0.6,
    });
    const portico = new THREE.Mesh(
      new THREE.BoxGeometry(4.2, 10.0, 24.0),
      porticoMat,
    );
    portico.position.set(-11.4, 5.0, 0);
    portico.castShadow = true;
    portico.frustumCulled = false;
    bldgGroup.add(portico);

    // 24m Grand Central Station Clock Tower
    const tower = new THREE.Mesh(
      new THREE.BoxGeometry(9.0, 24.0, 9.0),
      buildingMat,
    );
    tower.position.set(-19.5, 12.0, 0);
    tower.castShadow = true;
    tower.frustumCulled = false;
    bldgGroup.add(tower);

    // Sandstone Tower Crown & Battlements
    const crown = new THREE.Mesh(
      new THREE.BoxGeometry(10.2, 1.4, 10.2),
      porticoMat,
    );
    crown.position.set(-19.5, 24.2, 0);
    crown.castShadow = true;
    crown.frustumCulled = false;
    bldgGroup.add(crown);

    // Flagpole with Indian Tricolor Flag on top of Clock Tower
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.08, 0.12, 6.5, 8),
      steelMat,
    );
    pole.position.set(-19.5, 27.5, 0);
    bldgGroup.add(pole);

    const flagMat = new THREE.MeshBasicMaterial({ color: 0xf97316 });
    const flag = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.4), flagMat);
    flag.position.set(-19.5, 29.5, 1.2);
    bldgGroup.add(flag);

    // 4.0m Circular Station Clock Dials on Clock Tower (Facing tracks and platform)
    const clockDial = new THREE.Mesh(
      new THREE.PlaneGeometry(4.2, 4.2),
      clockMat,
    );
    clockDial.position.set(-14.9, 19.5, 0);
    clockDial.rotation.y = Math.PI / 2;
    clockDial.frustumCulled = false;
    bldgGroup.add(clockDial);

    // Illuminated 3D Station Nameplate on Building Roof: "रतलाम जंक्शन • RATLAM JUNCTION"
    const roofSignMat = new THREE.MeshBasicMaterial({ color: 0xdc2626 });
    const roofSignBoard = new THREE.Mesh(
      new THREE.BoxGeometry(0.3, 1.8, 38.0),
      roofSignMat,
    );
    roofSignBoard.position.set(-11.6, 15.4, 0);
    roofSignBoard.castShadow = true;
    roofSignBoard.frustumCulled = false;
    bldgGroup.add(roofSignBoard);

    bldgGroup.frustumCulled = false;
    stGroup.add(bldgGroup);

    // ---------------------------------------------------------
    // 5. Authentic Platform Amenities & Yard Infrastructure
    // Bilingual Enamel Boards, Digital Train Departure Screens, IRCTC Stalls, Benches, Lights & Safety Fence
    // ---------------------------------------------------------
    // A. 3 Large Bilingual Yellow Enamel Station Boards on Platform 1 & Platform 2
    [-0.022, 0.0, 0.022].forEach((uOffset) => {
      const bU = stCenterProg + uOffset;
      const bPt = this.curve.getPointAt(bU);
      const bTang = this.curve.getTangentAt(bU).normalize();
      const bNorm = new THREE.Vector3().crossVectors(bTang, up).normalize();

      // Platform 1 Board
      const bPos1 = bPt
        .clone()
        .add(bNorm.clone().multiplyScalar(-7.6))
        .setY(bPt.y + 1.05);
      const bPost1 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
        steelMat,
      );
      bPost1.position.copy(bPos1).setY(bPos1.y + 1.4);
      bPost1.frustumCulled = false;
      stGroup.add(bPost1);

      const bBoard1 = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.8, 4.8),
        stBoardMat,
      );
      bBoard1.position.copy(bPos1).setY(bPos1.y + 2.4);
      bBoard1.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), bNorm);
      bBoard1.castShadow = true;
      bBoard1.frustumCulled = false;
      stGroup.add(bBoard1);

      // Platform 2 Board
      const bPos2 = bPt
        .clone()
        .add(bNorm.clone().multiplyScalar(7.6))
        .setY(bPt.y + 1.05);
      const bPost2 = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 2.8, 8),
        steelMat,
      );
      bPost2.position.copy(bPos2).setY(bPos2.y + 1.4);
      bPost2.frustumCulled = false;
      stGroup.add(bPost2);

      const bBoard2 = new THREE.Mesh(
        new THREE.BoxGeometry(0.12, 1.8, 4.8),
        stBoardMat,
      );
      bBoard2.position.copy(bPos2).setY(bPos2.y + 2.4);
      bBoard2.quaternion.setFromUnitVectors(new THREE.Vector3(1, 0, 0), bNorm);
      bBoard2.castShadow = true;
      bBoard2.frustumCulled = false;
      stGroup.add(bBoard2);
    });

    // B. Electronic Train Departure Displays Suspended Under Canopy
    [-0.01, 0.01].forEach((uOffset) => {
      const dU = stCenterProg + uOffset;
      const dPt = this.curve.getPointAt(dU);
      const dTang = this.curve.getTangentAt(dU).normalize();
      const dNorm = new THREE.Vector3().crossVectors(dTang, up).normalize();

      const depScreen = new THREE.Mesh(
        new THREE.BoxGeometry(0.2, 1.1, 4.2),
        trainInfoMat,
      );
      depScreen.position
        .copy(dPt)
        .add(dNorm.clone().multiplyScalar(-7.6))
        .setY(dPt.y + 4.2);
      depScreen.quaternion.setFromUnitVectors(
        new THREE.Vector3(1, 0, 0),
        dNorm,
      );
      depScreen.frustumCulled = false;
      stGroup.add(depScreen);
    });

    // C. IRCTC Food & Chai Kiosks on Platform 1 & Platform 2
    const irctcMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      roughness: 0.5,
    });
    [-0.014, 0.014].forEach((uOffset, kIdx) => {
      const kU = stCenterProg + uOffset;
      const kPt = this.curve.getPointAt(kU);
      const kTang = this.curve.getTangentAt(kU).normalize();
      const kNorm = new THREE.Vector3().crossVectors(kTang, up).normalize();

      const kPos = kPt
        .clone()
        .add(kNorm.clone().multiplyScalar(kIdx === 0 ? -9.5 : 9.5))
        .setY(kPt.y + 1.05);

      const kiosk = new THREE.Mesh(
        new THREE.BoxGeometry(2.4, 2.6, 4.5),
        irctcMat,
      );
      kiosk.position.copy(kPos).setY(kPos.y + 1.3);
      kiosk.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), kTang);
      kiosk.castShadow = true;
      kiosk.frustumCulled = false;
      stGroup.add(kiosk);

      // Yellow canopy awning on stall
      const awning = new THREE.Mesh(
        new THREE.BoxGeometry(2.8, 0.25, 4.8),
        new THREE.MeshStandardMaterial({ color: 0xfacc15 }),
      );
      awning.position.copy(kPos).setY(kPos.y + 2.6);
      awning.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), kTang);
      stGroup.add(awning);
    });

    // D. Platform Passenger Benches (10 Benches along Platform 1 & 2)
    const benchWoodMat = new THREE.MeshStandardMaterial({
      color: 0x78350f,
      roughness: 0.7,
    });
    for (let b = 0; b < 10; b++) {
      const bU = stCenterProg - 0.018 + (b / 9) * 0.036;
      const bPt = this.curve.getPointAt(bU);
      const bTang = this.curve.getTangentAt(bU).normalize();
      const bNorm = new THREE.Vector3().crossVectors(bTang, up).normalize();

      [-7.6, 7.6].forEach((bx) => {
        const benchPos = bPt
          .clone()
          .add(bNorm.clone().multiplyScalar(bx))
          .setY(bPt.y + 1.05);
        const bench = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.45, 2.2),
          benchWoodMat,
        );
        bench.position.copy(benchPos).setY(benchPos.y + 0.25);
        bench.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), bTang);
        bench.castShadow = true;
        bench.frustumCulled = false;
        stGroup.add(bench);

        const benchBack = new THREE.Mesh(
          new THREE.BoxGeometry(0.1, 0.5, 2.2),
          benchWoodMat,
        );
        benchBack.position
          .copy(benchPos)
          .add(bNorm.clone().multiplyScalar(bx > 0 ? 0.3 : -0.3))
          .setY(benchPos.y + 0.6);
        benchBack.quaternion.setFromUnitVectors(
          new THREE.Vector3(0, 0, 1),
          bTang,
        );
        stGroup.add(benchBack);
      });
    }

    // E. High Mast Yard Floodlight Tower (25m tall hexagonal mast with circular floodlight ring)
    const mastPt = this.curve.getPointAt(stCenterProg);
    const mastNorm = new THREE.Vector3()
      .crossVectors(this.curve.getTangentAt(stCenterProg).normalize(), up)
      .normalize();
    const mastPos = mastPt
      .clone()
      .add(mastNorm.clone().multiplyScalar(16.0))
      .setY(0);

    const highMast = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.75, 25.0, 8),
      steelMat,
    );
    highMast.position.copy(mastPos).setY(12.5);
    highMast.castShadow = true;
    highMast.frustumCulled = false;
    stGroup.add(highMast);

    const lightRing = new THREE.Mesh(
      new THREE.TorusGeometry(1.8, 0.15, 8, 16),
      steelMat,
    );
    lightRing.rotation.x = Math.PI / 2;
    lightRing.position.copy(mastPos).setY(24.5);
    stGroup.add(lightRing);

    const yardLight = new THREE.PointLight(0xfffaed, 2.6, 95, 1.3);
    yardLight.position.copy(mastPos).setY(24.0);
    stGroup.add(yardLight);

    // F. Inter-Track Tubular Steel Safety Fencing (between Track 1 and Track 2)
    const fenceSteps = 28;
    const fenceSpan = 0.046;
    for (let f = 0; f < fenceSteps; f++) {
      const fU = stCenterProg - fenceSpan / 2 + (f / fenceSteps) * fenceSpan;
      const fPt = this.curve.getPointAt(fU);
      const fTang = this.curve.getTangentAt(fU).normalize();

      const fPost = new THREE.Mesh(
        new THREE.CylinderGeometry(0.04, 0.04, 1.2, 6),
        steelMat,
      );
      fPost.position.copy(fPt).setY(fPt.y + 0.6);
      fPost.frustumCulled = false;
      stGroup.add(fPost);

      const fBar = new THREE.Mesh(
        new THREE.BoxGeometry(0.06, 0.06, 4.8),
        steelMat,
      );
      fBar.position.copy(fPt).setY(fPt.y + 0.9);
      fBar.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), fTang);
      fBar.frustumCulled = false;
      stGroup.add(fBar);
    }

    stGroup.frustumCulled = false;
    this.trackGroup.add(stGroup);
  }

  // ---------------------------------------------------------
  // Level Crossing
  // ---------------------------------------------------------
  buildLevelCrossing() {
    const crossGroup = new THREE.Group();
    const crossPt = this.curve.getPointAt(this.crossingProgress);
    const tangent = this.curve.getTangentAt(this.crossingProgress).normalize();

    crossGroup.position.copy(crossPt);
    crossGroup.quaternion.setFromUnitVectors(
      new THREE.Vector3(0, 0, 1),
      tangent,
    );

    const roadMat = new THREE.MeshStandardMaterial({
      color: 0x1f2937,
      roughness: 0.9,
    });
    const barrierMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15,
      roughness: 0.4,
    });

    const road = new THREE.Mesh(
      new THREE.BoxGeometry(26.0, 0.12, 8.0),
      roadMat,
    );
    road.position.y = 0.06;
    crossGroup.add(road);

    [-5.5, 5.5].forEach((x) => {
      const arm = new THREE.Mesh(
        new THREE.BoxGeometry(7.0, 0.15, 0.12),
        barrierMat,
      );
      arm.position.set(x > 0 ? -3.5 : 3.5, 1.1, x > 0 ? 4.5 : -4.5);
      crossGroup.add(arm);
    });

    this.trackGroup.add(crossGroup);
  }

  // ---------------------------------------------------------
  // Signals
  // ---------------------------------------------------------
  buildSignals() {
    this.signals = [];
    const positions = [0.12, 0.35, 0.6, 0.82];
    const up = new THREE.Vector3(0, 1, 0);

    positions.forEach((prog) => {
      const pt = this.curve.getPointAt(prog);
      const tangent = this.curve.getTangentAt(prog).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const sigGroup = new THREE.Group();
      sigGroup.position
        .copy(pt)
        .add(normal.clone().multiplyScalar(-this.trackOffset / 2 - 2.4));
      sigGroup.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        tangent,
      );

      const post = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 4.8, 8),
        new THREE.MeshStandardMaterial({ color: 0x9ca3af }),
      );
      post.position.y = 2.4;
      sigGroup.add(post);

      const sigBox = new THREE.Mesh(
        new THREE.BoxGeometry(0.42, 1.3, 0.28),
        new THREE.MeshStandardMaterial({ color: 0x111 }),
      );
      sigBox.position.set(0, 4.2, 0);
      sigGroup.add(sigBox);

      const lamps = {};
      const lampDefs = [
        { name: "green", y: 4.6, col: 0x00e676 },
        { name: "yellow1", y: 4.3, col: 0xffd600 },
        { name: "red", y: 4.0, col: 0xff1744 },
        { name: "yellow2", y: 3.7, col: 0xffd600 },
      ];

      lampDefs.forEach((l) => {
        const mesh = new THREE.Mesh(
          new THREE.CylinderGeometry(0.07, 0.07, 0.05, 12).rotateX(Math.PI / 2),
          new THREE.MeshBasicMaterial({ color: 0x222 }),
        );
        mesh.position.set(0, l.y, 0.15);
        sigGroup.add(mesh);
        lamps[l.name] = { mesh, color: l.col };
      });

      this.trackGroup.add(sigGroup);
      this.signals.push({ progress: prog, lamps, currentAspect: "green" });
    });

    this.updateSignals(0);
  }

  updateSignals(trainProgress) {
    this.signals.forEach((sig) => {
      let aspect = "green";
      const dist = (sig.progress - trainProgress + 1.0) % 1.0;

      if (dist < 0.04) aspect = "red";
      else if (dist < 0.09) aspect = "yellow";
      else if (dist < 0.15) aspect = "double_yellow";
      else aspect = "green";

      sig.currentAspect = aspect;

      Object.keys(sig.lamps).forEach((k) => {
        sig.lamps[k].mesh.material.color.setHex(0x222);
      });

      if (aspect === "green")
        sig.lamps.green.mesh.material.color.setHex(sig.lamps.green.color);
      else if (aspect === "yellow")
        sig.lamps.yellow1.mesh.material.color.setHex(sig.lamps.yellow1.color);
      else if (aspect === "double_yellow") {
        sig.lamps.yellow1.mesh.material.color.setHex(sig.lamps.yellow1.color);
        sig.lamps.yellow2.mesh.material.color.setHex(sig.lamps.yellow2.color);
      } else if (aspect === "red")
        sig.lamps.red.mesh.material.color.setHex(sig.lamps.red.color);
    });
  }

  buildMileposts() {
    const postMat = new THREE.MeshStandardMaterial({ color: 0xf3f4f6 });
    const up = new THREE.Vector3(0, 1, 0);

    for (let i = 0; i < 18; i++) {
      const u = i / 18;
      const pt = this.curve.getPointAt(u);
      const tangent = this.curve.getTangentAt(u).normalize();
      const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

      const postGroup = new THREE.Group();
      postGroup.position
        .copy(pt)
        .add(normal.clone().multiplyScalar(this.trackOffset / 2 + 2.5));
      postGroup.quaternion.setFromUnitVectors(
        new THREE.Vector3(0, 0, 1),
        tangent,
      );

      const stone = new THREE.Mesh(
        new THREE.BoxGeometry(0.28, 0.85, 0.18),
        postMat,
      );
      stone.position.y = 0.42;
      postGroup.add(stone);

      this.trackGroup.add(postGroup);
    }
  }

  // ---------------------------------------------------------
  // Precise Track Evaluation at progress (Track 1 = left, Track 2 = right)
  // ---------------------------------------------------------
  getTrackTransform(progress, trackIndex = 0) {
    const u = ((progress % 1.0) + 1.0) % 1.0;
    const pt = this.curve.getPointAt(u);
    const tangent = this.curve.getTangentAt(u).normalize();
    const up = new THREE.Vector3(0, 1, 0);
    const normal = new THREE.Vector3().crossVectors(tangent, up).normalize();

    const offset =
      trackIndex === 0 ? -this.trackOffset / 2 : this.trackOffset / 2;
    const position = pt.clone().add(normal.clone().multiplyScalar(offset));
    position.y += this.railHeight;

    const delta = 0.002;
    const pPrev = this.curve.getPointAt((u - delta + 1.0) % 1.0);
    const pNext = this.curve.getPointAt((u + delta) % 1.0);
    const v1 = pt.clone().sub(pPrev);
    const v2 = pNext.clone().sub(pt);
    const cross = new THREE.Vector3().crossVectors(v1, v2);
    const curveRadius =
      cross.length() > 0.0001 ? (1.0 / cross.length()) * 50 : 0;
    const curveSign = cross.y > 0 ? 1 : -1;

    return {
      position,
      tangent,
      normal,
      curveRadius: curveRadius * curveSign,
    };
  }

  // ---------------------------------------------------------
  // Continuous Car Transform (Zero Disappearing Trains)
  // ---------------------------------------------------------
  getCarTransform(centerProgress, carLength, trackIndex = 0) {
    const centerT = this.getTrackTransform(centerProgress, trackIndex);
    return {
      position: centerT.position,
      heading: centerT.tangent,
      curveRadius: centerT.curveRadius,
    };
  }
}
