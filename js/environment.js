// ====================================================================
// Real-World Indian Railways Environment & Atmosphere
// Sky, Dynamic Sun/Lighting, Weather presets, and Realistic Oncoming AI Train
// ====================================================================

import * as THREE from 'three';

export class Environment {
  constructor(scene, trackSystem) {
    this.scene = scene;
    this.trackSystem = trackSystem;

    // Lighting nodes
    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    // Weather / Time presets: 'day', 'sunset', 'night', 'monsoon'
    this.currentWeather = 'day';

    // Monsoon Rain particle system
    this.rainParticles = null;
    this.rainGeo = null;

    // High-Fidelity Oncoming AI Train on Track 2
    this.aiLoco = null;
    this.aiCoaches = [];
    this.aiTrainProgress = 0.55;
    this.aiSpeedKmh = 105;
    this.aiLocoLength = 20.5;
    this.aiCoachLength = 23.5;
    this.aiCouplerGap = 0.8;
    this.aiCoachCount = 5;

    this.initSkyAndLighting();
    this.initRainSystem();
    this.initAITrain();
  }

  // ---------------------------------------------------------
  // Sun, Hemispheric & Ambient Lighting
  // ---------------------------------------------------------
  initSkyAndLighting() {
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0006);

    // Warm Directional Sunlight
    this.sunLight = new THREE.DirectionalLight(0xfffaed, 2.6);
    this.sunLight.position.set(300, 450, 200);
    this.sunLight.castShadow = true;
    this.sunLight.shadow.mapSize.width = 2048;
    this.sunLight.shadow.mapSize.height = 2048;
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1200;
    const d = 160;
    this.sunLight.shadow.camera.left = -d;
    this.sunLight.shadow.camera.right = d;
    this.sunLight.shadow.camera.top = d;
    this.sunLight.shadow.camera.bottom = -d;
    this.scene.add(this.sunLight);

