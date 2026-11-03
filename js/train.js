// ====================================================================
// Indian Railways Real-World 3D Train Models (WAP-7 & WDP-4D + Coaches)
// Fully articulated multi-car train (every car follows curve independently!)
// Procedural photorealistic canvas textures matching uploaded reference images
// ====================================================================

import * as THREE from 'three';

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

    // Generate high-fidelity procedural canvas textures
    this.textures = this.createProceduralTextures();

    // Lighting
    this.headlightBeam = null;
    this.headlightState = 'bright';

    this.buildTrain();
  }

  // ---------------------------------------------------------
  // High-Resolution Procedural Canvas Textures
  // ---------------------------------------------------------
  createProceduralTextures() {
    // 1. WAP-7 Side Livery Texture (Image 1)
    const canvasW = document.createElement('canvas');
    canvasW.width = 1024;
    canvasW.height = 256;
    const ctxW = canvasW.getContext('2d');

    // Base off-white / cream metal
    ctxW.fillStyle = '#f3f4f6';
    ctxW.fillRect(0, 0, 1024, 256);

    // Maroon/Red waistline band
    ctxW.fillStyle = '#b91c1c';
    ctxW.fillRect(0, 95, 1024, 75);

    // Gold/White Indian Railways lettering on red band
    ctxW.fillStyle = '#fef08a';
    ctxW.font = 'bold 22px sans-serif';
    ctxW.textAlign = 'center';
    ctxW.fillText('INDIAN RAILWAYS  •  भारतीय रेल', 512, 140);

    // Loco Shed & Number: GZB WAP-7 30201
    ctxW.fillStyle = '#111827';
    ctxW.font = 'bold 16px sans-serif';
    ctxW.fillText('WAP-7 #30201 GZB', 160, 65);
    ctxW.fillText('WAP-7 #30201 GZB', 864, 65);

    // Dark grey lower skirt
    ctxW.fillStyle = '#374151';
    ctxW.fillRect(0, 205, 1024, 51);

    // Ventilation Louver Grilles
    ctxW.fillStyle = '#1f2937';
    for (let x = 320; x <= 700; x += 18) {
      ctxW.fillRect(x, 40, 8, 42);
    }

    const wap7SideTex = new THREE.CanvasTexture(canvasW);

    // 2. WAP-7 Front Aerodynamic Nose Texture
    const canvasWF = document.createElement('canvas');
    canvasWF.width = 512;
    canvasWF.height = 512;
    const ctxWF = canvasWF.getContext('2d');
    ctxWF.fillStyle = '#f3f4f6';
    ctxWF.fillRect(0, 0, 512, 512);

    // Center Red Stripe continuation
    ctxWF.fillStyle = '#b91c1c';
    ctxWF.fillRect(0, 210, 512, 140);

    // Number Plate
    ctxWF.fillStyle = '#111';
    ctxWF.fillRect(160, 290, 192, 45);
    ctxWF.fillStyle = '#fff';
    ctxWF.font = 'bold 24px monospace';
    ctxWF.textAlign = 'center';
    ctxWF.fillText('30201 WAP7', 256, 322);

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

    // 4. LHB Red/Silver Coach Side Texture (Image 1)
    const canvasL = document.createElement('canvas');
    canvasL.width = 1024;
    canvasL.height = 256;
    const ctxL = canvasL.getContext('2d');

    // Silver stainless steel upper
    ctxL.fillStyle = '#d1d5db';
    ctxL.fillRect(0, 0, 1024, 256);

    // Rajdhani Crimson Red Waistband
    ctxL.fillStyle = '#b91c1c';
    ctxL.fillRect(0, 75, 1024, 110);

    // White Pinstripe
    ctxL.fillStyle = '#ffffff';
    ctxL.fillRect(0, 72, 1024, 3);
    ctxL.fillRect(0, 185, 1024, 3);

    // Dark AC Tinted Windows
    ctxL.fillStyle = '#0f172a';
    for (let i = 0; i < 11; i++) {
      const wx = 70 + i * 82;
      ctxL.fillRect(wx, 92, 60, 75);
    }

    // Lower Grey Skirt
    ctxL.fillStyle = '#374151';
    ctxL.fillRect(0, 215, 1024, 41);

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
  // WAP-7 High-Speed Electric Locomotive (Image 1)
  // ---------------------------------------------------------
  buildWAP7Locomotive(group) {
    const length = this.locoLength;
    const width = 3.15;
    const height = 3.2;

    const materials = {
      side: new THREE.MeshStandardMaterial({ map: this.textures.wap7SideTex, roughness: 0.35, metalness: 0.2 }),
      front: new THREE.MeshStandardMaterial({ map: this.textures.wap7FrontTex, roughness: 0.35, metalness: 0.2 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.4, metalness: 0.6 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.7 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x111e2e, transmission: 0.5, roughness: 0.1 }),
      cowcatcher: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4, metalness: 0.2 }),
      copper: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3, metalness: 0.8 }),
      insulator: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.3 })
    };

    // Body Cube with multi-material sides
    const cubeMats = [
      materials.side,     // +X (Right)
      materials.side,     // -X (Left)
      materials.roof,     // +Y (Roof)
      materials.darkSteel,// -Y (Under)
      materials.front,    // +Z (Front Nose)
      materials.front     // -Z (Rear Nose)
    ];

    const bodyMesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, length), cubeMats);
    bodyMesh.position.y = 2.0;
    bodyMesh.castShadow = true;
    bodyMesh.receiveShadow = true;
    group.add(bodyMesh);

    // Bevelled Roof Top
    const roofCurve = new THREE.CylinderGeometry(width / 2, width / 2, length, 16, 1, false, 0, Math.PI);
    roofCurve.rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
    const roofMesh = new THREE.Mesh(roofCurve, materials.roof);
    roofMesh.position.y = 3.6;
    roofMesh.scale.set(1, 0.35, 1);
    group.add(roofMesh);

    // Front Cab Windshields (Recessed with sunshade)
    [-0.65, 0.65].forEach(x => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.75), materials.glass);
      win.position.set(x, 2.55, length / 2 + 0.02);
      group.add(win);
    });

    // Twin High-Intensity Headlights
    const hlBox = new THREE.Mesh(new THREE.BoxGeometry(0.65, 0.28, 0.2), materials.darkSteel);
    hlBox.position.set(0, 3.25, length / 2 + 0.05);
    group.add(hlBox);

    const lampGeo = new THREE.CylinderGeometry(0.1, 0.1, 0.08, 16).rotateX(Math.PI / 2);
    [-0.16, 0.16].forEach(x => {
      const lamp = new THREE.Mesh(lampGeo, new THREE.MeshBasicMaterial({ color: 0xffffff }));
      lamp.position.set(x, 3.25, length / 2 + 0.16);
      group.add(lamp);
    });

    // Functional 3D Headlight SpotLight
    this.headlightBeam = new THREE.SpotLight(0xfffaed, 8.0, 160, Math.PI / 7, 0.4, 1.2);
    this.headlightBeam.position.set(0, 3.25, length / 2 + 0.5);
    this.headlightBeam.target.position.set(0, 0, length / 2 + 80);
    this.headlightBeam.castShadow = true;
    group.add(this.headlightBeam);
    group.add(this.headlightBeam.target);

    // Red Cowcatcher / Cattle Guard (Sloped Plow Grill)
    const plow = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 0.65, 4).rotateY(Math.PI / 4).scale(1.1, 0.6, 0.8),
      materials.cowcatcher
    );
    plow.position.set(0, 0.48, length / 2 + 0.3);
    group.add(plow);

    // Buffers and Coupler
    [-0.95, 0.95].forEach(x => {
      const buffer = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.08, 16).rotateX(Math.PI / 2), materials.darkSteel);
      buffer.position.set(x, 0.95, length / 2 + 0.45);
      group.add(buffer);
    });

    // Roof High-Voltage Gear & Pantographs
    this.buildPantograph(group, materials, -length * 0.32, true);  // Raised rear panto
    this.buildPantograph(group, materials, length * 0.32, false);  // Lowered front panto

    // Two Co-Co 3-Axle Bogies sitting precisely on the steel rails
    this.buildCoCoBogie(group, length * 0.28);
    this.buildCoCoBogie(group, -length * 0.28);
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
  // Co-Co 3-Axle Broad Gauge Bogie (Exact rail alignment)
  // ---------------------------------------------------------
  buildCoCoBogie(parent, zCenter) {
    const bogie = new THREE.Group();
    bogie.position.set(0, 0, zCenter);

    const darkSteel = new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.8 });
    const wheelSteel = new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.2, metalness: 0.9 });

    // Bogie Frame
    [-1.15, 1.15].forEach(x => {
      const beam = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.32, 4.4), darkSteel);
      beam.position.set(x, 0.65, 0);
      bogie.add(beam);
    });

    // 3 Axles sitting on top of the rails
    const axleSpacing = [-1.6, 0.0, 1.6];
    const railX = this.wheelRadius > 0 ? 0.838 : 0.838; // 1676mm / 2 = 0.838m

    axleSpacing.forEach(z => {
      const axleGroup = new THREE.Group();
      axleGroup.position.set(0, this.wheelRadius, z);

      // Steel Axle Shaft
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9).rotateZ(Math.PI / 2), darkSteel);
      axleGroup.add(shaft);

      // Pair of Steel Wheels exactly on the rail heads (x = ±0.838m)
      [-railX, railX].forEach(x => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius, this.wheelRadius, 0.12, 20).rotateZ(Math.PI / 2), wheelSteel);
        wheel.position.x = x;

        // Flange ring (inner wheel edge)
        const flange = new THREE.Mesh(new THREE.CylinderGeometry(this.wheelRadius + 0.04, this.wheelRadius + 0.04, 0.03, 20).rotateZ(Math.PI / 2), wheelSteel);
        flange.position.x = x + (x > 0 ? -0.07 : 0.07);
        wheel.add(flange);

        axleGroup.add(wheel);
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
  // Update Wheel Rotations & Dynamic Effects
  // ---------------------------------------------------------
  update(dt, speedMs) {
    const wheelAngularSpeed = speedMs / this.wheelRadius;
    const deltaAngle = wheelAngularSpeed * dt;
    this.rotatingWheels.forEach(w => {
      w.rotation.x += deltaAngle;
    });
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
