// ====================================================================
// Indian Railways Real-Time AI Obstacle & Safety Recovery System
// Manages Track Clearance, 1km LiDAR / Camera Scanning,
// Weight-Tiered Electric Shock Deterrence, and Inflatable Scoop Net
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
      alertType: 'info',
      collectedCount: 0,
      collectedWeight: 0,
      deterrenceActive: false,
      deterrenceMode: 'electric_shock'
    };

    this.animTime = 0;
    this.materials = {};

    // Remove any leftover obstacle objects from scene and ensure track starts 100% clear
    this.initDefaultObstacles();
  }

  setTrain(train) {
    this.train = train;
  }

  // Remove any crate / debris meshes from the scene
  cleanupSceneObstacles() {
    const toRemove = [];
    this.scene.traverse(child => {
      if (child.name === 'trackCargoDebris' || (child.userData && child.userData.type === 'crate')) {
        toRemove.push(child);
      }
    });
    toRemove.forEach(obj => {
      if (obj.parent) obj.parent.remove(obj);
      obj.traverse(c => {
        if (c.geometry) c.geometry.dispose();
        if (c.material) {
          if (Array.isArray(c.material)) c.material.forEach(m => m.dispose());
          else c.material.dispose();
        }
      });
    });
  }

  // Initial track obstacles: completely clear (all objects removed from track)
  initDefaultObstacles() {
    while (this.obstacles.length > 0) {
      const obs = this.obstacles.pop();
      if (obs.mesh && obs.mesh.parent) obs.mesh.parent.remove(obs.mesh);
    }
    this.cleanupSceneObstacles();
  }

  // Programmatic obstacle target spawner (uses invisible Object3D target so NO visible crate appears on track)
  spawnObstacle(type = 'target', trackProgress = 0, moveOffTrack = null, lateralOffset = 0, customMass = null, customName = null) {
    const mesh = new THREE.Object3D(); // Invisible target point (no visible 3D mesh on rails)
    const name = customName || 'Target';
    const mass = customMass !== null && customMass !== undefined ? customMass : 40;

    const transform = this.track.getTrackTransform(trackProgress, 0);
    mesh.position.copy(transform.position);
    if (lateralOffset !== 0 && transform.normal) {
      mesh.position.add(transform.normal.clone().multiplyScalar(lateralOffset));
    }
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), transform.tangent);

    const obstacleObj = {
      id: this.nextId++,
      type,
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

  spawnAheadOfTrain(trainProgress, trackLength, type = 'target', distanceMeters = 85, moveOffTrack = null, customMass = null, customName = null) {
    const deltaProgress = distanceMeters / trackLength;
    const targetProgress = (trainProgress + deltaProgress) % 1.0;
    return this.spawnObstacle(type, targetProgress, moveOffTrack, 0, customMass, customName);
  }

  spawnBesideCoach(trainProgress, trackLength, coachIndex = 1, lateralOffset = 2.4) {
    const locoLen = 20.5;
    const coachLen = 23.5;
    const couplerGap = 0.8;
    const distBack = (locoLen / 2) + couplerGap + (coachLen / 2) + coachIndex * (coachLen + couplerGap);
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;
    const coachProgress = (trainProgress - (distBack / actualTrackLength) + 1.0) % 1.0;
    return this.spawnObstacle('target', coachProgress, true, lateralOffset, 30, 'Coach Flank Target');
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
  // ------------------------------------------------------------------
  getTailoredShockSpecs(obs) {
    const mass = obs && obs.mass !== undefined ? obs.mass : 50;

    if (mass < 150) {
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
      audio.playElectricShockDischarge('shock', obs.mass);
    }

    this.spawnDeterrenceFX(obs, this.train);
  }

  triggerAnimalDeterrence(obs, audio, train = null) {
    return this.triggerDeterrence(obs, audio, train);
  }

  spawnDeterrenceFX(obs, train = null) {
    if (!obs || !obs.mesh) return;
    const activeTrain = train || this.train;

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

    if (activeTrain && activeTrain.pulseShockEmitters) {
      activeTrain.pulseShockEmitters(1.0, activeIndices);
    }
  }

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
            audio.playElectricShockDischarge('shock', obs.mass);
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

  animateLivingObstacles(dt, trainSpeedMs) {
    this.animTime += dt;

    this.obstacles.forEach(obs => {
      if (obs.isCollected || !obs.mesh) return;

      if (obs.isSideRepelled && obs.sideRepelDir) {
        const repelT = this.animTime - obs.sideRepelStartTime;
        obs.mesh.position.add(obs.sideRepelDir.clone().multiplyScalar(4.0 * dt));
        if (repelT > 1.4) {
          obs.isSideRepelled = false;
          obs.isCleared = true;
        }
      }

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

  update(dt, trainProgress, trainSpeedMs, captureNet, audio, physics, trackLength, aiSensorAuto = true, train = null) {
    if (train) this.train = train;

    let closestObstacle = null;
    let minForwardDist = Infinity;
    const actualTrackLength = trackLength || (this.track && this.track.totalLength) || 3600;

    // Check if any obstacle is on track
    this.obstacles.forEach(obs => {
      if (obs.isCollected) return;

      let forwardProgress = obs.progress - trainProgress;
      if (forwardProgress < -0.5) forwardProgress += 1.0;
      if (forwardProgress > 0.5) forwardProgress -= 1.0;

      const forwardMeters = forwardProgress * actualTrackLength;
      obs.forwardMeters = forwardMeters;

      if (forwardMeters > 0 && forwardMeters <= 1000 && forwardMeters < minForwardDist) {
        minForwardDist = forwardMeters;
        closestObstacle = obs;
      }
    });

    if (this.obstacles.length > 0) {
      this.animateLivingObstacles(dt, trainSpeedMs);
    }

    if (this.fxTimer > 0) {
      this.updateDeterrenceFX(dt);
    }

    this.checkCoachSideProximity(this.train, audio);

    if (closestObstacle && minForwardDist <= 1000) {
      this.telemetry.targetDetected = true;
      this.telemetry.type = closestObstacle.type;
      this.telemetry.name = closestObstacle.name;
      this.telemetry.distance = minForwardDist;

      const tailored = this.getTailoredShockSpecs(closestObstacle);
      this.telemetry.tailoredSpec = tailored.badge;
      this.telemetry.tailoredLabel = tailored.typeLabel;

      if (aiSensorAuto && !closestObstacle.hasBeenShocked) {
        this.triggerDeterrence(closestObstacle, audio, this.train);
        if (audio) audio.playTargetAcquiredBeep(false);
        this.telemetry.alertType = 'deploy';
        this.telemetry.alertMessage = `⚡ 1KM DETECTION: ${closestObstacle.name.toUpperCase()} (${closestObstacle.mass}KG) AT ${Math.round(minForwardDist)}M! ${tailored.powerSourcesCount}X POWER SOURCE(S) FIRING ELECTRIC SHOCK TO MOVE OFF TRACK!`;
      }

      if (closestObstacle.isCleared) {
        if (captureNet && captureNet.isDeployed) {
          captureNet.setDeployed(false);
        }
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = false;
        this.telemetry.tailoredSpec = 'TARGET MOVED OFF TRACK';
        this.telemetry.action = `✅ TARGET MOVED OFF TRACK VIA ELECTRIC SHOCK — TRACK CLEAR (NO NET NEEDED)`;
        this.telemetry.alertType = 'success';
      } else {
        const isUnder150kg = closestObstacle.mass < 150;
        this.telemetry.mass = closestObstacle.mass;
        this.telemetry.canCollect = isUnder150kg;

        if (isUnder150kg) {
          if (minForwardDist <= 40) {
            this.telemetry.action = `🪤 TARGET NOT MOVED (30-40M) — CAPTURE NET DEPLOYED (${closestObstacle.mass}KG < 150KG)`;
            this.telemetry.alertType = 'deploy';

            if (aiSensorAuto && captureNet && !captureNet.isDeployed) {
              captureNet.triggerSolenoidDeploy(audio);
              if (audio) audio.playTargetAcquiredBeep(false);
            }

            if (minForwardDist <= 14.0) {
              if (closestObstacle.mesh && closestObstacle.mesh.parent) {
                closestObstacle.mesh.parent.remove(closestObstacle.mesh);
              }
              if (captureNet) captureNet.collectObstacle(closestObstacle.mesh, closestObstacle);
              closestObstacle.isCollected = true;
              if (audio) audio.playRescueSuccessChime();

              this.telemetry.collectedCount++;
              this.telemetry.collectedWeight += closestObstacle.mass;
              this.telemetry.action = `🎯 SAFELY SECURED IN NET CRADLE (${closestObstacle.mass}KG) — RESCUE SUCCESS!`;
              this.telemetry.alertType = 'success';
            }
          } else {
            this.telemetry.action = `⚡ E-SHOCK DELIVERED (NOT MOVED) — WEIGHT ${closestObstacle.mass}KG < 150KG: NET WILL DEPLOY AT 30-40M`;
            this.telemetry.alertType = 'deploy';
          }
        } else {
          if (captureNet && captureNet.isDeployed) {
            captureNet.setDeployed(false);
          }
          if (minForwardDist <= 40) {
            this.telemetry.action = `⚠️ TARGET NOT MOVED — WEIGHT ${closestObstacle.mass}KG ≥ 150KG: NET STOWED (UNDER 150KG ONLY)! EMERGENCY BRAKE ENGAGED`;
            this.telemetry.alertType = 'hazard';
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
      this.telemetry.targetDetected = false;
      this.telemetry.type = null;
      this.telemetry.name = 'NONE (TRACK CLEAR)';
      this.telemetry.distance = null;
      this.telemetry.mass = null;
      this.telemetry.tailoredSpec = 'STANDBY (1 km)';
      this.telemetry.tailoredLabel = 'CLEAR LINE';
      this.telemetry.canCollect = false;
      this.telemetry.action = 'TRACK CLEAR — ACTIVE SCANNING (1 km LiDAR & Camera)';
      this.telemetry.alertMessage = null;
      this.telemetry.alertType = 'info';

      if (captureNet && captureNet.isDeployed && captureNet.collectedList.length === 0) {
        captureNet.setDeployed(false);
      }
    }

    return this.telemetry;
  }

  resetCollected(captureNet) {
    if (captureNet) {
      captureNet.clearCradle();
    }
    this.telemetry.collectedCount = 0;
    this.telemetry.collectedWeight = 0;
  }
}
