// ====================================================================
// Indian Railways Real-World 3D Train Models (WAP-7 & WDP-4D + Coaches)
// Fully articulated multi-car train (every car follows curve independently!)
// Procedural photorealistic canvas textures matching uploaded reference images
// ====================================================================

import * as THREE from 'three';
import { ObstacleCaptureNet } from './captureNet.js';

export class TrainModel {
  constructor(scene) {
    this.scene = scene;
    this.rootGroup = new THREE.Group();
    this.scene.add(this.rootGroup);

    this.trainType = 'electric'; // 'electric' (Image 1) or 'diesel' (Image 2)

    // Articulated train components
    this.locoCar = null;
    this.coachCars = []; // Array of independent coach group objects
    this.rotatingWheels = [];
    this.wipers = [];
    this.radiatorFans = [];

    // Lengths & Offsets (meters)
    this.locoLength = 20.5;
    this.coachLength = 23.5;
    this.couplerGap = 0.8;
    this.coachCount = 6;
    this.wheelRadius = 0.54; // Standard broad gauge wheel

    // Safety Obstacle Capture Net (Front Airbag / Rescue Scoop)
    this.captureNetDeployed = false; // Default CLOSED / STOWED; Auto-opens on AI obstacle detection
    this.captureNet = null;

    // Generate high-fidelity procedural canvas textures
    this.textures = this.createProceduralTextures();

    // Lighting
    this.headlightBeam = null;
    this.headlightState = 'bright';
    this.flasherLamps = [];

    this.buildTrain();
  }

