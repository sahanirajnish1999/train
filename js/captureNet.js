// ====================================================================
// Innovative Front Inflatable Obstacle Capture Net & Safety Airbag Scoop
// Real-world engineering prototype for high-speed rail obstacle deflection
// Modeled precisely after prototype reference photo:
// - 18-segment continuous tubular inflatable roll-cage frame
// - Spherical knuckle joints at all 12 structural vertices (seamless joins, zero open ends)
// - Twin forward aerodynamic deflection cones with vulcanized rubber tips
// - Ballistic warning yellow canvas prow hood / skirt bridging cones and frame
// - 4-panel recessed high-tensile braided safety netting (top, left flank, right flank, bottom cradle bed)
// - 5-bolster quilted pneumatic impact mattress with top bumper roll & maintenance pockets
// - Silver pneumatic gas reservoirs, dial pressure gauges & high-pressure coiled hoses
// - Industrial buffer clamp mounting brackets & chassis stay rods
// ====================================================================

import * as THREE from 'three';

export class ObstacleCaptureNet {
  /**
   * @param {THREE.Group} parentGroup - The locomotive car group to attach to
   * @param {number} locoLength - Locomotive length in meters (default 20.5m)
   * @param {boolean} initialDeployed - Whether the net is deployed on spawn
   */
  constructor(parentGroup, locoLength = 20.5, initialDeployed = true) {
    this.parent = parentGroup;
    this.locoLength = locoLength;
    this.isDeployed = initialDeployed;

    // Cache procedural textures
    this.textures = this.createProceduralTextures();

    // 3D Group container
    this.group = new THREE.Group();
    this.group.name = 'captureNet';

    // Build complete 3D structure
    this.build();

    this.group.visible = this.isDeployed;
    if (this.parent) {
      this.parent.add(this.group);
    }
  }

