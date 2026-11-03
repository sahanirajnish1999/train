// ====================================================================
// Innovative Front Inflatable Obstacle Capture Net & Safety Airbag Scoop
// Real-world engineering prototype for high-speed rail obstacle deflection
// Enhanced with Full AI Sensor Fusion Suite & Kavach Safety Controller:
// - High-Resolution 4K Optical Stereo Camera Array
// - Solid-State / Spinning 300m 3D LiDAR Sensor with scanning laser cone
// - 77 GHz Millimeter-Wave Long-Range Radar Radome
// - AI Edge Neural Processor & Kavach Safety Controller ECU with diagnostic LEDs
// - Rapid Pneumatic Deployment / Inflation Mechanism (Animates from stowed to deployed)
// - 18-segment continuous tubular inflatable roll-cage frame with spherical knuckles
// - Twin forward aerodynamic deflection cones with vulcanized rubber tips
// - 4-panel recessed braided safety netting & bottom obstacle catching cradle bed
// - 5-bolster quilted pneumatic impact mattress with maintenance pockets
// - Silver pneumatic gas reservoirs, dial pressure gauges & high-pressure hoses
// ====================================================================

import * as THREE from 'three';

export class ObstacleCaptureNet {
  /**
   * @param {THREE.Group} parentGroup - The locomotive car group to attach to
   * @param {number} locoLength - Locomotive length in meters (default 20.5m)
   * @param {boolean} initialDeployed - Whether the net is deployed on spawn
   */
  constructor(parentGroup, locoLength = 20.5, initialDeployed = false) {
    this.parent = parentGroup;
    this.locoLength = locoLength;
    this.isDeployed = initialDeployed;

    // Deployment Animation State (0.0 = Stowed/Folded, 1.0 = Fully Inflated & Deployed)
    this.deployProgress = initialDeployed ? 1.0 : 0.0;
    this.targetDeploy = initialDeployed ? 1.0 : 0.0;
    this.deploySpeed = 3.8; // Smooth rapid pneumatic deployment (~0.3s)

    // Collected Cargo Payloads inside the net cradle
    this.collectedList = [];
    this.totalPayloadWeight = 0;

    // Cache procedural textures
    this.textures = this.createProceduralTextures();

    // 3D Group container (holds entire sensor suite and deployable scoop)
    this.group = new THREE.Group();
    this.group.name = 'captureNet';

    // Group for deployable/inflatable scoop (scaled & translated during inflation)
    this.deployableScoop = new THREE.Group();
    this.deployableScoop.name = 'deployableScoop';
    this.group.add(this.deployableScoop);

    // Group inside the bottom net bed for cradled/captured cargo
    this.cradleCargoGroup = new THREE.Group();
    this.cradleCargoGroup.name = 'cradleCargoGroup';
    this.deployableScoop.add(this.cradleCargoGroup);

    // Dynamic LED indicators and LiDAR beam references
    this.leds = {};
    this.lidarBeam = null;
    this.lidarSweepAngle = 0;

    // Build static sensors and deployable capture net
    this.build();

    // Apply initial deployment state
    this.applyDeployTransform(this.deployProgress);

    if (this.parent) {
      this.parent.add(this.group);
    }
  }

