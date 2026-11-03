// ====================================================================
// Indian Railways Train Simulator - Main Controller & Game Loop
// ====================================================================

import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TrainPhysics } from './physics.js';
import { TrainAudio } from './audio.js';
import { TrackSystem } from './track.js';
import { TrainModel } from './train.js';
import { CabInterior } from './cab.js';
import { Environment } from './environment.js';
import { ObstacleManager } from './obstacles.js';

class SimulatorApp {
  constructor() {
    this.container = document.getElementById('canvas-container');
    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 3000);
    this.renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });

    this.clock = new THREE.Clock();

    // Subsystems
    this.physics = new TrainPhysics();
    this.audio = new TrainAudio();
    this.track = new TrackSystem(this.scene);
    this.train = new TrainModel(this.scene);
    this.cab = new CabInterior(this.train.locoCar);
    this.env = new Environment(this.scene, this.track);
    this.obstacles = new ObstacleManager(this.scene, this.track);
    this.lastTelemetry = null;

    // Orbit Controls for Chase Camera
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 120;
    this.controls.minDistance = 3;

    // Camera Modes: 'action', 'chase', 'cab', 'railfan', 'window', 'drone'
    this.cameraMode = 'action';
    this.railfanPos = new THREE.Vector3();
    this.railfanLookTarget = new THREE.Vector3();
    this.isRailfanInitialized = false;

    // Mouse look state for Cab mode
    this.cabYaw = 0;
    this.cabPitch = 0;
    this.isMouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;

    // DOM UI elements
    this.dom = {
      speedDigital: document.getElementById('speed-digital'),
      speedGaugeFill: document.getElementById('speedo-fill'),
      teBar: document.getElementById('te-bar'),
      teVal: document.getElementById('te-val'),
      bpVal: document.getElementById('bp-val'),
      bcVal: document.getElementById('bc-val'),
      notchVal: document.getElementById('notch-val'),
      brakeVal: document.getElementById('brake-val'),
      throttleHandle: document.getElementById('throttle-handle'),
      brakeHandle: document.getElementById('brake-handle'),
      signalAspectText: document.getElementById('signal-aspect-text'),
      signalDistText: document.getElementById('signal-dist-text'),
      aspectGreen: document.getElementById('aspect-green'),
      aspectYellow1: document.getElementById('aspect-yellow1'),
      aspectYellow2: document.getElementById('aspect-yellow2'),
      aspectRed: document.getElementById('aspect-red'),
      oheVal: document.getElementById('ohe-val'),
      pantoStatus: document.getElementById('panto-status'),
      reverserBtn: document.getElementById('btn-reverser'),
      stationDistText: document.getElementById('station-dist'),
      alertBanner: document.getElementById('alert-banner'),
      emergencyBtn: document.getElementById('btn-emergency'),
      startOverlay: document.getElementById('start-overlay'),
      startBtn: document.getElementById('start-btn'),
      helpModal: document.getElementById('help-modal'),
      btnHelp: document.getElementById('btn-help'),
      btnCloseHelp: document.getElementById('close-help'),
      // AI Kavach Sensor Fusion & Safety Controller elements
      kavachCard: document.getElementById('ai-kavach-card'),
      kavachTargetName: document.getElementById('kavach-target-name'),
      kavachTargetDist: document.getElementById('kavach-target-dist'),
      kavachTargetMass: document.getElementById('kavach-target-mass'),
      kavachAction: document.getElementById('kavach-action'),
      kavachPayloadVal: document.getElementById('kavach-payload-val'),
      kavachPayloadBar: document.getElementById('kavach-payload-bar'),
      btnSpawnHuman: document.getElementById('btn-spawn-human'),
      btnSpawnAnimal: document.getElementById('btn-spawn-animal'),
      btnSpawnBull: document.getElementById('btn-spawn-bull'),
      btnSpawnCrate: document.getElementById('btn-spawn-crate'),
      btnClearCradle: document.getElementById('btn-clear-cradle'),
      btnCaptureNet: document.getElementById('btn-capture-net')
    };

    this.initRenderer();
    this.initEventListeners();
    this.initUIControls();
    this.setCameraMode('action');

    // Start render loop
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  // ---------------------------------------------------------
  // WebGL Renderer Setup
  // ---------------------------------------------------------
  initRenderer() {
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;

    this.container.appendChild(this.renderer.domElement);

    // Initial Camera position
    this.camera.position.set(0, 8, 35);
  }

  // ---------------------------------------------------------
  // Keyboard and Mouse Event Handlers
  // ---------------------------------------------------------
  initEventListeners() {
    window.addEventListener('resize', () => {
      this.camera.aspect = window.innerWidth / window.innerHeight;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(window.innerWidth, window.innerHeight);
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
      if (e.repeat && ['Space', 'KeyH'].includes(e.code)) return;

      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          this.physics.notchUp();
          break;
        case 'KeyS':
        case 'ArrowDown':
          this.physics.notchDown();
          break;
        case 'KeyA':
          this.physics.applyBrake(0.1);
          this.audio.triggerBrakeHiss(0.4);
          break;
        case 'KeyD':
          this.physics.releaseBrake(0.1);
          this.audio.triggerBrakeHiss(0.3);
          break;
        case 'Space':
        case 'KeyH':
          this.audio.startHorn('dual');
          break;
        case 'KeyE':
          this.physics.triggerEmergencyBrake();
          this.audio.triggerBrakeHiss(1.0);
          break;
        case 'KeyR':
          this.physics.toggleReverser();
          break;
        case 'KeyC':
          this.cycleCamera();
          break;
        case 'KeyT':
          this.switchTrainType();
          break;
        case 'KeyL':
          this.train.cycleHeadlight();
          break;
        case 'KeyN':
          const netSt = this.train.toggleCaptureNet(this.audio);
          if (this.dom.btnCaptureNet) {
            this.dom.btnCaptureNet.innerText = `🛡️ Net: ${netSt ? 'DEPLOYED' : 'RETRACTED'}`;
            this.dom.btnCaptureNet.classList.toggle('active', netSt);
          }
          break;
        case 'KeyP':
          this.physics.togglePantograph();
          break;
        case 'KeyM':
          this.audio.toggleMute();
          break;
        case 'KeyV':
          this.cycleWeather();
          break;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.code === 'Space' || e.code === 'KeyH') {
        this.audio.stopHorn();
      }
    });

    // Cab mouse look
    window.addEventListener('mousedown', (e) => {
      if (e.target.closest('.hud-interactive') || e.target.closest('#start-overlay')) return;
      this.isMouseDown = true;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;
    });

    window.addEventListener('mousemove', (e) => {
      if (!this.isMouseDown || this.cameraMode !== 'cab') return;
      const dx = e.clientX - this.mouseX;
      const dy = e.clientY - this.mouseY;
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      this.cabYaw -= dx * 0.004;
      this.cabPitch = Math.max(-0.6, Math.min(0.6, this.cabPitch - dy * 0.004));
    });

    window.addEventListener('mouseup', () => {
      this.isMouseDown = false;
    });
  }

  // ---------------------------------------------------------
  // Interactive HUD Buttons and Sliders
  // ---------------------------------------------------------
  initUIControls() {
    // Start button / Audio unlock
    const startHandler = () => {
      try {
        this.audio.init();
        this.audio.resume();
        this.audio.playStationChime();
      } catch (err) {
        console.warn('Audio start warning:', err);
      }
      if (this.dom.startOverlay) {
        this.dom.startOverlay.style.display = 'none';
      }
    };

    if (this.dom.startBtn) {
      this.dom.startBtn.addEventListener('click', startHandler);
      this.dom.startBtn.addEventListener('touchend', startHandler);
    }

    // Train Selector cards on start screen
    const previewCards = document.querySelectorAll('.preview-card');
    previewCards.forEach(c => {
      c.addEventListener('click', () => {
        previewCards.forEach(p => p.classList.remove('selected'));
        c.classList.add('selected');
        const trainType = c.dataset.train;
        this.setTrain(trainType);
      });
    });

    // Camera view buttons
    document.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setCameraMode(btn.dataset.cam);
      });
    });

    // Train switch button
    const btnTrainSwitch = document.getElementById('btn-train-switch');
    if (btnTrainSwitch) {
      btnTrainSwitch.addEventListener('click', () => {
        this.switchTrainType();
      });
    }

    // Weather switcher button
    const btnWeather = document.getElementById('btn-weather');
    if (btnWeather) {
      btnWeather.addEventListener('click', () => {
        this.cycleWeather();
      });
    }

    // Horn button
    const btnHorn = document.getElementById('btn-horn');
    if (btnHorn) {
      btnHorn.addEventListener('mousedown', () => this.audio.startHorn());
      btnHorn.addEventListener('mouseup', () => this.audio.stopHorn());
      btnHorn.addEventListener('touchstart', (e) => { e.preventDefault(); this.audio.startHorn(); });
      btnHorn.addEventListener('touchend', (e) => { e.preventDefault(); this.audio.stopHorn(); });
    }

    // Emergency Brake Button
    if (this.dom.emergencyBtn) {
      this.dom.emergencyBtn.addEventListener('click', () => {
        this.physics.triggerEmergencyBrake();
        this.audio.triggerBrakeHiss(1.0);
      });
    }

    // Reverser Button
    if (this.dom.reverserBtn) {
      this.dom.reverserBtn.addEventListener('click', () => {
        this.physics.toggleReverser();
      });
    }

    // Headlight button
    const btnLights = document.getElementById('btn-lights');
    if (btnLights) {
      btnLights.addEventListener('click', () => {
        const state = this.train.cycleHeadlight();
        btnLights.innerText = `💡 Lights: ${state.toUpperCase()}`;
      });
    }

    // Pantograph button
    const btnPanto = document.getElementById('btn-panto');
    if (btnPanto) {
      btnPanto.addEventListener('click', () => {
        this.physics.togglePantograph();
      });
    }

    // Capture Net button
    if (this.dom.btnCaptureNet) {
      this.dom.btnCaptureNet.addEventListener('click', () => {
        const state = this.train.toggleCaptureNet(this.audio);
        this.dom.btnCaptureNet.innerText = `🛡️ Net: ${state ? 'DEPLOYED' : 'RETRACTED'}`;
        this.dom.btnCaptureNet.classList.toggle('active', state);
      });
    }

    // AI Kavach Obstacle Spawner Buttons
    if (this.dom.btnSpawnHuman) {
      this.dom.btnSpawnHuman.addEventListener('click', () => {
        this.obstacles.spawnAheadOfTrain(this.physics.trackProgress, this.track.totalLength, 'human');
      });
    }
    if (this.dom.btnSpawnAnimal) {
      this.dom.btnSpawnAnimal.addEventListener('click', () => {
        this.obstacles.spawnAheadOfTrain(this.physics.trackProgress, this.track.totalLength, 'animal');
      });
    }
    if (this.dom.btnSpawnBull) {
      this.dom.btnSpawnBull.addEventListener('click', () => {
        this.obstacles.spawnAheadOfTrain(this.physics.trackProgress, this.track.totalLength, 'cattle');
      });
    }
    if (this.dom.btnSpawnCrate) {
      this.dom.btnSpawnCrate.addEventListener('click', () => {
        this.obstacles.spawnAheadOfTrain(this.physics.trackProgress, this.track.totalLength, 'debris');
      });
    }
    if (this.dom.btnClearCradle) {
      this.dom.btnClearCradle.addEventListener('click', () => {
        this.obstacles.resetCollected(this.train.captureNet);
      });
    }

    // Help modal
    if (this.dom.btnHelp && this.dom.helpModal) {
      this.dom.btnHelp.addEventListener('click', () => this.dom.helpModal.classList.add('open'));
      this.dom.btnCloseHelp.addEventListener('click', () => this.dom.helpModal.classList.remove('open'));
    }

    // Throttle click/drag on HUD
    const throttleSlider = document.getElementById('throttle-slider');
    if (throttleSlider) {
      throttleSlider.addEventListener('click', (e) => {
        const rect = throttleSlider.getBoundingClientRect();
        const y = 1.0 - ((e.clientY - rect.top) / rect.height);
        const notch = Math.round(y * 8);
        this.physics.setNotch(notch);
      });
    }

    // Brake click/drag on HUD
    const brakeSlider = document.getElementById('brake-slider');
    if (brakeSlider) {
      brakeSlider.addEventListener('click', (e) => {
        const rect = brakeSlider.getBoundingClientRect();
        const y = 1.0 - ((e.clientY - rect.top) / rect.height);
        this.physics.setTrainBrake(y);
        this.audio.triggerBrakeHiss(0.4);
      });
    }
  }

  // ---------------------------------------------------------
  // Camera Switching
  // ---------------------------------------------------------
  setCameraMode(mode) {
    this.cameraMode = mode;
    this.isRailfanInitialized = false;

    // Update active UI tool button
    document.querySelectorAll('[data-cam]').forEach(b => {
      b.classList.toggle('active', b.dataset.cam === mode);
    });

    if (mode === 'chase' || mode === 'drone') {
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
    }
  }

  cycleCamera() {
    const modes = ['action', 'chase', 'cab', 'railfan', 'window', 'drone'];
    const idx = modes.indexOf(this.cameraMode);
    const nextMode = modes[(idx + 1) % modes.length];
    this.setCameraMode(nextMode);
  }

  // ---------------------------------------------------------
  // Train Model Switcher (WAP-7 vs Diesel)
  // ---------------------------------------------------------
  setTrain(type) {
    this.train.setTrainType(type);
    this.physics.isElectric = (type === 'electric');
    this.cab = new CabInterior(this.train.locoCar);

    const titleEl = document.getElementById('train-title');
    const shedEl = document.getElementById('loco-shed');
    const locoClassEl = document.getElementById('loco-class');

    if (type === 'electric') {
      if (titleEl) titleEl.innerText = '12301 RAJDHANI EXPRESS';
      if (shedEl) shedEl.innerText = 'GZB WAP-7 #30201';
      if (locoClassEl) locoClassEl.innerText = 'Electric 25kV AC (6,350 HP)';
      this.dom.oheVal.innerText = '25.0 kV';
    } else {
      if (titleEl) titleEl.innerText = '12952 SUPERFAST EXPRESS';
      if (shedEl) shedEl.innerText = 'BGKT WDP-4D #40112';
      if (locoClassEl) locoClassEl.innerText = 'Diesel-Electric 16-Cyl (4,500 HP)';
      this.dom.oheVal.innerText = 'DIESEL';
    }
  }

  switchTrainType() {
    const newType = this.train.trainType === 'electric' ? 'diesel' : 'electric';
    this.setTrain(newType);
  }

  cycleWeather() {
    const weathers = ['day', 'sunset', 'night', 'monsoon'];
    const idx = weathers.indexOf(this.env.currentWeather);
    const nextW = weathers[(idx + 1) % weathers.length];
    this.env.setWeather(nextW);

    const btnWeather = document.getElementById('btn-weather');
    if (btnWeather) {
      btnWeather.innerText = `🌦️ ${nextW.toUpperCase()}`;
    }
  }

  // ---------------------------------------------------------
  // Update Camera Positioning per frame
  // ---------------------------------------------------------
  updateCamera() {
    const locoPos = this.train.locoCar.position;
    const locoRot = this.train.locoCar.rotation;
    const forward = new THREE.Vector3(0, 0, 1).applyEuler(locoRot);
    const right = new THREE.Vector3(1, 0, 0).applyEuler(locoRot);
    const up = new THREE.Vector3(0, 1, 0);

    if (this.cameraMode === 'action') {
      // Cinematic low-angle front-left 3/4 perspective tracking locomotive nose, capture net, and rails
      // Matches uploaded reference image media_1793697380357_f8b6e0ba.png
      const fwdDist = this.train.locoLength / 2 + 10.5;
      const camOffset = forward.clone().multiplyScalar(fwdDist)
        .add(right.clone().multiplyScalar(-5.4))
        .add(up.clone().multiplyScalar(1.8));
      const lookTarget = locoPos.clone()
        .add(forward.clone().multiplyScalar(this.train.locoLength / 2 + 0.8))
        .add(right.clone().multiplyScalar(0.4))
        .add(up.clone().multiplyScalar(1.7));
      this.camera.position.copy(locoPos).add(camOffset);
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'chase') {
      // Smooth orbit tracking locomotive
      this.controls.target.copy(locoPos).add(new THREE.Vector3(0, 2.5, 0));
      if (this.camera.position.y < locoPos.y + 1.4) {
        this.camera.position.y = locoPos.y + 1.4;
      }
      this.controls.update();

    } else if (this.cameraMode === 'cab') {
      // Driver Seat inside Cockpit looking out front windshield
      const eyeOffset = new THREE.Vector3(0.55, 2.4, this.train.locoLength / 2 - 1.2).applyEuler(locoRot);
      this.camera.position.copy(locoPos).add(eyeOffset);

      // Look direction + mouse yaw/pitch
      const lookDir = forward.clone();
      lookDir.applyAxisAngle(up, this.cabYaw);
      lookDir.applyAxisAngle(right, this.cabPitch);

      this.camera.lookAt(this.camera.position.clone().add(lookDir));

    } else if (this.cameraMode === 'railfan') {
      // Fixed trackside spotter camera
      if (!this.isRailfanInitialized) {
        // Place camera 80m ahead of the train along track
        const aheadProg = (this.physics.trackProgress + (80 / this.track.totalLength)) % 1.0;
        const spot = this.track.getTrackTransform(aheadProg, 0);
        this.railfanPos.copy(spot.position).add(spot.normal.clone().multiplyScalar(6.5)).setY(spot.position.y + 1.6);
        this.camera.position.copy(this.railfanPos);
        this.isRailfanInitialized = true;
      }

      // Track train passing
      this.camera.lookAt(locoPos.clone().add(new THREE.Vector3(0, 2.0, 0)));

      // If train has passed 50m beyond the camera, reset camera ahead!
      const dist = locoPos.distanceTo(this.railfanPos);
      const isPast = locoPos.clone().sub(this.railfanPos).dot(forward) > 40;
      if (isPast || dist > 110) {
        this.isRailfanInitialized = false;
      }

    } else if (this.cameraMode === 'window') {
      // Passenger sitting by window in first coach
      if (this.train.coachCars.length > 0) {
        const c1 = this.train.coachCars[0];
        const winOffset = new THREE.Vector3(1.4, 2.0, 0).applyEuler(c1.rotation);
        this.camera.position.copy(c1.position).add(winOffset);
        const cRight = new THREE.Vector3(1, 0, 0).applyEuler(c1.rotation);
        const cFwd = new THREE.Vector3(0, 0, 1).applyEuler(c1.rotation);
        this.camera.lookAt(this.camera.position.clone().add(cRight.clone().multiplyScalar(8)).add(cFwd.clone().multiplyScalar(4)));
      }

    } else if (this.cameraMode === 'drone') {
      // High bird's-eye vantage point
      this.controls.target.copy(locoPos);
      this.controls.update();
    }
  }

  // ---------------------------------------------------------
  // Update HUD Gauges & Signals
  // ---------------------------------------------------------
  updateHUD() {
    const p = this.physics;

    // Speedometer Digital & Dial
    this.dom.speedDigital.innerText = Math.round(p.speedKmh);
    const speedDashoffset = 440 - (Math.min(1.0, p.speedKmh / 160) * 440);
    this.dom.speedGaugeFill.style.strokeDashoffset = speedDashoffset;

    // Tractive Effort bar & text
    this.dom.teVal.innerText = `${p.tractiveEffortKn} kN`;
    const teWidth = Math.min(100, (Math.abs(p.tractiveEffortKn) / 460) * 100);
    this.dom.teBar.style.width = `${teWidth}%`;

    // Pressures
    this.dom.bpVal.innerText = `${p.bpPressure.toFixed(1)} bar`;
    this.dom.bcVal.innerText = `${p.bcPressure.toFixed(1)} bar`;

    // Levers
    this.dom.notchVal.innerText = `N${p.notch}`;
    this.dom.brakeVal.innerText = `${Math.round(p.trainBrakePercent * 100)}%`;

    const notchPx = 12 + (p.notch / 8.0) * 76;
    this.dom.throttleHandle.style.bottom = `${notchPx}px`;

    const brakePx = 12 + (p.trainBrakePercent * 76);
    this.dom.brakeHandle.style.bottom = `${brakePx}px`;

    // Reverser
    const revText = p.reverser === 1 ? 'FORWARD (F)' : (p.reverser === 0 ? 'NEUTRAL (N)' : 'REVERSE (R)');
    this.dom.reverserBtn.innerText = `⚙️ ${revText}`;

    // Emergency button state
    this.dom.emergencyBtn.classList.toggle('engaged', p.emergencyBrake);

    // Pantograph status
    if (this.dom.pantoStatus) {
      this.dom.pantoStatus.innerText = p.pantographRaised ? 'UP (25kV)' : 'LOWERED';
      this.dom.pantoStatus.style.color = p.pantographRaised ? '#00e676' : '#ff1744';
    }

    // Station distance
    const distToStationMeters = ((this.track.stationProgress - p.trackProgress + 1.0) % 1.0) * this.track.totalLength;
    if (distToStationMeters < 1000) {
      this.dom.stationDistText.innerText = `${Math.round(distToStationMeters)} m`;
    } else {
      this.dom.stationDistText.innerText = `${(distToStationMeters / 1000).toFixed(1)} km`;
    }

    // Cab Signalling & SPAD detection
    this.track.updateSignals(p.trackProgress);
    const activeSig = this.track.signals[0]; // Nearest signal
    if (activeSig) {
      const sigAspect = activeSig.currentAspect;
      this.dom.signalAspectText.innerText = sigAspect.toUpperCase().replace('_', ' ');

      // Update HUD Signal lamps
      this.dom.aspectGreen.classList.toggle('lit', sigAspect === 'green');
      this.dom.aspectYellow1.classList.toggle('lit', sigAspect === 'yellow' || sigAspect === 'double_yellow');
      this.dom.aspectYellow2.classList.toggle('lit', sigAspect === 'double_yellow');
      this.dom.aspectRed.classList.toggle('lit', sigAspect === 'red');

      // Signal aspect lamps updated (Cab Signal cluster displays status cleanly without blocking view)
      if (!this.lastTelemetry || !this.lastTelemetry.alertMessage) {
        this.dom.alertBanner.style.display = 'none';
      }
    }

    // AI Kavach Sensor Fusion & Safety Controller HUD Telemetry
    if (this.lastTelemetry && this.dom.kavachTargetName) {
      const t = this.lastTelemetry;
      this.dom.kavachTargetName.innerText = t.name ? t.name.toUpperCase() : 'NONE (TRACK CLEAR)';
      this.dom.kavachTargetDist.innerText = t.distance !== null ? `${Math.round(t.distance)} m` : '---';

      if (t.mass !== null) {
        this.dom.kavachTargetMass.innerText = `${t.mass} kg (${t.canCollect ? 'SAFE ≤ 150KG' : 'OVERWEIGHT >150KG'})`;
        this.dom.kavachTargetMass.style.color = t.canCollect ? '#00e676' : '#ff1744';
      } else {
        this.dom.kavachTargetMass.innerText = '---';
        this.dom.kavachTargetMass.style.color = '#f1f5f9';
      }

      this.dom.kavachAction.innerText = t.action;
      this.dom.kavachAction.className = 'scanner-status';
      if (t.alertType === 'hazard') {
        this.dom.kavachAction.classList.add('hazard');
      } else if (t.alertType === 'deploy') {
        this.dom.kavachAction.classList.add('deploying');
      } else if (t.alertType === 'success') {
        this.dom.kavachAction.classList.add('collected');
      }

      // Card border state
      if (this.dom.kavachCard) {
        this.dom.kavachCard.classList.toggle('target-safe', t.targetDetected && t.canCollect);
        this.dom.kavachCard.classList.toggle('target-hazard', t.targetDetected && !t.canCollect);
      }

      // Scoop payload count
      if (this.dom.kavachPayloadVal) {
        this.dom.kavachPayloadVal.innerText = `${t.collectedWeight} kg (${t.collectedCount} Secured)`;
        this.dom.kavachPayloadVal.style.color = t.collectedWeight > 0 ? '#00e676' : '#94a3b8';
      }
      if (this.dom.kavachPayloadBar) {
        const payloadPct = Math.min(100, (t.collectedWeight / 150) * 100);
        this.dom.kavachPayloadBar.style.width = `${payloadPct}%`;
      }

      // Dynamic Alert Banner for AI Detection & Rescue Events
      if (t.alertMessage) {
        this.dom.alertBanner.style.display = 'block';
        if (t.alertType === 'hazard') {
          this.dom.alertBanner.style.background = 'rgba(220, 38, 38, 0.95)';
        } else if (t.alertType === 'success') {
          this.dom.alertBanner.style.background = 'rgba(16, 185, 129, 0.95)';
        } else {
          this.dom.alertBanner.style.background = 'rgba(234, 179, 8, 0.95)';
        }
        this.dom.alertBanner.innerText = t.alertMessage;
      }
    }
  }

  // ---------------------------------------------------------
  // Main Animation / Game Loop
  // ---------------------------------------------------------
  animate() {
    requestAnimationFrame(this.animate);

    const dt = Math.min(this.clock.getDelta(), 0.1);

    // 1. Get track curvature and transform for Locomotive (center and bogies)
    const locoTransform = this.track.getCarTransform(this.physics.trackProgress, this.train.locoLength, 0);

    // 2. Physics Step
    this.physics.update(dt, this.track.totalLength, locoTransform.curveRadius, 0);

    // 3. Position Locomotive accurately on rails
    this.train.locoCar.position.copy(locoTransform.position);
    this.train.locoCar.lookAt(locoTransform.position.clone().add(locoTransform.heading));

    // 4. Position and orient each Trailing Coach independently along the track curve
    let cumulativeDist = (this.train.locoLength / 2) + this.train.couplerGap + (this.train.coachLength / 2);
    for (let i = 0; i < this.train.coachCars.length; i++) {
      const coachProg = (this.physics.trackProgress - (cumulativeDist / this.track.totalLength) + 1.0) % 1.0;
      const coachTransform = this.track.getCarTransform(coachProg, this.train.coachLength, 0);
      const coachGroup = this.train.coachCars[i];
      coachGroup.position.copy(coachTransform.position);
      coachGroup.lookAt(coachTransform.position.clone().add(coachTransform.heading));
      cumulativeDist += this.train.coachLength + this.train.couplerGap;
    }

    // 5. Update Obstacle Manager & AI Safety Controller (LiDAR, Radar, 4K Stereo)
    const telemetry = this.obstacles.update(
      dt,
      this.physics.trackProgress,
      this.physics.speedMs,
      this.train.captureNet,
      this.audio,
      this.physics,
      this.track.totalLength
    );
    this.lastTelemetry = telemetry;

    // 6. Update Train wheel rotations, sensor LEDs & pneumatic deployment
    this.train.update(dt, this.physics.speedMs, telemetry.targetDetected);

    // 7. Update Cab Interior dials and physical levers
    if (this.cab) {
      this.cab.update(this.physics);
    }

    // 8. Update Audio Synthesizer
    this.audio.update(this.physics.speedKmh, this.physics.throttlePercent, this.physics.trainBrakePercent, this.physics.isElectric);

    // 9. Update Environment & Sun follow
    this.env.update(dt, locoTransform.position);

    // 10. Update Camera
    this.updateCamera();

    // 11. Update UI Gauges
    this.updateHUD();

    // 12. Render 3D Scene
    this.renderer.render(this.scene, this.camera);
  }
}

// Safe initialization whether DOM is ready or already loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    window.trainApp = new SimulatorApp();
  });
} else {
  window.trainApp = new SimulatorApp();
}

