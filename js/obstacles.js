// ====================================================================
// Indian Railways Real-Time AI Obstacle & Safety Recovery System
// Manages Track Obstacles, 1km LiDAR / Camera Detection,
// Weight-Tiered Electric Shock Deterrence, and 30-40m Inflatable Scoop Net
// ====================================================================

import * as THREE from 'three';

export class ObstacleManager {
  constructor(scene, track) {
    this.scene = scene;
    this.track = track;
    this.train = null;
    this.obstacles = [];
    this.nextId = 1;

    // Active Non-Lethal Electric Shock Suite (Track Clearance)
    this.activeDeterrenceMode = 'electric_shock';
    this.deterrenceSpecs = {
      electric_shock: {
        id: 'electric_shock',
        name: 'Track Electric Shock (Non-Lethal Track Clearance)',
        shortTitle: 'TRACK ELECTRIC SHOCK',
        badge: 'E-SHOCK PULSE',
        color: '#38bdf8',
        detail: 'Discharges non-lethal pulsed electrical gradient across track rails and forward contact sweepers (compliant with IEC 60335-2-76 / RDSO). Prompts immediate clearance off track without burns or physical injury.'
      }
    };

    // 3D Visual Effects Group for Active Deterrence Discharges
    this.fxGroup = new THREE.Group();
    this.scene.add(this.fxGroup);
    this.activeFX = null;
    this.fxTimer = 0;
    this.activePowerSourceIndices = null;

    // Detection telemetry fed to HUD and Safety Controller
    this.telemetry = {
      targetDetected: false,
      type: null,
      name: 'NONE (TRACK CLEAR)',
      distance: null,
      mass: null,
      tailoredSpec: null,
      tailoredLabel: null,
      canCollect: false,
      action: 'STANDBY',
      alertMessage: null,
      alertType: 'info', // 'info' | 'deploy' | 'hazard' | 'success'
      collectedCount: 0,
      collectedWeight: 0,
      deterrenceActive: false,
      deterrenceMode: 'electric_shock'
    };

    this.animTime = 0;

    // Industrial Track Obstacle Materials
    this.materials = {
      woodCrate: new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.85 }), // Weathered Railway Teak Wood
      industrialSteel: new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.25, metalness: 0.88 }),
      hazardYellow: new THREE.MeshStandardMaterial({ color: 0xeab308, roughness: 0.35 }),
      brass: new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.25, metalness: 0.88 })
    };

    // Track starts 100% clear (humans & animals completely removed)
    this.initDefaultObstacles();
  }

  setTrain(train) {
    this.train = train;
  }

  // ------------------------------------------------------------------
  // Track Obstacle Model Builder: Industrial Cargo Crate / Tool Chest
  // ------------------------------------------------------------------
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
  spawnObstacle(type = 'debris', trackProgress = 0, moveOffTrack = null, lateralOffset = 0, customMass = null, customName = null) {
    const mesh = this.buildDebrisMesh();
    const name = customName || 'Track Debris (Cargo Crate)';
    const mass = customMass !== null && customMass !== undefined ? customMass : 40;

    const transform = this.track.getTrackTransform(trackProgress, 0);
    mesh.position.copy(transform.position);
    if (lateralOffset !== 0 && transform.normal) {
      mesh.position.add(transform.normal.clone().multiplyScalar(lateralOffset));
    }
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);

    const obstacleObj = {
      id: this.nextId++,
      type: 'debris',
      name,
      mass,
      mesh,
      progress: trackProgress,
      lateralOffset: lateralOffset || 0,
      isCollected: false,
      isDeterred: false,
      hasBeenShocked: false,
      shockTime: 0,
      isCleared: false,
      isSideShocked: false,
      lastSideShockTime: 0,
      isSideRepelled: false,
      sideRepelStartTime: 0,
      sideRepelDir: null,
      moveOffTrackOnShock: moveOffTrack !== null ? moveOffTrack : false
    };

    this.scene.add(mesh);
    this.obstacles.push(obstacleObj);
    return obstacleObj;
  }

  // Initial track obstacles: completely clear (humans & animals removed)
  initDefaultObstacles() {
    while (this.obstacles.length > 0) {
      const obs = this.obstacles.pop();
      if (obs.mesh) this.scene.remove(obs.mesh);
    }
  }

  // Spawn immediately ahead of the train on demand (via HUD test buttons)
  spawnAheadOfTrain(trainProgress, trackLength, type = 'debris', distanceMeters = 85, moveOffTrack = null, customMass = null, customName = null) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle('debris', targetProgress, moveOffTrack, 0, customMass, customName);
  }

  // Spawn obstacle beside one of the train coaches within 2-3m perimeter
  spawnBesideCoach(trainProgress, trackLength, coachIndex = 1, lateralOffset = 2.4) {
    const locoLen = 20.5;
    const coachLen = 23.5;
    const couplerGap = 0.8;
    const distBack = (locoLen / 2) + couplerGap + (coachLen / 2) + coachIndex * (coachLen + couplerGap);
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;
    const coachProgress = (trainProgress - (distBack / actualTrackLength) + 1.0) % 1.0;
    return this.spawnObstacle('debris', coachProgress, true, lateralOffset, 30, 'Track Debris (Coach Flank)');
  }

  // ------------------------------------------------------------------
  // Active Non-Lethal Electric Shock Protocol (Track Clearance)
  // ------------------------------------------------------------------
  setDeterrenceMode(mode) {
    this.activeDeterrenceMode = 'electric_shock';
    this.telemetry.deterrenceMode = 'electric_shock';
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceSpecs(mode) {
    return this.deterrenceSpecs.electric_shock;
  }

  getDeterrenceTickerData(mode) {
    return {
      arch: 'E-SHOCK (RDSO)',
      polarization: 'PULSED GRADIENT',
      carrier: 'IEC 60335 COMPLIANT',
      focusState: 'CONTACT SWEEP ARMED',
      safety: '100% NON-LETHAL (ZERO HARM)'
    };
  }

  // ------------------------------------------------------------------
  // Weight-Tiered Electric Shock Specifications (1 to 4 Power Sources)
  // Rule 1: Under 150 kg -> ONLY 1 power source (Down-Left preferred ground angle)
  // Rule 2: 150 kg to 250 kg -> 2 power sources (Down-Left + Down-Right)
  // Rule 3: 250 kg to 350 kg -> 3 power sources (Top-Left + Top-Right + Down-Left)
  // Rule 4: 350 kg and above -> All 4 power sources (Quad full-power)
  // ------------------------------------------------------------------
  getTailoredShockSpecs(obs) {
    if (!obs) {
      return {
        tier: 1,
        powerSourcesCount: 1,
        activeIndices: [2],
        voltage: '2.0 kV',
        current: '1.2 mA',
        energy: '0.04 J',
        typeLabel: 'LIGHT HAZARD (<150KG)',
        badge: '1x POWER SOURCE: 2.0 kV / 1.2 mA',
        desc: 'Single power source at preferred ground angle'
      };
    }

    const mass = obs.mass !== undefined ? obs.mass : 40;

    if (mass < 150) {
      // TIER 1: Under 150 kg -> ONLY ONE power source at preferred ground angle (Down-Left)
      return {
        tier: 1,
        powerSourcesCount: 1,
        activeIndices: [2],
        activeLabels: ['Down-Left (Preferred Ground Angle)'],
        voltage: '2.0 kV',
        current: '1.2 mA',
        energy: '0.04 J',
        compliance: 'IEC 60479-1 / RDSO Protocol',
        typeLabel: 'LIGHT HAZARD (<150KG)',
        badge: '1x POWER SOURCE: 2.0 kV / 1.2 mA',
        color: '#38bdf8',
        desc: `Under 150 kg (${mass} kg): 1 power source active (Down-Left preferred ground angle).`
      };
    } else if (mass >= 150 && mass < 250) {
      // TIER 2: 150 kg to 250 kg -> TWO power sources (Down-Left + Down-Right)
      return {
        tier: 2,
        powerSourcesCount: 2,
        activeIndices: [2, 3],
        activeLabels: ['Down-Left', 'Down-Right'],
        voltage: '6.0 kV',
        current: '3.0 mA',
        energy: '0.95 J',
        compliance: 'IEC 60335-2-76 / RDSO Track Deterrence',
        typeLabel: 'MEDIUM HAZARD (150-250KG)',
        badge: '2x POWER SOURCES: 6.0 kV / 3.0 mA',
        color: '#f97316',
        desc: `150-250 kg (${mass} kg): 2 power sources active (Down-Left + Down-Right bilateral sweep).`
      };
    } else if (mass >= 250 && mass < 350) {
      // TIER 3: 250 kg to 350 kg -> THREE power sources (Top-Left + Top-Right + Down-Left)
      return {
        tier: 3,
        powerSourcesCount: 3,
        activeIndices: [0, 1, 2],
        activeLabels: ['Top-Left', 'Top-Right', 'Down-Left'],
        voltage: '7.2 kV',
        current: '3.5 mA',
        energy: '1.25 J',
        compliance: 'RDSO Safety Tier 3',
        typeLabel: 'HEAVY HAZARD (250-350KG)',
        badge: '3x POWER SOURCES: 7.2 kV / 3.5 mA',
        color: '#e11d48',
        desc: `250-350 kg (${mass} kg): 3 power sources active (Top-Left + Top-Right + Down-Left tri-channel beam).`
      };
    } else {
      // TIER 4: 350 kg and above -> ALL FOUR power sources (Quad full power)
      return {
        tier: 4,
        powerSourcesCount: 4,
        activeIndices: [0, 1, 2, 3],
        activeLabels: ['Top-Left', 'Top-Right', 'Down-Left', 'Down-Right'],
        voltage: '7.8 kV',
        current: '3.8 mA',
        energy: '1.40 J',
        compliance: 'RDSO Tech Circular 129 / IEC 60335-2-76',
        typeLabel: 'CRITICAL HAZARD (≥350KG)',
        badge: '4x POWER SOURCES: 7.8 kV / 3.8 mA',
        color: '#ec4899',
        desc: `350 kg and above (${mass} kg): All 4 power sources active (Quad full-power convergence).`
      };
    }
  }

  triggerDeterrence(obs, audio, train = null) {
    if (!obs || obs.isDeterred) return;
    if (train) this.train = train;

    obs.isDeterred = true;
    obs.hasBeenShocked = true;
    obs.shockTime = this.animTime;
    obs.deterMode = 'electric_shock';
    obs.fleeStartTime = this.animTime;
    obs.fleeDirection = (Math.random() > 0.5 ? 1 : -1);
    obs.isCleared = false;
    this.fxTimer = 1.2;

    if (audio) {
      audio.playElectricShockDischarge('debris', obs.mass);
    }

    this.spawnDeterrenceFX(obs, this.train);
  }

  triggerAnimalDeterrence(obs, audio, train = null) {
    return this.triggerDeterrence(obs, audio, train);
  }

  spawnDeterrenceFX(obs, train = null) {
    const activeTrain = train || this.train;

    // Clear previous FX
    while (this.fxGroup.children.length > 0) {
      const c = this.fxGroup.children[0];
      if (c.geometry) c.geometry.dispose();
      this.fxGroup.remove(c);
    }

    const obsPos = obs.mesh.position.clone();
    const tailored = this.getTailoredShockSpecs(obs);
    const activeIndices = tailored.activeIndices || [0, 1, 2, 3];
    this.activePowerSourceIndices = activeIndices;

    const emitters = (activeTrain && activeTrain.getShockEmitterWorldPositions)
      ? activeTrain.getShockEmitterWorldPositions()
      : null;

    const sparkColor = 0x38bdf8;
    const targetOffsets = [
      new THREE.Vector3(-0.25, 0.35, 0),
      new THREE.Vector3( 0.25, 0.35, 0),
      new THREE.Vector3(-0.25, 0.12, 0),
      new THREE.Vector3( 0.25, 0.12, 0)
    ];

    const fallbackFront = obsPos.clone().sub(
      this.track.getTrackTransform(obs.progress, 0).tangent.clone().normalize().multiplyScalar(obs.forwardMeters || 60)
    );
    const fallbackOffsets = [
      new THREE.Vector3(-1.25, 3.32, 0),
      new THREE.Vector3( 1.25, 3.32, 0),
      new THREE.Vector3(-1.35, 0.95, 0),
      new THREE.Vector3( 1.35, 0.95, 0)
    ];

    const segs = 16;
    for (let k = 0; k < activeIndices.length; k++) {
      const i = activeIndices[k];
      const emitter = (emitters && emitters[i]) ? emitters[i] : null;
      const p1 = emitter ? emitter.pos.clone() : fallbackFront.clone().add(fallbackOffsets[i]);
      const targetOffset = targetOffsets[i];
      const p2 = obsPos.clone().add(targetOffset);

      const pts = [];
      const dist = p1.distanceTo(p2);
      const jitterAmp = Math.min(1.2, Math.max(0.18, dist * 0.015));

      for (let s = 0; s <= segs; s++) {
        const t = s / segs;
        const p = p1.clone().lerp(p2, t);
        if (s > 0 && s < segs) {
          const envelope = Math.sin(t * Math.PI);
          p.x += (Math.random() - 0.5) * jitterAmp * envelope;
          p.y += (Math.random() - 0.5) * jitterAmp * 0.75 * envelope;
          p.z += (Math.random() - 0.5) * jitterAmp * envelope;
        }
        pts.push(p);
      }

      const geo = new THREE.BufferGeometry().setFromPoints(pts);
      const mat = new THREE.LineBasicMaterial({
        color: sparkColor,
        transparent: true,
        opacity: 0.95,
        linewidth: 2
      });
      const line = new THREE.Line(geo, mat);
      line.userData = {
        isLightning: true,
        arcIndex: i,
        emitterTip: emitter ? emitter.tip : null,
        fallbackOrigin: fallbackFront.clone().add(fallbackOffsets[i]),
        obs: obs,
        targetOffset: targetOffset,
        segs: segs
      };
      this.fxGroup.add(line);

      if (emitter && emitter.tip) {
        const nozzleFlare = new THREE.PointLight(sparkColor, 4.0, 8);
        emitter.tip.getWorldPosition(nozzleFlare.position);
        nozzleFlare.userData = { isNozzleFlare: true, emitterTip: emitter.tip };
        this.fxGroup.add(nozzleFlare);
      }
    }

    const lightPowerMult = activeIndices.length / 4;
    const sparkLight = new THREE.PointLight(sparkColor, 7.0 * (0.5 + 0.5 * lightPowerMult), 25);
    sparkLight.position.copy(obsPos.clone().add(new THREE.Vector3(0, 0.4, 0)));
    this.fxGroup.add(sparkLight);

    const sparkCount = Math.round(24 * (0.4 + 0.6 * lightPowerMult));
    const sparkGeo = new THREE.BufferGeometry();
    const sPos = [];
    for (let s = 0; s < sparkCount; s++) {
      sPos.push(
        obsPos.x + (Math.random() - 0.5) * 0.8,
        obsPos.y + Math.random() * 0.6,
        obsPos.z + (Math.random() - 0.5) * 0.8
      );
    }
    sparkGeo.setAttribute('position', new THREE.Float32BufferAttribute(sPos, 3));
    const sparkMat = new THREE.PointsMaterial({
      color: 0xe0f2fe,
      size: 0.08,
      transparent: true,
      opacity: 0.95
    });
    this.fxGroup.add(new THREE.Points(sparkGeo, sparkMat));

    if (activeTrain && activeTrain.pulseShockEmitters) {
      activeTrain.pulseShockEmitters(1.0, activeIndices);
    }
  }

  updateDeterrenceFX(dt) {
    if (this.fxTimer > 0) {
      this.fxTimer -= dt;
      const progress = Math.max(0, this.fxTimer / 1.2);

      if (this.train && this.train.pulseShockEmitters) {
        this.train.pulseShockEmitters(progress, this.activePowerSourceIndices);
      }

      const tempStart = new THREE.Vector3();
      const tempEnd = new THREE.Vector3();

      this.fxGroup.children.forEach(child => {
        if (child.isLine && child.userData.isLightning) {
          const ud = child.userData;
          if (ud.emitterTip) {
            ud.emitterTip.getWorldPosition(tempStart);
          } else {
            tempStart.copy(ud.fallbackOrigin);
          }

          if (ud.obs && ud.obs.mesh) {
            ud.obs.mesh.getWorldPosition(tempEnd);
            tempEnd.add(ud.targetOffset);
          }

          const posAttr = child.geometry.attributes.position;
          const arr = posAttr.array;
          const segs = ud.segs || 16;
          const dist = tempStart.distanceTo(tempEnd);
          const jitterAmp = Math.min(1.2, Math.max(0.18, dist * 0.015)) * progress;

          for (let i = 0; i <= segs; i++) {
            const t = i / segs;
            const p = tempStart.clone().lerp(tempEnd, t);
            if (i > 0 && i < segs) {
              const envelope = Math.sin(t * Math.PI);
              p.x += (Math.random() - 0.5) * jitterAmp * envelope;
              p.y += (Math.random() - 0.5) * jitterAmp * 0.75 * envelope;
              p.z += (Math.random() - 0.5) * jitterAmp * envelope;
            }
            arr[i * 3]     = p.x;
            arr[i * 3 + 1] = p.y;
            arr[i * 3 + 2] = p.z;
          }
          posAttr.needsUpdate = true;
          child.material.opacity = 0.95 * progress;
        } else if (child.isPointLight) {
          if (child.userData.isNozzleFlare && child.userData.emitterTip) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 4.0 : 1.5) * progress;
          } else if (child.userData.isSideNozzleFlare && child.userData.emitterTip) {
            child.userData.emitterTip.getWorldPosition(child.position);
            child.intensity = (Math.random() > 0.3 ? 5.0 : 2.0) * progress;
          } else if (child.userData.isSideTargetLight && child.userData.obs && child.userData.obs.mesh) {
            child.userData.obs.mesh.getWorldPosition(child.position).add(child.userData.targetOffset);
            child.intensity = (Math.random() > 0.2 ? 6.0 : 2.0) * progress;
          } else {
            child.intensity = (Math.random() > 0.2 ? 7.5 : 2.0) * progress;
          }
        }
      });

      if (this.fxTimer <= 0) {
        if (this.train && this.train.pulseShockEmitters) {
          this.train.pulseShockEmitters(0);
        }
        if (this.train && this.train.pulseCoachSideEmitters) {
          this.train.pulseCoachSideEmitters(null, 'all', 0);
        }
        this.activePowerSourceIndices = null;
        while (this.fxGroup.children.length > 0) {
          const c = this.fxGroup.children[0];
          if (c.geometry) c.geometry.dispose();
          this.fxGroup.remove(c);
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Coach Side Electric Shock Mechanisms (2-3m Perimeter Guard)
  // ------------------------------------------------------------------
  spawnCoachSideShockFX(obs, nearest) {
    const emitter = nearest.emitter;
    const emitterPos = nearest.worldPos;
    const obsPos = obs.mesh.position.clone();

    const sparkColor = 0x38bdf8;
    const targetOffset = new THREE.Vector3(0, 0.25, 0);
    const p1 = emitterPos.clone();
    const p2 = obsPos.clone().add(targetOffset);

    const segs = 14;
    const pts = [];
    const dist = p1.distanceTo(p2);
    const jitterAmp = Math.min(0.65, Math.max(0.12, dist * 0.08));

    for (let s = 0; s <= segs; s++) {
      const t = s / segs;
      const p = p1.clone().lerp(p2, t);
      if (s > 0 && s < segs) {
        const envelope = Math.sin(t * Math.PI);
        p.x += (Math.random() - 0.5) * jitterAmp * envelope;
        p.y += (Math.random() - 0.5) * jitterAmp * 0.7 * envelope;
        p.z += (Math.random() - 0.5) * jitterAmp * envelope;
      }
      pts.push(p);
    }

    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const mat = new THREE.LineBasicMaterial({
      color: sparkColor,
      transparent: true,
      opacity: 1.0,
      linewidth: 2.5
    });
    const line = new THREE.Line(geo, mat);
    line.userData = {
      isLightning: true,
      isSideShock: true,
      emitterTip: emitter.tip,
      obs: obs,
      targetOffset: targetOffset,
      segs: segs
    };
    this.fxGroup.add(line);

    const nozzleFlare = new THREE.PointLight(sparkColor, 5.0, 8);
    nozzleFlare.position.copy(emitterPos);
    nozzleFlare.userData = { isSideNozzleFlare: true, emitterTip: emitter.tip };
    this.fxGroup.add(nozzleFlare);

    const targetLight = new THREE.PointLight(sparkColor, 6.0, 10);
    targetLight.position.copy(p2);
    targetLight.userData = { isSideTargetLight: true, obs: obs, targetOffset: targetOffset };
    this.fxGroup.add(targetLight);

    this.fxTimer = 0.85;
  }

  checkCoachSideProximity(train, audio) {
    if (!train || !train.getNearestCoachSideEmitter) return;

    for (let i = 0; i < this.obstacles.length; i++) {
      const obs = this.obstacles[i];
      if (obs.isCollected || !obs.mesh) continue;

      const obsPos = obs.mesh.position;
      const nearest = train.getNearestCoachSideEmitter(obsPos);
      if (!nearest) continue;

      if (nearest.dist <= 3.0) {
        const canShock = !obs.lastSideShockTime || (this.animTime - obs.lastSideShockTime) > 1.2;
        if (canShock) {
          obs.lastSideShockTime = this.animTime;
          obs.isSideShocked = true;
          obs.isSideRepelled = true;
          obs.sideRepelStartTime = this.animTime;

          const pushDir = obsPos.clone().sub(nearest.worldPos);
          pushDir.y = 0;
          if (pushDir.lengthSq() < 0.01) {
            pushDir.set(nearest.emitter.side === 'left' ? -1 : 1, 0, 0);
          } else {
            pushDir.normalize();
          }
          obs.sideRepelDir = pushDir;

          this.spawnCoachSideShockFX(obs, nearest);

          if (train.pulseCoachSideEmitters) {
            train.pulseCoachSideEmitters(nearest.emitter.coachIndex, nearest.emitter.side, 1.0);
          }

          if (audio) {
            audio.playElectricShockDischarge('debris', obs.mass);
          }

          const coachNum = nearest.emitter.coachIndex + 1;
          const sideName = nearest.emitter.side.toUpperCase();
          this.telemetry.sideShockActive = true;
          this.telemetry.alertType = 'deploy';
          this.telemetry.alertMessage = `⚡ SIDE PROXIMITY GUARD: ${obs.name.toUpperCase()} WITHIN 2-3M (${nearest.dist.toFixed(1)}M) OF COACH #${coachNum} ${sideName}! DELIVERED ELECTRIC SHOCK!`;
          this.telemetry.action = `⚡ COACH #${coachNum} SIDE E-SHOCK DELIVERED (PROXIMITY: ${nearest.dist.toFixed(1)}M ≤ 3M)`;
        }
      }
    }
  }

  // ------------------------------------------------------------------
  // Obstacle Animation / Movement Loop
  // ------------------------------------------------------------------
  animateLivingObstacles(dt, trainSpeedMs) {
    this.animTime += dt;

    this.obstacles.forEach(obs => {
      if (obs.isCollected || !obs.mesh) return;

      // Side Proximity Repulsion (When shocked by Coach Side Mechanism within 2-3m)
      if (obs.isSideRepelled && obs.sideRepelDir) {
        const repelT = this.animTime - obs.sideRepelStartTime;
        obs.mesh.position.add(obs.sideRepelDir.clone().multiplyScalar(4.0 * dt));
        if (repelT > 1.4) {
          obs.isSideRepelled = false;
          obs.isCleared = true;
        }
      }

      // Lateral push off track if cleared
      if (obs.isDeterred && obs.moveOffTrackOnShock) {
        const fleeT = this.animTime - obs.fleeStartTime;
        const fleeDir = obs.fleeDirection || 1;
        const transform = this.track.getTrackTransform(obs.progress, 0);
        const tangent = transform.tangent.clone().normalize();
        const sideDir = new THREE.Vector3(-tangent.z, 0, tangent.x).normalize();

        const fleeDist = Math.min(5.5, fleeT * 4.2);
        const lateralPos = transform.position.clone().add(sideDir.clone().multiplyScalar(fleeDir * fleeDist));
        obs.mesh.position.copy(lateralPos);

        if (fleeDist >= 2.5) {
          obs.isCleared = true;
        }
      }
    });
  }

  // ------------------------------------------------------------------
  // Main Detection, AI Decision Matrix & Obstacle Scoop Loop
  // Enforces: Collect ONLY when Mass <= 150 kg AND Speed <= 150 km/h
  // Net defaults to CLOSED / STOWED; Opens with animation upon detection
  // ------------------------------------------------------------------
  update(dt, trainProgress, trainSpeedMs, captureNet, audio, physics, trackLength, aiSensorAuto = true, train = null) {
    if (train) this.train = train;
    let closestObstacle = null;
    let minForwardDist = Infinity;
    const speedKmh = trainSpeedMs * 3.6;
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;

    // Evaluate track spline distance to all uncollected obstacles ahead of train
    this.obstacles.forEach(obs => {
      if (obs.isCollected) return;

      let forwardProgress = obs.progress - trainProgress;
      if (forwardProgress < -0.5) forwardProgress += 1.0;
      if (forwardProgress > 0.5) forwardProgress -= 1.0;

      const forwardMeters = forwardProgress * actualTrackLength;
      obs.forwardMeters = forwardMeters;

      // Only consider obstacles within 1 km (1000m) scanning range ahead
      if (forwardMeters > 0 && forwardMeters <= 1000 && forwardMeters < minForwardDist) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    // Run obstacle displacement animation
    this.animateLivingObstacles(dt, trainSpeedMs);

    // Update 3D visual FX for deterrence discharges
    this.updateDeterrenceFX(dt);

    // Coach Side Electric Shock Perimeter Guard (Evaluates 2-3m proximity alongside coaches)
    this.checkCoachSideProximity(this.train, audio);

    // If an obstacle is detected within 1 km (1000m) Camera & LiDAR range
    if (closestObstacle && minForwardDist <= 1000) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;

      // Obtain weight-tiered electric shock specifications
      const tailored = this.getTailoredShockSpecs(closestObstacle);
      this.telemetry.tailoredSpec = tailored.badge;
      this.telemetry.tailoredLabel = tailored.typeLabel;

      // ================================================================
      // STAGE 1: DELIVER ELECTRIC SHOCK TO MOVE TARGET OFF TRACK
      // ================================================================
      if (aiSensorAuto && !closestObstacle.hasBeenShocked) {
        this.triggerDeterrence(closestObstacle, audio, this.train);
        if (audio) audio.playTargetAcquiredBeep(false);
        this.telemetry.alertType = 'deploy';
        this.telemetry.alertMessage = `⚡ 1KM DETECTION: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) AT ${Math.round(minForwardDist)}M! ${tailored.powerSourcesCount}X POWER SOURCE(S) FIRING ELECTRIC SHOCK TO MOVE OFF TRACK!`;
      }

      // Continuous repeat electric shock pulse every 1.4s while target remains on track
      if (aiSensorAuto && !closestObstacle.isCleared && this.fxTimer <= 0) {
        this.spawnDeterrenceFX(closestObstacle, this.train);
        if (audio) audio.playElectricShockDischarge(closestObstacle.type, closestObstacle.mass);
        this.fxTimer = 1.0;
      }

      // ================================================================
      // EVALUATION: DID TARGET MOVE OFF TRACK?
      // ================================================================
      if (closestObstacle.isCleared) {
        if (captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = false;
        this.telemetry.tailoredSpec = 'TARGET MOVED OFF TRACK';
        this.telemetry.action = `✅ TARGET MOVED OFF TRACK VIA ELECTRIC SHOCK — TRACK CLEAR (NO NET NEEDED)`;
        this.telemetry.alertType = 'success';
        this.telemetry.alertMessage = `🎯 TRACK CLEAR! ${closestObstacle.name.toUpperCase()} MOVED SAFELY OFF TRACK VIA ELECTRIC SHOCK! ZERO CASUALTIES!`;

        if (physics && physics.emergencyBrake) {
          physics.setEmergencyBrake(false);
        }
      } else if (closestObstacle.isDeterred && closestObstacle.moveOffTrackOnShock) {
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.action = `⚡ ELECTRIC SHOCK DELIVERED — TARGET MOVING OFF TRACK (${Math.round(minForwardDist)}M)`;
        this.telemetry.alertType = 'deploy';
      }
      // ================================================================
      // STAGE 2: TARGET STILL DOES NOT MOVE -> DEPLOY CAPTURE NET IF WEIGHT < 150 KG
      // ================================================================
      else {
        const isUnder150kg = closestObstacle.mass < 150;
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = isUnder150kg;

        // CASE A: WEIGHT < 150 KG
        if (isUnder150kg) {
          if (minForwardDist <= 40) {
            this.telemetry.action = `🪤 TARGET NOT MOVED (30-40M) — CAPTURE NET DEPLOYED (${closestObstacle.mass}KG < 150KG)`;
            this.telemetry.alertType = 'deploy';

            if (aiSensorAuto && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
              this.telemetry.alertMessage = `🪤 TARGET ON TRACK WITHIN 30-40M (${Math.round(minForwardDist)}M)! WEIGHT ${closestObstacle.mass}KG < 150KG: CAPTURE NET AUTOMATICALLY DEPLOYED!`;
            }

            // Scoop collection at <= 14.0m
            if (minForwardDist <= 14.0) {
              this.scene.remove(closestObstacle.mesh);
              captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
              closestObstacle.isCollected = true;

              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG) — RESCUE SUCCESS!`;
              this.telemetry.alertType = 'success';
              this.telemetry.alertMessage = `🎯 OBSTACLE SAFELY SECURED: ${closestObstacle.name} (${closestObstacle.mass} kg) in capture net cradle. Zero harm!`;
            }
          } else {
            this.telemetry.action = `⚡ E-SHOCK DELIVERED (NOT MOVED) — WEIGHT ${closestObstacle.mass}KG < 150KG: NET WILL DEPLOY AT 30-40M`;
            this.telemetry.alertType = 'deploy';
          }
        }
        // CASE B: WEIGHT >= 150 KG
        else {
          if (captureNet.isDeployed) {
            captureNet.setDeployed(false);
          }

          if (minForwardDist <= 40) {
            this.telemetry.action = `⚠️ TARGET NOT MOVED — WEIGHT ${closestObstacle.mass}KG ≥ 150KG: NET STOWED (UNDER 150KG ONLY)! EMERGENCY BRAKE ENGAGED`;
            this.telemetry.alertType = 'hazard';
            this.telemetry.alertMessage = `⚠️ OVERWEIGHT HAZARD (${closestObstacle.mass}KG ≥ 150KG)! NET STOWED! EMERGENCY BRAKE ENGAGED!`;

            if (minForwardDist <= 35) {
              if (physics && !physics.emergencyBrake) {
                physics.setEmergencyBrake(true);
              }
              if (audio) {
                audio.startHorn();
              }
            }
          } else {
            this.telemetry.action = `⚡ E-SHOCK DELIVERED (NOT MOVED) — WEIGHT ${closestObstacle.mass}KG ≥ 150KG: NET STOWED (OVER 150KG)! BRAKE ARMED`;
            this.telemetry.alertType = 'hazard';
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
      this.telemetry.tailoredSpec = null;
      this.telemetry.tailoredLabel = null;
      this.telemetry.canCollect = false;
      this.telemetry.action = 'TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)';
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = 'info';

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