  // ------------------------------------------------------------------
  // High-Fidelity Procedural Textures
  // ------------------------------------------------------------------
  createProceduralTextures() {
    // 1. Braided Yellow High-Tensile Safety Grid Netting Texture (Transparent)
    const canvasNet = document.createElement('canvas');
    canvasNet.width = 256;
    canvasNet.height = 256;
    const ctxNet = canvasNet.getContext('2d');
    ctxNet.clearRect(0, 0, 256, 256);

    // Deep shadow under cords for 3D depth
    ctxNet.lineWidth = 18;
    ctxNet.strokeStyle = '#78350f'; // Dark amber shadow
    ctxNet.beginPath();
    ctxNet.moveTo(0, 131); ctxNet.lineTo(256, 131);
    ctxNet.moveTo(131, 0); ctxNet.lineTo(131, 256);
    ctxNet.stroke();

    // Main vibrant safety yellow braided cord body
    ctxNet.lineWidth = 14;
    ctxNet.strokeStyle = '#eab308'; // Safety Yellow/Gold
    ctxNet.beginPath();
    ctxNet.moveTo(0, 128); ctxNet.lineTo(256, 128);
    ctxNet.moveTo(128, 0); ctxNet.lineTo(128, 256);
    ctxNet.stroke();

    // Top rope twist highlight fibers
    ctxNet.lineWidth = 4;
    ctxNet.strokeStyle = '#fef08a'; // Bright lemon fiber glint
    ctxNet.beginPath();
    ctxNet.moveTo(0, 124); ctxNet.lineTo(256, 124);
    ctxNet.moveTo(124, 0); ctxNet.lineTo(124, 256);
    ctxNet.stroke();

    // Braided rope strand diagonal twist notches
    ctxNet.strokeStyle = '#ca8a04';
    ctxNet.lineWidth = 3;
    for (let i = 0; i < 256; i += 24) {
      ctxNet.beginPath();
      ctxNet.moveTo(i, 120); ctxNet.lineTo(i + 8, 136);
      ctxNet.stroke();
      ctxNet.beginPath();
      ctxNet.moveTo(120, i); ctxNet.lineTo(136, i + 8);
      ctxNet.stroke();
    }

    // Heavy round woven knot at grid intersection
    ctxNet.fillStyle = '#78350f';
    ctxNet.beginPath();
    ctxNet.arc(128, 128, 18, 0, Math.PI * 2);
    ctxNet.fill();
    ctxNet.fillStyle = '#facc15';
    ctxNet.beginPath();
    ctxNet.arc(128, 128, 14, 0, Math.PI * 2);
    ctxNet.fill();
    ctxNet.fillStyle = '#fef9c3';
    ctxNet.beginPath();
    ctxNet.arc(124, 124, 6, 0, Math.PI * 2);
    ctxNet.fill();

    const captureNetMeshTex = new THREE.CanvasTexture(canvasNet);
    captureNetMeshTex.wrapS = THREE.RepeatWrapping;
    captureNetMeshTex.wrapT = THREE.RepeatWrapping;
    captureNetMeshTex.repeat.set(1, 1);

    // 2. Quilted Safety Orange Airbag / Boom Fabric Texture (Heavy Duty Ripstop Vinyl)
    const canvasCushion = document.createElement('canvas');
    canvasCushion.width = 512;
    canvasCushion.height = 512;
    const ctxCushion = canvasCushion.getContext('2d');
    ctxCushion.fillStyle = '#ea580c'; // Safety Orange
    ctxCushion.fillRect(0, 0, 512, 512);

    // Micro ripstop grid
    ctxCushion.strokeStyle = '#c2410c';
    ctxCushion.lineWidth = 1;
    for (let i = 0; i < 512; i += 16) {
      ctxCushion.beginPath();
      ctxCushion.moveTo(i, 0); ctxCushion.lineTo(i, 512);
      ctxCushion.moveTo(0, i); ctxCushion.lineTo(512, i);
      ctxCushion.stroke();
    }

    // Cylindrical bolster volume shading & double stitched seams
    for (let bx = 0; bx < 512; bx += 128) {
      const gradH = ctxCushion.createLinearGradient(bx, 0, bx + 64, 0);
      gradH.addColorStop(0, 'rgba(255, 255, 255, 0.22)');
      gradH.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctxCushion.fillStyle = gradH;
      ctxCushion.fillRect(bx + 16, 0, 48, 512);

      const gradS = ctxCushion.createLinearGradient(bx + 64, 0, bx + 128, 0);
      gradS.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      gradS.addColorStop(1, 'rgba(0, 0, 0, 0.45)');
      ctxCushion.fillStyle = gradS;
      ctxCushion.fillRect(bx + 64, 0, 64, 512);

      ctxCushion.fillStyle = '#7c2d12';
      ctxCushion.fillRect(bx + 125, 0, 6, 512);

      ctxCushion.fillStyle = '#fef08a';
      for (let y = 6; y < 512; y += 18) {
        ctxCushion.fillRect(bx + 122, y, 3, 7);
        ctxCushion.fillRect(bx + 131, y, 3, 7);
      }
    }
    const captureCushionTex = new THREE.CanvasTexture(canvasCushion);
    captureCushionTex.wrapS = THREE.RepeatWrapping;
    captureCushionTex.wrapT = THREE.RepeatWrapping;
    captureCushionTex.repeat.set(2, 2);

    // 3. Industrial Pressure Gauge Dial Face Texture
    const canvasGauge = document.createElement('canvas');
    canvasGauge.width = 128;
    canvasGauge.height = 128;
    const ctxG = canvasGauge.getContext('2d');
    ctxG.fillStyle = '#f8fafc';
    ctxG.beginPath();
    ctxG.arc(64, 64, 60, 0, Math.PI * 2);
    ctxG.fill();
    ctxG.lineWidth = 5;
    ctxG.strokeStyle = '#475569';
    ctxG.stroke();
    // Green safe zone arc (200-280 bar)
    ctxG.lineWidth = 6;
    ctxG.strokeStyle = '#22c55e';
    ctxG.beginPath();
    ctxG.arc(64, 64, 48, 0.75 * Math.PI, 1.55 * Math.PI);
    ctxG.stroke();
    // Red danger zone arc
    ctxG.strokeStyle = '#ef4444';
    ctxG.beginPath();
    ctxG.arc(64, 64, 48, 1.55 * Math.PI, 1.95 * Math.PI);
    ctxG.stroke();
    ctxG.fillStyle = '#0f172a';
    ctxG.font = 'bold 11px sans-serif';
    ctxG.textAlign = 'center';
    ctxG.fillText('BAR', 64, 48);
    ctxG.font = '9px monospace';
    ctxG.fillText('300', 88, 76);
    ctxG.fillText('0', 40, 76);
    ctxG.strokeStyle = '#dc2626';
    ctxG.lineWidth = 3;
    ctxG.beginPath();
    ctxG.moveTo(64, 64);
    ctxG.lineTo(44, 44);
    ctxG.stroke();
    ctxG.fillStyle = '#1e293b';
    ctxG.beginPath();
    ctxG.arc(64, 64, 6, 0, Math.PI * 2);
    ctxG.fill();
    const gaugeDialTex = new THREE.CanvasTexture(canvasGauge);

    return {
      captureNetMeshTex,
      captureCushionTex,
      gaugeDialTex
    };
  }

