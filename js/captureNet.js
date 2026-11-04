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
    this.activeCaptures = [];
    this.totalPayloadWeight = 0;
    this.cradlePayloadSag = 0;
    this.cradlePayloadSagVel = 0;

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

    // Dynamic Aero-Elastic Mesh Physics State (Mathematical Hooke's Law & Navier-Stokes Aero Pressure)
    this.hammockMesh = null;
    this.hammockGeo = null;
    this.hammockBasePos = null;
    this.hammockSegsX = 14;
    this.hammockSegsZ = 18;

    this.topMesh = null;
    this.topBasePos = null;
    this.sideMeshL = null;
    this.sideBasePosL = null;
    this.sideMeshR = null;
    this.sideBasePosR = null;

    this.aeroTime = 0;
    this.cradlePayloadSag = 0;
    this.cradlePayloadSagVel = 0;

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
    // 1. Heavy-Duty 5-Ton Rated Kevlar Rescue Webbing Matrix Texture (512 x 512)
    // Features tight, interwoven high-tenacity safety orange straps with reflective silver tracers,
    // double-stitched reinforced borders, and heavy box-X cross stitches at all intersections
    const canvasNet = document.createElement('canvas');
    canvasNet.width = 512;
    canvasNet.height = 512;
    const ctxNet = canvasNet.getContext('2d');
    ctxNet.clearRect(0, 0, 512, 512);

    const strapCoords = [64, 192, 320, 448];

    // Layer A: Deep 3D Contact Drop Shadows underneath all straps
    ctxNet.lineWidth = 32;
    ctxNet.strokeStyle = 'rgba(26, 8, 2, 0.75)';
    ctxNet.beginPath();
    strapCoords.forEach(c => {
      ctxNet.moveTo(0, c + 3); ctxNet.lineTo(512, c + 3);
      ctxNet.moveTo(c + 3, 0); ctxNet.lineTo(c + 3, 512);
    });
    ctxNet.stroke();

    // Layer B: Heavy High-Tensile Rescue Orange Webbing Belts (Width 24px)
    ctxNet.lineWidth = 24;
    ctxNet.strokeStyle = '#ea580c'; // Vibrant High-Visibility Rescue Safety Orange
    ctxNet.beginPath();
    strapCoords.forEach(c => {
      ctxNet.moveTo(0, c); ctxNet.lineTo(512, c);
      ctxNet.moveTo(c, 0); ctxNet.lineTo(c, 512);
    });
    ctxNet.stroke();

    // Layer C: Woven Edge Border Shading
    ctxNet.lineWidth = 2.5;
    ctxNet.strokeStyle = '#9a3412';
    strapCoords.forEach(c => {
      ctxNet.beginPath();
      ctxNet.moveTo(0, c - 11); ctxNet.lineTo(512, c - 11);
      ctxNet.moveTo(0, c + 11); ctxNet.lineTo(512, c + 11);
      ctxNet.moveTo(c - 11, 0); ctxNet.lineTo(c - 11, 512);
      ctxNet.moveTo(c + 11, 0); ctxNet.lineTo(c + 11, 512);
      ctxNet.stroke();
    });

    // Layer D: Central Retroreflective 3M Silver Tracer Threads (Width 4.5px)
    ctxNet.lineWidth = 4.5;
    ctxNet.strokeStyle = '#f8fafc'; // Gleaming silver-white reflective tracer
    ctxNet.beginPath();
    strapCoords.forEach(c => {
      ctxNet.moveTo(0, c); ctxNet.lineTo(512, c);
      ctxNet.moveTo(c, 0); ctxNet.lineTo(c, 512);
    });
    ctxNet.stroke();

    // Layer E: Heavy Box-X Stitched Reinforcement Joints at every intersection (16 joints)
    strapCoords.forEach(x => {
      strapCoords.forEach(y => {
        // Reinforced square backing patch
        ctxNet.fillStyle = '#7c2d12';
        ctxNet.fillRect(x - 14, y - 14, 28, 28);

        // Box perimeter stitch
        ctxNet.strokeStyle = '#fef08a';
        ctxNet.lineWidth = 2.0;
        ctxNet.strokeRect(x - 11, y - 11, 22, 22);

        // Diagonal X-stitches
        ctxNet.beginPath();
        ctxNet.moveTo(x - 10, y - 10); ctxNet.lineTo(x + 10, y + 10);
        ctxNet.moveTo(x + 10, y - 10); ctxNet.lineTo(x - 10, y + 10);
        ctxNet.stroke();

        // Center stainless rivet / grommet
        ctxNet.fillStyle = '#1e293b';
        ctxNet.beginPath();
        ctxNet.arc(x, y, 4.5, 0, Math.PI * 2);
        ctxNet.fill();
        ctxNet.fillStyle = '#e2e8f0';
        ctxNet.beginPath();
        ctxNet.arc(x, y, 2.5, 0, Math.PI * 2);
        ctxNet.fill();
      });
    });

    const captureNetMeshTex = new THREE.CanvasTexture(canvasNet);
    captureNetMeshTex.wrapS = THREE.RepeatWrapping;
    captureNetMeshTex.wrapT = THREE.RepeatWrapping;
    captureNetMeshTex.repeat.set(1, 1);

    // 2. Ultra-HD Rescue Orange Inflatable Pipe Texture (1024 x 512)
    // Features 3D rounded specular volume, 3M retroreflective silver bands,
    // diagonal safety hazard chevrons, technical stenciling, and vulcanized seam tape
    const canvasRedPipe = document.createElement('canvas');
    canvasRedPipe.width = 1024;
    canvasRedPipe.height = 512;
    const ctxRed = canvasRedPipe.getContext('2d');

    // Deep vibrant rescue safety orange base
    ctxRed.fillStyle = '#ea580c';
    ctxRed.fillRect(0, 0, 1024, 512);

    // Micro-ripstop Hypalon rubber texture weave
    ctxRed.strokeStyle = 'rgba(124, 45, 18, 0.40)';
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
    ctxRed.fillStyle = '#7c2d12';
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

    // Tough vulcanized orange composite apron base
    ctxApron.fillStyle = '#ea580c';
    ctxApron.fillRect(0, 0, 512, 512);

    // Dark rubberized pickup lip border at bottom
    ctxApron.fillStyle = '#0f172a';
    ctxApron.fillRect(0, 470, 512, 42);

    // Reflective white chevron arrows pointing inward up the scoop
    ctxApron.fillStyle = '#ffffff';
    for (let cy = 70; cy < 450; cy += 110) {
      ctxApron.beginPath();
      ctxApron.moveTo(256, cy - 35);
      ctxApron.lineTo(450, cy + 25);
      ctxApron.lineTo(410, cy + 45);
      ctxApron.lineTo(256, cy);
      ctxApron.lineTo(102, cy + 45);
      ctxApron.lineTo(62, cy + 25);
      ctxApron.closePath();
      ctxApron.fill();
    }

    ctxApron.font = 'bold 22px "Courier New", monospace';
    ctxApron.fillStyle = '#ffffff';
    ctxApron.textAlign = 'center';
    ctxApron.fillText('✦ HUMAN RESCUE CRADLE ✦', 256, 40);
    ctxApron.fillText('MAX 150 KG • DECELERATION ZONE', 256, 495);

    const apronTex = new THREE.CanvasTexture(canvasApron);
    apronTex.wrapS = THREE.ClampToEdgeWrapping;
    apronTex.wrapT = THREE.ClampToEdgeWrapping;

    // 4. High-Grade Rescue Orange PVC / Hypalon Fabric Texture (512 x 512)
    const canvasCushion = document.createElement('canvas');
    canvasCushion.width = 512;
    canvasCushion.height = 512;
    const ctxCushion = canvasCushion.getContext('2d');

    // Rich saturated rescue safety orange
    ctxCushion.fillStyle = '#ea580c';
    ctxCushion.fillRect(0, 0, 512, 512);

    // Micro-ripstop diamond weave
    ctxCushion.strokeStyle = 'rgba(124, 45, 18, 0.45)';
    ctxCushion.lineWidth = 1.5;
    for (let i = 0; i < 512; i += 16) {
      ctxCushion.beginPath();
      ctxCushion.moveTo(i, 0); ctxCushion.lineTo(i, 512);
      ctxCushion.moveTo(0, i); ctxCushion.lineTo(512, i);
      ctxCushion.stroke();
    }

    // Horizontal quilted bolster seam bands with silver double-stitching
    for (let by = 64; by < 512; by += 128) {
      // Welded rubber seam tape line
      ctxCushion.fillStyle = '#9a3412';
      ctxCushion.fillRect(0, by - 4, 512, 8);

      // Double-stitched high-tensile silver/white thread
      ctxCushion.fillStyle = '#f8fafc';
      for (let x = 6; x < 512; x += 16) {
        ctxCushion.fillRect(x, by - 6, 7, 2.5);
        ctxCushion.fillRect(x, by + 4, 7, 2.5);
      }
    }

    // Stencil Technical Markings
    ctxCushion.save();
    ctxCushion.fillStyle = 'rgba(255, 255, 255, 0.90)';
    ctxCushion.font = 'bold 20px "Courier New", monospace';
    ctxCushion.textAlign = 'center';
    ctxCushion.fillText('✦ AI KAVACH IMPACT SCOOP ✦', 256, 120);
    ctxCushion.font = 'bold 16px "Courier New", monospace';
    ctxCushion.fillText('MAX 150 KG • DECELERATION BACKSTOP', 256, 380);
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

    const accentOrangeMat = new THREE.MeshPhysicalMaterial({
      color: 0xea580c, // High-gloss Indian Railways Safety Rescue Vibrant Orange
      roughness: 0.16,
      metalness: 0.24,
      clearcoat: 0.95,
      clearcoatRoughness: 0.08,
      reflectivity: 0.85
    });
    const accentRedMat = accentOrangeMat; // Universal alias for rescue orange frame components

    const impactFoamMat = new THREE.MeshStandardMaterial({
      color: 0xf97316, // High-visibility safety rescue orange shock foam padding
      roughness: 0.88,
      metalness: 0.04
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

    // \_/ Flared Aerodynamic Scoop Geometry (Sleek, thin, high-strength tubular roll-cage)
    // Top span: 2.80m (-1.40m to +1.40m at y = 2.15m)
    // Bottom span: 1.84m (-0.92m to +0.92m at y = 0.46m) sitting safely over rails
    const v = {
      // Rear mounting on locomotive buffer beam (zBase)
      topL_base:  new THREE.Vector3(-1.40, 2.15, zBase),
      topR_base:  new THREE.Vector3( 1.40, 2.15, zBase),
      botL_base:  new THREE.Vector3(-0.92, 0.46, zBase),
      botR_base:  new THREE.Vector3( 0.92, 0.46, zBase),

      // Mid-span outriggers & side struts
      shoulderL:  new THREE.Vector3(-1.40, 2.15, zBase + 1.40),
      shoulderR:  new THREE.Vector3( 1.40, 2.15, zBase + 1.40),
      midBotL:    new THREE.Vector3(-0.92, 0.46, zBase + 1.45),
      midBotR:    new THREE.Vector3( 0.92, 0.46, zBase + 1.45),

      // Front Wide-Open Mouth Opening (Exact coordinates matching front U-frame!)
      frontTopL:  new THREE.Vector3(-1.40, 2.15, zTip),
      frontTopR:  new THREE.Vector3( 1.40, 2.15, zTip),
      frontBotL:  new THREE.Vector3(-0.92, 0.46, zTip),
      frontBotR:  new THREE.Vector3( 0.92, 0.46, zTip)
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

    // Subdivided Elastic Membrane Panel Generator
    // Creates a subdivided vertex grid that can realistically deform under aerodynamic pressure
    function createSubdividedPanel(p0, p1, p2, p3, segsU = 8, segsV = 6, uvScaleU = 8, uvScaleV = 6, mat) {
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let j = 0; j <= segsV; j++) {
        const v = j / segsV;
        const leftPt = p0.clone().lerp(p3, v);
        const rightPt = p1.clone().lerp(p2, v);

        for (let i = 0; i <= segsU; i++) {
          const u = i / segsU;
          const pt = leftPt.clone().lerp(rightPt, u);
          positions.push(pt.x, pt.y, pt.z);
          uvs.push(u * uvScaleU, (1 - v) * uvScaleV);
        }
      }

      const rowSize = segsU + 1;
      for (let j = 0; j < segsV; j++) {
        for (let i = 0; i < segsU; i++) {
          const a = j * rowSize + i;
          const b = j * rowSize + (i + 1);
          const c = (j + 1) * rowSize + i;
          const d = (j + 1) * rowSize + (i + 1);
          indices.push(a, b, c);
          indices.push(b, d, c);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // High-Fidelity Concave Hammock Net Bed Generator
    // Sags down in the center (15cm pocket) with raised side edges and front retention ridge
    function createConcaveHammock(pRearL, pRearR, pFrontR, pFrontL, segsX = 14, segsZ = 18, mat) {
      const geom = new THREE.BufferGeometry();
      const positions = [];
      const uvs = [];
      const indices = [];

      for (let j = 0; j <= segsZ; j++) {
        const v = j / segsZ; // 0 = Rear (base), 1 = Front (lip)
        const leftPt = pRearL.clone().lerp(pFrontL, v);
        const rightPt = pRearR.clone().lerp(pFrontR, v);

        for (let i = 0; i <= segsX; i++) {
          const u = i / segsX; // 0 = Left edge, 1 = Right edge
          const pt = leftPt.clone().lerp(rightPt, u);

          // Transverse parabolic sag (max 1.0 at center u = 0.5)
          const transverseSag = Math.sin(u * Math.PI);

          // Longitudinal pocket: deepest in mid-catching zone, strictly 0 at front and rear frame pipes
          const longitudinalPocket = Math.sin(v * Math.PI);
          
          // Up to 15cm deep concave pocket for genuine deceleration & retention!
          const totalSag = transverseSag * (0.15 * longitudinalPocket);
          pt.y -= totalSag;

          positions.push(pt.x, pt.y, pt.z);
          uvs.push(u * 5.0, v * 7.0);
        }
      }

      const rowSize = segsX + 1;
      for (let j = 0; j < segsZ; j++) {
        for (let i = 0; i < segsX; i++) {
          const a = j * rowSize + i;
          const b = j * rowSize + (i + 1);
          const c = (j + 1) * rowSize + i;
          const d = (j + 1) * rowSize + (i + 1);

          indices.push(a, c, b);
          indices.push(b, c, d);
        }
      }

      geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
      geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
      geom.setIndex(indices);
      geom.computeVertexNormals();

      const mesh = new THREE.Mesh(geom, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      return mesh;
    }

    // 1. Continuous Tubular Roll-Cage Frame (Slender High-Tensile Outrigger Booms)
    // Forward boom endpoints terminate flush against the rear wall of the front U-frame
    const frontTopL_boom = new THREE.Vector3(-1.40, 2.15, zTip - 0.024);
    const frontTopR_boom = new THREE.Vector3( 1.40, 2.15, zTip - 0.024);
    const frontBotL_boom = new THREE.Vector3(-0.92, 0.46, zTip - 0.024);
    const frontBotR_boom = new THREE.Vector3( 0.92, 0.46, zTip - 0.024);

    const tubePairs = [
      // Rear transverse frames (Mounted on locomotive buffer beam)
      [v.topL_base, v.topR_base, 0.024, accentRedMat],
      [v.botL_base, v.botR_base, 0.022, accentRedMat],
      [v.topL_base, v.botL_base, 0.022, accentRedMat],
      [v.topR_base, v.botR_base, 0.022, accentRedMat],

      // Left flank outriggers (upper, lower & diagonal brace)
      [v.topL_base,  v.shoulderL,       0.022, accentRedMat],
      [v.shoulderL,  frontTopL_boom,     0.022, accentRedMat],
      [v.botL_base,  v.midBotL,         0.022, accentRedMat],
      [v.midBotL,    frontBotL_boom,     0.022, accentRedMat],
      [v.shoulderL,  v.midBotL,         0.018, accentRedMat],

      // Right flank outriggers (upper, lower & diagonal brace)
      [v.topR_base,  v.shoulderR,       0.022, accentRedMat],
      [v.shoulderR,  frontTopR_boom,     0.022, accentRedMat],
      [v.botR_base,  v.midBotR,         0.022, accentRedMat],
      [v.midBotR,    frontBotR_boom,     0.020, accentRedMat],
      [v.shoulderR,  v.midBotR,         0.018, accentRedMat]
    ];

    tubePairs.forEach(p => {
      const tube = createTube(p[0], p[1], p[2], p[3]);
      if (tube) this.deployableScoop.add(tube);
    });

    // Spherical Knuckles at rear locomotive base and mid-span structural nodes
    [
      v.topL_base, v.topR_base, v.botL_base, v.botR_base,
      v.shoulderL, v.shoulderR, v.midBotL, v.midBotR
    ].forEach(pt => {
      this.deployableScoop.add(createKnuckle(pt, 0.025, accentRedMat));
    });

    // ================================================================
    // 2. CONTINUOUS SEAMLESS U-SHAPE RESCUE FRAME (Front Mouth Opening)
    // Continuous tubular frame with smooth radiused U-bends at all 4 corners
    // and precision-aligned straight upright pillars and header/footer bars.
    // Perfectly matches the netting perimeter with 0 gap and no jagged knuckles.
    // ================================================================
    const zF = zTip;
    const rFillet = 0.12;

    const pTL = v.frontTopL;
    const pTR = v.frontTopR;
    const pBR = v.frontBotR;
    const pBL = v.frontBotL;

    // Tangent vectors and corner fillet control points
    const dirRight = pBR.clone().sub(pTR).normalize();
    const dirLeft  = pTL.clone().sub(pBL).normalize();

    const pTopR_start = new THREE.Vector3( 1.40 - rFillet, 2.15, zF);
    const pTopR_end   = pTR.clone().add(dirRight.clone().multiplyScalar(rFillet));

    const pBotR_start = pBR.clone().sub(dirRight.clone().multiplyScalar(rFillet));
    const pBotR_end   = new THREE.Vector3( 0.92 - rFillet, 0.46, zF);

    const pBotL_start = new THREE.Vector3(-0.92 + rFillet, 0.46, zF);
    const pBotL_end   = pBL.clone().add(dirLeft.clone().multiplyScalar(rFillet));

    const pTopL_start = pTL.clone().sub(dirLeft.clone().multiplyScalar(rFillet));
    const pTopL_end   = new THREE.Vector3(-1.40 + rFillet, 2.15, zF);

    const uPath = new THREE.CurvePath();
    // 1. Top header bar (straight along top net border)
    uPath.add(new THREE.LineCurve3(pTopL_end, pTopR_start));
    // 2. Top-right smooth radiused U-bend fillet
    uPath.add(new THREE.QuadraticBezierCurve3(pTopR_start, pTR, pTopR_end));
    // 3. Right upright pillar (straight along exact side net front edge)
    uPath.add(new THREE.LineCurve3(pTopR_end, pBotR_start));
    // 4. Bottom-right smooth radiused U-bend fillet
    uPath.add(new THREE.QuadraticBezierCurve3(pBotR_start, pBR, pBotR_end));
    // 5. Bottom clearance bar (straight along exact hammock front edge)
    uPath.add(new THREE.LineCurve3(pBotR_end, pBotL_start));
    // 6. Bottom-left smooth radiused U-bend fillet
    uPath.add(new THREE.QuadraticBezierCurve3(pBotL_start, pBL, pBotL_end));
    // 7. Left upright pillar (straight along exact side net front edge)
    uPath.add(new THREE.LineCurve3(pBotL_end, pTopL_start));
    // 8. Top-left smooth radiused U-bend fillet
    uPath.add(new THREE.QuadraticBezierCurve3(pTopL_start, pTL, pTopL_end));

    const uFrameGeo = new THREE.TubeGeometry(uPath, 128, 0.024, 16, true);
    const uFrameMesh = new THREE.Mesh(uFrameGeo, accentOrangeMat);
    uFrameMesh.castShadow = true;
    this.deployableScoop.add(uFrameMesh);

    // ================================================================
    // 3. CONTINUOUS KEVLAR PERIMETER BOLTROPE & TIGHT MECHANICAL FASTENERS
    // Securely fastens the net mesh directly into the orange U-frame with zero gap
    // ================================================================
    const boltropeMat = new THREE.MeshStandardMaterial({
      color: 0xc2410c, // Deep reinforced safety orange Kevlar boltrope
      roughness: 0.40,
      metalness: 0.15
    });

    [
      [pTL, pTR], // Top header border
      [pTR, pBR], // Right upright pillar border
      [pBR, pBL], // Bottom clearance lip border
      [pBL, pTL]  // Left upright pillar border
    ].forEach(([pA, pB]) => {
      const rope = createTube(pA, pB, 0.007, boltropeMat);
      if (rope) this.deployableScoop.add(rope);
    });

    // Precision Stainless Steel Cinch Rings Wrapping Snugly around U-Frame & Boltrope
    const cinchRingGeo = new THREE.TorusGeometry(0.0255, 0.0035, 12, 24);
    const cinchMat = metalMat;

    // Rings along Left and Right Upright Pillars (6 per side)
    [-1, 1].forEach(side => {
      const pBot = side === -1 ? pBL : pBR;
      const pTop = side === -1 ? pTL : pTR;
      const pillarDir = pTop.clone().sub(pBot).normalize();

      [0.10, 0.25, 0.40, 0.55, 0.70, 0.85].forEach(tFrac => {
        const ring = new THREE.Mesh(cinchRingGeo, cinchMat);
        ring.position.copy(pBot.clone().lerp(pTop, tFrac));
        ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), pillarDir);
        this.deployableScoop.add(ring);
      });
    });

    // Rings along Top Header Bar (7 rings)
    [0.15, 0.26, 0.38, 0.50, 0.62, 0.74, 0.85].forEach(tFrac => {
      const ring = new THREE.Mesh(cinchRingGeo, cinchMat);
      ring.position.copy(pTL.clone().lerp(pTR, tFrac));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
      this.deployableScoop.add(ring);
    });

    // Rings along Bottom Clearance Bar (5 rings)
    [0.20, 0.35, 0.50, 0.65, 0.80].forEach(tFrac => {
      const ring = new THREE.Mesh(cinchRingGeo, cinchMat);
      ring.position.copy(pBL.clone().lerp(pBR, tFrac));
      ring.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), new THREE.Vector3(1, 0, 0));
      this.deployableScoop.add(ring);
    });

    // 4. Ultra-Thin Low-Profile Emergency LED Strobe Bar along Top Header
    const lightBarHousing = new THREE.Mesh(new THREE.BoxGeometry(2.20, 0.032, 0.038), darkHousingMat);
    lightBarHousing.position.set(0, 2.18, zTip + 0.025);
    this.deployableScoop.add(lightBarHousing);

    const bezel = new THREE.Mesh(new THREE.BoxGeometry(2.22, 0.008, 0.040), metalMat);
    bezel.position.set(0, 2.20, zTip + 0.025);
    this.deployableScoop.add(bezel);

    const strobeLeds = [];
    const ledCount = 8;
    const ledSpacing = 2.0 / ledCount;
    for (let s = 0; s < ledCount; s++) {
      const lx = -1.0 + (s + 0.5) * ledSpacing;
      const isAmber = (s === 1 || s === 6 || s === 2 || s === 5);
      const ledMat = new THREE.MeshBasicMaterial({
        color: isAmber ? 0xf59e0b : 0xf8fafc,
        transparent: true,
        opacity: 0.95
      });
      const ledLens = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.020, 0.012), ledMat);
      ledLens.position.set(lx, 2.18, zTip + 0.046);
      this.deployableScoop.add(ledLens);
      strobeLeds.push(ledLens);
    }
    this.strobeLeds = strobeLeds;

    // 5. Real-World Low-Clearance Ground Scooper Chute & Beveled Pick-up Lip
    // Extends forward and down to 3cm above rails (y = 0.35m) to smoothly glide under obstacles
    const rampGeo = new THREE.BufferGeometry();
    const rPos = [
      // Segment 1: Low-clearance beveled pick-up lip (y = 0.35m, right above 0.32m rail head)
      -0.92, 0.35, zTip + 0.28,
       0.92, 0.35, zTip + 0.28,
       0.92, 0.46, zTip,
      -0.92, 0.46, zTip,

      // Segment 2: Transition chute over clearance bar dropping into concave hammock bed
      -0.92, 0.46, zTip,
       0.92, 0.46, zTip,
       0.92, 0.45, zTip - 0.40,
      -0.92, 0.45, zTip - 0.40
    ];
    const rIndices = [
      0, 1, 2,  0, 2, 3,       // Front pick-up lip
      4, 5, 6,  4, 6, 7        // Transition chute into cradle
    ];
    const rUvs = [
      0, 1,    1, 1,    1, 0.5,  0, 0.5,
      0, 0.5,  1, 0.5,  1, 0,    0, 0
    ];
    rampGeo.setAttribute('position', new THREE.Float32BufferAttribute(rPos, 3));
    rampGeo.setAttribute('uv', new THREE.Float32BufferAttribute(rUvs, 2));
    rampGeo.setIndex(rIndices);
    rampGeo.computeVertexNormals();
    const rampMesh = new THREE.Mesh(rampGeo, apronMat);
    this.deployableScoop.add(rampMesh);

    // Beveled Vulcanized Rubber Pick-up Lip Runner Bar along the very front edge
    const lipBar = createTube(
      new THREE.Vector3(-0.92, 0.35, zTip + 0.28),
      new THREE.Vector3( 0.92, 0.35, zTip + 0.28),
      0.024,
      rubberMat
    );
    if (lipBar) this.deployableScoop.add(lipBar);

    // Stainless Steel Track Guide Roller Skids (Keep the scoop gliding smoothly over rails & turnouts)
    [-0.84, -0.28, 0.28, 0.84].forEach(sx => {
      const skidBracket = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.10, 0.28), darkHousingMat);
      skidBracket.position.set(sx, 0.40, zTip - 0.10);
      this.deployableScoop.add(skidBracket);

      const rollerWheel = new THREE.Mesh(new THREE.CylinderGeometry(0.038, 0.038, 0.05, 16).rotateZ(Math.PI / 2), metalMat);
      rollerWheel.position.set(sx, 0.36, zTip - 0.08);
      this.deployableScoop.add(rollerWheel);
    });

    // High-Tensile Webbing Tabs & Silver Eyelet Rings with Tension Lacing along Main Booms
    const eyeletGeo = new THREE.TorusGeometry(0.024, 0.005, 10, 16);
    const eyeletMat = metalMat;
    const lacingMat = new THREE.MeshStandardMaterial({ color: 0xea580c, roughness: 0.25 }); // Orange nylon tension cord

    [
      [v.topL_base, frontTopL_boom],
      [v.topR_base, frontTopR_boom],
      [v.botL_base, frontBotL_boom],
      [v.botR_base, frontBotR_boom]
    ].forEach(([pA, pB]) => {
      const segs = 8;
      const boomDir = pB.clone().sub(pA).normalize();
      for (let s = 1; s < segs; s++) {
        const frac = s / segs;
        const pt = pA.clone().lerp(pB, frac);
        const eyelet = new THREE.Mesh(eyeletGeo, eyeletMat);
        eyelet.position.copy(pt);
        eyelet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), boomDir);
        this.deployableScoop.add(eyelet);

        // Small tension lacing cord segment
        const cordPts = [
          pt.clone(),
          pt.clone().add(new THREE.Vector3(0, s % 2 === 0 ? 0.025 : -0.025, 0.035))
        ];
        const cordGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(cordPts), 4, 0.005, 6, false);
        const cord = new THREE.Mesh(cordGeo, lacingMat);
        this.deployableScoop.add(cord);
      }
    });

    // 6. High-Tensile Kevlar Braided Safety Netting Enclosure (Aero-Elastic Dynamic Panels)
    // Top Safety Roof Screen (Spans over top arch, preventing deflection over train)
    this.topMesh = createSubdividedPanel(v.topL_base, v.topR_base, v.frontTopR, v.frontTopL, 8, 6, 8, 6, netMeshMat);
    this.topBasePos = new Float32Array(this.topMesh.geometry.attributes.position.array);
    this.deployableScoop.add(this.topMesh);

    // Left Flank Protective Side Net Wall
    this.sideMeshL = createSubdividedPanel(v.topL_base, v.frontTopL, v.frontBotL, v.botL_base, 8, 6, 8, 6, netMeshMat);
    this.sideBasePosL = new Float32Array(this.sideMeshL.geometry.attributes.position.array);
    this.deployableScoop.add(this.sideMeshL);

    // Right Flank Protective Side Net Wall (Symmetric coordinates & parameters)
    this.sideMeshR = createSubdividedPanel(v.topR_base, v.frontTopR, v.frontBotR, v.botR_base, 8, 6, 8, 6, netMeshMat);
    this.sideBasePosR = new Float32Array(this.sideMeshR.geometry.attributes.position.array);
    this.deployableScoop.add(this.sideMeshR);

    // 8. Deep Concave Deceleration Hammock Net Bed (True Real-World Human Catching Cradle)
    // Sags into an 18cm deep pocket that decelerates and safely retains humans/obstacles!
    const hammockBed = createConcaveHammock(
      v.botL_base,
      v.botR_base,
      v.frontBotR,
      v.frontBotL,
      14, // 14 transverse segments
      18, // 18 longitudinal segments
      netMeshMat
    );
    this.hammockMesh = hammockBed;
    this.hammockGeo = hammockBed.geometry;
    this.hammockBasePos = new Float32Array(hammockBed.geometry.attributes.position.array);
    this.hammockSegsX = 14;
    this.hammockSegsZ = 18;
    this.deployableScoop.add(hammockBed);

    // 9. Multi-Bolster Quilted Pneumatic Cushion Mattress (Padded Inflatable Deceleration Backstop)
    // Fully shields the locomotive buffer beam so obstacles decelerate into soft pneumatic cushions!
    const bolsterCount = 7;
    const bW = 2.50 / bolsterCount;
    for (let i = 0; i < bolsterCount; i++) {
      const bx = -1.25 + (i + 0.5) * bW;
      const bGeo = new THREE.CylinderGeometry(bW * 0.48, bW * 0.48, 1.55, 18);
      const bolster = new THREE.Mesh(bGeo, accentRedMat);
      bolster.position.set(bx, 1.45, zBase + 0.12);
      bolster.castShadow = true;
      this.deployableScoop.add(bolster);

      // Overpressure relief dump valves on bolsters
      if (i === 1 || i === 3 || i === 5) {
        const valveRing = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.03, 16).rotateX(Math.PI / 2), metalMat);
        valveRing.position.set(bx, 1.45, zBase + 0.22);
        this.deployableScoop.add(valveRing);
        const valveCap = new THREE.Mesh(new THREE.SphereGeometry(0.036, 12, 8), darkHousingMat);
        valveCap.position.set(bx, 1.45, zBase + 0.24);
        this.deployableScoop.add(valveCap);
      }
    }

    // High-Density Deceleration Impact Caps over Locomotive Buffer Discs
    // Shields the protruding steel buffer heads with thick impact-absorbing cushions
    [-0.95, 0.95].forEach(bx => {
      const bufferCapGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.16, 24);
      bufferCapGeo.rotateX(Math.PI / 2);
      const bufferCap = new THREE.Mesh(bufferCapGeo, accentRedMat);
      bufferCap.position.set(bx, 0.95, zBase + 0.34);
      bufferCap.castShadow = true;
      this.deployableScoop.add(bufferCap);

      const rimGeo = new THREE.TorusGeometry(0.26, 0.012, 8, 24);
      const rim = new THREE.Mesh(rimGeo, metalMat);
      rim.position.set(bx, 0.95, zBase + 0.42);
      this.deployableScoop.add(rim);
    });

    // Thick Lower Lumbar & Buffer Beam Protective Cushion Bar (Spans full beam width)
    const bufferPadGeo = new THREE.CylinderGeometry(0.22, 0.22, 2.65, 24);
    bufferPadGeo.rotateZ(Math.PI / 2);
    const bufferPad = new THREE.Mesh(bufferPadGeo, accentRedMat);
    bufferPad.position.set(0, 0.95, zBase + 0.30);
    this.deployableScoop.add(bufferPad);

    const topPadGeo = new THREE.CylinderGeometry(0.09, 0.09, 2.70, 20);
    topPadGeo.rotateZ(Math.PI / 2);
    const topPad = new THREE.Mesh(topPadGeo, accentRedMat);
    topPad.position.set(0, 2.18, zBase + 0.12);
    this.deployableScoop.add(topPad);

    [-1.15, 1.15].forEach(px => {
      const pocketGeo = new THREE.BoxGeometry(0.05, 0.30, 0.42);
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
    this.cradleCargoGroup.position.set(0, 0.52, zBase + 1.55);
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
    this.beginCaptureSequence(obstacleMesh, obstacleInfo);
  }

  beginCaptureSequence(obstacleMesh, obstacleInfo) {
    const zOffset = (this.collectedList.length * 0.40) - 0.20;
    this.cradleCargoGroup.add(obstacleMesh);
    this.collectedList.push(obstacleInfo);
    this.totalPayloadWeight += obstacleInfo.mass;

    // Start position: right at the front scoop mouth entrance lip (z = 1.55m in cradleCargoGroup local space)
    const isHuman = obstacleInfo.type === 'human';
    const isAnimal = obstacleInfo.type === 'animal';

    obstacleMesh.position.set(0, isHuman ? -0.32 : (isAnimal ? -0.16 : -0.15), 1.55);
    obstacleMesh.rotation.set(0, 0, 0);

    const targetPos = new THREE.Vector3(
      0,
      isHuman ? -0.38 : (isAnimal ? -0.22 : -0.15),
      isHuman ? zOffset - 0.05 : (isAnimal ? zOffset + 0.08 : zOffset)
    );

    const targetRotX = isHuman ? -0.16 : (isAnimal ? -0.25 : 0);
    const targetRotZ = isAnimal ? 0.12 : 0;

    const animItem = {
      mesh: obstacleMesh,
      info: obstacleInfo,
      time: 0,
      duration: 0.75, // simulation seconds (stretches realistically in slow-motion)
      startPos: new THREE.Vector3(0, isHuman ? -0.32 : (isAnimal ? -0.16 : -0.15), 1.55),
      targetPos: targetPos,
      targetRotX: targetRotX,
      targetRotZ: targetRotZ,
      settled: false,
      userData: obstacleMesh.userData || {}
    };

    this.activeCaptures.push(animItem);
    this.cradlePayloadSagVel = -0.65;
  }

  clearCradle() {
    while (this.cradleCargoGroup.children.length > 0) {
      this.cradleCargoGroup.remove(this.cradleCargoGroup.children[0]);
    }
    this.collectedList = [];
    this.activeCaptures = [];
    this.totalPayloadWeight = 0;
  }

  // ------------------------------------------------------------------
  // Real-Time Frame Update (Deployment physics, Aero-Elastic Fabric Dynamics, LiDAR beam, LEDs)
  // Mathematical Navier-Stokes dynamic pressure q = 0.5 * rho * v^2 and Hooke's membrane elasticity
  // ------------------------------------------------------------------
  update(dt, isTargetDetected = false, speedMs = 0) {
    this.aeroTime += dt;

    // 1. Elastic Pneumatic Inflation Interpolation
    if (Math.abs(this.deployProgress - this.targetDeploy) > 0.001) {
      this.deployProgress += (this.targetDeploy - this.deployProgress) * Math.min(dt * this.deploySpeed * 4.0, 1.0);
      this.applyDeployTransform(this.deployProgress);
    }

    // 2. Real-World Aero-Elastic Fabric Mechanics (Calculated for up to 160 km/h)
    // Speed: 160 km/h = 44.44 m/s. Stagnation pressure q = 1/2 * rho * v^2 = 1.21 kPa
    const vNorm = Math.min(Math.abs(speedMs) / 44.44, 1.25);
    const qFactor = vNorm * vNorm; // Strictly quadratic dynamic pressure response

    // Strouhal vortex shedding frequency for webbing straps (fs = St * v / d)
    const flutterFreq = 8.0 + 26.0 * vNorm;
    const flutterAmp = 0.024 * Math.pow(vNorm, 1.5);

    // Dynamic Payload Catenary Sag (Hooke's spring-mass damping oscillation)
    const targetPayloadSag = (this.totalPayloadWeight / 150) * -0.09;
    const kSpring = 24.0;
    const cDamp = 6.2;
    const sagAcc = (targetPayloadSag - this.cradlePayloadSag) * kSpring - this.cradlePayloadSagVel * cDamp;
    this.cradlePayloadSagVel += sagAcc * dt;
    this.cradlePayloadSag += this.cradlePayloadSagVel * dt;

    // A. Modulate Hammock Elastic Net Bed
    if (this.hammockMesh && this.hammockBasePos) {
      const posAttr = this.hammockMesh.geometry.attributes.position;
      const pos = posAttr.array;
      const base = this.hammockBasePos;
      const segsX = this.hammockSegsX;
      const segsZ = this.hammockSegsZ;

      let idx = 0;
      for (let j = 0; j <= segsZ; j++) {
        const v = j / segsZ; // 0 = base (rear), 1 = lip (front)
        for (let i = 0; i <= segsX; i++) {
          const u = i / segsX; // 0 = left edge, 1 = right edge

          // Fixed boundary condition at steel roll-cage edges (strictly 0 at perimeter)
          const edgeWeight = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);

          // Aerodynamic backward billow deflection (wind pushes elastic fabric toward locomotive)
          const deltaZ_aero = -0.13 * qFactor * edgeWeight;

          // Aerodynamic downward suction sag & payload stretch
          const deltaY_aero = (-0.06 * qFactor + this.cradlePayloadSag) * edgeWeight;

          // Aero-elastic high-speed traveling ripple / flutter wave (Strouhal vortex shedding)
          const ripple = flutterAmp * Math.sin(3.5 * Math.PI * v - flutterFreq * this.aeroTime) * Math.cos(2.0 * Math.PI * u) * edgeWeight;

          pos[idx]     = base[idx];
          pos[idx + 1] = base[idx + 1] + deltaY_aero + ripple;
          pos[idx + 2] = base[idx + 2] + deltaZ_aero + ripple * 0.6;

          idx += 3;
        }
      }
      posAttr.needsUpdate = true;
      if (Math.floor(this.aeroTime * 30) % 3 === 0) {
        this.hammockMesh.geometry.computeVertexNormals();
      }
    }

    // B. Modulate Side Flank Elastic Net Walls (Internal scoop airflow bulges outward)
    [
      { mesh: this.sideMeshL, base: this.sideBasePosL, sign: -1 },
      { mesh: this.sideMeshR, base: this.sideBasePosR, sign:  1 }
    ].forEach(({ mesh, base, sign }) => {
      if (!mesh || !base) return;
        const posAttr = mesh.geometry.attributes.position;
        const pos = posAttr.array;
        const segsU = 8;
        const segsV = 6;
        let idx = 0;
        for (let j = 0; j <= segsV; j++) {
          const v = j / segsV;
          for (let i = 0; i <= segsU; i++) {
            const u = i / segsU;
            const edgeWeight = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
            const bulgeX = sign * 0.08 * qFactor * edgeWeight;
            const ripple = sign * flutterAmp * 0.7 * Math.sin(2.8 * Math.PI * u - flutterFreq * this.aeroTime) * edgeWeight;

            pos[idx]     = base[idx] + bulgeX + ripple;
            pos[idx + 1] = base[idx + 1];
            pos[idx + 2] = base[idx + 2];
            idx += 3;
          }
        }
        posAttr.needsUpdate = true;
      });

      // C. Modulate Top Roof Safety Screen (Upward deflection from bow wave)
      if (this.topMesh && this.topBasePos) {
        const posAttr = this.topMesh.geometry.attributes.position;
        const pos = posAttr.array;
        const base = this.topBasePos;
        const segsU = 8;
        const segsV = 6;
        let idx = 0;
        for (let j = 0; j <= segsV; j++) {
          const v = j / segsV;
          for (let i = 0; i <= segsU; i++) {
            const u = i / segsU;
            const edgeWeight = Math.sin(u * Math.PI) * Math.sin(v * Math.PI);
            const billowY = 0.07 * qFactor * edgeWeight;
            const ripple = flutterAmp * 0.6 * Math.sin(3.0 * Math.PI * v - flutterFreq * this.aeroTime) * edgeWeight;

            pos[idx]     = base[idx];
            pos[idx + 1] = base[idx + 1] + billowY + ripple;
            pos[idx + 2] = base[idx + 2];
            idx += 3;
          }
        }
        posAttr.needsUpdate = true;
      }

      // D. Dynamic Obstacle Cradling Response (Inertia, dynamic payload settling & rail vibration)
      const zBase = this.locoLength / 2 + 0.35;
      const railVibe = 0.005 * vNorm * Math.sin(this.aeroTime * 28.0);
      this.cradleCargoGroup.position.y = 0.52 + this.cradlePayloadSag + railVibe;
      this.cradleCargoGroup.position.z = zBase + 1.55 - 0.05 * qFactor;

      // E. Dynamic Obstacle Scoop & Deceleration Kinematics
      for (let i = 0; i < this.activeCaptures.length; i++) {
        const cap = this.activeCaptures[i];
        if (!cap.settled) {
          cap.time += dt;
          const p = Math.min(1.0, cap.time / cap.duration);

          // Cubic deceleration trajectory along track direction (s: 0 -> 1)
          const s = 1.0 - Math.pow(1.0 - p, 3.0);
          const curZ = THREE.MathUtils.lerp(cap.startPos.z, cap.targetPos.z, s);

          // Vertical scoop trajectory:
          // - Ramp glide over pick-up lip (p: 0 to 0.35)
          const rampHump = 0.14 * Math.sin(Math.min(1.0, p / 0.35) * Math.PI);
          // - Deceleration kinetic depression into elastic netting (p: 0.30 to 0.85)
          const elasticDip = -0.16 * Math.sin(Math.max(0.0, Math.min(1.0, (p - 0.30) / 0.55)) * Math.PI);
          const baseCurY = THREE.MathUtils.lerp(cap.startPos.y, cap.targetPos.y, s);
          const curY = baseCurY + rampHump + elasticDip;

          cap.mesh.position.set(0, curY, curZ);

          // Reclining rotation into supportive safety hammock
          const rotS = 0.5 - 0.5 * Math.cos(Math.PI * Math.min(1.0, p / 0.75));
          cap.mesh.rotation.x = THREE.MathUtils.lerp(0, cap.targetRotX, rotS);
          cap.mesh.rotation.z = THREE.MathUtils.lerp(0, cap.targetRotZ, rotS);

          // Biomechanical joint articulation during scoop
          const ud = cap.userData;
          if (ud.type === 'human') {
            // Torso reclines back comfortably against rear safety cushion
            if (ud.torsoGroup) {
              ud.torsoGroup.rotation.x = THREE.MathUtils.lerp(0, -0.38, rotS);
            }
            // Hips flex forward into sitting hammock posture (thighs lifted)
            if (ud.legL) ud.legL.rotation.x = THREE.MathUtils.lerp(0, 1.25, rotS);
            if (ud.legR) ud.legR.rotation.x = THREE.MathUtils.lerp(0, 1.15, rotS);
            // Knees bend deeply to sit naturally in elastic hammock
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = THREE.MathUtils.lerp(0, -1.65, rotS);
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = THREE.MathUtils.lerp(0, -1.55, rotS);

            // Arms reach up and grasp the high-vis safety orange net straps
            if (ud.armL) {
              ud.armL.rotation.x = THREE.MathUtils.lerp(0, -0.45, rotS);
              ud.armL.rotation.y = THREE.MathUtils.lerp(0, 0.15, rotS);
              ud.armL.rotation.z = THREE.MathUtils.lerp(0, -0.48, rotS);
            }
            if (ud.armR) {
              ud.armR.rotation.x = THREE.MathUtils.lerp(0, -0.40, rotS);
              ud.armR.rotation.y = THREE.MathUtils.lerp(0, -0.12, rotS);
              ud.armR.rotation.z = THREE.MathUtils.lerp(0, 0.45, rotS);
            }
            if (ud.forearmL) ud.forearmL.rotation.x = THREE.MathUtils.lerp(-0.22, -1.12, rotS);
            if (ud.forearmR) ud.forearmR.rotation.x = THREE.MathUtils.lerp(-0.22, -1.08, rotS);

            // Head nods forward slightly to protect cervical vertebrae then looks alertly out front
            if (ud.headGroup) ud.headGroup.rotation.x = THREE.MathUtils.lerp(0, -0.25, rotS);
          } else if (ud.type === 'animal') {
            // Quadruped safely curls legs under body in recumbent shelter posture
            if (ud.legs) {
              ud.legs.forEach(leg => {
                leg.group.rotation.x = THREE.MathUtils.lerp(0, leg.isFront ? 1.30 : -1.05, rotS);
                if (leg.kneeGroup) {
                  leg.kneeGroup.rotation.x = THREE.MathUtils.lerp(0, leg.isFront ? -1.80 : 1.70, rotS);
                }
              });
            }
            if (ud.headGroup) {
              ud.headGroup.rotation.x = THREE.MathUtils.lerp(0, -0.20, rotS);
            }
          }

          // Net deformation impulse at peak impact (p around 0.50)
          if (p > 0.40 && p < 0.65) {
            this.cradlePayloadSag = -0.16 * Math.sin(((p - 0.40) / 0.25) * Math.PI);
          }

          if (p >= 1.0) {
            cap.settled = true;
            cap.mesh.position.copy(cap.targetPos);
            cap.mesh.rotation.x = cap.targetRotX;
            cap.mesh.rotation.z = cap.targetRotZ;
          }
        } else {
          // Continuous, dynamic, organic living behavior inside the rescue net cradle
          const ud = cap.userData;
          const t = this.aeroTime;

          if (ud.type === 'human') {
            // 1. Deep, rhythmic relief breathing with periodic relief sigh
            const breath = Math.sin(t * 2.8);
            const deepReliefSigh = Math.pow(Math.max(0, Math.sin(t * 0.45)), 4.0) * 0.08;
            if (ud.torsoGroup) {
              const exp = 0.038 * breath + deepReliefSigh;
              ud.torsoGroup.scale.set(1.0 + exp, 1.0 + exp * 0.6, 1.0 + exp);
              ud.torsoGroup.rotation.x = -0.38 + 0.025 * breath;
            }

            // 2. Head looking around: scanning driver cab, tracks below, and passing scenery
            if (ud.headGroup) {
              const lookUp = -0.28 + 0.06 * Math.sin(t * 1.6);
              const lookYaw = 0.28 * Math.sin(t * 0.7) + 0.12 * Math.sin(t * 1.8);
              const nod = 0.03 * Math.sin(t * 3.2);
              ud.headGroup.rotation.set(lookUp + nod, lookYaw, 0.04 * Math.sin(t * 0.9));
            }

            // 3. Hands gripping and adjusting on the high-vis safety orange net ropes
            if (ud.armL && ud.forearmL) {
              ud.armL.rotation.set(-0.45 + 0.03 * Math.sin(t * 2.0), 0.15, -0.48 + 0.04 * Math.cos(t * 1.7));
              ud.forearmL.rotation.x = -1.12 + 0.07 * Math.sin(t * 2.3);
            }
            if (ud.armR && ud.forearmR) {
              ud.armR.rotation.set(-0.40 + 0.03 * Math.cos(t * 1.9), -0.12, 0.45 + 0.04 * Math.sin(t * 2.1));
              ud.forearmR.rotation.x = -1.08 + 0.06 * Math.cos(t * 2.2);
            }

            // 4. Legs resting in natural sitting posture with track vibration damping
            const railBump = 0.03 * Math.sin(t * 22.0) * vNorm;
            if (ud.legL) ud.legL.rotation.x = 1.25 + 0.02 * Math.sin(t * 1.5);
            if (ud.legR) ud.legR.rotation.x = 1.15 + 0.02 * Math.cos(t * 1.4);
            if (ud.lowerLegL) ud.lowerLegL.rotation.x = -1.65 + railBump;
            if (ud.lowerLegR) ud.lowerLegR.rotation.x = -1.55 + railBump;

            // 5. Gentle whole-body hammock sway from train inertia and aerodynamic draft
            cap.mesh.rotation.z = 0.025 * Math.sin(t * 3.2) * vNorm;
            cap.mesh.rotation.x = cap.targetRotX + 0.018 * Math.cos(t * 3.8) * vNorm;

          } else if (ud.type === 'animal') {
            // Continuous living behavior for rescued quadruped in the net
            const breathAnim = Math.sin(t * 4.2);
            if (ud.body) {
              ud.body.scale.set(0.92 + 0.045 * breathAnim, 1.15 + 0.035 * breathAnim, 1.0);
            }

            // Head looks around alertly
            if (ud.headGroup) {
              ud.headGroup.rotation.y = Math.sin(t * 1.4) * 0.35;
              ud.headGroup.rotation.x = -0.18 + Math.sin(t * 2.4) * 0.08;
            }

            // Ears twitching independently
            if (ud.ears && ud.ears.length >= 2) {
              ud.ears[0].rotation.z = -0.55 + Math.sin(t * 7.5) * 0.25;
              ud.ears[1].rotation.z = 0.55 + Math.sin(t * 6.0 + 1.2) * 0.25;
            }

            // Tail swishes against orange net webbing
            if (ud.tail) {
              ud.tail.rotation.z = Math.sin(t * 4.5) * 0.55;
              ud.tail.rotation.x = 0.35 + Math.abs(Math.sin(t * 2.2)) * 0.25;
            }

            // Maintain comfortable recumbent curled posture
            if (ud.legs) {
              ud.legs.forEach(leg => {
                leg.group.rotation.x = leg.isFront ? 1.30 : -1.05;
                if (leg.kneeGroup) {
                  leg.kneeGroup.rotation.x = leg.isFront ? -1.80 : 1.70;
                }
              });
            }
          }
        }
    }

    // 3. LiDAR Scanning Beam Sweep Rotation & Optical Pulse
    if (this.lidarBeam) {
      this.lidarSweepAngle += dt * 3.5;
      this.lidarBeam.rotation.z = Math.sin(this.lidarSweepAngle) * 0.12;
      this.lidarBeam.material.opacity = 0.08 + Math.abs(Math.sin(this.lidarSweepAngle * 2.0)) * 0.08;
    }

    // 4. AI Processor & Sensor LED Activity Blinks
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

    // 5. Emergency Rescue Strobe Flasher Animation along Top Red Pipe Header
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