  // ---------------------------------------------------------
  // High-Resolution Procedural Canvas Textures
  // ---------------------------------------------------------
  createProceduralTextures() {
    // 1. WAP-7 Side Livery Texture (2048 x 512 Ultra-HD)
    const canvasW = document.createElement('canvas');
    canvasW.width = 2048;
    canvasW.height = 512;
    const ctxW = canvasW.getContext('2d');

    // Base off-white / light cream metallic body panels
    ctxW.fillStyle = '#f1f5f9';
    ctxW.fillRect(0, 0, 2048, 512);

    // Subtle brushed metallic grain
    ctxW.fillStyle = 'rgba(148, 163, 184, 0.08)';
    for (let y = 0; y < 512; y += 4) {
      ctxW.fillRect(0, y, 2048, 2);
    }

    // Horizontal sheet metal panel seams and rivet rows
    ctxW.strokeStyle = '#cbd5e1';
    ctxW.lineWidth = 2;
    ctxW.beginPath();
    ctxW.moveTo(0, 60); ctxW.lineTo(2048, 60);
    ctxW.moveTo(0, 180); ctxW.lineTo(2048, 180);
    ctxW.moveTo(0, 340); ctxW.lineTo(2048, 340);
    ctxW.stroke();

    // Rivet dots along seams
    ctxW.fillStyle = '#94a3b8';
    for (let x = 20; x < 2048; x += 32) {
      ctxW.fillRect(x, 58, 3, 3);
      ctxW.fillRect(x, 178, 3, 3);
      ctxW.fillRect(x, 338, 3, 3);
    }

    // Authentic Indian Railways Deep Crimson Red / Maroon Waistband
    const gradRed = ctxW.createLinearGradient(0, 180, 0, 340);
    gradRed.addColorStop(0, '#7f1d1d');
    gradRed.addColorStop(0.12, '#991b1b');
    gradRed.addColorStop(0.88, '#991b1b');
    gradRed.addColorStop(1, '#7f1d1d');
    ctxW.fillStyle = gradRed;
    ctxW.fillRect(0, 180, 2048, 160);

    // Twin Golden-Yellow Pinstripes framing the red band
    ctxW.fillStyle = '#facc15';
    ctxW.fillRect(0, 172, 2048, 8);
    ctxW.fillRect(0, 340, 2048, 8);

    // Official Indian Railways Crest (Ashoka Lion / Wheel Roundel in Gold & Navy)
    const crestX = 1024;
    const crestY = 260;
    ctxW.save();
    ctxW.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctxW.shadowBlur = 8;
    ctxW.fillStyle = '#1e3a8a';
    ctxW.beginPath();
    ctxW.arc(crestX, crestY, 44, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.lineWidth = 5;
    ctxW.strokeStyle = '#facc15';
    ctxW.stroke();

    // Chakra Spokes
    ctxW.strokeStyle = '#fde047';
    ctxW.lineWidth = 2;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctxW.beginPath();
      ctxW.moveTo(crestX, crestY);
      ctxW.lineTo(crestX + Math.cos(a) * 36, crestY + Math.sin(a) * 36);
      ctxW.stroke();
    }
    ctxW.fillStyle = '#fde047';
    ctxW.beginPath();
    ctxW.arc(crestX, crestY, 12, 0, Math.PI * 2);
    ctxW.fill();
    ctxW.restore();

    // Bold Serif Typography: INDIAN RAILWAYS  •  भारतीय रेल
    ctxW.save();
    ctxW.shadowColor = 'rgba(0, 0, 0, 0.7)';
    ctxW.shadowBlur = 6;
    ctxW.shadowOffsetY = 2;
    ctxW.fillStyle = '#fef08a';
    ctxW.font = 'bold 36px "Times New Roman", Georgia, serif';
    ctxW.textAlign = 'right';
    ctxW.fillText('INDIAN RAILWAYS', 940, 272);
    ctxW.textAlign = 'left';
    ctxW.fillText('भारतीय रेल', 1108, 272);
    ctxW.restore();

    // Loco Class & Shed Stencils: WAP-7 #30201 GZB (Ghaziabad)
    ctxW.fillStyle = '#0f172a';
    ctxW.font = 'bold 32px "Courier New", monospace';
    ctxW.textAlign = 'left';
    ctxW.fillText('WAP-7 #30201', 120, 130);
    ctxW.font = 'bold 20px sans-serif';
    ctxW.fillStyle = '#475569';
    ctxW.fillText('NORTHERN RAILWAY • GZB SHED • 6350 HP', 120, 160);

    ctxW.textAlign = 'right';
    ctxW.fillStyle = '#0f172a';
    ctxW.font = 'bold 32px "Courier New", monospace';
    ctxW.fillText('WAP-7 #30201', 1928, 130);
    ctxW.font = 'bold 20px sans-serif';
    ctxW.fillStyle = '#475569';
    ctxW.fillText('NORTHERN RAILWAY • GZB SHED • 6350 HP', 1928, 160);

    // 3D Ventilation Louver Grilles (Machinery Cooling Air Intake Slat Array)
    const louverStart = 560;
    const louverEnd = 860;
    const louver2Start = 1188;
    const louver2End = 1488;
    [ [louverStart, louverEnd], [louver2Start, louver2End] ].forEach(([start, end]) => {
      // Dark ventilation chamber cutout
      ctxW.fillStyle = '#0f172a';
      ctxW.fillRect(start - 8, 70, (end - start) + 16, 92);

      // Louver Slats with 3D metallic highlights and shadows
      for (let x = start; x <= end; x += 22) {
        // Metallic slat highlight
        ctxW.fillStyle = '#e2e8f0';
        ctxW.fillRect(x, 72, 4, 88);
        // Slat face
        ctxW.fillStyle = '#94a3b8';
        ctxW.fillRect(x + 4, 72, 8, 88);
        // Drop shadow into cavity
        ctxW.fillStyle = '#1e293b';
        ctxW.fillRect(x + 12, 72, 8, 88);
      }

      // Grille border frame
      ctxW.strokeStyle = '#475569';
      ctxW.lineWidth = 4;
      ctxW.strokeRect(start - 8, 70, (end - start) + 16, 92);
    });

    // Cab Side Access Doors (Recessed Frame, Window with Rubber Gasket & Chrome Handle)
    [240, 1808].forEach(dx => {
      ctxW.strokeStyle = '#64748b';
      ctxW.lineWidth = 4;
      ctxW.strokeRect(dx - 60, 60, 120, 350);

      // Door window
      ctxW.fillStyle = '#0f172a';
      ctxW.fillRect(dx - 36, 90, 72, 80);
      ctxW.strokeStyle = '#334155';
      ctxW.lineWidth = 5;
      ctxW.strokeRect(dx - 36, 90, 72, 80);

      // Glass inner reflection
      ctxW.fillStyle = '#1e293b';
      ctxW.fillRect(dx - 32, 94, 64, 72);
      ctxW.strokeStyle = 'rgba(255, 255, 255, 0.4)';
      ctxW.lineWidth = 2;
      ctxW.beginPath();
      ctxW.moveTo(dx - 28, 160); ctxW.lineTo(dx + 28, 100);
      ctxW.stroke();

      // Chrome Door Lever Handle
      ctxW.fillStyle = '#e2e8f0';
      ctxW.fillRect(dx + 30, 240, 20, 8);
      ctxW.fillStyle = '#475569';
      ctxW.beginPath();
      ctxW.arc(dx + 32, 244, 8, 0, Math.PI * 2);
      ctxW.fill();

      // Danger High Voltage Decal
      ctxW.fillStyle = '#facc15';
      ctxW.beginPath();
      ctxW.moveTo(dx, 310);
      ctxW.lineTo(dx - 18, 336);
      ctxW.lineTo(dx + 18, 336);
      ctxW.closePath();
      ctxW.fill();
      ctxW.fillStyle = '#000';
      ctxW.font = 'bold 16px sans-serif';
      ctxW.textAlign = 'center';
      ctxW.fillText('⚡', dx, 332);
    });

    // Dark Charcoal / Anthracite Lower Underframe Skirt
    const gradSkirt = ctxW.createLinearGradient(0, 410, 0, 512);
    gradSkirt.addColorStop(0, '#334155');
    gradSkirt.addColorStop(1, '#0f172a');
    ctxW.fillStyle = gradSkirt;
    ctxW.fillRect(0, 410, 2048, 102);

    // Battery Box Vents & Inspection Hatches on skirt
    ctxW.fillStyle = '#1e293b';
    for (let x = 380; x < 1668; x += 140) {
      ctxW.fillRect(x, 430, 96, 54);
      ctxW.strokeStyle = '#475569';
      ctxW.lineWidth = 2;
      ctxW.strokeRect(x, 430, 96, 54);
      // Vent slots
      ctxW.fillStyle = '#020617';
      for (let vy = 438; vy <= 476; vy += 8) {
        ctxW.fillRect(x + 12, vy, 72, 4);
      }
      ctxW.fillStyle = '#1e293b';
    }

    // Yellow Jacking Arrow Markers
    ctxW.fillStyle = '#facc15';
    [320, 900, 1148, 1728].forEach(jx => {
      ctxW.beginPath();
      ctxW.moveTo(jx, 416);
      ctxW.lineTo(jx - 12, 432);
      ctxW.lineTo(jx + 12, 432);
      ctxW.closePath();
      ctxW.fill();
    });

    const wap7SideTex = new THREE.CanvasTexture(canvasW);

    // 2. WAP-7 Front Aerodynamic Nose Texture (1024 x 1024 Ultra-HD)
    const canvasWF = document.createElement('canvas');
    canvasWF.width = 1024;
    canvasWF.height = 1024;
    const ctxWF = canvasWF.getContext('2d');

    // Smooth off-white metallic cab face
    ctxWF.fillStyle = '#f8fafc';
    ctxWF.fillRect(0, 0, 1024, 1024);

    // Center Red Waistband Continuation (Curved V-rake chevron)
    const gradFrontRed = ctxWF.createLinearGradient(0, 420, 0, 700);
    gradFrontRed.addColorStop(0, '#7f1d1d');
    gradFrontRed.addColorStop(0.1, '#991b1b');
    gradFrontRed.addColorStop(0.9, '#991b1b');
    gradFrontRed.addColorStop(1, '#7f1d1d');
    ctxWF.fillStyle = gradFrontRed;
    ctxWF.fillRect(0, 420, 1024, 280);

    // Golden accent pinstripes
    ctxWF.fillStyle = '#facc15';
    ctxWF.fillRect(0, 410, 1024, 10);
    ctxWF.fillRect(0, 700, 1024, 10);

    // Center Roundel Crest of Indian Railways
    ctxWF.save();
    ctxWF.shadowColor = 'rgba(0,0,0,0.6)';
    ctxWF.shadowBlur = 12;
    ctxWF.fillStyle = '#1e3a8a';
    ctxWF.beginPath();
    ctxWF.arc(512, 530, 72, 0, Math.PI * 2);
    ctxWF.fill();
    ctxWF.lineWidth = 6;
    ctxWF.strokeStyle = '#facc15';
    ctxWF.stroke();
    // Chakra wheel spokes
    ctxWF.strokeStyle = '#fde047';
    ctxWF.lineWidth = 3;
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      ctxWF.beginPath();
      ctxWF.moveTo(512, 530);
      ctxWF.lineTo(512 + Math.cos(a) * 58, 530 + Math.sin(a) * 58);
      ctxWF.stroke();
    }
    ctxWF.fillStyle = '#facc15';
    ctxWF.beginPath();
    ctxWF.arc(512, 530, 20, 0, Math.PI * 2);
    ctxWF.fill();
    ctxWF.restore();

