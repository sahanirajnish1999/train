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

    this.animTime = 0;

    // High-Fidelity Anatomical & Industrial Obstacle Materials
    this.materials = {
      humanSkin: new THREE.MeshStandardMaterial({ color: 0xdf9b77, roughness: 0.65 }),
      humanShirt: new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.7 }),
      humanVest: new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }), // Fluorescent Indian Railways Safety Orange
      humanReflective: new THREE.MeshStandardMaterial({ color: 0xf8fafc, roughness: 0.18, metalness: 0.8 }), // 3M Microprismatic Silver
      humanPants: new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.65 }), // Indian Railways Navy Blue Work Trousers
      humanBoots: new THREE.MeshStandardMaterial({ color: 0x3a2a1d, roughness: 0.55 }), // Heavy Oiled Work Leather
      bootSole: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 }), // Black Lugged Rubber Tread
      humanBelt: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.75 }),
      humanEyes: new THREE.MeshBasicMaterial({ color: 0x09090b }),
      helmetYellow: new THREE.MeshStandardMaterial({ color: 0xfacc15, roughness: 0.25, metalness: 0.15 }), // High-Gloss Fiber Hard Hat
      radioPlastic: new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.4 }),
      darkHousing: new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.35 }),
      glassLens: new THREE.MeshPhysicalMaterial({ color: 0x38bdf8, roughness: 0.05, transmission: 0.85, thickness: 0.1 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.88 }),
      cattleHide: new THREE.MeshStandardMaterial({ color: 0x948b7e, roughness: 0.72 }), // Authentic Indian Desi Zebu Dun Hide
      cattleDark: new THREE.MeshStandardMaterial({ color: 0x27272a, roughness: 0.65 }),
      cattleHorn: new THREE.MeshStandardMaterial({ color: 0xf3f4f6, roughness: 0.35, metalness: 0.08 }),
      cattleEye: new THREE.MeshBasicMaterial({ color: 0x09090b }),
      animalFur: new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.75 }), // Warm Golden Wildlife Fur
      animalMuzzle: new THREE.MeshStandardMaterial({ color: 0x1c1917, roughness: 0.5 }),
      animalHoof: new THREE.MeshStandardMaterial({ color: 0x292524, roughness: 0.8 }),
      woodCrate: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }), // Weathered Railway Teak Wood
      industrialSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 }),
      hazardYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 })
    };

    // Spawn scenic track obstacles along the route
    this.initDefaultObstacles();
  }

  // ------------------------------------------------------------------
  // 3D Model Builders for Human, Animal, Heavy Cattle, Debris
  // ------------------------------------------------------------------

  // 1. Human Track Worker / Railway Inspector (Mass: 72 kg <= 150 kg -> SCOOPABLE)
  // Realistic Indian Railways trackman with fluorescent high-vis jacket, 3M reflective cross-harness,
  // walkie-talkie, sculpted anatomical head, hard hat with brim, articulated joints, and steel-toe boots
  buildHumanMesh() {
    const group = new THREE.Group();
    group.name = 'humanWorker';

    // A. Pelvis / Hips (Root of body)
    const pelvis = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.14, 0.18, 12), this.materials.humanPants);
    pelvis.position.y = 0.88;
    pelvis.castShadow = true;
    group.add(pelvis);

    // Leather Utility Belt with Brass Buckle & Tool Pouches
    const belt = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.17, 0.05, 14), this.materials.humanBelt);
    belt.position.y = 0.95;
    group.add(belt);
    const buckle = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.05, 0.03), this.materials.brass);
    buckle.position.set(0, 0.95, 0.17);
    group.add(buckle);
    const pouch = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.10, 0.05), this.materials.humanBelt);
    pouch.position.set(0.18, 0.92, 0.04);
    group.add(pouch);

    // B. Anatomical Torso (Chest + High-Vis Jacket)
    const torsoGroup = new THREE.Group();
    torsoGroup.position.set(0, 0.98, 0);

    // Inner collared work shirt
    const shirt = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.16, 0.38, 14), this.materials.humanShirt);
    shirt.position.y = 0.19;
    shirt.castShadow = true;
    torsoGroup.add(shirt);

    // High-Vis Fluorescent Safety Vest over shirt
    const vest = new THREE.Mesh(new THREE.CylinderGeometry(0.205, 0.175, 0.36, 14), this.materials.humanVest);
    vest.position.y = 0.18;
    vest.castShadow = true;
    torsoGroup.add(vest);

    // 3M Silver Microprismatic Reflective Harness Stripes (Cross-over chest & waist tape - flush with jacket)
    [-0.09, 0.09].forEach((rx, idx) => {
      // Front chest vertical reflective bands
      const refFront = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.012), this.materials.humanReflective);
      refFront.position.set(rx, 0.18, 0.188);
      refFront.rotation.y = idx === 0 ? 0.06 : -0.06;
      torsoGroup.add(refFront);

      // Back vertical reflective bands
      const refBack = new THREE.Mesh(new THREE.BoxGeometry(0.045, 0.32, 0.012), this.materials.humanReflective);
      refBack.position.set(rx, 0.18, -0.188);
      refBack.rotation.y = idx === 0 ? -0.06 : 0.06;
      torsoGroup.add(refBack);
    });

    const refWaist = new THREE.Mesh(new THREE.CylinderGeometry(0.208, 0.178, 0.042, 14), this.materials.humanReflective);
    refWaist.position.y = 0.05;
    torsoGroup.add(refWaist);

    // Walkie-Talkie Radio on Left Lapel
    const radio = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.10, 0.035), this.materials.radioPlastic);
    radio.position.set(-0.14, 0.28, 0.16);
    radio.rotation.z = -0.15;
    torsoGroup.add(radio);
    const antenna = new THREE.Mesh(new THREE.CylinderGeometry(0.004, 0.004, 0.08, 6), this.materials.radioPlastic);
    antenna.position.set(-0.15, 0.35, 0.16);
    torsoGroup.add(antenna);

    // C. Neck & Sculpted Head (Attached to TorsoGroup for natural anatomical movement)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.085, 0.12, 10), this.materials.humanSkin);
    neck.position.set(0, 0.38, 0);
    torsoGroup.add(neck);

    const headGroup = new THREE.Group();
    headGroup.position.set(0, 0.48, 0.02);

    // Cranium
    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.115, 16, 14), this.materials.humanSkin);
    cranium.scale.set(1.0, 1.15, 1.05);
    cranium.castShadow = true;
    headGroup.add(cranium);

    // Facial features: Nose, Jaw, Eyes, Ears
    const nose = new THREE.Mesh(new THREE.ConeGeometry(0.022, 0.045, 8).rotateX(Math.PI / 2), this.materials.humanSkin);
    nose.position.set(0, -0.01, 0.125);
    headGroup.add(nose);

    [-0.04, 0.04].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 8), this.materials.humanEyes);
      eye.position.set(ex, 0.025, 0.112);
      headGroup.add(eye);
    });

    [-0.12, 0.12].forEach(ex => {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(0.024, 8, 8), this.materials.humanSkin);
      ear.scale.set(0.4, 1.0, 0.7);
      ear.position.set(ex, 0, 0);
      headGroup.add(ear);
    });

    // Construction Hard Hat / Safety Helmet (Realistic Indian Railways standard with peak & rib)
    const helmetCrown = new THREE.Mesh(new THREE.SphereGeometry(0.14, 16, 12), this.materials.helmetYellow);
    helmetCrown.position.set(0, 0.05, -0.01);
    helmetCrown.scale.set(1.02, 0.85, 1.12);
    headGroup.add(helmetCrown);

    // Helmet Front Peak Brim
    const brimGeo = new THREE.CylinderGeometry(0.165, 0.165, 0.02, 16);
    const helmetBrim = new THREE.Mesh(brimGeo, this.materials.helmetYellow);
    helmetBrim.position.set(0, 0.03, 0.02);
    helmetBrim.rotation.x = 0.08;
    headGroup.add(helmetBrim);

    // Central Reinforcement Crown Ridge Rib
    const helmetRib = new THREE.Mesh(new THREE.BoxGeometry(0.03, 0.06, 0.22), this.materials.helmetYellow);
    helmetRib.position.set(0, 0.14, -0.01);
    headGroup.add(helmetRib);

    // Protective Eyewear / Safety Goggles pushed up on helmet brim
    const goggleFrame = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.03, 0.04), this.materials.darkHousing);
    goggleFrame.position.set(0, 0.05, 0.12);
    headGroup.add(goggleFrame);
    [-0.038, 0.038].forEach(gx => {
      const gLens = new THREE.Mesh(new THREE.BoxGeometry(0.042, 0.024, 0.01), this.materials.glassLens);
      gLens.position.set(gx, 0.05, 0.142);
      headGroup.add(gLens);
    });

    torsoGroup.add(headGroup);

    group.userData = {
      type: 'human',
      torsoGroup,
      headGroup,
      armL: null,
      armR: null,
      forearmL: null,
      forearmR: null,
      legL: null,
      legR: null,
      lowerLegL: null,
      lowerLegR: null,
      toolShaft: null
    };

    // D. Articulated Arms with Elbows and Gloved Hands (Attached to torsoGroup shoulders)
    [-1, 1].forEach(side => {
      const armGroup = new THREE.Group();
      armGroup.position.set(side * 0.23, 0.34, 0);

      // Shoulder Deltoid Cap
      const shoulder = new THREE.Mesh(new THREE.SphereGeometry(0.065, 12, 10), this.materials.humanVest);
      armGroup.add(shoulder);

      // Upper Arm (with high-vis orange sleeve & reflective band)
      const upperArm = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.046, 0.26, 10), this.materials.humanVest);
      upperArm.position.set(side * 0.02, -0.13, 0);
      upperArm.rotation.z = side * -0.08;
      armGroup.add(upperArm);

      const armStripe = new THREE.Mesh(new THREE.CylinderGeometry(0.054, 0.054, 0.035, 10), this.materials.humanReflective);
      armStripe.position.set(side * 0.02, -0.16, 0);
      armGroup.add(armStripe);

      // Forearm & Elbow group (Navy/Khaki sleeve)
      const forearmGroup = new THREE.Group();
      forearmGroup.position.set(side * 0.04, -0.26, 0.02);

      const forearm = new THREE.Mesh(new THREE.CylinderGeometry(0.044, 0.038, 0.24, 10), this.materials.humanShirt);
      forearm.position.set(0, -0.08, 0.02);
      forearm.rotation.x = -0.22;
      forearmGroup.add(forearm);

      // Heavy Work Glove / Hand with thumb
      const palm = new THREE.Mesh(new THREE.BoxGeometry(0.048, 0.075, 0.036), this.materials.humanBoots);
      palm.position.set(side * 0.01, -0.22, 0.06);
      forearmGroup.add(palm);
      const thumb = new THREE.Mesh(new THREE.SphereGeometry(0.016, 6, 6), this.materials.humanBoots);
      thumb.position.set(side * -0.015, -0.20, 0.08);
      forearmGroup.add(thumb);

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

    // E. Articulated Legs with Knees, Creases & Heavy Steel-Toe Boots
    [-1, 1].forEach(side => {
      const legGroup = new THREE.Group();
      legGroup.position.set(side * 0.11, 0.85, 0);

      // Thigh with navy work pants
      const thigh = new THREE.Mesh(new THREE.CylinderGeometry(0.078, 0.065, 0.38, 12), this.materials.humanPants);
      thigh.position.set(0, -0.18, 0.01);
      thigh.rotation.x = 0.04;
      legGroup.add(thigh);

      // Lower leg group pivoted at knee joint
      const lowerLegGroup = new THREE.Group();
      lowerLegGroup.position.set(0, -0.37, 0.02);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.062, 10, 8), this.materials.humanPants);
      lowerLegGroup.add(knee);

      const calf = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.054, 0.36, 12), this.materials.humanPants);
      calf.position.set(0, -0.18, -0.01);
      lowerLegGroup.add(calf);

      const ankleReflector = new THREE.Mesh(new THREE.CylinderGeometry(0.064, 0.064, 0.035, 12), this.materials.humanReflective);
      ankleReflector.position.set(0, -0.31, -0.01);
      lowerLegGroup.add(ankleReflector);

      // Heavy Leather Work Boot with Lugged Rubber Sole
      const bootGroup = new THREE.Group();
      bootGroup.position.set(0, -0.36, -0.02);

      const bootAnkle = new THREE.Mesh(new THREE.CylinderGeometry(0.056, 0.058, 0.10, 10), this.materials.humanBoots);
      bootAnkle.position.y = 0.04;
      bootGroup.add(bootAnkle);

      const bootUpper = new THREE.Mesh(new THREE.BoxGeometry(0.105, 0.075, 0.20), this.materials.humanBoots);
      bootUpper.position.set(0, -0.01, 0.05);
      bootGroup.add(bootUpper);

      const toeCap = new THREE.Mesh(new THREE.CylinderGeometry(0.052, 0.052, 0.09, 10).rotateZ(Math.PI / 2), this.materials.bootSole);
      toeCap.position.set(0, -0.015, 0.13);
      bootGroup.add(toeCap);

      const sole = new THREE.Mesh(new THREE.BoxGeometry(0.115, 0.026, 0.24), this.materials.bootSole);
      sole.position.set(0, -0.06, 0.045);
      bootGroup.add(sole);

      const heel = new THREE.Mesh(new THREE.BoxGeometry(0.112, 0.022, 0.08), this.materials.bootSole);
      heel.position.set(0, -0.045, -0.04);
      bootGroup.add(heel);

      lowerLegGroup.add(bootGroup);
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

    // Handheld Railway Track Gauge & Tool in Left Glove
    const toolShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.55, 8), this.materials.industrialSteel);
    toolShaft.position.set(-0.02, -0.28, 0.08);
    const toolHead = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.04, 0.04), this.materials.hazardYellow);
    toolHead.position.set(0, 0.24, 0);
    toolShaft.add(toolHead);
    if (group.userData.forearmL) {
      group.userData.forearmL.add(toolShaft);
    }
    group.userData.toolShaft = toolShaft;

    return group;
  }

  // 2. Wildlife / Stray Animal (Deer / Stray Calf - Mass: 55 kg <= 150 kg -> SCOOPABLE)
  // Sculpted anatomical quadruped with contoured head, alert ears, articulated legs, and tail
  buildAnimalMesh() {
    const group = new THREE.Group();
    group.name = 'wildlifeCalf';

    // Barrel Body
    const body = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.21, 0.88, 12).rotateX(Math.PI / 2), this.materials.animalFur);
    body.position.set(0, 0.68, 0);
    body.scale.set(0.92, 1.15, 1.0);
    body.castShadow = true;
    group.add(body);

    const chest = new THREE.Mesh(new THREE.SphereGeometry(0.24, 12, 10), this.materials.animalFur);
    chest.position.set(0, 0.70, 0.36);
    group.add(chest);

    const rump = new THREE.Mesh(new THREE.SphereGeometry(0.22, 12, 10), this.materials.animalFur);
    rump.position.set(0, 0.70, -0.36);
    group.add(rump);

    // Neck
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.16, 0.45, 10), this.materials.animalFur);
    neck.position.set(0, 0.92, 0.48);
    neck.rotation.x = -0.55;
    group.add(neck);

    // Contoured Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.14, 0.68);
    headGroup.rotation.x = 0.15;

    const cranium = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), this.materials.animalFur);
    cranium.scale.set(0.95, 1.05, 1.15);
    headGroup.add(cranium);

    const muzzle = new THREE.Mesh(new THREE.ConeGeometry(0.085, 0.22, 10).rotateX(Math.PI / 2), this.materials.animalFur);
    muzzle.position.set(0, -0.04, 0.18);
    headGroup.add(muzzle);

    const nose = new THREE.Mesh(new THREE.SphereGeometry(0.03, 8, 8), this.materials.animalMuzzle);
    nose.position.set(0, -0.02, 0.29);
    headGroup.add(nose);

    [-0.085, 0.085].forEach(ex => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 8), this.materials.cattleEye);
      eye.position.set(ex, 0.05, 0.09);
      headGroup.add(eye);
    });

    const ears = [];
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.045, 0.18, 6), this.materials.animalFur);
      ear.position.set(side * 0.11, 0.12, -0.04);
      ear.rotation.z = side * -0.55;
      ear.rotation.x = -0.2;
      headGroup.add(ear);
      ears.push(ear);
    });

    group.add(headGroup);

    // 4 Quadruped Legs with Anatomical Hip/Shoulder Pivots and Knee Joints
    const legs = [];
    [
      { x: -0.16, z: 0.30, isFront: true },
      { x:  0.16, z: 0.30, isFront: true },
      { x: -0.15, z: -0.32, isFront: false },
      { x:  0.15, z: -0.32, isFront: false }
    ].forEach(leg => {
      // Hip / Shoulder Pivot Group at y = 0.62
      const legGroup = new THREE.Group();
      legGroup.position.set(leg.x, 0.62, leg.z);

      const upperRadius = leg.isFront ? 0.065 : 0.075;
      const upper = new THREE.Mesh(new THREE.CylinderGeometry(upperRadius, 0.045, 0.30, 8), this.materials.animalFur);
      upper.position.y = -0.14;
      legGroup.add(upper);

      // Knee / Hock Pivot Group at y = -0.28
      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.28, leg.isFront ? 0.01 : -0.02);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.046, 8, 8), this.materials.animalFur);
      kneeGroup.add(knee);

      const lower = new THREE.Mesh(new THREE.CylinderGeometry(0.042, 0.032, 0.28, 8), this.materials.animalFur);
      lower.position.y = -0.14;
      kneeGroup.add(lower);

      const paw = new THREE.Mesh(new THREE.BoxGeometry(0.055, 0.042, 0.08), this.materials.animalHoof);
      paw.position.set(0, -0.28, 0.015);
      kneeGroup.add(paw);

      legGroup.add(kneeGroup);
      legs.push({ group: legGroup, kneeGroup: kneeGroup, isFront: leg.isFront });
      group.add(legGroup);
    });

    // Tail
    const tail = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.01, 0.28, 6), this.materials.animalFur);
    tail.position.set(0, 0.65, -0.52);
    tail.rotation.x = 0.4;
    group.add(tail);

    group.userData = {
      type: 'animal',
      body,
      chest,
      rump,
      headGroup,
      legs,
      tail,
      ears
    };

    return group;
  }

  // 3. Heavy Cattle / Stray Indian Zebu Bull (Mass: 480 kg > 150 kg -> OVERWEIGHT HAZARD)
  // Features prominent Indian Zebu dorsal hump, pendulous throat dewlap, curved horns, and cloven hooves
  buildHeavyCattleMesh() {
    const group = new THREE.Group();
    group.name = 'desiCattleZebu';

    // A. Main Torso Barrel & Ribcage
    const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.48, 0.44, 1.35, 14).rotateX(Math.PI / 2), this.materials.cattleHide);
    barrel.position.set(0, 1.05, 0);
    barrel.scale.set(0.95, 1.15, 1.0);
    barrel.castShadow = true;
    group.add(barrel);

    // Rear Haunches / Rump
    const haunches = new THREE.Mesh(new THREE.SphereGeometry(0.46, 14, 12), this.materials.cattleHide);
    haunches.position.set(0, 1.08, -0.62);
    haunches.scale.set(0.92, 1.08, 0.95);
    group.add(haunches);

    // Shoulder Girdle / Withers
    const shoulders = new THREE.Mesh(new THREE.SphereGeometry(0.48, 14, 12), this.materials.cattleHide);
    shoulders.position.set(0, 1.08, 0.58);
    shoulders.scale.set(0.96, 1.12, 0.95);
    group.add(shoulders);

    // B. Prominent Indian Zebu Dorsal Hump
    const hump = new THREE.Mesh(new THREE.SphereGeometry(0.28, 14, 12), this.materials.cattleHide);
    hump.position.set(0, 1.52, 0.42);
    hump.scale.set(0.72, 1.15, 1.35);
    hump.castShadow = true;
    group.add(hump);

    // C. Muscular Neck & Throat Dewlap (Gala-Kambal)
    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.36, 0.65, 12), this.materials.cattleHide);
    neck.position.set(0, 1.25, 0.95);
    neck.rotation.x = -0.55;
    neck.castShadow = true;
    group.add(neck);

    const dewlap = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.38, 0.55), this.materials.cattleHide);
    dewlap.position.set(0, 0.92, 0.98);
    dewlap.rotation.x = -0.45;
    group.add(dewlap);

    // D. Sculpted Bovine Head
    const headGroup = new THREE.Group();
    headGroup.position.set(0, 1.35, 1.32);
    headGroup.rotation.x = 0.25;

    const cranium = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.32, 0.38), this.materials.cattleHide);
    cranium.position.set(0, 0.05, 0);
    headGroup.add(cranium);

    const muzzle = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.22, 0.32), this.materials.cattleHide);
    muzzle.position.set(0, -0.06, 0.25);
    headGroup.add(muzzle);

    const nosePad = new THREE.Mesh(new THREE.BoxGeometry(0.25, 0.12, 0.08), this.materials.cattleDark);
    nosePad.position.set(0, -0.08, 0.41);
    headGroup.add(nosePad);

    [-0.055, 0.055].forEach(nx => {
      const nostril = new THREE.Mesh(new THREE.CylinderGeometry(0.018, 0.018, 0.04, 8).rotateX(Math.PI / 2), this.materials.cattleDark);
      nostril.position.set(nx, -0.07, 0.45);
      headGroup.add(nostril);
    });

    [-0.17, 0.17].forEach(side => {
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.032, 10, 8), this.materials.cattleEye);
      eye.position.set(side, 0.08, 0.08);
      headGroup.add(eye);
    });

    const cattleEars = [];
    [-1, 1].forEach(side => {
      const ear = new THREE.Mesh(new THREE.ConeGeometry(0.07, 0.32, 8), this.materials.cattleHide);
      ear.position.set(side * 0.22, 0.05, -0.05);
      ear.rotation.z = side * -1.15;
      ear.rotation.x = -0.3;
      ear.scale.set(1.0, 1.0, 0.35);
      headGroup.add(ear);
      cattleEars.push(ear);
    });

    // Elegant Swept Curved Horns
    [-1, 1].forEach(side => {
      const hornCurvePts = [
        new THREE.Vector3(side * 0.12, 0.18, -0.05),
        new THREE.Vector3(side * 0.28, 0.38, -0.08),
        new THREE.Vector3(side * 0.32, 0.58, 0.02),
        new THREE.Vector3(side * 0.24, 0.68, 0.12)
      ];
      const hornCurve = new THREE.CatmullRomCurve3(hornCurvePts);
      const hornGeo = new THREE.TubeGeometry(hornCurve, 12, 0.042, 8, false);
      const horn = new THREE.Mesh(hornGeo, this.materials.cattleHorn);
      headGroup.add(horn);

      const hornTip = new THREE.Mesh(new THREE.ConeGeometry(0.028, 0.10, 8), this.materials.cattleDark);
      hornTip.position.copy(hornCurvePts[3]);
      hornTip.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), new THREE.Vector3(-side * 0.4, 0.8, 0.4).normalize());
      headGroup.add(hornTip);
    });

    group.add(headGroup);

    // E. 4 Articulated Quadruped Legs with Anatomical Shoulder/Hip Pivots & Cloven Hooves
    const cattleLegs = [];
    [
      { x: -0.28, z: 0.52, isFront: true },
      { x:  0.28, z: 0.52, isFront: true },
      { x: -0.26, z: -0.55, isFront: false },
      { x:  0.26, z: -0.55, isFront: false }
    ].forEach(leg => {
      // Hip / Shoulder Pivot Group at y = 0.95
      const legGroup = new THREE.Group();
      legGroup.position.set(leg.x, 0.95, leg.z);

      const upperRadius = leg.isFront ? 0.11 : 0.13;
      const upperLeg = new THREE.Mesh(new THREE.CylinderGeometry(upperRadius, 0.085, 0.45, 10), this.materials.cattleHide);
      upperLeg.position.y = -0.22;
      legGroup.add(upperLeg);

      // Knee / Hock Pivot Group at y = -0.45
      const kneeGroup = new THREE.Group();
      kneeGroup.position.set(0, -0.45, leg.isFront ? 0.01 : -0.03);

      const knee = new THREE.Mesh(new THREE.SphereGeometry(0.082, 10, 8), this.materials.cattleHide);
      kneeGroup.add(knee);

      const lowerLeg = new THREE.Mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.38, 10), this.materials.cattleHide);
      lowerLeg.position.y = -0.19;
      kneeGroup.add(lowerLeg);

      const pastern = new THREE.Mesh(new THREE.CylinderGeometry(0.062, 0.075, 0.08, 10), this.materials.cattleDark);
      pastern.position.set(0, -0.40, 0.01);
      kneeGroup.add(pastern);

      [-0.024, 0.024].forEach(hx => {
        const hoofClaw = new THREE.Mesh(new THREE.BoxGeometry(0.044, 0.065, 0.10), this.materials.cattleDark);
        hoofClaw.position.set(hx, -0.45, 0.02);
        kneeGroup.add(hoofClaw);
      });

      legGroup.add(kneeGroup);
      cattleLegs.push({ group: legGroup, kneeGroup: kneeGroup, isFront: leg.isFront });
      group.add(legGroup);
    });

    // F. Long Tail with Tufted Switch
    const tailPts = [
      new THREE.Vector3(0, 1.10, -0.88),
      new THREE.Vector3(0.02, 0.85, -0.92),
      new THREE.Vector3(-0.02, 0.60, -0.90),
      new THREE.Vector3(0, 0.42, -0.86)
    ];
    const tailCurve = new THREE.CatmullRomCurve3(tailPts);
    const tailMesh = new THREE.Mesh(new THREE.TubeGeometry(tailCurve, 10, 0.024, 6, false), this.materials.cattleHide);
    group.add(tailMesh);

    const tailTuft = new THREE.Mesh(new THREE.ConeGeometry(0.055, 0.18, 8), this.materials.cattleDark);
    tailTuft.position.set(0, 0.32, -0.85);
    tailTuft.rotation.x = 0.2;
    group.add(tailTuft);

    group.userData = {
      type: 'cow',
      barrel,
      haunches,
      dewlap,
      neck,
      headGroup,
      legs: cattleLegs,
      tail: tailMesh,
      ears: cattleEars
    };

    return group;
  }

  // 4. Industrial Railway Maintenance Tool Chest / Track Obstacle (Mass: 40 kg <= 150 kg -> SCOOPABLE)
  // Heavy timber gang chest with galvanized steel angles, rivets, padlock, and hazard stripes
  buildDebrisMesh() {
    const group = new THREE.Group();
    group.name = 'trackCargoDebris';

    const chest = new THREE.Mesh(new THREE.BoxGeometry(0.85, 0.52, 0.65), this.materials.woodCrate);
    chest.position.y = 0.26;
    chest.castShadow = true;
    group.add(chest);

    // Steel Edge Reinforcement Angles with Rivets
    const strapTop = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.06, 0.67), this.materials.industrialSteel);
    strapTop.position.y = 0.48;
    group.add(strapTop);

    const strapBot = new THREE.Mesh(new THREE.BoxGeometry(0.87, 0.06, 0.67), this.materials.industrialSteel);
    strapBot.position.y = 0.05;
    group.add(strapBot);

    // Center Steel Clasp & Cast Brass Padlock
    const clasp = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.18, 0.03), this.materials.industrialSteel);
    clasp.position.set(0, 0.32, 0.33);
    group.add(clasp);

    const padlock = new THREE.Mesh(new THREE.BoxGeometry(0.06, 0.07, 0.03), this.materials.brass);
    padlock.position.set(0, 0.25, 0.35);
    group.add(padlock);

    // Yellow/Black Hazard Striped Decal Plate
    const hazardPlate = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.09, 0.02), this.materials.hazardYellow);
    hazardPlate.position.set(0, 0.16, 0.33);
    group.add(hazardPlate);

    // Heavy Steel Drop Handles on Sides
    [-0.435, 0.435].forEach(hx => {
      const handlePlate = new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.10, 0.14), this.materials.industrialSteel);
      handlePlate.position.set(hx, 0.28, 0);
      group.add(handlePlate);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.045, 0.012, 6, 12), this.materials.industrialSteel);
      ring.position.set(hx + (hx > 0 ? 0.015 : -0.015), 0.26, 0);
      ring.rotation.y = Math.PI / 2;
      group.add(ring);
    });

    group.userData = {
      type: 'crate'
    };

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
  // Living On-Track Obstacle Animation Loop
  // Simulates breathing, head scanning, contrapposto weight-shifts,
  // grazing, tail swishes, ear twitches, and startled train-avoidance panic
  // ------------------------------------------------------------------
  animateLivingObstacles(dt, trainSpeedMs) {
    this.animTime += dt;
    const t = this.animTime;

    this.obstacles.forEach(obs => {
      if (obs.isCollected || !obs.mesh || !obs.mesh.userData) return;
      const ud = obs.mesh.userData;

      // Distance from oncoming train
      const dist = obs.forwardMeters !== undefined ? obs.forwardMeters : 100;
      const isTrainClose = dist < 95;  // Reacts when train enters 95m line-of-sight
      const isUrgent = dist < 50;      // Desperate panic when train is < 50m

      // ----------------------------------------------------------------
      // 1. HUMAN TRACK WORKER / RAILWAY INSPECTOR
      // ----------------------------------------------------------------
      if (ud.type === 'human') {
        const seed = obs.id * 2.1;
        const localT = t + seed;

        if (!isTrainClose) {
          // A. NORMAL ACTIVE TRACK INSPECTION / IDLE (Relaxed, breathing, alive)
          const breath = Math.sin(localT * 2.2);
          if (ud.torsoGroup) {
            ud.torsoGroup.scale.set(1.0 + 0.015 * breath, 1.0 + 0.008 * breath, 1.0 + 0.015 * breath);
            ud.torsoGroup.rotation.y = Math.sin(localT * 0.45) * 0.10;
            ud.torsoGroup.rotation.x = 0.06 + Math.sin(localT * 0.6) * 0.04; // Gentle forward lean inspecting track
          }

          // Head Scanning (checking sleepers, rail joints, and scenery)
          if (ud.headGroup) {
            const headScanY = Math.sin(localT * 0.5) * 0.35 + Math.sin(localT * 1.3) * 0.15;
            const headScanX = 0.22 + Math.cos(localT * 0.7) * 0.12; // Looking down at rail line
            ud.headGroup.rotation.set(headScanX, headScanY, 0);
          }

          // Natural Arm Idling (holding gauge tool, relaxing)
          if (ud.armL) {
            ud.armL.rotation.x = -0.18 + Math.sin(localT * 0.8) * 0.08;
            ud.armL.rotation.z = -0.15 + Math.cos(localT * 0.5) * 0.05;
          }
          if (ud.forearmL) {
            ud.forearmL.rotation.x = -0.38 + Math.sin(localT * 0.8) * 0.10;
          }

          if (ud.armR) {
            ud.armR.rotation.x = -0.12 - Math.sin(localT * 0.7) * 0.06;
            ud.armR.rotation.z = 0.14 - Math.cos(localT * 0.6) * 0.04;
          }
          if (ud.forearmR) {
            ud.forearmR.rotation.x = -0.30 - Math.sin(localT * 0.7) * 0.08;
          }

          // Natural Contrapposto Weight Shift on legs
          const weightShift = Math.sin(localT * 0.35);
          if (ud.legL) {
            ud.legL.rotation.x = 0.03 + weightShift * 0.05;
            ud.legL.rotation.z = weightShift * 0.02;
          }
          if (ud.lowerLegL) {
            ud.lowerLegL.rotation.x = -Math.max(0, weightShift * 0.08);
          }
          if (ud.legR) {
            ud.legR.rotation.x = 0.03 - weightShift * 0.05;
            ud.legR.rotation.z = weightShift * 0.02;
          }
          if (ud.lowerLegR) {
            ud.lowerLegR.rotation.x = -Math.max(0, -weightShift * 0.08);
          }
        } else {
          // B. STARTLED ALARM / PANIC REACTION (Train horn blaring!)
          const panicLerp = isUrgent ? 1.0 : Math.min(1.0, (95 - dist) / 45);

          // Head snaps directly up to lock onto approaching locomotive
          if (ud.headGroup) {
            ud.headGroup.rotation.x = THREE.MathUtils.lerp(0.22, -0.20, panicLerp);
            ud.headGroup.rotation.y = THREE.MathUtils.lerp(0, Math.sin(localT * 14.0) * 0.08, panicLerp);
          }

          // Torso pulls backward in shock, hyperventilating
          if (ud.torsoGroup) {
            ud.torsoGroup.rotation.x = THREE.MathUtils.lerp(0.06, -0.25, panicLerp);
            const heavyBreath = Math.sin(localT * 7.0) * 0.06;
            ud.torsoGroup.scale.set(1.0 + heavyBreath, 1.0 + heavyBreath * 0.5, 1.0 + heavyBreath);
          }

          // Left arm frantically waving / warning oncoming train
          if (ud.armL) {
            const waveX = THREE.MathUtils.lerp(-0.18, -1.95 + Math.sin(localT * 14.0) * 0.35, panicLerp);
            const waveZ = THREE.MathUtils.lerp(-0.15, -0.50 + Math.cos(localT * 14.0) * 0.20, panicLerp);
            ud.armL.rotation.set(waveX, 0, waveZ);
          }
          if (ud.forearmL) {
            ud.forearmL.rotation.x = THREE.MathUtils.lerp(-0.38, -0.90, panicLerp);
          }

          // Right arm raises defensively to protect face/body
          if (ud.armR) {
            const shieldX = THREE.MathUtils.lerp(-0.12, -1.60 + Math.sin(localT * 8.0) * 0.15, panicLerp);
            const shieldZ = THREE.MathUtils.lerp(0.14, 0.42, panicLerp);
            ud.armR.rotation.set(shieldX, 0, shieldZ);
          }
          if (ud.forearmR) {
            ud.forearmR.rotation.x = THREE.MathUtils.lerp(-0.30, -1.15, panicLerp);
          }

          // Legs crouch into athletic evasive posture
          if (ud.legL) ud.legL.rotation.x = THREE.MathUtils.lerp(0.03, 0.42, panicLerp);
          if (ud.lowerLegL) ud.lowerLegL.rotation.x = THREE.MathUtils.lerp(0, -0.70, panicLerp);
          if (ud.legR) ud.legR.rotation.x = THREE.MathUtils.lerp(0.03, 0.30, panicLerp);
          if (ud.lowerLegR) ud.lowerLegR.rotation.x = THREE.MathUtils.lerp(0, -0.60, panicLerp);
        }
      }

      // ----------------------------------------------------------------
      // 2. WILDLIFE / CALF / DEER (Alert, agile natural life)
      // ----------------------------------------------------------------
      else if (ud.type === 'animal') {
        const localT = t + obs.id * 2.5;
        const breath = Math.sin(localT * 2.8);

        if (ud.body) {
          ud.body.scale.set(0.92 + 0.02 * breath, 1.15 + 0.015 * breath, 1.0);
        }

        // Tail flicking
        if (ud.tail) {
          ud.tail.rotation.z = Math.sin(localT * 4.5) * 0.45;
          ud.tail.rotation.x = 0.4 + Math.sin(localT * 2.0) * 0.15;
        }

        if (!isTrainClose) {
          // Grazing on ballast weeds with subtle leg weight shifts
          if (ud.headGroup) {
            const headPitch = 0.20 + Math.sin(localT * 0.7) * 0.35;
            const headYaw = Math.sin(localT * 1.2) * 0.25;
            ud.headGroup.rotation.set(headPitch, headYaw, 0);
          }
          // Ears twitching independently
          if (ud.ears) {
            ud.ears.forEach((ear, idx) => {
              ear.rotation.z = (idx === 0 ? -0.55 : 0.55) + Math.sin(localT * 6.0 + idx * 2.0) * 0.22;
            });
          }
          // Natural quadruped idling stance weight shift
          if (ud.legs) {
            const legShift = Math.sin(localT * 0.9) * 0.04;
            ud.legs.forEach((leg, idx) => {
              leg.group.rotation.x = (idx % 2 === 0 ? legShift : -legShift);
            });
          }
        } else {
          // Startled wildlife: head high, ears back, alarm stance
          if (ud.headGroup) {
            ud.headGroup.rotation.x = -0.45;
            ud.headGroup.rotation.y = Math.sin(localT * 12.0) * 0.15;
          }
          if (ud.ears) {
            ud.ears.forEach(ear => { ear.rotation.x = 0.45; });
          }
          if (ud.tail) {
            ud.tail.rotation.x = 0.90;
          }
          if (ud.legs) {
            ud.legs.forEach(leg => {
              leg.group.rotation.x = leg.isFront ? -0.18 : 0.14;
              if (leg.kneeGroup) {
                leg.kneeGroup.rotation.x = leg.isFront ? 0.24 : -0.20;
              }
            });
          }
        }
      }

      // ----------------------------------------------------------------
      // 3. DESI COW / ZEBU BULL (Authentic cattle behavior)
      // ----------------------------------------------------------------
      else if (ud.type === 'cow' || ud.type === 'cattle') {
        const localT = t + obs.id * 1.6;
        const breath = Math.sin(localT * 1.8);

        // Barrel breathing
        if (ud.barrel) {
          ud.barrel.scale.set(0.95 + 0.02 * breath, 1.15 + 0.02 * breath, 1.0);
        }

        // Characteristic cattle fly-swatting tail swish
        if (ud.tail) {
          ud.tail.rotation.z = Math.sin(localT * 3.2) * 0.60 + Math.sin(localT * 7.5) * 0.20;
          ud.tail.rotation.x = 0.15 + Math.abs(Math.sin(localT * 1.6)) * 0.25;
        }

        // Natural heavy leg weight shifting
        if (ud.legs) {
          const cowShift = Math.sin(localT * 0.6) * 0.03;
          ud.legs.forEach((leg, idx) => {
            leg.group.rotation.x = (idx % 2 === 0 ? cowShift : -cowShift);
          });
        }

        // Chewing / Rumination & Dewlap sway
        if (ud.headGroup) {
          const chew = Math.sin(localT * 4.5) * 0.05;
          const headYaw = Math.sin(localT * 0.4) * 0.22;
          const headPitch = isTrainClose ? -0.38 : (0.12 + Math.sin(localT * 0.5) * 0.22);
          ud.headGroup.rotation.set(headPitch + chew, headYaw, 0);
        }

        if (ud.dewlap) {
          ud.dewlap.rotation.z = Math.sin(localT * 2.0) * 0.18;
        }

        // Ear droop and flick
        if (ud.ears) {
          ud.ears.forEach((ear, idx) => {
            ear.rotation.z = (idx === 0 ? -1.15 : 1.15) + Math.sin(localT * 4.0 + idx * 3.0) * 0.18;
          });
        }
      }
    });
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
      obs.forwardMeters = forwardMeters;

      // Only consider obstacles within scanning range ahead (up to 140m)
      if (forwardMeters < minForwardDist && forwardMeters < 140) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    // Run dynamic living on-track organic animations for all obstacles
    this.animateLivingObstacles(dt, trainSpeedMs);

    // If an obstacle is detected within sensor range (up to 110m)
    if (closestObstacle && minForwardDist < 110) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;
      this.telemetry.mass = closestObstacle.mass;

      // Dual Safety Condition: Collect ONLY when Mass <= 150 kg AND Speed <= 160 km/h
      const isWeightSafe = closestObstacle.mass <= 150;
      const isSpeedSafe = speedKmh <= 160;
      const canCollect = isWeightSafe && isSpeedSafe;
      this.telemetry.canCollect = canCollect;

      // ----------------------------------------------------------------
      // SAFETY CONTROLLER LOGIC:
      // Case A: Safe for capture (Mass <= 150 kg & Speed <= 160 km/h)
      // Net is default closed; Rapidly opens with 3D pneumatic animation
      // ----------------------------------------------------------------
      if (canCollect) {
        this.telemetry.action = 'AIRBAG NET RAPID DEPLOY & RESCUE SCOOP';
        this.telemetry.alertType = 'deploy';

        // 1. Rapid Pneumatic Inflation Trigger: Opens with animation at <= 80m
        if (minForwardDist <= 80 && !captureNet.isDeployed) {
          captureNet.triggerSolenoidDeploy(audio);
          if (audio) audio.playTargetAcquiredBeep(false);
          this.telemetry.alertMessage = `⚡ AI KAVACH: ${closestObstacle.name.toUpperCase()} DETECTED (${closestObstacle.mass}KG ≤ 150KG, SPEED ≤ 160 KM/H). AIRBAG NET INFLATING!`;
        }

        // 2. Physical Scoop / Collection Event right as the scoop tip meets obstacle (<= 14.0m from train center)
        if (minForwardDist <= 14.0) {
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
      // Case B: OVERWEIGHT (> 150 kg) or OVERSPEED (> 160 km/h)
      // DO NOT OPEN NET! Apply Emergency Brake + Horn Intervention
      // ----------------------------------------------------------------
      else {
        // Ensure net remains CLOSED/STOWED to avoid structural damage
        if (captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }

        const reason = !isWeightSafe
          ? `OVERWEIGHT (>150KG): ${closestObstacle.mass}KG EXCEEDS NET LIMIT`
          : `OVERSPEED (>160 KM/H): SPEED ${Math.round(speedKmh)} KM/H TOO HIGH FOR NET`;

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

