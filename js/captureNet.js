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

    // Dynamic LED indicators, Strobe Light Bar, and LiDAR beam references
    this.leds = {};
    this.strobeLeds = [];
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

    // Deep crimson/black contact shadow underneath cords for genuine 3D depth & relief
    ctxNet.lineWidth = 26;
    ctxNet.strokeStyle = '#380404'; // Deep crimson maroon shadow
    ctxNet.beginPath();
    ctxNet.moveTo(0, 260); ctxNet.lineTo(512, 260);
    ctxNet.moveTo(260, 0); ctxNet.lineTo(260, 512);
    ctxNet.stroke();

    // Secondary diagonal cord drop shadows
    ctxNet.lineWidth = 14;
    ctxNet.strokeStyle = 'rgba(56, 4, 4, 0.45)';
    ctxNet.beginPath();
    ctxNet.moveTo(0, 0); ctxNet.lineTo(512, 512);
    ctxNet.moveTo(512, 0); ctxNet.lineTo(0, 512);
    ctxNet.stroke();

    // Main vibrant safety rescue red braided core cords
    ctxNet.lineWidth = 20;
    ctxNet.strokeStyle = '#dc2626'; // High-visibility Rescue Safety Red
    ctxNet.beginPath();
    ctxNet.moveTo(0, 256); ctxNet.lineTo(512, 256);
    ctxNet.moveTo(256, 0); ctxNet.lineTo(256, 512);
    ctxNet.stroke();

    // Diagonal support cords
    ctxNet.lineWidth = 10;
    ctxNet.strokeStyle = '#b91c1c'; // Deep Crimson Red
    ctxNet.beginPath();
    ctxNet.moveTo(0, 0); ctxNet.lineTo(512, 512);
    ctxNet.moveTo(512, 0); ctxNet.lineTo(0, 512);
    ctxNet.stroke();

    // Upper rope twist fiber highlight glints
    ctxNet.lineWidth = 6;
    ctxNet.strokeStyle = '#f87171'; // Light coral / red silk fiber sheen
    ctxNet.beginPath();
    ctxNet.moveTo(0, 250); ctxNet.lineTo(512, 250);
    ctxNet.moveTo(250, 0); ctxNet.lineTo(250, 512);
    ctxNet.stroke();

    // Braided rope twist notches (spiraling cord texture)
    ctxNet.strokeStyle = '#7f1d1d';
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
    ctxNet.fillStyle = '#380404';
    ctxNet.beginPath();
    ctxNet.arc(256, 256, 28, 0, Math.PI * 2);
    ctxNet.fill();

    ctxNet.fillStyle = '#ef4444'; // Bright emergency red knot
    ctxNet.beginPath();
    ctxNet.arc(256, 256, 22, 0, Math.PI * 2);
    ctxNet.fill();

    ctxNet.fillStyle = '#fee2e2'; // Gloss highlight
    ctxNet.beginPath();
    ctxNet.arc(250, 250, 10, 0, Math.PI * 2);
    ctxNet.fill();

    const captureNetMeshTex = new THREE.CanvasTexture(canvasNet);
    captureNetMeshTex.wrapS = THREE.RepeatWrapping;
    captureNetMeshTex.wrapT = THREE.RepeatWrapping;
    captureNetMeshTex.repeat.set(1, 1);

    // 2. Ultra-HD Rescue Red Inflatable Pipe Texture (1024 x 512)
    // Features 3D rounded specular volume, 3M retroreflective silver bands,
    // diagonal safety hazard chevrons, technical stenciling, and vulcanized seam tape
    const canvasRedPipe = document.createElement('canvas');
    canvasRedPipe.width = 1024;
    canvasRedPipe.height = 512;
    const ctxRed = canvasRedPipe.getContext('2d');

    // Deep vibrant rescue safety red base
    ctxRed.fillStyle = '#dc2626';
    ctxRed.fillRect(0, 0, 1024, 512);

    // Micro-ripstop Hypalon rubber texture weave
    ctxRed.strokeStyle = 'rgba(153, 27, 27, 0.40)';
    ctxRed.lineWidth = 1.5;
    for (let i = 0; i < 1024; i += 16) {
      ctxRed.beginPath();
      ctxRed.moveTo(i, 0); ctxRed.lineTo(i, 512);
      ctxRed.stroke();
    }
    for (let j = 0; j < 512; j += 16) {
      ctxRed.beginPath();
      ctxRed.moveTo(0, j); ctxRed.lineTo(1024, j);
      ctxRed.stroke();
    }

    // Cylindrical volume specular sheen (gives 3D rounded puffiness to pneumatic tubes)
    const gradPipeH = ctxRed.createLinearGradient(0, 0, 0, 190);
    gradPipeH.addColorStop(0.0, 'rgba(255, 255, 255, 0.38)');
    gradPipeH.addColorStop(0.4, 'rgba(255, 255, 255, 0.14)');
    gradPipeH.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctxRed.fillStyle = gradPipeH;
    ctxRed.fillRect(0, 0, 1024, 190);

    const gradPipeS = ctxRed.createLinearGradient(0, 340, 0, 512);
    gradPipeS.addColorStop(0.0, 'rgba(0, 0, 0, 0.0)');
    gradPipeS.addColorStop(1.0, 'rgba(0, 0, 0, 0.48)');
    ctxRed.fillStyle = gradPipeS;
    ctxRed.fillRect(0, 340, 1024, 172);

    // High-visibility 3M Retroreflective Silver Bands & Hazard Chevron Collars
    const bandPositions = [140, 480, 820];
    bandPositions.forEach(bx => {
      // Vulcanized black rubber collar borders
      ctxRed.fillStyle = '#1e293b';
      ctxRed.fillRect(bx - 12, 0, 104, 512);

      // Bright retroreflective silver center band
      ctxRed.fillStyle = '#f8fafc';
      ctxRed.fillRect(bx, 0, 80, 512);

      // Black diagonal safety hazard stripes
      ctxRed.fillStyle = '#0f172a';
      for (let y = -40; y < 512; y += 40) {
        ctxRed.beginPath();
        ctxRed.moveTo(bx, y);
        ctxRed.lineTo(bx + 40, y + 40);
        ctxRed.lineTo(bx + 40, y + 60);
        ctxRed.lineTo(bx, y + 20);
        ctxRed.closePath();
        ctxRed.fill();

        ctxRed.beginPath();
        ctxRed.moveTo(bx + 40, y + 40);
        ctxRed.lineTo(bx + 80, y);
        ctxRed.lineTo(bx + 80, y + 20);
        ctxRed.lineTo(bx + 40, y + 60);
        ctxRed.closePath();
        ctxRed.fill();
      }

      // Welded rubber seam lines with double stitch marks
      ctxRed.fillStyle = '#cbd5e1';
      for (let y = 6; y < 512; y += 14) {
        ctxRed.fillRect(bx - 6, y, 2.5, 6);
        ctxRed.fillRect(bx + 84, y, 2.5, 6);
      }
    });

    // Technical Rescue Stencil Typography between bands
    ctxRed.save();
    ctxRed.fillStyle = '#ffffff';
    ctxRed.font = 'bold 22px "Courier New", monospace';
    ctxRed.textAlign = 'center';
    ctxRed.fillText('✦ KAVACH IMPACT SCOOP ✦', 310, 240);
    ctxRed.font = 'bold 15px "Courier New", monospace';
    ctxRed.fillText('RAPID PNEUMATIC RESCUE • 150 KG MAX', 310, 275);
    ctxRed.fillText('WP: 15 BAR • HIGH-TENSILE HYPALON', 310, 305);

    ctxRed.font = 'bold 22px "Courier New", monospace';
    ctxRed.fillText('▶▶ RESCUE BED ▶▶', 650, 240);
    ctxRed.font = 'bold 15px "Courier New", monospace';
    ctxRed.fillText('HIGH-STRENGTH IMPACT SCOOP', 650, 275);
    ctxRed.fillText('IR-RDSO SPECIFIED SAFETY PROTOCOL', 650, 305);
    ctxRed.restore();

    // Heat-welded longitudinal center seam line
    ctxRed.fillStyle = '#7f1d1d';
    ctxRed.fillRect(0, 252, 1024, 6);

    const redPipeTex = new THREE.CanvasTexture(canvasRedPipe);
    redPipeTex.wrapS = THREE.RepeatWrapping;
    redPipeTex.wrapT = THREE.RepeatWrapping;
    redPipeTex.repeat.set(2, 1);

    // 3. High-Visibility Rescue Deflection Apron Texture (512 x 512)
    const canvasApron = document.createElement('canvas');
    canvasApron.width = 512;
    canvasApron.height = 512;
    const ctxApron = canvasApron.getContext('2d');

    ctxApron.fillStyle = '#dc2626';
    ctxApron.fillRect(0, 0, 512, 512);

    // Reflective white chevron arrows pointing inward up the scoop
    ctxApron.fillStyle = '#ffffff';
    for (let cy = 60; cy < 480; cy += 120) {
      ctxApron.beginPath();
      ctxApron.moveTo(256, cy - 35);
      ctxApron.lineTo(440, cy + 30);
      ctxApron.lineTo(400, cy + 50);
      ctxApron.lineTo(256, cy);
      ctxApron.lineTo(112, cy + 50);
      ctxApron.lineTo(72, cy + 30);
      ctxApron.closePath();
      ctxApron.fill();
    }

    ctxApron.font = 'bold 24px monospace';
    ctxApron.fillStyle = '#ffffff';
    ctxApron.textAlign = 'center';
    ctxApron.fillText('RESCUE CRADLE ZONE', 256, 490);

    const apronTex = new THREE.CanvasTexture(canvasApron);
    apronTex.wrapS = THREE.ClampToEdgeWrapping;
    apronTex.wrapT = THREE.ClampToEdgeWrapping;

    // 4. High-Grade Rescue Orange & Graphite PVC / Hypalon Fabric Texture (512 x 512)
    const canvasCushion = document.createElement('canvas');
    canvasCushion.width = 512;
    canvasCushion.height = 512;
    const ctxCushion = canvasCushion.getContext('2d');

    // Rich saturated rescue safety orange
    ctxCushion.fillStyle = '#ea580c';
    ctxCushion.fillRect(0, 0, 512, 512);

    // Micro-ripstop diamond weave
    ctxCushion.strokeStyle = 'rgba(154, 52, 18, 0.4)';
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
      gradH.addColorStop(0, 'rgba(255, 237, 213, 0.16)');
      gradH.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
      ctxCushion.fillStyle = gradH;
      ctxCushion.fillRect(bx + 12, 0, 52, 512);

      const gradS = ctxCushion.createLinearGradient(bx + 64, 0, bx + 128, 0);
      gradS.addColorStop(0, 'rgba(0, 0, 0, 0.0)');
      gradS.addColorStop(1, 'rgba(30, 41, 59, 0.45)');
      ctxCushion.fillStyle = gradS;
      ctxCushion.fillRect(bx + 64, 0, 64, 512);

      // Welded seam tape line
      ctxCushion.fillStyle = '#7c2d12';
      ctxCushion.fillRect(bx + 124, 0, 8, 512);

      // Double-stitched high-tensile silver/white thread
      ctxCushion.fillStyle = '#f1f5f9';
      for (let y = 6; y < 512; y += 16) {
        ctxCushion.fillRect(bx + 121, y, 2.5, 7);
        ctxCushion.fillRect(bx + 132, y, 2.5, 7);
      }
    }

    // Stencil Technical Markings
    ctxCushion.save();
    ctxCushion.fillStyle = 'rgba(255, 255, 255, 0.85)';
    ctxCushion.font = 'bold 20px "Courier New", monospace';
    ctxCushion.textAlign = 'center';
    ctxCushion.fillText('OBSTACLE SCOOP • MAX 150KG', 256, 120);
    ctxCushion.font = 'bold 16px "Courier New", monospace';
    ctxCushion.fillText('AIRBAG INFLATION WP: 12 BAR', 256, 380);
    ctxCushion.restore();

    const captureCushionTex = new THREE.CanvasTexture(canvasCushion);
    captureCushionTex.wrapS = THREE.RepeatWrapping;
    captureCushionTex.wrapT = THREE.RepeatWrapping;
    captureCushionTex.repeat.set(1, 1);

    // 5. Precision Industrial Pressure Gauge Dial Face (256 x 256)
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
      redPipeTex,
      apronTex,
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

    const accentRedMat = new THREE.MeshStandardMaterial({
      map: this.textures.redPipeTex,
      color: 0xffffff, // Full texture fidelity with stencils, chevrons & reflective silver bands
      roughness: 0.32,
      metalness: 0.12
    });

    const apronMat = new THREE.MeshStandardMaterial({
      map: this.textures.apronTex,
      color: 0xffffff,
      roughness: 0.38,
      metalness: 0.10,
      side: THREE.DoubleSide
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

    // \_/ Flared Inflatable Capture Scoop Geometry (Front opening forms: \_/ )
    // Thick heavy-duty pneumatic pontoons with commanding industrial presence:
    // Top span: 3.16m (-1.58m to +1.58m at y = 2.22m)
    // Bottom span: 2.04m (-1.02m to +1.02m at y = 0.54m) sitting safely over rails
    const v = {
      // Rear mounting on locomotive buffer beam (zBase)
      topL_base:  new THREE.Vector3(-1.46, 2.24, zBase),
      topR_base:  new THREE.Vector3( 1.46, 2.24, zBase),
      botL_base:  new THREE.Vector3(-1.14, 0.58, zBase),
      botR_base:  new THREE.Vector3( 1.14, 0.58, zBase),

      // Mid-span outriggers & side struts
      shoulderL:  new THREE.Vector3(-1.52, 2.20, zBase + 1.25),
      shoulderR:  new THREE.Vector3( 1.52, 2.20, zBase + 1.25),
      midBotL:    new THREE.Vector3(-1.08, 0.55, zBase + 1.45),
      midBotR:    new THREE.Vector3( 1.08, 0.55, zBase + 1.45),

      // Front Wide-Open Mouth Opening (\_/ Profile: Left \ , Right / , Bottom _ )
      frontTopL:  new THREE.Vector3(-1.58, 2.22, zTip),
      frontTopR:  new THREE.Vector3( 1.58, 2.22, zTip),
      frontBotL:  new THREE.Vector3(-1.02, 0.54, zTip),
      frontBotR:  new THREE.Vector3( 1.02, 0.54, zTip)
    };

    function createTube(pA, pB, radius, mat) {
      const dir = pB.clone().sub(pA);
      const len = dir.length();
      if (len < 0.001) return null;
      const geom = new THREE.CylinderGeometry(radius, radius, len, 20);
      geom.rotateX(Math.PI / 2);
      const mesh = new THREE.Mesh(geom, mat);
      mesh.position.copy(pA.clone().add(pB).multiplyScalar(0.5));
      mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir.clone().normalize());
      mesh.castShadow = true;
      return mesh;
    }

    function createKnuckle(pos, radius, mat) {
      const geom = new THREE.SphereGeometry(radius, 16, 12);
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

    // 1. Continuous Inflatable Tubular Roll-Cage Frame (Thick Heavy-Duty Pontoons)
    const tubePairs = [
      // Rear transverse frames
      [v.topL_base, v.topR_base, 0.20, accentRedMat],
      [v.botL_base, v.botR_base, 0.18, boomOrangeMat],
      [v.topL_base, v.botL_base, 0.18, boomOrangeMat],
      [v.topR_base, v.botR_base, 0.18, boomOrangeMat],

      // Left flank outriggers (upper & lower)
      [v.topL_base, v.shoulderL, 0.18, boomOrangeMat],
      [v.shoulderL, v.frontTopL, 0.20, boomOrangeMat],
      [v.botL_base, v.midBotL, 0.18, boomOrangeMat],
      [v.midBotL,   v.frontBotL, 0.18, boomOrangeMat],
      [v.shoulderL, v.midBotL, 0.16, boomOrangeMat],

      // Right flank outriggers (upper & lower)
      [v.topR_base, v.shoulderR, 0.18, boomOrangeMat],
      [v.shoulderR, v.frontTopR, 0.20, boomOrangeMat],
      [v.botR_base, v.midBotR, 0.18, boomOrangeMat],
      [v.midBotR,   v.frontBotR, 0.18, boomOrangeMat],
      [v.shoulderR, v.midBotR, 0.16, boomOrangeMat],

      // Front mouth opening perimeter framing (\_/ Flared Profile: Left \ , Right / , Bottom _ )
      // Thick heavy-duty pneumatic pontoons for maximum impact absorption
      [v.frontTopL, v.frontTopR, 0.22, accentRedMat],   // Upper front arched header (0.44m diameter)
      [v.frontBotL, v.frontBotR, 0.20, accentRedMat],   // Lower front track clearance bar (_) (0.40m diameter)
      [v.frontTopL, v.frontBotL, 0.22, accentRedMat],   // Left flared pillar (\) (0.44m diameter)
      [v.frontTopR, v.frontBotR, 0.22, accentRedMat]    // Right flared pillar (/) (0.44m diameter)
    ];

    tubePairs.forEach(p => {
      const tube = createTube(p[0], p[1], p[2], p[3]);
      if (tube) this.deployableScoop.add(tube);
    });

    // Spherical Knuckles at all structural corner vertices (matched to thick pontoons)
    Object.entries(v).forEach(([name, pt]) => {
      const isRed = name.startsWith('front') || name.startsWith('top');
      this.deployableScoop.add(createKnuckle(pt, 0.245, isRed ? accentRedMat : boomOrangeMat));
    });

    // High-Vis Red Reinforcement Straps & Retroreflective Hoop Sleeves along main booms
    [
      [v.topL_base, v.shoulderL],
      [v.topR_base, v.shoulderR],
      [v.shoulderL, v.frontTopL],
      [v.shoulderR, v.frontTopR],
      [v.botL_base, v.midBotL],
      [v.botR_base, v.midBotR],
      [v.midBotL, v.frontBotL],
      [v.midBotR, v.frontBotR]
    ].forEach(([pA, pB]) => {
      [0.35, 0.70].forEach(frac => {
        const pos = pA.clone().lerp(pB, frac);
        const strapGeo = new THREE.CylinderGeometry(0.235, 0.235, 0.20, 20);
        strapGeo.rotateX(Math.PI / 2);
        const strap = new THREE.Mesh(strapGeo, accentRedMat);
        strap.position.copy(pos);
        const dir = pB.clone().sub(pA).normalize();
        strap.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.deployableScoop.add(strap);

        // Stainless steel clamp ring around strap
        const clampRing = new THREE.Mesh(new THREE.TorusGeometry(0.245, 0.016, 8, 20), metalMat);
        clampRing.position.copy(pos);
        clampRing.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), dir);
        this.deployableScoop.add(clampRing);
      });
    });

    // 2. Heavy-Duty Mechanical Flanged Collar Cuffs with Hex Bolts at all 4 mouth corners
    [
      v.frontTopL,
      v.frontTopR,
      v.frontBotL,
      v.frontBotR
    ].forEach((pt) => {
      // Polished stainless steel retention collar ring
      const collarMesh = new THREE.Mesh(new THREE.TorusGeometry(0.255, 0.022, 10, 24), metalMat);
      collarMesh.position.copy(pt);
      this.deployableScoop.add(collarMesh);

      // Radial hex socket bolt heads around collar
      for (let b = 0; b < 6; b++) {
        const ang = (b / 6) * Math.PI * 2;
        const bx = pt.x + Math.cos(ang) * 0.255;
        const by = pt.y + Math.sin(ang) * 0.255;
        const bolt = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.035, 6).rotateX(Math.PI / 2), metalMat);
        bolt.position.set(bx, by, pt.z + 0.03);
        this.deployableScoop.add(bolt);
      }
    });

    // Tough Vulcanized Rubber Impact Skid Bumper Pads at Bottom Corners
    [
      v.frontBotL,
      v.frontBotR
    ].forEach((pt) => {
      const skidPad = new THREE.Mesh(new THREE.SphereGeometry(0.16, 16, 12), rubberMat);
      skidPad.position.set(pt.x, pt.y - 0.08, pt.z + 0.06);
      this.deployableScoop.add(skidPad);
    });

    // 3. Aerodynamic Emergency Rescue LED Strobe Light Bar along Top Red Header Bar
    const lightBarHousing = new THREE.Mesh(new THREE.BoxGeometry(2.40, 0.07, 0.08), darkHousingMat);
    lightBarHousing.position.set(0, 2.26, zTip + 0.20);
    this.deployableScoop.add(lightBarHousing);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.42, 0.018, 0.085), metalMat);
    bezel.position.set(0, 2.295, zTip + 0.20);
    this.deployableScoop.add(bezel);

    const strobeLeds = [];
    const ledCount = 8;
    const ledSpacing = 2.2 / ledCount;
    for (let s = 0; s < ledCount; s++) {
      const lx = -1.1 + (s + 0.5) * ledSpacing;
      const isAmber = (s === 1 || s === 6 || s === 2 || s === 5);
      const ledMat = new THREE.MeshBasicMaterial({
        color: isAmber ? 0xf59e0b : 0xf8fafc,
        transparent: true,
        opacity: 0.95
      });
      const ledLens = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.042, 0.02), ledMat);
      ledLens.position.set(lx, 2.26, zTip + 0.245);
      this.deployableScoop.add(ledLens);
      strobeLeds.push(ledLens);
    }
    this.strobeLeds = strobeLeds;

    // 4. High-Pressure Flexible Pneumatic Equalizer Bypass Hoses & Brass Couplers
    [-1, 1].forEach(side => {
      const topPt = new THREE.Vector3(side * 1.48, 2.18, zTip - 0.15);
      const botPt = new THREE.Vector3(side * 0.98, 0.60, zTip - 0.15);
      const midPt = new THREE.Vector3(side * 1.30, 1.40, zTip - 0.28);
      const hoseCurve = new THREE.CatmullRomCurve3([topPt, midPt, botPt]);
      const hoseGeo = new THREE.TubeGeometry(hoseCurve, 16, 0.022, 8, false);
      const hose = new THREE.Mesh(hoseGeo, hoseMat);
      this.deployableScoop.add(hose);

      [topPt, botPt].forEach(p => {
        const brassFitting = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.07, 8).rotateX(Math.PI / 2), brassMat);
        brassFitting.position.copy(p);
        this.deployableScoop.add(brassFitting);
      });
    });

    // 5. High-Visibility Rescue Chevron Ground-Clearance Scooper Ramp / Deflection Apron
    // Spans across the entire bottom opening between frontBotL (-1.02m) and frontBotR (+1.02m)
    // Printed with bright reflective chevron arrows guiding upward into the deep catching net cradle!
    const rampGeo = new THREE.BufferGeometry();
    const rPos = [
      -1.02, 0.54, zTip,          // Left front lip
       1.02, 0.54, zTip,          // Right front lip
       1.02, 0.58, zTip - 0.45,   // Right ramp incline
      -1.02, 0.58, zTip - 0.45    // Left ramp incline
    ];
    const rIndices = [0, 1, 2,  0, 2, 3];
    const rUvs = [0, 1,  1, 1,  1, 0,  0, 0];
    rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUvs, 2));
    rampGeo.setIndex(rIndices);
    rampGeo.computeVertexNormals();
    const rampMesh = new THREE.Mesh(rampGeo, apronMat);
    this.deployableScoop.add(rampMesh);

    // Stainless Steel Track Guide Roller Skids (Keep the scoop gliding smoothly over rails & turnouts)
    [-0.84, -0.28, 0.28, 0.84].forEach(sx => {
      const skidBracket = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.14, 0.34), darkHousingMat);
      skidBracket.position.set(sx, 0.46, zTip - 0.10);
      this.deployableScoop.add(skidBracket);

      const rollerWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.048, 0.048, 0.06, 16).rotateZ(Math.PI / 2), metalMat);
      rollerWheel.position.set(sx, 0.42, zTip - 0.08);
      this.deployableScoop.add(rollerWheel);
    });

    // High-Tensile Webbing Tabs & Silver Eyelet Rings with Red Tension Lacing along Main Booms
    const eyeletGeo = new THREE.TorusGeometry(0.024, 0.007, 8, 12);
    const eyeletMat = metalMat;
    const lacingMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.3 }); // Red nylon tension cord

    [
      [v.topL_base, v.frontTopL],
      [v.topR_base, v.frontTopR],
      [v.botL_base, v.frontBotL],
      [v.botR_base, v.frontBotR]
    ].forEach(([pA, pB]) => {
      const segs = 8;
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        const pt = pA.clone().lerp(pB, frac);
        const eyelet = new THREE.Mesh(eyeletGeo, eyeletMat);
        eyelet.position.copy(pt);
        this.deployableScoop.add(eyelet);

        // Small tension lacing cord segment
        const cordPts = [
          pt.clone(),
          pt.clone().add(new THREE.Vector3(0, s % 2 === 0 ? 0.04 : -0.04, 0.05))
        ];
        const cordGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 4, 0.006, 6, false);
        const cord = new THREE.Mesh(cordGeo, lacingMat);
        this.deployableScoop.add(cord);
      }
    });

    // 3. High-Tensile Kevlar Braided Safety Netting Enclosure
    // Top Safety Roof Screen (Spans over top arch, preventing deflection over train)
    this.deployableScoop.add(createQuadPanel(v.topL_base, v.topR_base, v.frontTopR, v.frontTopL, 16, 12, netMeshMat));

    // Left Flank Protective Side Net Wall
    this.deployableScoop.add(createQuadPanel(v.topL_base, v.frontTopL, v.frontBotL, v.botL_base, 14, 10, netMeshMat));

    // Right Flank Protective Side Net Wall
    this.deployableScoop.add(createQuadPanel(v.topR_base, v.botR_base, v.frontBotR, v.frontTopR, 14, 10, netMeshMat));

    // Bottom Rescue Cradle Net Bed (Deep catching hammock suspended between pontoons)
    this.deployableScoop.add(createQuadPanel(v.botL_base, v.botR_base, v.frontBotR, v.frontBotL, 16, 14, netMeshMat));

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

    const topPadGeo = new THREE.CylinderGeometry(0.18, 0.18, 2.85, 20);
    topPadGeo.rotateZ(Math.PI / 2);
    const topPad = new THREE.Mesh(topPadGeo, accentRedMat);
    topPad.position.set(0, 2.24, zBase + 0.12);
    this.deployableScoop.add(topPad);

    [-1.20, 1.20].forEach(px => {
      const pocketGeo = new THREE.BoxGeometry(0.08, 0.42, 0.52);
      const pocket = new THREE.Mesh(pocketGeo, accentRedMat);
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
    this.cradleCargoGroup.position.set(0, 0.62, zBase + 1.55);
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

    // 4. Emergency Rescue Strobe Flasher Animation along Top Red Pipe Header
    if (this.strobeLeds && this.strobeLeds.length > 0) {
      const flashCycle = Math.floor(timeSec * 16) % 6;
      const isFlash = (flashCycle === 0 || flashCycle === 2);
      const isLeftPhase = Math.floor(timeSec * 4) % 2 === 0;
      this.strobeLeds.forEach((led, idx) => {
        const isLeftLed = idx < this.strobeLeds.length / 2;
        const active = isFlash && (isLeftPhase ? isLeftLed : !isLeftLed);
        led.material.opacity = active ? 0.98 : 0.20;
      });
    }
  }
}