  // ------------------------------------------------------------------
  // High-Fidelity Procedural Textures
  // ------------------------------------------------------------------
  createProceduralTextures() {
    // 1. Braided High-Tensile Diamond Kevlar Safety Netting Texture (512 x 512)
    const canvasNet = document.createElement('canvas');
    canvasNet.width = 512;
    canvasNet.height = 512;
    const ctxNet = canvasNet.getContext('2d');
    ctxNet.clearRect(0, 0, 512, 512);

    // Deep contact shadow underneath cords for genuine 3D depth & relief
    ctxNet.lineWidth = 26;
    ctxNet.strokeStyle = '#451a03'; // Deep amber shadow
    ctxNet.beginPath();
    ctxNet.moveTo(0, 260); ctxNet.lineTo(512, 260);
    ctxNet.moveTo(260, 0); ctxNet.lineTo(260, 512);
    ctxNet.stroke();

    // Secondary diagonal cord drop shadows
    ctxNet.lineWidth = 14;
    ctxNet.strokeStyle = 'rgba(69, 26, 3, 0.45)';
    ctxNet.beginPath();
    ctxNet.moveTo(0, 0); ctxNet.lineTo(512, 512);
    ctxNet.moveTo(512, 0); ctxNet.lineTo(0, 512);
    ctxNet.stroke();

    // Main vibrant safety yellow / golden Kevlar braided core
    ctxNet.lineWidth = 20;
    ctxNet.strokeStyle = '#eab308'; // Safety Yellow
    ctxNet.beginPath();
    ctxNet.moveTo(0, 256); ctxNet.lineTo(512, 256);
    ctxNet.moveTo(256, 0); ctxNet.lineTo(256, 512);
    ctxNet.stroke();

    // Diagonal support cords
    ctxNet.lineWidth = 10;
    ctxNet.strokeStyle = '#ca8a04';
    ctxNet.beginPath();
    ctxNet.moveTo(0, 0); ctxNet.lineTo(512, 512);
    ctxNet.moveTo(512, 0); ctxNet.lineTo(0, 512);
    ctxNet.stroke();

    // Upper rope twist fiber highlight glints
    ctxNet.lineWidth = 6;
    ctxNet.strokeStyle = '#fef08a'; // Bright lemon fiber glint
    ctxNet.beginPath();
    ctxNet.moveTo(0, 250); ctxNet.lineTo(512, 250);
    ctxNet.moveTo(250, 0); ctxNet.lineTo(250, 512);
    ctxNet.stroke();

    // Braided rope twist notches (spiraling cord texture)
    ctxNet.strokeStyle = '#a16207';
    ctxNet.lineWidth = 4;
    for (let i = 0; i < 512; i += 28) {
      ctxNet.beginPath();
      ctxNet.moveTo(i, 244); ctxNet.lineTo(i + 12, 268);
      ctxNet.stroke();
      ctxNet.beginPath();
      ctxNet.moveTo(244, i); ctxNet.lineTo(268, i + 12);
      ctxNet.stroke();
    }

    // Heavy round woven knot & brass reinforcement grommet at intersection
    ctxNet.fillStyle = '#451a03';
    ctxNet.beginPath();
    ctxNet.arc(256, 256, 28, 0, Math.PI * 2);
    ctxNet.fill();

    ctxNet.fillStyle = '#eab308';
    ctxNet.beginPath();
    ctxNet.arc(256, 256, 22, 0, Math.PI * 2);
    ctxNet.fill();

    ctxNet.fillStyle = '#fef08a';
    ctxNet.beginPath();
    ctxNet.arc(250, 250, 10, 0, Math.PI * 2);
    ctxNet.fill();

    const captureNetMeshTex = new THREE.CanvasTexture(canvasNet);
    captureNetMeshTex.wrapS = THREE.RepeatWrapping;
    captureNetMeshTex.wrapT = THREE.RepeatWrapping;
    captureNetMeshTex.repeat.set(1, 1);

    // 2. High-Grade Rescue Orange PVC / Hypalon Fabric Texture (512 x 512)
    const canvasCushion = document.createElement('canvas');
    canvasCushion.width = 512;
    canvasCushion.height = 512;
    const ctxCushion = canvasCushion.getContext('2d');

    // Base high-vis rescue orange
    ctxCushion.fillStyle = '#f97316';
    ctxCushion.fillRect(0, 0, 512, 512);

    // Micro-ripstop diamond weave
    ctxCushion.strokeStyle = 'rgba(194, 65, 12, 0.4)';
    ctxCushion.lineWidth = 1.5;
    for (let i = 0; i < 512; i += 16) {
      ctxCushion.beginPath();
      ctxCushion.moveTo(i, 0); ctxCushion.lineTo(i, 512);
      ctxCushion.moveTo(0, i); ctxCushion.lineTo(512, i);
      ctxCushion.stroke();
    }

    // Cylindrical bolster volume shading & welded seam bands
    for (let bx = 0; bx < 512; bx += 128) {
      const gradH = ctxCushion.createLinearGradient(bx, 0, bx + 64, 0);
      gradH.addColorStop(0, 'rgba(255, 255, 255, 0.28)');
      gradH.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctxCushion.fillStyle = gradH;
      ctxCushion.fillRect(bx + 12, 0, 52, 512);

      const gradS = ctxCushion.createLinearGradient(bx + 64, 0, bx + 128, 0);
      gradS.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      gradS.addColorStop(1, 'rgba(0, 0, 0, 0.50)');
      ctxCushion.fillStyle = gradS;
      ctxCushion.fillRect(bx + 64, 0, 64, 512);

      // Welded seam tape line
      ctxCushion.fillStyle = '#7c2d12';
      ctxCushion.fillRect(bx + 124, 0, 8, 512);

      // Double-stitched high-tensile gold thread
      ctxCushion.fillStyle = '#fef08a';
      for (let y = 6; y < 512; y += 16) {
        ctxCushion.fillRect(bx + 121, y, 2.5, 7);
        ctxCushion.fillRect(bx + 132, y, 2.5, 7);
      }
    }

    // Stencil Technical Markings
    ctxCushion.save();
    ctxCushion.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctxCushion.font = 'bold 20px "Courier New", monospace';
    ctxCushion.textAlign = 'center';
    ctxCushion.fillText('OBSTACLE SCOOP • MAX 150KG', 256, 120);
    ctxCushion.font = 'bold 16px "Courier New", monospace';
    ctxCushion.fillText('AIRBAG INFLATION WP: 12 BAR', 256, 380);
    ctxCushion.restore();

    const captureCushionTex = new THREE.CanvasTexture(canvasCushion);
    captureCushionTex.wrapS = THREE.RepeatWrapping;
    captureCushionTex.wrapT = THREE.RepeatWrapping;
    captureCushionTex.repeat.set(2, 2);

    // 3. Precision Industrial Pressure Gauge Dial Face (256 x 256)
    const canvasGauge = document.createElement('canvas');
    canvasGauge.width = 256;
    canvasGauge.height = 256;
    const ctxG = canvasGauge.getContext('2d');

    // Outer Chrome Rim
    ctxG.fillStyle = '#f1f5f9';
    ctxG.beginPath();
    ctxG.arc(128, 128, 124, 0, Math.PI * 2);
    ctxG.fill();
    ctxG.lineWidth = 8;
    ctxG.strokeStyle = '#475569';
    ctxG.stroke();

    // Gauge Face
    ctxG.fillStyle = '#ffffff';
    ctxG.beginPath();
    ctxG.arc(128, 128, 116, 0, Math.PI * 2);
    ctxG.fill();

    // Green Safe Operating Zone Arc (180 - 250 BAR)
    ctxG.lineWidth = 14;
    ctxG.strokeStyle = '#22c55e';
    ctxG.beginPath();
    ctxG.arc(128, 128, 92, 0.8 * Math.PI, 1.55 * Math.PI);
    ctxG.stroke();

    // Red Danger Zone Arc (250 - 300 BAR)
    ctxG.strokeStyle = '#ef4444';
    ctxG.beginPath();
    ctxG.arc(128, 128, 92, 1.55 * Math.PI, 1.95 * Math.PI);
    ctxG.stroke();

    // Scale graduation tick marks
    ctxG.strokeStyle = '#0f172a';
    ctxG.lineWidth = 3;
    for (let a = 0.75 * Math.PI; a <= 2.05 * Math.PI; a += 0.08) {
      const r1 = 82;
      const r2 = 98;
      ctxG.beginPath();
      ctxG.moveTo(128 + Math.cos(a) * r1, 128 + Math.sin(a) * r1);
      ctxG.lineTo(128 + Math.cos(a) * r2, 128 + Math.sin(a) * r2);
      ctxG.stroke();
    }

    // Dial Typography
    ctxG.fillStyle = '#0f172a';
    ctxG.font = 'bold 22px sans-serif';
    ctxG.textAlign = 'center';
    ctxG.fillText('BAR', 128, 95);
    ctxG.font = 'bold 15px monospace';
    ctxG.fillText('0', 70, 165);
    ctxG.fillText('200', 128, 65);
    ctxG.fillText('300', 188, 165);

    // Indicator Needle pointing to 230 BAR (optimal pressure)
    ctxG.strokeStyle = '#dc2626';
    ctxG.lineWidth = 5;
    ctxG.beginPath();
    ctxG.moveTo(128, 128);
    ctxG.lineTo(128 - 25, 128 - 70);
    ctxG.stroke();

    // Center Hub Cap
    ctxG.fillStyle = '#1e293b';
    ctxG.beginPath();
    ctxG.arc(128, 128, 12, 0, Math.PI * 2);
    ctxG.fill();

    const gaugeDialTex = new THREE.CanvasTexture(canvasGauge);

    return {
      captureNetMeshTex,
      captureCushionTex,
      gaugeDialTex
    };
  }