  // ------------------------------------------------------------------
  // Build 3D Capture Net Model
  // ------------------------------------------------------------------
  build() {
    const zBase = this.locoLength / 2 + 0.35; // Mounted on front buffer beam / pilot plate
    const zTip = zBase + 3.10;               // Extends 3.10m forward over rails

    // Standard materials
    const boomOrangeMat = new THREE.MeshStandardMaterial({
      map: this.textures.captureCushionTex,
      roughness: 0.55,
      metalness: 0.1
    });

    const tipYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // High-visibility warning yellow canvas
      roughness: 0.45,
      metalness: 0.15
    });

    const netMeshMat = new THREE.MeshStandardMaterial({
      map: this.textures.captureNetMeshTex,
      transparent: true,
      alphaTest: 0.25,
      side: THREE.DoubleSide,
      roughness: 0.8,
      metalness: 0.05
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0x94a3b8, // Polished silver inflators / structural steel
      roughness: 0.25,
      metalness: 0.85
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x27272a, // Tough vulcanized rubber bumper tips
      roughness: 0.85,
      metalness: 0.1
    });

    const hoseMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Black flexible high-pressure pneumatic hoses
      roughness: 0.7,
      metalness: 0.2
    });

    const gaugeFaceMat = new THREE.MeshBasicMaterial({
      map: this.textures.gaugeDialTex
    });

    // 12 Key Structural Roll-Cage Vertices (Precise 3D alignment)
    const v = {
      topL_base: new THREE.Vector3(-1.32, 2.20, zBase),
      topR_base: new THREE.Vector3( 1.32, 2.20, zBase),
      botL_base: new THREE.Vector3(-1.32, 0.72, zBase),
      botR_base: new THREE.Vector3( 1.32, 0.72, zBase),

      shoulderL: new THREE.Vector3(-1.18, 2.00, zBase + 0.95),
      shoulderR: new THREE.Vector3( 1.18, 2.00, zBase + 0.95),
      midBotL:   new THREE.Vector3(-1.08, 0.62, zBase + 1.15),
      midBotR:   new THREE.Vector3( 1.08, 0.62, zBase + 1.15),

      noseTopL:  new THREE.Vector3(-0.24, 0.68, zTip - 0.35),
      noseTopR:  new THREE.Vector3( 0.24, 0.68, zTip - 0.35),
      noseBotL:  new THREE.Vector3(-0.18, 0.46, zTip),
      noseBotR:  new THREE.Vector3( 0.18, 0.46, zTip)
    };

    // Helper: Connect two 3D vertices with a continuous cylinder tube
    function createTube(pA, pB, radius, mat) {
      const dir = pB.clone().sub(pA);
      const len = dir.length();
      if (len < 0.001) return null;
      const geom = new THREE.CylinderGeometry(radius, radius, len, 16);
      geom.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pA.clone().add(pB).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
      mesh.castShadow = true;
      return mesh;
    }

    // Helper: Seamless spherical knuckle joint at intersections (Zero open ends)
    function createKnuckle(pos, radius, mat) {
      const geom = new THREE.SphereGeometry(radius, 14, 10);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      return mesh;
    }

    // Helper: Build a quad net panel with UV texture coordinates
    function createQuadPanel(p0, p1, p2, p3, uvScaleU, uvScaleV, mat) {
      const geom = new THREE.BufferGeometry();
      const positions = [
        p0.x, p0.y, p0.z,
        p1.x, p1.y, p1.z,
        p2.x, p2.y, p2.z,
        p3.x, p3.y, p3.z
      ];
      const uvs = [
        0, uvScaleV,
        uvScaleU, uvScaleV,
        uvScaleU, 0,
        0, 0
      ];
      const indices = [0, 1, 2, 0, 2, 3];
      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();
      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      return mesh;
    }

    // 1. Continuous Inflatable Tubular Roll-Cage Frame (18 interconnected segments)
    const tubePairs = [
      // Rear Mounting Arch
      [v.topL_base, v.topR_base, 0.12, tipYellowMat], // Top brow with yellow protective sleeve
      [v.botL_base, v.botR_base, 0.12, boomOrangeMat],
      [v.topL_base, v.botL_base, 0.12, boomOrangeMat],
      [v.topR_base, v.botR_base, 0.12, boomOrangeMat],
      // Upper Booms (Shoulder slopes)
      [v.topL_base, v.shoulderL, 0.12, boomOrangeMat],
      [v.shoulderL, v.noseTopL, 0.12, boomOrangeMat],
      [v.topR_base, v.shoulderR, 0.12, boomOrangeMat],
      [v.shoulderR, v.noseTopR, 0.12, boomOrangeMat],
      // Lower Booms (Keel rails)
      [v.botL_base, v.midBotL, 0.12, boomOrangeMat],
      [v.midBotL,   v.noseBotL, 0.12, boomOrangeMat],
      [v.botR_base, v.midBotR, 0.12, boomOrangeMat],
      [v.midBotR,   v.noseBotR, 0.12, boomOrangeMat],
      // Side Rib Struts
      [v.shoulderL, v.midBotL, 0.11, boomOrangeMat],
      [v.shoulderR, v.midBotR, 0.11, boomOrangeMat],
      // Front Nose Frame
      [v.noseTopL, v.noseTopR, 0.10, tipYellowMat],
      [v.noseBotL, v.noseBotR, 0.10, tipYellowMat],
      [v.noseTopL, v.noseBotL, 0.10, tipYellowMat],
      [v.noseTopR, v.noseBotR, 0.10, tipYellowMat]
    ];

    tubePairs.forEach(p => {
      const tube = createTube(p[0], p[1], p[2], p[3]);
      if (tube) this.group.add(tube);
    });

    // Spherical Knuckles at all 12 vertices (Eliminating open tube ends)
    Object.entries(v).forEach(([name, pt]) => {
      const isYellow = name.startsWith('nose') || name.startsWith('top');
      this.group.add(createKnuckle(pt, 0.135, isYellow ? tipYellowMat : boomOrangeMat));
    });

    // Yellow Reinforcement Straps & Hoop Sleeves along main booms
    [
      [v.topL_base, v.shoulderL],
      [v.topR_base, v.shoulderR],
      [v.shoulderL, v.noseTopL],
      [v.shoulderR, v.noseTopR],
      [v.botL_base, v.midBotL],
      [v.botR_base, v.midBotR],
      [v.midBotL, v.noseBotL],
      [v.midBotR, v.noseBotR]
    ].forEach(([pA, pB]) => {
      [0.35, 0.70].forEach(frac => {
        const pos = pA.clone().lerp(pB, frac);
        const strapGeo = new THREE.CylinderGeometry(0.135, 0.135, 0.16, 16);
        strapGeo.rotateX(Math.PI / 2);
        const strap = new THREE.Mesh(strapGeo, tipYellowMat);
        strap.position.copy(pos);
        const dir = pB.clone().sub(pA).normalize();
        strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.group.add(strap);
      });
    });

    // 2. Twin Forward Aerodynamic Deflection Cones & Prow Hood
    [-0.16, 0.16].forEach(cx => {
      // Deflection cone
      const coneGeo = new THREE.ConeGeometry(0.19, 0.62, 18);
      coneGeo.rotateX(Math.PI / 2);
      const cone = new THREE.Mesh(coneGeo, tipYellowMat);
      cone.position.set(cx, 0.49, zTip + 0.31);
      cone.castShadow = true;
      this.group.add(cone);

      // Smooth soft rubber tip cap
      const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), rubberMat);
      tipCap.position.set(cx, 0.49, zTip + 0.62);
      this.group.add(tipCap);

      // Reinforcement collar ring at cone base
      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 16), boomOrangeMat);
      collar.position.set(cx, 0.49, zTip);
      this.group.add(collar);
    });

    // Aerodynamic yellow canvas nose hood / skirt bridging the twin cones & tubes
    const noseHoodGeo = new THREE.BufferGeometry();
    const nhPos = [
      // Top nose edge
      v.noseTopL.x, v.noseTopL.y, v.noseTopL.z,
      v.noseTopR.x, v.noseTopR.y, v.noseTopR.z,
      // Mid cone join
      0.16, 0.52, zTip + 0.28,
     -0.16, 0.52, zTip + 0.28,
      // Bottom nose edge
      v.noseBotL.x, v.noseBotL.y, v.noseBotL.z,
      v.noseBotR.x, v.noseBotR.y, v.noseBotR.z,
      // Under cone join
      0.16, 0.46, zTip + 0.28,
     -0.16, 0.46, zTip + 0.28
    ];
    const nhIndices = [
      0, 1, 2,  0, 2, 3, // Upper sloped hood
      3, 2, 6,  3, 6, 7, // Front center bridge
      7, 6, 5,  7, 5, 4  // Bottom under-skirt
    ];
    noseHoodGeo.setAttribute('position', new THREE.Float32BufferAttribute(nhPos, 3));
    noseHoodGeo.setIndex(nhIndices);
    noseHoodGeo.computeVertexNormals();
    const noseHoodMesh = new THREE.Mesh(noseHoodGeo, tipYellowMat);
    this.group.add(noseHoodMesh);

    // 3. Four-Panel Recessed High-Tensile Braided Safety Netting
    // A. Top Scoop Catch Net (2 quads)
    this.group.add(createQuadPanel(v.topL_base, v.topR_base, v.shoulderR, v.shoulderL, 16, 6, netMeshMat));
    this.group.add(createQuadPanel(v.shoulderL, v.shoulderR, v.noseTopR, v.noseTopL, 16, 16, netMeshMat));

    // B. Left Flank Net (2 quads)
    this.group.add(createQuadPanel(v.topL_base, v.shoulderL, v.midBotL, v.botL_base, 8, 10, netMeshMat));
    this.group.add(createQuadPanel(v.shoulderL, v.noseTopL, v.noseBotL, v.midBotL, 16, 10, netMeshMat));

    // C. Right Flank Net (2 quads)
    this.group.add(createQuadPanel(v.shoulderR, v.topR_base, v.botR_base, v.midBotR, 8, 10, netMeshMat));
    this.group.add(createQuadPanel(v.noseTopR, v.shoulderR, v.midBotR, v.noseBotR, 16, 10, netMeshMat));

    // D. Bottom Cradle Catch Bed Net (2 quads)
    this.group.add(createQuadPanel(v.botL_base, v.botR_base, v.midBotR, v.midBotL, 14, 8, netMeshMat));
    this.group.add(createQuadPanel(v.midBotL, v.midBotR, v.noseBotR, v.noseBotL, 14, 16, netMeshMat));

    // 4. Multi-Bolster Quilted Pneumatic Cushion Mattress (5 Vertical Cylindrical Bolsters)
    const bolsterCount = 5;
    const bW = 2.45 / bolsterCount;
    for (let i = 0; i < bolsterCount; i++) {
      const bx = -1.225 + (i + 0.5) * bW;
      const bGeo = new THREE.CylinderGeometry(bW * 0.44, bW * 0.44, 1.48, 16);
      const bolster = new THREE.Mesh(bGeo, boomOrangeMat);
      bolster.position.set(bx, 1.46, zBase + 0.12);
      bolster.castShadow = true;
      this.group.add(bolster);
    }

    // Top padded bolster bumper (Yellow roll)
    const topPadGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.55, 16);
    topPadGeo.rotateZ(Math.PI / 2);
    const topPad = new THREE.Mesh(topPadGeo, tipYellowMat);
    topPad.position.set(0, 2.22, zBase + 0.12);
    this.group.add(topPad);

    // Yellow Canvas Maintenance Pockets on inner sidewall (Seen in prototype photo!)
    [-1.15, 1.15].forEach(px => {
      const pocketGeo = new THREE.BoxGeometry(0.06, 0.38, 0.48);
      const pocket = new THREE.Mesh(pocketGeo, tipYellowMat);
      pocket.position.set(px, 1.35, zBase + 0.45);
      this.group.add(pocket);
    });

    // 5. Pneumatic Inflators, Dial Gauges, and Coiled Hoses
    [-1.24, 1.24].forEach((ix, idx) => {
      const sign = idx === 0 ? -1 : 1;

      // Silver Gas Cylinder Reservoir
      const cylGeo = new THREE.CylinderGeometry(0.08, 0.08, 0.45, 14);
      cylGeo.rotateZ(sign * 0.3);
      const cyl = new THREE.Mesh(cylGeo, metalMat);
      cyl.position.set(ix, 0.88, zBase + 0.65);
      cyl.castShadow = true;
      this.group.add(cyl);

      // Pressure Gauge Manifold & Dial
      const gaugeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), metalMat);
      gaugeStem.position.set(ix + sign * 0.08, 1.05, zBase + 0.65);
      this.group.add(gaugeStem);

      const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.035, 16).rotateZ(Math.PI / 2), metalMat);
      gaugeBody.position.set(ix + sign * 0.12, 1.10, zBase + 0.65);
      this.group.add(gaugeBody);

      // Dial face disc
      const dialFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.052, 16).rotateY(sign > 0 ? Math.PI / 2 : -Math.PI / 2),
        gaugeFaceMat
      );
      dialFace.position.set(ix + sign * 0.138, 1.10, zBase + 0.65);
      this.group.add(dialFace);

      // High-Pressure Hose
      const hosePts = [
        new THREE.Vector3(ix + sign * 0.08, 0.95, zBase + 0.65),
        new THREE.Vector3(ix + sign * 0.14, 0.72, zBase + 0.90),
        new THREE.Vector3(ix + sign * 0.04, 0.68, zBase + 1.25),
        new THREE.Vector3(ix * 0.92, 0.62, zBase + 1.20)
      ];
      const hoseCurve = new THREE.CatmullRomCurve3(hosePts);
      const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.02, 8, false);
      const hose = new THREE.Mesh(hoseGeo, hoseMat);
      this.group.add(hose);
    });

    // 6. Heavy Industrial Mounting Brackets & Anchor Struts
    [-0.95, 0.95].forEach(mx => {
      // Buffer clamp sleeve & bracket
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.38), metalMat);
      clamp.position.set(mx, 0.95, zBase - 0.08);
      clamp.castShadow = true;
      this.group.add(clamp);

      // Diagonal chassis stay rod to locomotive nose
      const rodStart = new THREE.Vector3(mx * 1.25, 2.18, zBase);
      const rodEnd = new THREE.Vector3(mx * 0.85, 2.50, zBase - 0.35);
      const rod = createTube(rodStart, rodEnd, 0.035, metalMat);
      if (rod) this.group.add(rod);
    });
  }

  // ------------------------------------------------------------------
  // Deployment & Visibility Controls
  // ------------------------------------------------------------------
  toggle() {
    this.isDeployed = !this.isDeployed;
    this.group.visible = this.isDeployed;
    return this.isDeployed;
  }

  setDeployed(deployed) {
    this.isDeployed = !!deployed;
    this.group.visible = this.isDeployed;
    return this.isDeployed;
  }
}