    // Bold Road Number Plate: 30201 WAP-7
    ctxWF.fillStyle = '#0f172a';
    ctxWF.fillRect(352, 626, 320, 60);
    ctxWF.strokeStyle = '#e2e8f0';
    ctxWF.lineWidth = 4;
    ctxWF.strokeRect(352, 626, 320, 60);
    ctxWF.fillStyle = '#ffffff';
    ctxWF.font = 'bold 36px "Courier New", monospace';
    ctxWF.textAlign = 'center';
    ctxWF.fillText('30201 WAP7', 512, 668);

    // Electrification Warning Decal
    ctxWF.fillStyle = '#facc15';
    ctxWF.beginPath();
    ctxWF.moveTo(512, 730);
    ctxWF.lineTo(476, 786);
    ctxWF.lineTo(548, 786);
    ctxWF.closePath();
    ctxWF.fill();
    ctxWF.strokeStyle = '#dc2626';
    ctxWF.lineWidth = 4;
    ctxWF.stroke();
    ctxWF.fillStyle = '#000000';
    ctxWF.font = 'bold 32px sans-serif';
    ctxWF.textAlign = 'center';
    ctxWF.fillText('⚡', 512, 776);
    ctxWF.fillStyle = '#991b1b';
    ctxWF.font = 'bold 18px sans-serif';
    ctxWF.fillText('25 kV AC • DANGER • सावधान', 512, 814);

    // Lower Buffer Beam Hazard Stripes (Yellow & Black diagonal warning chevrons)
    ctxWF.fillStyle = '#1e293b';
    ctxWF.fillRect(0, 840, 1024, 184);
    ctxWF.fillStyle = '#facc15';
    for (let hx = -200; hx < 1200; hx += 80) {
      ctxWF.beginPath();
      ctxWF.moveTo(hx, 840);
      ctxWF.lineTo(hx + 40, 840);
      ctxWF.lineTo(hx - 20, 1024);
      ctxWF.lineTo(hx - 60, 1024);
      ctxWF.closePath();
      ctxWF.fill();
    }

    const wap7FrontTex = new THREE.CanvasTexture(canvasWF);

    // 3. Diesel WDP-4D Chevron Nose Texture (Image 2)
    const canvasD = document.createElement('canvas');
    canvasD.width = 512;
    canvasD.height = 512;
    const ctxD = canvasD.getContext('2d');
    ctxD.fillStyle = '#b91c1c'; // Red body
    ctxD.fillRect(0, 0, 512, 512);

    // Bold Golden Yellow Chevrons (>>>)
    ctxD.fillStyle = '#facc15';
    for (let y = 140; y <= 380; y += 70) {
      ctxD.beginPath();
      ctxD.moveTo(256, y + 40);
      ctxD.lineTo(80, y - 40);
      ctxD.lineTo(130, y - 40);
      ctxD.lineTo(256, y + 10);
      ctxD.lineTo(382, y - 40);
      ctxD.lineTo(432, y - 40);
      ctxD.closePath();
      ctxD.fill();
    }

    const dieselFrontTex = new THREE.CanvasTexture(canvasD);

    // 4. LHB Red/Silver Coach Side Texture (2048 x 512 Ultra-HD)
    const canvasL = document.createElement('canvas');
    canvasL.width = 2048;
    canvasL.height = 512;
    const ctxL = canvasL.getContext('2d');

    // Silver stainless steel brushed metal body
    ctxL.fillStyle = '#e2e8f0';
    ctxL.fillRect(0, 0, 2048, 512);

    // Fine horizontal stainless steel corrugation ribs
    ctxL.fillStyle = 'rgba(100, 116, 139, 0.12)';
    for (let y = 0; y < 150; y += 8) {
      ctxL.fillRect(0, y, 2048, 3);
    }

    // Rajdhani Crimson Red Waistband
    const gradLhbRed = ctxL.createLinearGradient(0, 150, 0, 370);
    gradLhbRed.addColorStop(0, '#7f1d1d');
    gradLhbRed.addColorStop(0.1, '#991b1b');
    gradLhbRed.addColorStop(0.9, '#991b1b');
    gradLhbRed.addColorStop(1, '#7f1d1d');
    ctxL.fillStyle = gradLhbRed;
    ctxL.fillRect(0, 150, 2048, 220);

    // White accent edge pinstripes
    ctxL.fillStyle = '#ffffff';
    ctxL.fillRect(0, 144, 2048, 6);
    ctxL.fillRect(0, 370, 2048, 6);

    // Authentic Tinted Panoramic Double-Glazed Windows (12 Bays)
    for (let i = 0; i < 12; i++) {
      const wx = 120 + i * 152;
      // Black extruded rubber window gasket
      ctxL.fillStyle = '#0f172a';
      ctxL.fillRect(wx - 4, 180, 116, 148);

      // Deep tinted glass
      ctxL.fillStyle = '#1e293b';
      ctxL.fillRect(wx, 184, 108, 140);

      // Soft warm interior glow & curtain fold
      ctxL.fillStyle = 'rgba(254, 240, 138, 0.20)';
      ctxL.fillRect(wx + 8, 184, 92, 140);

      // Curtain silhouette on side
      ctxL.fillStyle = 'rgba(203, 213, 225, 0.45)';
      ctxL.fillRect(wx, 184, 22, 140);

      // Diagonal sunlight glass reflection glint
      ctxL.strokeStyle = 'rgba(255, 255, 255, 0.35)';
      ctxL.lineWidth = 3;
      ctxL.beginPath();
      ctxL.moveTo(wx + 10, 314);
      ctxL.lineTo(wx + 90, 194);
      ctxL.stroke();
    }

    // Coach Class & Rajdhani Stencils
    ctxL.fillStyle = '#fef08a';
    ctxL.font = 'bold 22px sans-serif';
    ctxL.textAlign = 'left';
    ctxL.fillText('RAJDHANI EXPRESS • 12301', 120, 135);
    ctxL.textAlign = 'right';
    ctxL.fillText('AC 3-TIER • B-4 • 08123/C', 1928, 135);

    // Lower Dark Charcoal Skirt
    const gradLhbSkirt = ctxL.createLinearGradient(0, 420, 0, 512);
    gradLhbSkirt.addColorStop(0, '#334155');
    gradLhbSkirt.addColorStop(1, '#0f172a');
    ctxL.fillStyle = gradLhbSkirt;
    ctxL.fillRect(0, 420, 2048, 92);

    // AC Condenser vents on skirt
    ctxL.fillStyle = '#1e293b';
    for (let x = 240; x < 1848; x += 220) {
      ctxL.fillRect(x, 436, 130, 46);
      ctxL.strokeStyle = '#475569';
      ctxL.lineWidth = 2;
      ctxL.strokeRect(x, 436, 130, 46);
    }