    // Ambient Sky fill
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.1);
    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(this.ambientLight);
  }

  // ---------------------------------------------------------
  // Monsoon Raindrop Particles
  // ---------------------------------------------------------
  initRainSystem() {
    const rainCount = 4000;
    this.rainGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 160;
      positions[i + 1] = Math.random() * 80;
      positions[i + 2] = (Math.random() - 0.5) * 160;
    }

    this.rainGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0.0
    });

    this.rainParticles = new THREE.Points(this.rainGeo, rainMat);
    this.scene.add(this.rainParticles);
  }

  // ---------------------------------------------------------
  // High-Fidelity Oncoming Indian Railways Train (WAG-9 + ICF Rake)
  // Fully articulated: Every car follows Track 2 curve with 100% precision
  // ---------------------------------------------------------
  initAITrain() {
    // 1. Procedural Textures for Second Train
    // WAG-9 Emerald Green Locomotive Livery
    const canvasL = document.createElement('canvas');
    canvasL.width = 1024;
    canvasL.height = 256;
    const ctxL = canvasL.getContext('2d');
    ctxL.fillStyle = '#166534'; // Indian Railways WAG-9 Green
    ctxL.fillRect(0, 0, 1024, 256);
    // Yellow Waistline
    ctxL.fillStyle = '#facc15';
    ctxL.fillRect(0, 105, 1024, 45);
    // Lettering
    ctxL.fillStyle = '#111';
    ctxL.font = 'bold 20px sans-serif';
    ctxL.textAlign = 'center';
    ctxL.fillText('INDIAN RAILWAYS  •  भारतीय रेल  •  WAG-9 #31085', 512, 136);
    // Dark skirt
    ctxL.fillStyle = '#1f2937';
    ctxL.fillRect(0, 210, 1024, 46);
    const wag9Tex = new THREE.CanvasTexture(canvasL);

    // Front Nose Texture with Chevron / Warning Band
    const canvasF = document.createElement('canvas');
    canvasF.width = 512;
    canvasF.height = 512;
    const ctxF = canvasF.getContext('2d');
    ctxF.fillStyle = '#166534';
    ctxF.fillRect(0, 0, 512, 512);
    ctxF.fillStyle = '#facc15';
    ctxF.fillRect(0, 220, 512, 90);
    ctxF.fillStyle = '#111';
    ctxF.font = 'bold 26px monospace';
    ctxF.textAlign = 'center';
    ctxF.fillText('WAG-9 31085', 256, 275);
    const wag9FrontTex = new THREE.CanvasTexture(canvasF);

    // Blue ICF Passenger Coach Texture
    const canvasC = document.createElement('canvas');
    canvasC.width = 1024;
    canvasC.height = 256;
    const ctxC = canvasC.getContext('2d');
    ctxC.fillStyle = '#1e3a8a'; // IR Navy Blue
    ctxC.fillRect(0, 0, 1024, 256);
    ctxC.fillStyle = '#38bdf8'; // Sky-blue stripes
    ctxC.fillRect(0, 55, 1024, 12);
    ctxC.fillRect(0, 185, 1024, 12);
    // Windows
    ctxC.fillStyle = '#0f172a';
    for (let i = 0; i < 11; i++) {
      ctxC.fillRect(75 + i * 80, 80, 54, 85);
    }
    const icfCoachTex = new THREE.CanvasTexture(canvasC);

    const materials = {
      wag9Side: new THREE.MeshStandardMaterial({ map: wag9Tex, roughness: 0.35, metalness: 0.3 }),
      wag9Front: new THREE.MeshStandardMaterial({ map: wag9FrontTex, roughness: 0.35, metalness: 0.2 }),
      coachSide: new THREE.MeshStandardMaterial({ map: icfCoachTex, roughness: 0.35, metalness: 0.3 }),
      roof: new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.4, metalness: 0.5 }),
      darkSteel: new THREE.MeshStandardMaterial({ color: 0x1f242d, roughness: 0.6, metalness: 0.7 }),
      wheelSteel: new THREE.MeshStandardMaterial({ color: 0x6b7280, roughness: 0.2, metalness: 0.9 }),
      cowcatcher: new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }),
      glass: new THREE.MeshPhysicalMaterial({ color: 0x111e2e, roughness: 0.1, transmission: 0.5 })
    };

    // 2. Build WAG-9 Locomotive (Independent Group)
    this.aiLoco = new THREE.Group();
    const lWidth = 3.15;
    const lHeight = 3.1;
    const lLen = this.aiLocoLength;

    const locoMats = [
      materials.wag9Side, materials.wag9Side, materials.roof, materials.darkSteel, materials.wag9Front, materials.wag9Front
    ];
    const locoBody = new THREE.Mesh(new THREE.BoxGeometry(lWidth, lHeight, lLen), locoMats);
    locoBody.position.y = 1.95;
    locoBody.castShadow = true;
    this.aiLoco.add(locoBody);

    // Front Windshields (at front end: +Z)
    [-0.65, 0.65].forEach(x => {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.95, 0.75), materials.glass);
      win.position.set(x, 2.5, lLen / 2 + 0.02);
      this.aiLoco.add(win);
    });

    // High Headlights with functional bright light
    const hl = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16).rotateX(Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0xffffff }));
    hl.position.set(0, 3.2, lLen / 2 + 0.06);
    this.aiLoco.add(hl);

    const aiHeadlightBeam = new THREE.SpotLight(0xfffaed, 7.0, 130, Math.PI / 7, 0.4, 1.2);
    aiHeadlightBeam.position.set(0, 3.2, lLen / 2 + 0.5);
    aiHeadlightBeam.target.position.set(0, 0, lLen / 2 + 60);
    this.aiLoco.add(aiHeadlightBeam);
    this.aiLoco.add(aiHeadlightBeam.target);

    // Red Cowcatcher Plow
    const cowcatcher = new THREE.Mesh(new THREE.ConeGeometry(1.5, 0.65, 4).rotateY(Math.PI / 4).scale(1.1, 0.6, 0.8), materials.cowcatcher);
    cowcatcher.position.set(0, 0.48, lLen / 2 + 0.3);
    this.aiLoco.add(cowcatcher);

    // Roof Pantograph (Raised touching OHE at ~5.4m)
    const panto = new THREE.Group();
    panto.position.set(0, 3.55, -lLen * 0.28);
    const pArm1 = new THREE.Mesh(new THREE.CylinderGeometry(0.025, 0.025, 1.3), materials.darkSteel);
    pArm1.position.set(0, 0.55, 0);
    pArm1.rotation.x = 0.65;
    const pArm2 = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 1.2), materials.darkSteel);
    pArm2.position.set(0, 1.15, 0);
    pArm2.rotation.x = -1.15;
    const pHead = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.04, 0.12), new THREE.MeshStandardMaterial({ color: 0xd97706 }));
    pHead.position.set(0, 1.75, 0);
    panto.add(pArm1);
    panto.add(pArm2);
    panto.add(pHead);
    this.aiLoco.add(panto);

    // 2 Bogies sitting precisely on Track 2 rails
    this.buildAIBogie(this.aiLoco, lLen * 0.28, materials);
    this.buildAIBogie(this.aiLoco, -lLen * 0.28, materials);

    this.scene.add(this.aiLoco);

    // 3. Build Trailing Articulated Coaches (Independent Groups)
    this.aiCoaches = [];
    for (let i = 0; i < this.aiCoachCount; i++) {
      const coach = new THREE.Group();
      const cWidth = 3.24;
      const cHeight = 2.75;
      const cLen = this.aiCoachLength;

      const coachMats = [
        materials.coachSide, materials.coachSide, materials.roof, materials.darkSteel, materials.roof, materials.roof
      ];
      const coachBody = new THREE.Mesh(new THREE.BoxGeometry(cWidth, cHeight, cLen), coachMats);
      coachBody.position.y = 1.9;
      coachBody.castShadow = true;
      coach.add(coachBody);

      // Curved Roof
      const roofCyl = new THREE.CylinderGeometry(cWidth / 2, cWidth / 2, cLen, 16, 1, false, 0, Math.PI);
      roofCyl.rotateZ(Math.PI / 2).rotateY(Math.PI / 2);
      const cRoof = new THREE.Mesh(roofCyl, materials.roof);
      cRoof.position.y = 3.25;
      cRoof.scale.set(1, 0.38, 1);
      coach.add(cRoof);

      // 2 Bogies
      this.buildAIBogie(coach, cLen * 0.35, materials);
      this.buildAIBogie(coach, -cLen * 0.35, materials);

      this.scene.add(coach);
      this.aiCoaches.push(coach);
    }
  }

  // ---------------------------------------------------------
  // AI Bogie with Steel Flanged Wheels
  // ---------------------------------------------------------
  buildAIBogie(parent, zCenter, mats) {
    const bogie = new THREE.Group();
    bogie.position.set(0, 0, zCenter);

    const wheelRadius = 0.54;
    const railX = 0.838; // 1676mm / 2

    [-1.2, 1.2].forEach(z => {
      const axle = new THREE.Group();
      axle.position.set(0, wheelRadius, z);

      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 1.9).rotateZ(Math.PI / 2), mats.darkSteel);
      axle.add(shaft);

      [-railX, railX].forEach(x => {
        const wheel = new THREE.Mesh(new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.12, 16).rotateZ(Math.PI / 2), mats.wheelSteel);
        wheel.position.x = x;
        axle.add(wheel);
      });

      bogie.add(axle);
    });

    parent.add(bogie);
  }

  // ---------------------------------------------------------
  // Weather & Time Presets
  // ---------------------------------------------------------
  setWeather(type) {
    this.currentWeather = type;

    if (type === 'day') {
      this.scene.background.setHex(0x87ceeb);
      this.scene.fog.color.setHex(0x87ceeb);
      this.scene.fog.density = 0.0006;
      this.sunLight.color.setHex(0xfffaed);
      this.sunLight.intensity = 2.6;
      this.ambientLight.intensity = 0.45;
      this.hemiLight.color.setHex(0xffffff);
      this.hemiLight.groundColor.setHex(0x444444);
      this.hemiLight.intensity = 1.1;
      this.rainParticles.material.opacity = 0.0;
    } else if (type === 'sunset') {
      this.scene.background.setHex(0xf97316);
      this.scene.fog.color.setHex(0xf97316);
      this.scene.fog.density = 0.0009;
      this.sunLight.color.setHex(0xfdba74);
      this.sunLight.intensity = 2.2;
      this.sunLight.position.set(400, 80, 200);
      this.ambientLight.intensity = 0.5;
      this.hemiLight.color.setHex(0xfed7aa);
      this.hemiLight.groundColor.setHex(0x451a03);
      this.hemiLight.intensity = 1.0;
      this.rainParticles.material.opacity = 0.0;
    } else if (type === 'night') {
      this.scene.background.setHex(0x050a12);
      this.scene.fog.color.setHex(0x050a12);
      this.scene.fog.density = 0.0015;
      this.sunLight.color.setHex(0x60a5fa);
      this.sunLight.intensity = 0.2;
      this.ambientLight.intensity = 0.15;
      this.hemiLight.color.setHex(0x1e293b);
      this.hemiLight.groundColor.setHex(0x020617);
      this.hemiLight.intensity = 0.3;
      this.rainParticles.material.opacity = 0.0;
    } else if (type === 'monsoon') {
      this.scene.background.setHex(0x475569);
      this.scene.fog.color.setHex(0x475569);
      this.scene.fog.density = 0.002;
      this.sunLight.color.setHex(0x94a3b8);
      this.sunLight.intensity = 1.0;
      this.ambientLight.intensity = 0.4;
      this.hemiLight.intensity = 0.7;
      this.rainParticles.material.opacity = 0.75;
    }
  }

  // ---------------------------------------------------------
  // Update Loop (Rain, Sun follow, Articulated AI Train on Track 2)
  // ---------------------------------------------------------
  update(dt, playerPosition) {
    // 1. Move Sun with player so shadows stay crisp
    if (this.sunLight && playerPosition) {
      this.sunLight.position.set(playerPosition.x + 150, playerPosition.y + 250, playerPosition.z + 100);
      this.sunLight.target.position.copy(playerPosition);
      this.sunLight.target.updateMatrixWorld();
    }

    // 2. Monsoon Rain Animation
    if (this.currentWeather === 'monsoon' && this.rainParticles && playerPosition) {
      this.rainParticles.position.copy(playerPosition);
      const positions = this.rainGeo.attributes.position.array;
      for (let i = 1; i < positions.length; i += 3) {
        positions[i] -= 85 * dt;
        if (positions[i] < 0) {
          positions[i] = 75;
        }
      }
      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // 3. Move Articulated Oncoming AI Train along Track 2 (Right Track = index 1)
    if (this.aiLoco && this.trackSystem) {
      const aiSpeedMs = this.aiSpeedKmh / 3.6;
      // Runs in reverse direction along Track 2
      this.aiTrainProgress -= (aiSpeedMs * dt) / this.trackSystem.totalLength;
      if (this.aiTrainProgress < 0) this.aiTrainProgress += 1.0;

      // Position and orient AI Locomotive on Track 2 (Index 1)
      const locoT = this.trackSystem.getCarTransform(this.aiTrainProgress, this.aiLocoLength, 1);
      this.aiLoco.position.copy(locoT.position);
      // Face backward along tangent (opposite direction)
      this.aiLoco.lookAt(locoT.position.clone().sub(locoT.heading));

      // Position and orient each Trailing Coach along Track 2 with full articulation
      let cumDist = (this.aiLocoLength / 2) + this.aiCouplerGap + (this.aiCoachLength / 2);
      for (let i = 0; i < this.aiCoaches.length; i++) {
        // Coach is behind loco in its travel direction (so + distance in loop)
        const coachProg = (this.aiTrainProgress + (cumDist / this.trackSystem.totalLength) + 1.0) % 1.0;
        const coachT = this.trackSystem.getCarTransform(coachProg, this.aiCoachLength, 1);
        const coachGroup = this.aiCoaches[i];
        coachGroup.position.copy(coachT.position);
        coachGroup.lookAt(coachT.position.clone().sub(coachT.heading));

        cumDist += this.aiCoachLength + this.aiCouplerGap;
      }
    }
  }
}
