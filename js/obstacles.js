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

    // Detection telemetry fed to HUD and Safety Controller
    this.telemetry = {
      targetDetected: false,
      type: null,
      name: 'NONE (TRACK CLEAR)',
      distance: null,
      mass: null,
      canCollect: false,
      action: 'STANDBY',
      alertMessage: null,
      alertType: 'info', // 'info' | 'deploy' | 'hazard' | 'success'
      collectedCount: 0,
      collectedWeight: 0
    };

    // Shared reusable materials
    this.materials = {
      humanSkin: new THREE.MeshStandardMaterial({ color: 0xcd8c64, roughness: 0.8 }),
      humanVest: new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.4 }), // High-vis fluorescent orange
      humanReflective: new THREE.MeshStandardMaterial({ color: 0xf1f5f9, roughness: 0.2, metalness: 0.6 }), // Silver reflective stripes
      humanPants: new THREE.MeshStandardMaterial({ color: 0x1e3a5f, roughness: 0.7 }), // Navy blue work trousers
      humanBoots: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.9 }), // Black work boots
      helmetYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.3, metalness: 0.2 }), // Yellow hard hat
      animalFur: new THREE.MeshStandardMaterial({ color: 0xa16207, roughness: 0.9 }), // Golden brown fur
      animalHoof: new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 }),
      cattleBody: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.85 }), // Dark grey bull hide
      cattleHorn: new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.4 }), // Pale ivory horns
      woodCrate: new THREE.MeshStandardMaterial({ color: 0x854d0e, roughness: 0.85 }), // Weathered pine wood
      metalBand: new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.3, metalness: 0.7 })
    };

    // Spawn scenic track obstacles along the route
    this.initDefaultObstacles();
  }

  // ------------------------------------------------------------------
  // 3D Model Builders for Human, Animal, Heavy Cattle, Debris
  // ------------------------------------------------------------------

  // 1. Human Track Worker / Pedestrian (Mass: 72 kg <= 150 kg -> SCOOPABLE)
  buildHumanMesh() {
    const group = new THREE.Group();

    // Torso with high-vis safety jacket
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.62, 0.26), this.materials.humanVest);
    torso.position.y = 1.05;
    torso.castShadow = true;
    group.add(torso);

    // Reflective silver safety stripes across chest & waist
    const stripe1 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.27), this.materials.humanReflective);
    stripe1.position.y = 1.15;
    group.add(stripe1);
    const stripe2 = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.06, 0.27), this.materials.humanReflective);
    stripe2.position.y = 0.92;
    group.add(stripe2);

    // Neck & Head
    const head = new THREE.Mesh(new THREE.SphereGeometry(0.12, 12, 10), this.materials.humanSkin);
    head.position.y = 1.48;
    head.castShadow = true;
    group.add(head);

    // Construction Safety Helmet (Hard Hat)
    const helmet = new THREE.Mesh(
      new THREE.CylinderGeometry(0.17, 0.17, 0.11, 14),
      this.materials.helmetYellow
    );
    helmet.position.y = 1.56;
    helmet.castShadow = true;
    group.add(helmet);

    // Left & Right Arms with hi-vis sleeves
    [-0.28, 0.28].forEach(x => {
      const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.55, 8), this.materials.humanVest);
      arm.position.set(x, 1.02, 0);
      arm.castShadow = true;
      group.add(arm);

      // Hand
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), this.materials.humanSkin);
      hand.position.set(x, 0.70, 0);
      group.add(hand);
    });

    // Legs with navy trousers
    [-0.13, 0.13].forEach(x => {
      const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.72, 8), this.materials.humanPants);
      leg.position.set(x, 0.45, 0);
      leg.castShadow = true;
      group.add(leg);

      // Boot
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.10, 0.22), this.materials.humanBoots);
      boot.position.set(x, 0.05, 0.04);
      boot.castShadow = true;
      group.add(boot);
    });

    return group;
  }

  // 2. Wildlife / Stray Animal (Deer / Stray Calf - Mass: 55 kg <= 150 kg -> SCOOPABLE)
  buildAnimalMesh() {
    const group = new THREE.Group();

    // Body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.48, 0.95), this.materials.animalFur);
    body.position.y = 0.65;
    body.castShadow = true;
    group.add(body);

    // Neck & Head
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.16, 0.38, 8), this.materials.animalFur);
    neck.position.set(0, 0.95, 0.38);
    neck.rotation.x = -0.4;
    neck.castShadow = true;
    group.add(neck);

    const head = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.22, 0.35), this.materials.animalFur);
    head.position.set(0, 1.12, 0.52);
    head.castShadow = true;
    group.add(head);

    // Ears
    [-0.10, 0.10].forEach(x => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.15, 6), this.materials.animalFur);
      ear.position.set(x, 1.25, 0.48);
      ear.rotation.z = x > 0 ? -0.3 : 0.3;
      group.add(ear);
    });

    // 4 Legs
    [-0.16, 0.16].forEach(x => {
      [-0.32, 0.32].forEach(z => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.035, 0.55, 8), this.materials.animalFur);
        leg.position.set(x, 0.28, z);
        leg.castShadow = true;
        group.add(leg);

        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.04, 0.06, 8), this.materials.animalHoof);
        hoof.position.set(x, 0.03, z);
        group.add(hoof);
      });
    });

    return group;
  }

  // 3. Heavy Cattle / Stray Bull (Mass: 480 kg > 150 kg -> OVERWEIGHT HAZARD)
  buildHeavyCattleMesh() {
    const group = new THREE.Group();

    // Heavy muscular barrel body
    const body = new THREE.Mesh(new THREE.BoxGeometry(0.95, 0.90, 1.75), this.materials.cattleBody);
    body.position.y = 0.95;
    body.castShadow = true;
    group.add(body);

    // Thick neck
    const neck = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.65, 0.60), this.materials.cattleBody);
    neck.position.set(0, 1.15, 0.85);
    neck.rotation.x = -0.25;
    neck.castShadow = true;
    group.add(neck);

    // Broad horned head
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.45, 0.55), this.materials.cattleBody);
    head.position.set(0, 1.25, 1.15);
    head.castShadow = true;
    group.add(head);

    // Prominent Bull Horns
    [-0.28, 0.28].forEach(x => {
      const horn = new THREE.Mesh(new THREE.ConeGeometry(0.06, 0.42, 8), this.materials.cattleHorn);
      horn.position.set(x, 1.55, 1.12);
      horn.rotation.z = x > 0 ? -0.65 : 0.65;
      horn.rotation.x = 0.2;
      group.add(horn);
    });

    // 4 Stout legs
    [-0.32, 0.32].forEach(x => {
      [-0.60, 0.60].forEach(z => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.08, 0.75, 10), this.materials.cattleBody);
        leg.position.set(x, 0.38, z);
        leg.castShadow = true;
        group.add(leg);

        const hoof = new THREE.Mesh(new THREE.CylinderGeometry(0.095, 0.095, 0.08, 8), this.materials.animalHoof);
        hoof.position.set(x, 0.04, z);
        group.add(hoof);
      });
    });

    return group;
  }

  // 4. Wooden Cargo Crate / Track Debris (Mass: 40 kg <= 150 kg -> SCOOPABLE)
  buildDebrisMesh() {
    const group = new THREE.Group();
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.75, 0.65, 0.75), this.materials.woodCrate);
    crate.position.y = 0.325;
    crate.castShadow = true;
    group.add(crate);

    // Metal corner reinforcement brackets
    const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.08, 0.77), this.materials.metalBand);
    band1.position.y = 0.52;
    group.add(band1);
    const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.77, 0.08, 0.77), this.materials.metalBand);
    band2.position.y = 0.15;
    group.add(band2);

    return group;
  }

  // ------------------------------------------------------------------
  // Spawn and Positioning Logic
  // ------------------------------------------------------------------
  spawnObstacle(type, trackProgress) {
    let mesh, name, mass;
    switch (type) {
      case 'human':
        mesh = this.buildHumanMesh();
        name = 'Human (Track Worker)';
        mass = 72; // kg
        break;
      case 'animal':
        mesh = this.buildAnimalMesh();
        name = 'Wildlife (Stray Deer/Calf)';
        mass = 55; // kg
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
      isCollected: false
    };

    this.scene.add(mesh);
    this.obstacles.push(obstacleObj);
    return obstacleObj;
  }

  // Initial scenic obstacles along the route
  initDefaultObstacles() {
    // 1. Human Track Worker in immediate line-of-sight (65-75m ahead of train spawn)
    this.spawnObstacle('human', 0.045);
    // 2. Stray Animal near mustard fields
    this.spawnObstacle('animal', 0.12);
    // 3. Track Inspector near mountain approach
    this.spawnObstacle('human', 0.28);
    // 4. Heavy Stray Bull (>150kg Overweight Hazard)
    this.spawnObstacle('cattle', 0.45);
    // 5. Stray Animal
    this.spawnObstacle('animal', 0.60);
    // 6. Track Cargo Debris
    this.spawnObstacle('debris', 0.74);
    // 7. Human Track Worker near level crossing
    this.spawnObstacle('human', 0.88);
  }

  // Spawn immediately ahead of the train on demand (via HUD test buttons)
  spawnAheadOfTrain(trainProgress, trackLength, type = 'human', distanceMeters = 85) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(type, targetProgress);
  }

  // ------------------------------------------------------------------
  // Main Detection, AI Decision Matrix & Obstacle Scoop Loop
  // Enforces: Collect ONLY when Mass <= 150 kg AND Speed <= 150 km/h
  // Net defaults to CLOSED / STOWED; Opens with animation upon detection
  // ------------------------------------------------------------------
  update(dt, trainProgress, trainSpeedMs, captureNet, audio, physics, trackLength) {
    let closestObstacle = null;
    let minForwardDist = Infinity;
    const speedKmh = trainSpeedMs * 3.6;

    // Evaluate track spline distance to all uncollected obstacles ahead of train
    this.obstacles.forEach(obs => {
      if (obs.isCollected) return;

      // Forward distance calculation on circular track spline
      let diff = obs.progress - trainProgress;
      if (diff < 0) diff += 1.0;
      const forwardMeters = diff * trackLength;

      // Only consider obstacles within scanning range ahead (up to 140m)
      if (forwardMeters < minForwardDist && forwardMeters < 140) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    // If an obstacle is detected within sensor range (up to 110m)
    if (closestObstacle && minForwardDist < 110) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;
      this.telemetry.mass = closestObstacle.mass;

      // Dual Safety Condition: Collect ONLY when Mass <= 150 kg AND Speed <= 150 km/h
      const isWeightSafe = closestObstacle.mass <= 150;
      const isSpeedSafe = speedKmh <= 150;
      const canCollect = isWeightSafe && isSpeedSafe;
      this.telemetry.canCollect = canCollect;

      // ----------------------------------------------------------------
      // SAFETY CONTROLLER LOGIC:
      // Case A: Safe for capture (Mass <= 150 kg & Speed <= 150 km/h)
      // Net is default closed; Rapidly opens with 3D pneumatic animation
      // ----------------------------------------------------------------
      if (canCollect) {
        this.telemetry.action = 'AIRBAG NET RAPID DEPLOY & RESCUE SCOOP';
        this.telemetry.alertType = 'deploy';

        // 1. Rapid Pneumatic Inflation Trigger: Opens with animation at <= 80m
        if (minForwardDist <= 80 && !captureNet.isDeployed) {
          captureNet.triggerSolenoidDeploy(audio);
          if (audio) audio.playTargetAcquiredBeep(false);
          this.telemetry.alertMessage = `⚡ AI KAVACH: ${closestObstacle.name.toUpperCase()} DETECTED (${closestObstacle.mass}KG ≤ 150KG). AIRBAG NET INFLATING!`;
        }

        // 2. Physical Scoop / Collection Event at train front tip (<= 2.5m)
        if (minForwardDist <= 2.5) {
          this.scene.remove(closestObstacle.mesh);
          captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
          closestObstacle.isCollected = true;

          // Sound celebratory rescue confirmation audio
          if (audio) audio.playRescueSuccessChime();

          this.telemetry.collectedCount++;
          this.telemetry.collectedWeight += closestObstacle.mass;
          this.telemetry.alertType = 'success';
          this.telemetry.alertMessage = `🎯 OBSTACLE SAFELY COLLECTED: ${closestObstacle.name} (${closestObstacle.mass} kg) secured in scoop cradle. Zero casualties!`;
        }
      }
      // ----------------------------------------------------------------
      // Case B: OVERWEIGHT (> 150 kg) or OVERSPEED (> 150 km/h)
      // DO NOT OPEN NET! Apply Emergency Brake + Horn Intervention
      // ----------------------------------------------------------------
      else {
        // Ensure net remains CLOSED/STOWED to avoid structural damage
        if (captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }

        const reason = !isWeightSafe
          ? `OVERWEIGHT (>150KG): ${closestObstacle.mass}KG EXCEEDS NET LIMIT`
          : `OVERSPEED (>150 KM/H): SPEED ${Math.round(speedKmh)} KM/H TOO HIGH FOR NET`;

        this.telemetry.action = `${reason} - EMERGENCY BRAKE ONLY`;
        this.telemetry.alertType = 'hazard';
        this.telemetry.alertMessage = `⚠️ HAZARD: ${closestObstacle.name.toUpperCase()} ON TRACK! NET HELD CLOSED. EMERGENCY BRAKE APPLIED!`;

        // Automatically engage emergency brake & continuous warning horn
        if (minForwardDist <= 95) {
          if (physics && !physics.emergencyBrake) {
            physics.setEmergencyBrake(true);
          }
          if (audio) {
            audio.playTargetAcquiredBeep(true);
            audio.startHorn();
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
      this.telemetry.canCollect = false;
      this.telemetry.action = 'STANDBY - SCANNING (LiDAR / RADAR / 4K)';
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