    const lhbSideTex = new THREE.CanvasTexture(canvasL);

    // 5. ICF Blue Coach Side Texture (Image 2)
    const canvasI = document.createElement('canvas');
    canvasI.width = 1024;
    canvasI.height = 256;
    const ctxI = canvasI.getContext('2d');

    // Midnight Navy Blue
    ctxI.fillStyle = '#1e3a8a';
    ctxI.fillRect(0, 0, 1024, 256);

    // Sky-Blue Twin Cheatline
    ctxI.fillStyle = '#38bdf8';
    ctxI.fillRect(0, 55, 1024, 12);
    ctxI.fillRect(0, 185, 1024, 12);

    // Windows with security bars
    ctxI.fillStyle = '#0a101d';
    for (let i = 0; i < 12; i++) {
      const wx = 65 + i * 75;
      ctxI.fillRect(wx, 80, 52, 85);
      // Window bars
      ctxI.strokeStyle = '#64748b';
      ctxI.lineWidth = 2;
      for (let bx = wx + 10; bx < wx + 50; bx += 10) {
        ctxI.beginPath();
        ctxI.moveTo(bx, 80);
        ctxI.lineTo(bx, 165);
        ctxI.stroke();
      }
    }

    const icfSideTex = new THREE.CanvasTexture(canvasI);