  // ------------------------------------------------------------------
  // Build 3D Sensor Suite & Deployable Capture Net Model
  // ------------------------------------------------------------------
  build() {
    const zBase = this.locoLength / 2 + 0.35; // Mounted on front buffer beam / pilot plate
    const zTip = zBase + 3.10;               // Extends 3.10m forward over rails

    // Standard materials
    const boomOrangeMat = new THREE.MeshStandardMaterial({
      map: this.textures.captureCushionTex,
      roughness: 0.38,
      metalness: 0.08
    });

    const tipYellowMat = new THREE.MeshStandardMaterial({
      color: 0xfacc15, // High-visibility warning yellow canvas
      roughness: 0.35,
      metalness: 0.12
    });

    const netMeshMat = new THREE.MeshStandardMaterial({
      map: this.textures.captureNetMeshTex,
      transparent: true,
      alphaTest: 0.20,
      side: THREE.DoubleSide,
      roughness: 0.65,
      metalness: 0.05
    });

    const metalMat = new THREE.MeshStandardMaterial({
      color: 0xe2e8f0, // Polished stainless steel / aluminium inflators
      roughness: 0.18,
      metalness: 0.92
    });

    const brassMat = new THREE.MeshStandardMaterial({
      color: 0xd97706, // Brass valve fittings
      roughness: 0.22,
      metalness: 0.88
    });

    const darkHousingMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b, // Dark graphite aerospace sensor housing
      roughness: 0.32,
      metalness: 0.75
    });

    const glassLensMat = new THREE.MeshPhysicalMaterial({
      color: 0x0284c7, // AR coated optical lens
      roughness: 0.04,
      metalness: 0.1,
      transmission: 0.90,
      thickness: 0.15
    });

    const rubberMat = new THREE.MeshStandardMaterial({
      color: 0x18181b, // Tough vulcanized rubber bumper tips
      roughness: 0.85,
      metalness: 0.05
    });

    const hoseMat = new THREE.MeshStandardMaterial({
      color: 0x09090b, // Black flexible high-pressure pneumatic hoses
      roughness: 0.65,
      metalness: 0.15
    });

    const gaugeFaceMat = new THREE.MeshBasicMaterial({
      map: this.textures.gaugeDialTex
    });

    // ================================================================
    // PART A: AI SENSOR FUSION HARDWARE (Fixed on Locomotive Front)
    // High-Res Stereo Optical Camera, 3D LiDAR, 77GHz Radar & AI ECU
    // ================================================================

    // 1. High-Resolution 4K Stereo Optical Camera Pod (Cab Brow / Visor level)
    const camPod = new THREE.Group();
    camPod.position.set(0, 2.45, zBase + 0.18);

    const camHousing = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.14, 0.24), darkHousingMat);
    camHousing.castShadow = true;
    camPod.add(camHousing);

    // Dual Optical Apertures (Stereo Depth Eyes)
    [-0.13, 0.13].forEach(cx => {
      const lensRim = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.04, 16).rotateX(Math.PI / 2), metalMat);
      lensRim.position.set(cx, 0, 0.13);
      camPod.add(lensRim);

      const lensGlass = new THREE.Mesh(new THREE.SphereGeometry(0.038, 12, 10), glassLensMat);
      lensGlass.position.set(cx, 0, 0.14);
      camPod.add(lensGlass);
    });
    this.group.add(camPod);

    // 2. 3D Solid-State Railway LiDAR Sensor (Center Nose)
    const lidarGroup = new THREE.Group();
    lidarGroup.position.set(0, 2.18, zBase + 0.35);

    // Cylindrical Scanner Puck Body
    const lidarPuck = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.16, 20), darkHousingMat);
    lidarPuck.castShadow = true;
    lidarGroup.add(lidarPuck);

    // Optical 360-degree Emitter Window Ring
    const lidarWindow = new THREE.Mesh(new THREE.CylinderGeometry(0.132, 0.132, 0.06, 20), glassLensMat);
    lidarWindow.position.y = 0.02;
    lidarGroup.add(lidarWindow);

    // Pulsing Scanning Cyan Laser Beam Cone (Visualizes active LiDAR sweeping)
    const lidarBeamGeo = new THREE.ConeGeometry(3.5, 42.0, 16, 1, true);
    lidarBeamGeo.rotateX(Math.PI / 2);
    const lidarBeamMat = new THREE.MeshBasicMaterial({
      color: 0x06b6d4, // Cyan laser sweep
      transparent: true,
      opacity: 0.12,
      side: THREE.DoubleSide,
      depthWrite: false
    });
    const lidarBeam = new THREE.Mesh(lidarBeamGeo, lidarBeamMat);
    lidarBeam.position.set(0, 0, 21.0);
    lidarGroup.add(lidarBeam);
    this.lidarBeam = lidarBeam;
    this.group.add(lidarGroup);

    // 3. 77 GHz Long-Range Millimeter-Wave Radar Radome (Center Pilot Beam)
    const radarGroup = new THREE.Group();
    radarGroup.position.set(0, 1.25, zBase + 0.42);

    const radarBase = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.24, 0.08), darkHousingMat);
    radarGroup.add(radarBase);

    const radarRadome = new THREE.Mesh(new THREE.CylinderGeometry(0.10, 0.10, 0.03, 16).rotateX(Math.PI / 2), metalMat);
    radarRadome.position.z = 0.05;
    radarGroup.add(radarRadome);
    this.group.add(radarGroup);

    // 4. Ruggedized AI Edge Neural Processor & Kavach Safety Controller ECU Box
    const ecuGroup = new THREE.Group();
    ecuGroup.position.set(1.42, 1.15, zBase + 0.08);

    // Cast Aluminum Finned Heatsink Housing
    const ecuBox = new THREE.Mesh(new THREE.BoxGeometry(0.30, 0.46, 0.24), darkHousingMat);
    ecuBox.castShadow = true;
    ecuGroup.add(ecuBox);

    // Cooling Heatsink Fins
    for (let f = -0.18; f <= 0.18; f += 0.05) {
      const fin = new THREE.Mesh(new THREE.BoxGeometry(0.04, 0.02, 0.22), metalMat);
      fin.position.set(0.16, f, 0);
      ecuGroup.add(fin);
    }

    // Active Status Diagnostic LEDs
    const ledMatPWR = new THREE.MeshBasicMaterial({ color: 0x22c55e }); // Power (Solid Green)
    const ledMatLIDAR = new THREE.MeshBasicMaterial({ color: 0x06b6d4 }); // LiDAR (Pulsing Cyan)
    const ledMatRADAR = new THREE.MeshBasicMaterial({ color: 0xf59e0b }); // Radar (Pulsing Amber)
    const ledMatAI = new THREE.MeshBasicMaterial({ color: 0x10b981 }); // AI Inference (Blinking Green)
    const ledMatSOLENOID = new THREE.MeshBasicMaterial({ color: 0xef4444 }); // Pneumatic Solenoid (Red)

    const ledPWR = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMatPWR);
    ledPWR.position.set(0.16, 0.16, 0.08);
    ecuGroup.add(ledPWR);

    const ledLIDAR = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMatLIDAR);
    ledLIDAR.position.set(0.16, 0.08, 0.08);
    ecuGroup.add(ledLIDAR);

    const ledRADAR = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMatRADAR);
    ledRADAR.position.set(0.16, 0.00, 0.08);
    ecuGroup.add(ledRADAR);

    const ledAI = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMatAI);
    ledAI.position.set(0.16, -0.08, 0.08);
    ecuGroup.add(ledAI);

    const ledSOLENOID = new THREE.Mesh(new THREE.SphereGeometry(0.016, 8, 8), ledMatSOLENOID);
    ledSOLENOID.position.set(0.16, -0.16, 0.08);
    ecuGroup.add(ledSOLENOID);

    this.leds = { pwr: ledPWR, lidar: ledLIDAR, radar: ledRADAR, ai: ledAI, solenoid: ledSOLENOID };
    this.group.add(ecuGroup);

    // Heavy Industrial Steel Mounting Brackets (Permanent frame anchors)
    [-0.95, 0.95].forEach(mx => {
      const clamp = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.32, 0.38), metalMat);
      clamp.position.set(mx, 0.95, zBase - 0.08);
      clamp.castShadow = true;
      this.group.add(clamp);

      const rodStart = new THREE.Vector3(mx * 1.25, 2.18, zBase);
      const rodEnd = new THREE.Vector3(mx * 0.85, 2.50, zBase - 0.35);
      const rod = createTube(rodStart, rodEnd, 0.035, metalMat);
      if (rod) this.group.add(rod);
    });

    // ================================================================
    // PART B: RAPID PNEUMATIC INFLATABLE ROLL-CAGE & NET SCOOP
    // (Contained in this.deployableScoop for dynamic inflation animation)
    // ================================================================

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

    function createKnuckle(pos, radius, mat) {
      const geom = new THREE.SphereGeometry(radius, 14, 10);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pos);
      mesh.castShadow = true;
      return mesh;
    }

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
      [v.topL_base, v.topR_base, 0.12, tipYellowMat],
      [v.botL_base, v.botR_base, 0.12, boomOrangeMat],
      [v.topL_base, v.botL_base, 0.12, boomOrangeMat],
      [v.topR_base, v.botR_base, 0.12, boomOrangeMat],
      [v.topL_base, v.shoulderL, 0.12, boomOrangeMat],
      [v.shoulderL, v.noseTopL, 0.12, boomOrangeMat],
      [v.topR_base, v.shoulderR, 0.12, boomOrangeMat],
      [v.shoulderR, v.noseTopR, 0.12, boomOrangeMat],
      [v.botL_base, v.midBotL, 0.12, boomOrangeMat],
      [v.midBotL,   v.noseBotL, 0.12, boomOrangeMat],
      [v.botR_base, v.midBotR, 0.12, boomOrangeMat],
      [v.midBotR,   v.noseBotR, 0.12, boomOrangeMat],
      [v.shoulderL, v.midBotL, 0.11, boomOrangeMat],
      [v.shoulderR, v.midBotR, 0.11, boomOrangeMat],
      [v.noseTopL, v.noseTopR, 0.10, tipYellowMat],
      [v.noseBotL, v.noseBotR, 0.10, tipYellowMat],
      [v.noseTopL, v.noseBotL, 0.10, tipYellowMat],
      [v.noseTopR, v.noseBotR, 0.10, tipYellowMat]
    ];

    tubePairs.forEach(p => {
      const tube = createTube(p[0], p[1], p[2], p[3]);
      if (tube) this.deployableScoop.add(tube);
    });

    // Spherical Knuckles at all 12 vertices
    Object.entries(v).forEach(([name, pt]) => {
      const isYellow = name.startsWith('nose') || name.startsWith('top');
      this.deployableScoop.add(createKnuckle(pt, 0.135, isYellow ? tipYellowMat : boomOrangeMat));
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
        this.deployableScoop.add(strap);
      });
    });

    // 2. Twin Forward Aerodynamic Deflection Cones & Prow Hood
    [-0.16, 0.16].forEach(cx => {
      const coneGeo = new THREE.ConeGeometry(0.19, 0.62, 18);
      coneGeo.rotateX(Math.PI / 2);
      const cone = new THREE.Mesh(coneGeo, tipYellowMat);
      cone.position.set(cx, 0.49, zTip + 0.31);
      cone.castShadow = true;
      this.deployableScoop.add(cone);

      const tipCap = new THREE.Mesh(new THREE.SphereGeometry(0.065, 14, 10), rubberMat);
      tipCap.position.set(cx, 0.49, zTip + 0.62);
      this.deployableScoop.add(tipCap);

      const collar = new THREE.Mesh(new THREE.TorusGeometry(0.18, 0.025, 8, 16), boomOrangeMat);
      collar.position.set(cx, 0.49, zTip);
      this.deployableScoop.add(collar);
    });

    // Aerodynamic yellow canvas nose hood / skirt bridging the twin cones & tubes
    const noseHoodGeo = new THREE.BufferGeometry();
    const nhPos = [
      v.noseTopL.x, v.noseTopL.y, v.noseTopL.z,
      v.noseTopR.x, v.noseTopR.y, v.noseTopR.z,
      0.16, 0.52, zTip + 0.28,
     -0.16, 0.52, zTip + 0.28,
      v.noseBotL.x, v.noseBotL.y, v.noseBotL.z,
      v.noseBotR.x, v.noseBotR.y, v.noseBotR.z,
      0.16, 0.46, zTip + 0.28,
     -0.16, 0.46, zTip + 0.28
    ];
    const nhIndices = [
      0, 1, 2,  0, 2, 3,
      3, 2, 6,  3, 6, 7,
      7, 6, 5,  7, 5, 4
    ];
    noseHoodGeo.setAttribute('position', new THREE.Float32BufferAttribute(nhPos, 3));
    noseHoodGeo.setIndex(nhIndices);
    noseHoodGeo.computeVertexNormals();
    const noseHoodMesh = new THREE.Mesh(noseHoodGeo, tipYellowMat);
    this.deployableScoop.add(noseHoodMesh);

    // 3. Four-Panel Recessed High-Tensile Braided Safety Netting
    this.deployableScoop.add(createQuadPanel(v.topL_base, v.topR_base, v.shoulderR, v.shoulderL, 16, 6, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.shoulderL, v.shoulderR, v.noseTopR, v.noseTopL, 16, 16, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.topL_base, v.shoulderL, v.midBotL, v.botL_base, 8, 10, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.shoulderL, v.noseTopL, v.noseBotL, v.midBotL, 16, 10, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.shoulderR, v.topR_base, v.botR_base, v.midBotR, 8, 10, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.noseTopR, v.shoulderR, v.midBotR, v.noseBotR, 16, 10, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.botL_base, v.botR_base, v.midBotR, v.midBotL, 14, 8, netMeshMat));
    this.deployableScoop.add(createQuadPanel(v.midBotL, v.midBotR, v.noseBotR, v.noseBotL, 14, 16, netMeshMat));

    // 4. Multi-Bolster Quilted Pneumatic Cushion Mattress (6 Vertical Bolsters)
    const bolsterCount = 6;
    const bW = 2.45 / bolsterCount;
    for (let i = 0; i < bolsterCount; i++) {
      const bx = -1.225 + (i + 0.5) * bW;
      const bGeo = new THREE.CylinderGeometry(bW * 0.46, bW * 0.46, 1.52, 18);
      const bolster = new THREE.Mesh(bGeo, boomOrangeMat);
      bolster.position.set(bx, 1.46, zBase + 0.12);
      bolster.castShadow = true;
      this.deployableScoop.add(bolster);

      // Overpressure relief dump valves on bolsters (from real prototype photo)
      if (i === 1 || i === 4) {
        const valveRing = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.04, 16).rotateX(Math.PI / 2), metalMat);
        valveRing.position.set(bx, 1.46, zBase + 0.24);
        this.deployableScoop.add(valveRing);
        const valveCap = new THREE.Mesh(new THREE.SphereGeometry(0.042, 12, 8), darkHousingMat);
        valveCap.position.set(bx, 1.46, zBase + 0.26);
        this.deployableScoop.add(valveCap);
      }
    }

    const topPadGeo = new THREE.CylinderGeometry(0.14, 0.14, 2.55, 18);
    topPadGeo.rotateZ(Math.PI / 2);
    const topPad = new THREE.Mesh(topPadGeo, tipYellowMat);
    topPad.position.set(0, 2.22, zBase + 0.12);
    this.deployableScoop.add(topPad);

    [-1.15, 1.15].forEach(px => {
      const pocketGeo = new THREE.BoxGeometry(0.06, 0.38, 0.48);
      const pocket = new THREE.Mesh(pocketGeo, tipYellowMat);
      pocket.position.set(px, 1.35, zBase + 0.45);
      this.deployableScoop.add(pocket);
    });

    // 5. Pneumatic Inflator Reservoirs, Pressure Gauges, and Coiled Hoses
    [-1.24, 1.24].forEach((ix, idx) => {
      const sign = idx === 0 ? -1 : 1;

      const cylGeo = new THREE.CylinderGeometry(0.085, 0.085, 0.48, 16);
      cylGeo.rotateZ(sign * 0.3);
      const cyl = new THREE.Mesh(cylGeo, metalMat);
      cyl.position.set(ix, 0.88, zBase + 0.65);
      cyl.castShadow = true;
      this.deployableScoop.add(cyl);

      const hexManifold = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.06, 6), brassMat);
      hexManifold.position.set(ix, 1.14, zBase + 0.65);
      this.deployableScoop.add(hexManifold);

      const gaugeStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.08, 8), metalMat);
      gaugeStem.position.set(ix + sign * 0.08, 1.05, zBase + 0.65);
      this.deployableScoop.add(gaugeStem);

      const gaugeBody = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.038, 18).rotateZ(Math.PI / 2), metalMat);
      gaugeBody.position.set(ix + sign * 0.12, 1.10, zBase + 0.65);
      this.deployableScoop.add(gaugeBody);

      const dialFace = new THREE.Mesh(
        new THREE.CircleGeometry(0.056, 18).rotateY(sign > 0 ? Math.PI / 2 : -Math.PI / 2),
        gaugeFaceMat
      );
      dialFace.position.set(ix + sign * 0.142, 1.10, zBase + 0.65);
      this.deployableScoop.add(dialFace);

      const hosePts = [
        new THREE.Vector3(ix + sign * 0.08, 0.95, zBase + 0.65),
        new THREE.Vector3(ix + sign * 0.14, 0.72, zBase + 0.90),
        new THREE.Vector3(ix + sign * 0.04, 0.68, zBase + 1.25),
        new THREE.Vector3(ix * 0.92, 0.62, zBase + 1.20)
      ];
      const hoseCurve = new THREE.CatmullRomCurve3(hosePts);
      const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.02, 8, false);
      const hose = new THREE.Mesh(hoseGeo, hoseMat);
      this.deployableScoop.add(hose);
    });

    // Position cradle cargo anchor point
    this.cradleCargoGroup.position.set(0, 0.58, zBase + 1.55);
  }

  // ------------------------------------------------------------------
  // Pneumatic Rapid Inflation & Deployment Animation
  // ------------------------------------------------------------------
  applyDeployTransform(progress) {
    // Progress: 0.0 = Folded compactly against buffer beam, 1.0 = Fully inflated
    const zBase = this.locoLength / 2 + 0.35;
    
    // Scale along Z expands forward from 0.06 to 1.0; Width/Height expand from 0.72 to 1.0
    const scaleZ = 0.06 + 0.94 * progress;
    const scaleXY = 0.72 + 0.28 * progress;
    this.deployableScoop.scale.set(scaleXY, scaleXY, scaleZ);

    // Pivot expansion from zBase forward
    this.deployableScoop.position.z = zBase * (1.0 - scaleZ);
  }

  // Rapid pneumatic solenoid activation (Fired by AI Safety Controller or manual toggle)
  triggerSolenoidDeploy(audio) {
    if (this.isDeployed && this.deployProgress > 0.8) return;
    this.targetDeploy = 1.0;
    this.isDeployed = true;

    // Flash actuator solenoid LED
    if (this.leds.solenoid) {
      this.leds.solenoid.scale.set(2.0, 2.0, 2.0);
      setTimeout(() => {
        if (this.leds.solenoid) this.leds.solenoid.scale.set(1.0, 1.0, 1.0);
      }, 400);
    }

    // Play pneumatic high-pressure inflation hiss audio
    if (audio) {
      audio.playPneumaticDeploySound();
    }
  }

  toggle(audio) {
    this.isDeployed = !this.isDeployed;
    this.targetDeploy = this.isDeployed ? 1.0 : 0.0;
    if (this.isDeployed && audio) {
      audio.playPneumaticDeploySound();
    }
    return this.isDeployed;
  }

  setDeployed(deployed, audio) {
    this.isDeployed = !!deployed;
    this.targetDeploy = this.isDeployed ? 1.0 : 0.0;
    if (this.isDeployed && audio) {
      audio.playPneumaticDeploySound();
    }
    return this.isDeployed;
  }

  // ------------------------------------------------------------------
  // Obstacle Collection / Scoop into Bottom Cradle Net
  // ------------------------------------------------------------------
  collectObstacle(obstacleMesh, obstacleInfo) {
    // Add to cradle group
    obstacleMesh.position.set(0, 0, (this.collectedList.length * 0.45) - 0.3);
    // Rotate to lie down or sit comfortably in the net cradle
    if (obstacleInfo.type === 'human') {
      obstacleMesh.rotation.x = -Math.PI / 2.8; // Sitting / reclining back safely into orange cushion
      obstacleMesh.position.y = -0.15;
    } else if (obstacleInfo.type === 'animal') {
      obstacleMesh.rotation.z = Math.PI / 6;
      obstacleMesh.position.y = -0.10;
    }

    this.cradleCargoGroup.add(obstacleMesh);
    this.collectedList.push(obstacleInfo);
    this.totalPayloadWeight += obstacleInfo.mass;
  }

  clearCradle() {
    while (this.cradleCargoGroup.children.length > 0) {
      this.cradleCargoGroup.remove(this.cradleCargoGroup.children[0]);
    }
    this.collectedList = [];
    this.totalPayloadWeight = 0;
  }

  // ------------------------------------------------------------------
  // Real-Time Frame Update (Deployment physics, LiDAR beam, LEDs)
  // ------------------------------------------------------------------
  update(dt, isTargetDetected = false) {
    // 1. Elastic Pneumatic Inflation Interpolation
    if (Math.abs(this.deployProgress - this.targetDeploy) > 0.001) {
      this.deployProgress += (this.targetDeploy - this.deployProgress) * Math.min(dt * this.deploySpeed * 4.0, 1.0);
      this.applyDeployTransform(this.deployProgress);
    }

    // 2. LiDAR Scanning Beam Sweep Rotation & Optical Pulse
    if (this.lidarBeam) {
      this.lidarSweepAngle += dt * 3.5;
      this.lidarBeam.rotation.z = Math.sin(this.lidarSweepAngle) * 0.12;
      this.lidarBeam.material.opacity = 0.08 + Math.abs(Math.sin(this.lidarSweepAngle * 2.0)) * 0.08;
    }

    // 3. AI Processor & Sensor LED Activity Blinks
    const timeSec = performance.now() * 0.001;
    if (this.leds.lidar) {
      this.leds.lidar.material.color.setHex((Math.floor(timeSec * 8) % 2 === 0) ? 0x06b6d4 : 0x0284c7);
    }
    if (this.leds.radar) {
      this.leds.radar.material.color.setHex((Math.floor(timeSec * 5) % 2 === 0) ? 0xf59e0b : 0xb45309);
    }
    if (this.leds.ai) {
      // Blinks rapidly in bright emerald when a target is detected by AI vision
      if (isTargetDetected) {
        this.leds.ai.material.color.setHex((Math.floor(timeSec * 14) % 2 === 0) ? 0x10b981 : 0x047857);
      } else {
        this.leds.ai.material.color.setHex((Math.floor(timeSec * 2) % 2 === 0) ? 0x059669 : 0x064e3b);
      }
    }
  }
}