    return {
      wap7SideTex,
      wap7FrontTex,
      dieselFrontTex,
      lhbSideTex,
      icfSideTex
    };
  }

  // ---------------------------------------------------------
  // Build Full Articulated Train Rake
  // ---------------------------------------------------------
  buildTrain() {
    // Clear existing meshes
    while (this.rootGroup.children.length > 0) {
      this.rootGroup.remove(this.rootGroup.children[0]);
    }
    this.coachCars = [];
    this.rotatingWheels = [];
    this.wipers = [];
    this.radiatorFans = [];
    this.flasherLamps = [];

    // 1. Build Locomotive Car Group (Independent Top-Level Group)
    this.locoCar = new THREE.Group();
    if (this.trainType === 'electric') {
      this.buildWAP7Locomotive(this.locoCar);
    } else {
      this.buildDieselLocomotive(this.locoCar);
    }
    this.rootGroup.add(this.locoCar);

    // 2. Build Independent Coach Car Groups
    for (let i = 0; i < this.coachCount; i++) {
      const coachCar = new THREE.Group();
      if (this.trainType === 'electric') {
        this.buildLhbCoach(coachCar, i === this.coachCount - 1);
      } else {
        this.buildIcfCoach(coachCar, i === this.coachCount - 1);
      }
      this.rootGroup.add(coachCar);
      this.coachCars.push(coachCar);
    }
  }

  // ---------------------------------------------------------
  // WAP-7 High-Speed Electric Locomotive (High-Fidelity Model)
  // ---------------------------------------------------------
  buildWAP7Locomotive(group) {
    const length = this.locoLength; // 20.5m
    const width = 3.15;
    const height = 2.70;
    const centerLen = 15.5; // Central machinery compartment
    const cabLen = (length - centerLen) / 2; // 2.5m per aerodynamic cab

    const materials = {
      side: new THREE.MeshStandardMaterial({ map: this.textures.wap7SideTex, roughness: 0.28, metalness: 0.35 }),
      front: new THREE.MeshStandardMaterial({ map: this.textures.wap7FrontTex, roughness: 0.28, metalness: 0.35 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.38, metalness: 0.55 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.8 }),
      chrome: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.1, metalness: 0.95 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x0f172a, roughness: 0.05, metalness: 0.1, transmission: 0.7, thickness: 0.2 }),
      cowcatcher: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4, metalness: 0.3 }),
      hazard: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.4, metalness: 0.2 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.2, metalness: 0.9 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.25, metalness: 0.85 }),
      insulator: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.25, metalness: 0.1 }),
      rubber: new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    };

    // 1. Central Machinery Compartment (15.5m long)
    const cubeMats = [
      materials.side,     // +X (Right side livery)
      materials.side,     // -X (Left side livery)
      materials.roof,     // +Y (Roof)
      materials.darkSteel,// -Y (Underframe)
      materials.front,    // +Z (Internal bulkhead)
      materials.front     // -Z (Internal bulkhead)
    ];

    const bodyCenter = new THREE.Mesh(new THREE.BoxGeometry(width, height, centerLen), cubeMats);
    bodyCenter.position.set(0, 2.05, 0);
    bodyCenter.castShadow = true;
    bodyCenter.receiveShadow = true;
    group.add(bodyCenter);

    // Arched Machinery Roof
    const roofCurve = new THREE.CylinderGeometry(width / 2, width / 2, centerLen, 24, 1, false, 0, Math.PI);
    roofCurve.rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    const roofCenterMesh = new THREE.Mesh(roofCurve, materials.roof);
    roofCenterMesh.position.set(0, 3.40, 0);
    roofCenterMesh.scale.set(1, 0.38, 1);
    group.add(roofCenterMesh);

    // Dynamic Braking Resistor Cooling Louver Hoods on roof
    [-3.8, -1.2, 1.2, 3.8].forEach(rz => {
      const hood = new THREE.Mesh(new THREE.BoxGeometry(1.6, 0.22, 1.8), materials.darkSteel);
      hood.position.set(0, 3.65, rz);
      hood.castShadow = true;
      group.add(hood);

      const ventMesh = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.04, 1.5), materials.darkSteel);
      ventMesh.position.set(0, 3.77, rz);
      group.add(ventMesh);
    });

    // 2. Aerodynamic Cabs: Front (+Z) and Rear (-Z)
    [1, -1].forEach(dir => {
      const isFront = dir > 0;
      const cabGroup = new THREE.Group();
      cabGroup.position.set(0, 0, dir * (centerLen / 2));
      cabGroup.scale.set(1, 1, dir); // Mirrored along Z

      // Tapered Aerodynamic Cab Shell (slopes backward at 8.5 degrees)
      const cabBody = new THREE.Mesh(new THREE.BoxGeometry(width, height, cabLen), [
        materials.side, materials.side, materials.roof, materials.darkSteel, materials.front, materials.darkSteel
      ]);
      cabBody.position.set(0, 2.05, cabLen / 2);
      cabBody.castShadow = true;
      cabGroup.add(cabBody);

      // Curved Cab Roof
      const cabRoof = new THREE.Mesh(
        new THREE.CylinderGeometry(width / 2, width / 2 * 0.94, cabLen, 20, 1, false, 0, Math.PI).rotateZ(Math.PI / 2).rotateY(Math.PI / 2),
        materials.roof
      );
      cabRoof.position.set(0, 3.40, cabLen / 2);
      cabRoof.scale.set(1, 0.38, 1);
      cabGroup.add(cabRoof);

      // Front Sloped Nose Face (Raked backward aerodynamic wedge)
      const noseWedge = new THREE.Mesh(
        new THREE.ConeGeometry(width / 2, 0.9, 4).rotateY(Math.PI / 4).scale(1.0, 1.0, 0.5),
        materials.front
      );
      noseWedge.position.set(0, 2.50, cabLen + 0.12);
      cabGroup.add(noseWedge);

      // Dual Angled Front Windshields with Black Extruded Rubber Beading
      [-0.68, 0.68].forEach(wx => {
        // Outer black rubber gasket frame
        const frame = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.82, 0.06), materials.rubber);
        frame.position.set(wx, 2.58, cabLen + 0.02);
        frame.rotation.x = -0.14; // Sleek 8-degree rake
        cabGroup.add(frame);

        // Tinted safety glass pane
        const glassPane = new THREE.Mesh(new THREE.PlaneGeometry(0.96, 0.70), materials.glass);
        glassPane.position.set(wx, 2.58, cabLen + 0.05);
        glassPane.rotation.x = -0.14;
        cabGroup.add(glassPane);

        // Sun Visor / Brow Awning
        const visor = new THREE.Mesh(new THREE.BoxGeometry(1.08, 0.06, 0.18), materials.darkSteel);
        visor.position.set(wx, 3.02, cabLen + 0.10);
        cabGroup.add(visor);

        // Windshield Wiper Blade & Arm
        const wiperPivot = new THREE.Group();
        wiperPivot.position.set(wx, 2.22, cabLen + 0.06);
        const wiperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.45), materials.darkSteel);
        wiperArm.position.set(0.08, 0.22, 0);
        wiperArm.rotation.z = -0.35;
        wiperPivot.add(wiperArm);
        const wiperBlade = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.44, 0.015), materials.rubber);
        wiperBlade.position.set(0.16, 0.24, 0.02);
        wiperBlade.rotation.z = -0.35;
        wiperPivot.add(wiperBlade);
        cabGroup.add(wiperPivot);
      });

      // Twin-Beam High-Intensity Headlight Cluster (WAP-7 Center Nose Nacelle)
      const hlNacelle = new THREE.Mesh(new THREE.BoxGeometry(0.72, 0.32, 0.28), materials.darkSteel);
      hlNacelle.position.set(0, 3.28, cabLen + 0.12);
      hlNacelle.castShadow = true;
      cabGroup.add(hlNacelle);

      // Dual Chrome Reflector Cups & Glowing Inner Bulbs
      [-0.18, 0.18].forEach(hx => {
        const bezel = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.06, 20).rotateX(Math.PI / 2), materials.chrome);
        bezel.position.set(hx, 3.28, cabLen + 0.26);
        cabGroup.add(bezel);

        const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.085, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff }));
        bulb.position.set(hx, 3.28, cabLen + 0.28);
        cabGroup.add(bulb);
      });

      // Center Amber Flasher Light (Safety Beacon above Headlights)
      const flasherMat = new THREE.MeshBasicMaterial({ color: 0xf59e0b });
      const flasher = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.055, 0.05, 14).rotateX(Math.PI / 2), flasherMat);
      flasher.position.set(0, 3.48, cabLen + 0.22);
      cabGroup.add(flasher);
      this.flasherLamps.push(flasherMat);

      // Modern Indian Railways WAP-7 Roof-Mounted Cab Air Conditioner Unit
      const acUnit = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.28, 1.8), new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.35, metalness: 0.3 }));
      acUnit.position.set(0, 3.82, cabLen * 0.45);
      acUnit.castShadow = true;
      cabGroup.add(acUnit);

      // Dual Condenser Fan Exhaust Grilles on AC unit
      [-0.45, 0.45].forEach(fz => {
        const fanBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.04, 16), materials.darkSteel);
        fanBezel.position.set(0, 3.97, cabLen * 0.45 + fz);
        cabGroup.add(fanBezel);
        const fanBlades = new THREE.Mesh(new THREE.CircleGeometry(0.21, 8).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x0f172a }));
        fanBlades.position.set(0, 3.99, cabLen * 0.45 + fz);
        cabGroup.add(fanBlades);
      });

      // RTIS Satellite Antenna Dome
      const rtisDome = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.18, 0.08, 16), new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 }));
      rtisDome.position.set(-0.65, 3.82, cabLen * 0.15);
      cabGroup.add(rtisDome);

      // Wireless Radio Blade Antenna
      const bladeAnt = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.22, 0.12), materials.darkSteel);
      bladeAnt.position.set(0.65, 3.86, cabLen * 0.15);
      cabGroup.add(bladeAnt);

      // Stainless Steel Cab Corner Handrails (Vertical grab irons)
      [-1.54, 1.54].forEach(hx => {
        const rail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 1.6), materials.chrome);
        rail.position.set(hx, 1.85, cabLen - 0.1);
        cabGroup.add(rail);

        // Lower Shunter Footboard / Step at buffer beam corner
        const step = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.04, 0.28), materials.darkSteel);
        step.position.set(hx, 0.52, cabLen + 0.15);
        cabGroup.add(step);
      });

      // Twin Red Tail / Marker Lights (Lower Corners)
      [-1.15, 1.15].forEach(mx => {
        const markerBezel = new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.04, 14).rotateX(Math.PI / 2), materials.darkSteel);
        markerBezel.position.set(mx, 1.25, cabLen + 0.05);
        cabGroup.add(markerBezel);

        const markerLens = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), new THREE.MeshBasicMaterial({ color: isFront ? 0xffffff : 0xef4444 }));
        markerLens.position.set(mx, 1.25, cabLen + 0.07);
        cabGroup.add(markerLens);
      });

      // Roof Pneumatic Dual Horn Trumpets
      const hornGroup = new THREE.Group();
      hornGroup.position.set(0, 3.72, cabLen - 0.4);
      [-0.14, 0.14].forEach(hx => {
        const hornStem = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.03, 0.38).rotateX(Math.PI / 2), materials.brass);
        hornStem.position.set(hx, 0, 0.18);
        hornGroup.add(hornStem);
        const hornBell = new THREE.Mesh(new THREE.ConeGeometry(0.08, 0.16, 16).rotateX(Math.PI / 2), materials.brass);
        hornBell.position.set(hx, 0, 0.38);
        hornGroup.add(hornBell);
      });
      cabGroup.add(hornGroup);

      // Heavy Transverse Buffer Beam Girder (Pilot Beam)
      const bufferBeam = new THREE.Mesh(new THREE.BoxGeometry(3.18, 0.44, 0.36), materials.darkSteel);
      bufferBeam.position.set(0, 0.95, cabLen + 0.18);
      bufferBeam.castShadow = true;
      cabGroup.add(bufferBeam);

      // Dual Sprung Buffer Plungers & Round Buffer Heads
      [-0.95, 0.95].forEach(bx => {
        const plunger = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.34, 16).rotateX(Math.PI / 2), materials.darkSteel);
        plunger.position.set(bx, 0.95, cabLen + 0.48);
        cabGroup.add(plunger);

        const head = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, 0.06, 20).rotateX(Math.PI / 2), materials.darkSteel);
        head.position.set(bx, 0.95, cabLen + 0.66);
        cabGroup.add(head);
      });

      // Center AAR Knuckle Coupler & Screw Coupling Hook
      const couplerStem = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.24, 0.65), materials.darkSteel);
      couplerStem.position.set(0, 0.88, cabLen + 0.48);
      cabGroup.add(couplerStem);
      const couplerKnuckle = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.28, 0.22), materials.darkSteel);
      couplerKnuckle.position.set(0.04, 0.88, cabLen + 0.80);
      cabGroup.add(couplerKnuckle);

      // Twin Flexible Brake Air Hoses (Red Feed & Green Brake Pipe)
      [-0.32, 0.32].forEach((hx, hidx) => {
        const hoseColor = hidx === 0 ? 0xdc2626 : 0x16a34a;
        const hosePts = [
          new THREE.Vector3(hx, 0.95, cabLen + 0.35),
          new THREE.Vector3(hx * 1.1, 0.65, cabLen + 0.50),
          new THREE.Vector3(hx * 0.7, 0.45, cabLen + 0.45)
        ];
        const hoseCurve = new THREE.CatmullRomCurve3(hosePts);
        const hoseMesh = new THREE.Mesh(
          new THREE.TubeGeometry(hoseCurve, 12, 0.024, 8, false),
          new THREE.MeshStandardMaterial({ color: hoseColor, roughness: 0.6 })
        );
        cabGroup.add(hoseMesh);
      });

      // Rugged Aerodynamic Cattle Guard / Cowcatcher Plow
      const plow = new THREE.Mesh(
        new THREE.ConeGeometry(1.55, 0.68, 4).rotateY(Math.PI / 4).scale(1.15, 0.65, 0.85),
        materials.cowcatcher
      );
      plow.position.set(0, 0.48, cabLen + 0.38);
      plow.castShadow = true;
      cabGroup.add(plow);

      // Horizontal deflection slats on cowcatcher
      [-0.12, 0.0, 0.12].forEach(sy => {
        const slat = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.04, 0.12), materials.darkSteel);
        slat.position.set(0, 0.48 + sy, cabLen + 0.52 - Math.abs(sy) * 0.2);
        cabGroup.add(slat);
      });

      group.add(cabGroup);
    });

    // 3. Functional 3D Headlight SpotLight (Front Nose)
    this.headlightBeam = new THREE.SpotLight(0xfffaed, 8.5, 175, Math.PI / 6.5, 0.35, 1.2);
    this.headlightBeam.position.set(0, 3.28, length / 2 + 0.4);
    this.headlightBeam.target.position.set(0, 0.5, length / 2 + 85);
    this.headlightBeam.castShadow = true;
    group.add(this.headlightBeam);
    group.add(this.headlightBeam.target);

    // 4. Heavy Underframe Equipment (Traction Transformer & Air Reservoirs between bogies)
    const underframeGroup = new THREE.Group();
    underframeGroup.position.set(0, 0.72, 0);

    // Main 25kV Traction Transformer Casing with Cooling Radiator Fins
    const transformerBox = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.95, 4.2), materials.darkSteel);
    transformerBox.castShadow = true;
    underframeGroup.add(transformerBox);

    // Cooling oil tubes on transformer
    for (let fz = -1.8; fz <= 1.8; fz += 0.4) {
      [-1.38, 1.38].forEach(fx => {
        const finTube = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.85, 8), materials.darkSteel);
        finTube.position.set(fx, 0, fz);
        underframeGroup.add(finTube);
      });
    }

    // Dual Main Compressed Air Reservoirs (Long Cylindrical Tanks)
    [-1.05, 1.05].forEach(tx => {
      const tank = new THREE.Mesh(
        new THREE.CylinderGeometry(0.24, 0.24, 3.8, 18).rotateX(Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.4, metalness: 0.6 })
      );
      tank.position.set(tx, -0.15, 0);
      tank.castShadow = true;
      underframeGroup.add(tank);

      // Tank mounting brackets
      [-1.5, 0, 1.5].forEach(tz => {
        const tBracket = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.4, 0.1), materials.darkSteel);
        tBracket.position.set(tx, 0.08, tz);
        underframeGroup.add(tBracket);
      });
    });

    group.add(underframeGroup);

    // 5. Roof High-Voltage 25kV Equipment & Pantographs
    this.buildPantograph(group, materials, -length * 0.32, true);  // Raised rear pantograph (25kV OHE)
    this.buildPantograph(group, materials, length * 0.32, false);  // Lowered front pantograph

    // High-Voltage Copper Busbar Conduits running along roof
    const busbarPts = [
      new THREE.Vector3(0.35, 3.82, -length * 0.32),
      new THREE.Vector3(0.35, 3.85, 0),
      new THREE.Vector3(0.35, 3.82, length * 0.32)
    ];
    const busbarGeo = new THREE.TubeGeometry(new THREE.CatmullRomCurve3(busbarPts), 24, 0.022, 8, false);
    const busbarMesh = new THREE.Mesh(busbarGeo, materials.copper);
    group.add(busbarMesh);

    // Ribbed Ceramic Roof Insulators (Conical Sheds) supporting busbar
    [-4.5, -2.0, 0, 2.0, 4.5].forEach(iz => {
      const insGroup = new THREE.Group();
      insGroup.position.set(0.35, 3.65, iz);
      for (let s = 0; s < 3; s++) {
        const shed = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.12, 0.06, 12), materials.insulator);
        shed.position.y = s * 0.06;
        insGroup.add(shed);
      }
      group.add(insGroup);
    });

    // Vacuum Circuit Breaker (VCB) Box & Surge Arrester
    const vcb = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.35, 0.72), materials.darkSteel);
    vcb.position.set(-0.45, 3.75, 0.8);
    group.add(vcb);

    // 6. Two Co-Co 3-Axle Broad Gauge Bogies (Exact rail alignment)
    this.buildCoCoBogie(group, length * 0.28);
    this.buildCoCoBogie(group, -length * 0.28);

    // 7. Front Obstacle Capture Net & Safety Airbag Scoop (Dedicated Module: js/captureNet.js)
    this.captureNet = new ObstacleCaptureNet(group, length, this.captureNetDeployed);
  }

  // ---------------------------------------------------------
  // Pantograph Mechanism
  // ---------------------------------------------------------
  buildPantograph(parent, mats, zPos, isRaised = true) {
    const panto = new THREE.Group();
    panto.position.set(0, 3.75, zPos);

    // 4 Corner Insulators
    [-0.5, 0.5].forEach(x => {
      [-0.4, 0.4].forEach(z => {
        const ins = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.22, 8), mats.insulator);
        ins.position.set(x, 0.1, z);
        panto.add(ins);
      });
    });

    // Articulated Lower Arm
    const lowerArm = new THREE.Group();
    lowerArm.position.set(0, 0.25, -0.2);
    const arm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3), mats.darkSteel);
    arm1.position.set(0, 0.6, 0);
    lowerArm.add(arm1);

    // Upper Arm
    const upperArm = new THREE.Group();
    upperArm.position.set(0, 1.2, 0);
    const arm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), mats.darkSteel);
    arm2.position.set(0, 0.55, 0);
    upperArm.add(arm2);

    // Copper Collector Head (Touches OHE at ~5.4m)
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), mats.copper);
    head.position.set(0, 1.15, 0);
    upperArm.add(head);

    lowerArm.add(upperArm);
    panto.add(lowerArm);

    if (isRaised) {
      lowerArm.rotation.x = 0.65;
      upperArm.rotation.x = -1.15;
    } else {
      lowerArm.rotation.x = 0.12;
      upperArm.rotation.x = -0.2;
    }

    parent.add(panto);
  }

  // ---------------------------------------------------------
  // Co-Co 3-Axle Broad Gauge Bogie (High-Fidelity Cast Steel)
  // ---------------------------------------------------------
  buildCoCoBogie(parent, zCenter) {
    const bogie = new THREE.Group();
    bogie.position.set(0, 0, zCenter);

    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.8 });
    const castSteel = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.6, metalness: 0.7 });
    const wheelSteel = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.15, metalness: 0.95 });
    const springMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4, metalness: 0.8 });

    // Bogie Main Side Frames (Heavy Fabricated Steel Beams with Curved Weight-Relief Cutouts)
    [-1.18, 1.18].forEach(x => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.38, 4.6), castSteel);
      beam.position.set(x, 0.68, 0);
      beam.castShadow = true;
      bogie.add(beam);

      // Transverse bolster cross-members
      [0, -1.6, 1.6].forEach(cz => {
        const trans = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.28, 0.35), darkSteel);
        trans.position.set(x * 0.85, 0.68, cz);
        bogie.add(trans);
      });
    });

    // 3 Axles sitting precisely on top of the rails (Broad Gauge: 1676mm -> railX = 0.838m)
    const axleSpacing = [-1.6, 0.0, 1.6];
    const railX = 0.838;

    axleSpacing.forEach(z => {
      const axleGroup = new THREE.Group();
      axleGroup.position.set(0, this.wheelRadius, z);

      // Solid Steel Axle Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.085, 0.085, 1.95, 16).rotateZ(Math.PI / 2), darkSteel);
      shaft.castShadow = true;
      axleGroup.add(shaft);

      // Pair of Precision Steel Wheels exactly on the rail heads (x = ±0.838m)
      [-railX, railX].forEach(x => {
        // High-reflectivity polished steel tire tread rim
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.13, 24).rotateZ(Math.PI / 2), wheelSteel);
        wheel.position.x = x;
        wheel.castShadow = true;

        // Inner Wheel Webbing Hub
        const hub = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius * 0.72, this.wheelRadius * 0.72, 0.135, 18).rotateZ(Math.PI / 2), castSteel);
        wheel.add(hub);

        // Flange ring (inner wheel edge)
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius + 0.038, this.wheelRadius + 0.038, 0.032, 24).rotateZ(Math.PI / 2), wheelSteel);
        flange.position.x = x > 0 ? -0.075 : 0.075;
        wheel.add(flange);

        axleGroup.add(wheel);

        // Axle Journal Box & Dual Helical Suspension Coil Springs (Static on bogie frame)
        const jbX = x > 0 ? 1.18 : -1.18;
        const jBox = new THREE.Mesh(new THREE.BoxGeometry(0.22, 0.24, 0.26), darkSteel);
        jBox.position.set(jbX, this.wheelRadius, z);
        bogie.add(jBox);

        // Axle end cap
        const endCap = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.05, 12).rotateZ(Math.PI / 2), wheelSteel);
        endCap.position.set(jbX + (x > 0 ? 0.12 : -0.12), this.wheelRadius, z);
        bogie.add(endCap);

        // Dual Coil Springs per axle box
        [-0.10, 0.10].forEach(sz => {
          const spring = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.26, 10), springMat);
          spring.position.set(jbX, this.wheelRadius + 0.24, z + sz);
          bogie.add(spring);
        });

        // Brake Caliper & Brake Block clamping near wheel
        const brakeBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.16, 0.08), darkSteel);
        brakeBlock.position.set(x, this.wheelRadius, z + 0.38);
        bogie.add(brakeBlock);

        // Wheel Sanding Pipe & Nozzle (aimed at rail contact point)
        const sandPipe = new THREE.Mesh(new THREE.CylinderGeometry(0.016, 0.016, 0.40).rotateX(x > 0 ? 0.35 : -0.35), darkSteel);
        sandPipe.position.set(x * 0.95, this.wheelRadius - 0.18, z + (x > 0 ? 0.52 : -0.52));
        bogie.add(sandPipe);
      });

      bogie.add(axleGroup);
      this.rotatingWheels.push(axleGroup);
    });

    parent.add(bogie);
  }

  // ---------------------------------------------------------
  // WDP-4D / WDM-3D Diesel Locomotive (Image 2)
  // ---------------------------------------------------------
  buildDieselLocomotive(group) {
    const length = this.locoLength;
    const width = 3.15;
    const height = 3.0;

    const materials = {
      side: new THREE.MeshStandardMaterial({ map: this.textures.wap7SideTex, roughness: 0.35 }),
      front: new THREE.MeshStandardMaterial({ map: this.textures.dieselFrontTex, roughness: 0.35 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.4 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.7 }),
      cowcatcher: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 })
    };

    const cubeMats = [
      materials.roof, materials.roof, materials.roof, materials.darkSteel, materials.front, materials.front
    ];

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), cubeMats);
    body.position.y = 1.9;
    body.castShadow = true;
    group.add(body);

    // High Headlights
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(0, 3.1, length / 2 + 0.05);
    group.add(hl);

    this.headlightBeam = new THREE.SpotLight(0xfffaed, 7.5, 150, Math.PI / 7, 0.4, 1.2);
    this.headlightBeam.position.set(0, 3.1, length / 2 + 0.5);
    this.headlightBeam.target.position.set(0, 0, length / 2 + 80);
    this.headlightBeam.castShadow = true;
    group.add(this.headlightBeam);
    group.add(this.headlightBeam.target);

    // Cowcatcher
    const plow = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.65, 4).rotateY(Math.PI / 4).scale(1.1, 0.6, 0.8), materials.cowcatcher);
    plow.position.set(0, 0.48, length / 2 + 0.3);
    group.add(plow);

    // Bogies
    this.buildCoCoBogie(group, length * 0.28);
    this.buildCoCoBogie(group, -length * 0.28);

    // Front Obstacle Capture Net & Safety Airbag Scoop (Dedicated Module: js/captureNet.js)
    this.captureNet = new ObstacleCaptureNet(group, length, this.captureNetDeployed);
  }

  // ---------------------------------------------------------
  // LHB Red/Silver Coaches (Image 1 - Rajdhani Express)
  // ---------------------------------------------------------
  buildLhbCoach(group, isRear = false) {
    const length = this.coachLength;
    const width = 3.24;
    const height = 2.75;

    const materials = {
      side: new THREE.MeshStandardMaterial({ map: this.textures.lhbSideTex, roughness: 0.3, metalness: 0.4 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4, metalness: 0.6 }),
      ends: new THREE.MeshStandardMaterial({ color: 0xb91c1c, roughness: 0.4 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.7 })
    };

    const cubeMats = [
      materials.side, materials.side, materials.roof, materials.darkSteel, materials.ends, materials.ends
    ];

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), cubeMats);
    body.position.y = 1.95;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // Corrugated Silver Roof
    const roofCyl = new THREE.CylinderGeometry(width / 2, width / 2, length, 16, 1, false, 0, Math.PI);
    roofCyl.rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    const roof = new THREE.Mesh(roofCyl, materials.roof);
    roof.position.y = 3.32;
    roof.scale.set(1, 0.38, 1);
    group.add(roof);

    // Vestibule Gangway Rubber Bellows (at both car ends)
    [-length / 2, length / 2].forEach(z => {
      const bellow = new THREE.Mesh(new THREE.BoxGeometry(1.6, 2.2, 0.45), materials.darkSteel);
      bellow.position.set(0, 1.9, z);
      group.add(bellow);
    });

    // 2 FIAT Bogies
    this.buildFiatBogie(group, length * 0.35);
    this.buildFiatBogie(group, -length * 0.35);
  }

  // ---------------------------------------------------------
  // ICF Blue Coaches (Image 2)
  // ---------------------------------------------------------
  buildIcfCoach(group, isRear = false) {
    const length = this.coachLength;
    const width = 3.24;
    const height = 2.7;

    const materials = {
      side: new THREE.MeshStandardMaterial({ map: this.textures.icfSideTex, roughness: 0.35 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4 }),
      ends: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.4 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.7 })
    };

    const cubeMats = [
      materials.side, materials.side, materials.roof, materials.darkSteel, materials.ends, materials.ends
    ];

    const body = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), cubeMats);
    body.position.y = 1.9;
    body.castShadow = true;
    group.add(body);

    // 2 Bogies
    this.buildFiatBogie(group, length * 0.35);
    this.buildFiatBogie(group, -length * 0.35);
  }

  // ---------------------------------------------------------
  // 2-Axle FIAT / ICF Passenger Bogie
  // ---------------------------------------------------------
  buildFiatBogie(parent, zCenter) {
    const bogie = new THREE.Group();
    bogie.position.set(0, 0, zCenter);

    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.8 });
    const wheelSteel = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.2, metalness: 0.9 });

    [-1.15, 1.15].forEach(x => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.28, 3.2), darkSteel);
      beam.position.set(x, 0.62, 0);
      bogie.add(beam);
    });

    const railX = 0.838;
    [-1.25, 1.25].forEach(z => {
      const axle = new THREE.Group();
      axle.position.set(0, this.wheelRadius, z);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9).rotateZ(Math.PI / 2), darkSteel);
      axle.add(shaft);

      [-railX, railX].forEach(x => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.12, 18).rotateZ(Math.PI / 2), wheelSteel);
        wheel.position.x = x;
        axle.add(wheel);
      });

      bogie.add(axle);
      this.rotatingWheels.push(axle);
    });

    parent.add(bogie);
  }

  // ---------------------------------------------------------
  // Switch Locomotive Model
  // ---------------------------------------------------------
  setTrainType(type) {
    if (this.trainType === type) return;
    this.trainType = type;
    this.buildTrain();
  }

  // ---------------------------------------------------------
  // Update Wheel Rotations, Sensor LEDs & Dynamic Effects
  // ---------------------------------------------------------
  update(dt, speedMs, isTargetDetected = false) {
    const wheelAngularSpeed = speedMs / this.wheelRadius;
    const deltaAngle = wheelAngularSpeed * dt;
    this.rotatingWheels.forEach(w => {
      w.rotation.x += deltaAngle;
    });

    // Pulse Amber Cab Flasher Lamps
    const pulse = 0.5 + 0.5 * Math.sin(performance.now() * 0.008);
    const flasherColor = pulse > 0.45 ? 0xf59e0b : 0x78350f;
    this.flasherLamps.forEach(m => m.color.setHex(flasherColor));

    // Update Capture Net rapid inflation animation, aero-elastic fabric physics & active sensor suite
    if (this.captureNet) {
      this.captureNet.update(dt, isTargetDetected, speedMs);
    }
  }

  // ---------------------------------------------------------
  // Toggle Front Capture Net Deployment (Controlled via js/captureNet.js)
  // ---------------------------------------------------------
  toggleCaptureNet(audio = null) {
    if (this.captureNet) {
      this.captureNetDeployed = this.captureNet.toggle(audio);
    } else {
      this.captureNetDeployed = !this.captureNetDeployed;
    }
    return this.captureNetDeployed;
  }

  get captureNetGroup() {
    return this.captureNet ? this.captureNet.group : null;
  }

  cycleHeadlight() {
    if (this.headlightState === 'bright') {
      this.headlightState = 'dim';
      if (this.headlightBeam) this.headlightBeam.intensity = 2.5;
    } else if (this.headlightState === 'dim') {
      this.headlightState = 'off';
      if (this.headlightBeam) this.headlightBeam.intensity = 0.0;
    } else {
      this.headlightState = 'bright';
      if (this.headlightBeam) this.headlightBeam.intensity = 8.0;
    }
    return this.headlightState;
  }
}
