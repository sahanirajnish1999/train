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
    this.obstacles.setTrain(this.train);
    this.lastTelemetry = null;

    // Cinematic Slow-Motion Time-Warp State (Does not alter true train speed)
    this.timeScale = 1.0;
    this.timeScales = [1.0, 0.5, 0.25, 0.1];
    this.timeScaleIndex = 0;
    this.autoSlowMo = true;
    this.isRescueSlowMo = false;
    this.rescueSlowMoTimer = 0;

    // Simulation Run / Pause State
    this.isPaused = false;
    this.aiSensorAuto = true;
    this.autoSpin = false;
    this.activeSpeedPreset = 120;

    // Orbit Controls for Chase / Orbit Camera
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.05;
    this.controls.maxDistance = 140;
    this.controls.minDistance = 3;

    // Camera Modes: 'orbit', 'cab', 'target', 'action', 'drone', 'net'
    this.cameraMode = 'orbit';
    this.railfanPos = new THREE.Vector3();
    this.railfanLookTarget = new THREE.Vector3();
    this.isRailfanInitialized = false;

    // Mouse look state for Cab mode
    this.cabYaw = 0;
    this.cabPitch = 0;
    this.isMouseDown = false;
    this.mouseX = 0;
    this.mouseY = 0;

    // Scenario Runner State (1-by-1 Mode)
    this.currentScenario = 1;

    // DOM UI elements
    this.dom = {
      stationDistText: document.getElementById('station-dist'),
      alertBanner: document.getElementById('alert-banner'),
      helpModal: document.getElementById('help-modal'),
      btnHelp: document.getElementById('btn-help'),
      btnCloseHelp: document.getElementById('close-help'),
      // AI Kavach Sensor Fusion & Safety Controller elements
      kavachCard: document.getElementById('ai-kavach-card'),
      btnKavachMinimize: document.getElementById('btn-kavach-minimize'),
      kavachTargetName: document.getElementById('kavach-target-name'),
      kavachTargetDist: document.getElementById('kavach-target-dist'),
      kavachTargetMass: document.getElementById('kavach-target-mass'),
      kavachTargetSpec: document.getElementById('kavach-target-spec'),
      kavachAction: document.getElementById('kavach-action'),
      kavachPayloadVal: document.getElementById('kavach-payload-val'),
      kavachPayloadBar: document.getElementById('kavach-payload-bar'),
      // Human & Animal Obstacle Scenario Buttons
      btnHumanEnter: document.getElementById('btn-human-enter'),
      btnHumanExit: document.getElementById('btn-human-exit'),
      btnHumanMid: document.getElementById('btn-human-mid'),
      btnHumanSudden: document.getElementById('btn-human-sudden'),
      btnAnimalDog: document.getElementById('btn-animal-dog'),
      btnAnimalDeer: document.getElementById('btn-animal-deer'),
      btnAnimalCow: document.getElementById('btn-animal-cow'),
      btnAnimalElephant: document.getElementById('btn-animal-elephant'),
      btnAnimalCowSudden: document.getElementById('btn-animal-cow-sudden'),
      btnClearObstacles: document.getElementById('btn-clear-obstacles'),
      // Power Source Weight Tier Test Buttons
      btnTier1: document.getElementById('btn-tier-1'),
      btnTier2: document.getElementById('btn-tier-2'),
      btnTier3: document.getElementById('btn-tier-3'),
      btnTier4: document.getElementById('btn-tier-4'),
      // Scenario Stepper Dock Elements (1-by-1 Scenarios 1 to 10)
      btnScenPrev: document.getElementById('btn-scen-prev'),
      btnScenNext: document.getElementById('btn-scen-next'),
      btnScen1: document.getElementById('btn-scen-1'),
      btnScen2: document.getElementById('btn-scen-2'),
      btnScen3: document.getElementById('btn-scen-3'),
      btnScen4: document.getElementById('btn-scen-4'),
      btnScen5: document.getElementById('btn-scen-5'),
      btnScen6: document.getElementById('btn-scen-6'),
      btnScen7: document.getElementById('btn-scen-7'),
      btnScen8: document.getElementById('btn-scen-8'),
      btnScen9: document.getElementById('btn-scen-9'),
      btnScen10: document.getElementById('btn-scen-10'),
      btnScenCam: document.getElementById('btn-scen-cam'),
      btnScenShock: document.getElementById('btn-scen-shock'),
      btnScenReplay: document.getElementById('btn-scen-replay'),
      // Floating Console Elements
      floatingConsole: document.getElementById('floating-console-container'),
      consoleSpeedVal: document.getElementById('console-speed-val'),
      btnRunPause: document.getElementById('btn-run-pause'),
      btnAiSensorMode: document.getElementById('btn-ai-sensor-mode'),
      btnConsoleShock: document.getElementById('btn-console-shock'),
      btnConsoleNet: document.getElementById('btn-console-net'),
      btnConsoleHorn: document.getElementById('btn-console-horn'),
      btnConsoleEmergency: document.getElementById('btn-console-emergency'),
      btnConsoleReset: document.getElementById('btn-console-reset'),
      btnAutoSpin: document.getElementById('btn-auto-spin'),
      tickerStatus: document.getElementById('ticker-status')
    };

    this.initRenderer();
    this.initEventListeners();
    this.initUIControls();
    this.updateScenarioHUD(1);
    this.setCameraMode('orbit');

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
        case 'KeyN':
          this.setCameraMode('net');
          break;
        case 'KeyZ':
          this.cycleSlowMotion();
          break;
        case 'KeyL':
          this.train.cycleHeadlight();
          break;
        case 'KeyO':
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
        case 'KeyB':
          this.fireElectricShockPulse();
          break;
        case 'Digit1':
        case 'Numpad1':
          this.applyScenario(1);
          break;
        case 'Digit2':
        case 'Numpad2':
          this.applyScenario(2);
          break;
        case 'Digit3':
        case 'Numpad3':
          this.applyScenario(3);
          break;
        case 'Digit4':
        case 'Numpad4':
          this.applyScenario(4);
          break;
        case 'Digit5':
        case 'Numpad5':
          this.applyScenario(5);
          break;
        case 'Digit6':
        case 'Numpad6':
          this.applyScenario(6);
          break;
        case 'Digit7':
        case 'Numpad7':
          this.applyScenario(7);
          break;
        case 'Digit8':
        case 'Numpad8':
          this.applyScenario(8);
          break;
        case 'Digit9':
        case 'Numpad9':
          this.applyScenario(9);
          break;
        case 'Digit0':
        case 'Numpad0':
          this.applyScenario(10);
          break;
        case 'BracketLeft':
          this.prevScenario();
          break;
        case 'BracketRight':
          this.nextScenario();
          break;
        case 'KeyX':
          this.replayCurrentScenario();
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
      if (e.target.closest('.hud-interactive')) return;
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
    // Seamless Audio Unlock on First User Interaction
    const unlockAudio = () => {
      try {
        if (!this.audio.isInitialized) {
          this.audio.init();
        }
        this.audio.resume();
        this.audio.playStationChime();
      } catch (err) {
        console.warn('Audio unlock warning:', err);
      }
      window.removeEventListener('pointerdown', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
    };
    window.addEventListener('pointerdown', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });

    // Camera view buttons
    document.querySelectorAll('[data-cam]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.setCameraMode(btn.dataset.cam);
      });
    });

    // Slow Motion quick tool button
    const btnSlowMo = document.getElementById('btn-slow-mo');
    if (btnSlowMo) {
      btnSlowMo.addEventListener('click', () => {
        this.cycleSlowMotion();
      });
    }

    // Weather switcher button
    const btnWeather = document.getElementById('btn-weather');
    if (btnWeather) {
      btnWeather.addEventListener('click', () => {
        this.cycleWeather();
      });
    }

    // Close help modal
    if (this.dom.btnHelp && this.dom.helpModal) {
      this.dom.btnHelp.addEventListener('click', () => this.dom.helpModal.classList.add('open'));
      this.dom.btnCloseHelp.addEventListener('click', () => this.dom.helpModal.classList.remove('open'));
    }

    // Dismiss alert pill on click
    if (this.dom.alertBanner) {
      this.dom.alertBanner.addEventListener('click', () => {
        this.dom.alertBanner.style.display = 'none';
        clearTimeout(this.alertBannerTimeout);
      });
    }

    // ----------------------------------------------------------------
    // Floating Console Event Listeners (Ref: media_1793808764475_89ecfc40.jpg)
    // ----------------------------------------------------------------
    if (this.dom.btnRunPause) {
      this.dom.btnRunPause.addEventListener('click', () => this.togglePause());
    }

    // Speed Preset Buttons (STOP, 40, 80, 120 CRUISE, 160 MAX)
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const spd = parseInt(btn.dataset.speed, 10);
        this.physics.setTargetSpeed(spd);
        this.activeSpeedPreset = spd;
        this.updateSpeedPresetButtons(spd);
        if (this.isPaused) {
          this.togglePause();
        }
      });
    });

    // AI Sensor Mode Toggle (AUTO / MANUAL)
    if (this.dom.btnAiSensorMode) {
      this.dom.btnAiSensorMode.addEventListener('click', () => this.toggleAiSensorMode());
    }

    // Deterrence Beam Button
    if (this.dom.btnConsoleBeam) {
      this.dom.btnConsoleBeam.addEventListener('click', () => this.fireDeterrenceBeam());
    }

    // Front Net Button
    if (this.dom.btnConsoleNet) {
      this.dom.btnConsoleNet.addEventListener('click', () => this.toggleCaptureNet());
    }

    // Horn Blast Button
    if (this.dom.btnConsoleHorn) {
      const startHornHandler = () => this.audio.startHorn('dual');
      const stopHornHandler = () => this.audio.stopHorn();
      this.dom.btnConsoleHorn.addEventListener('mousedown', startHornHandler);
      this.dom.btnConsoleHorn.addEventListener('mouseup', stopHornHandler);
      this.dom.btnConsoleHorn.addEventListener('touchstart', (e) => { e.preventDefault(); startHornHandler(); });
      this.dom.btnConsoleHorn.addEventListener('touchend', (e) => { e.preventDefault(); stopHornHandler(); });
    }

    // Emergency Brake Button
    if (this.dom.btnConsoleEmergency) {
      this.dom.btnConsoleEmergency.addEventListener('click', () => {
        this.physics.triggerEmergencyBrake();
        this.audio.triggerBrakeHiss(1.0);
        this.dom.btnConsoleEmergency.classList.toggle('active', this.physics.emergencyBrake);
      });
    }

    // Reset Run Button
    if (this.dom.btnConsoleReset) {
      this.dom.btnConsoleReset.addEventListener('click', () => this.resetRun());
    }

    // Auto Spin Button
    if (this.dom.btnAutoSpin) {
      this.dom.btnAutoSpin.addEventListener('click', () => this.toggleAutoSpin());
    }

    // Manual Electric Shock Trigger Button
    if (this.dom.btnConsoleShock) {
      this.dom.btnConsoleShock.addEventListener('click', () => this.fireElectricShockPulse());
    }

    // Obstacle Scenario Buttons inside Kavach Card
    if (this.dom.btnHumanEnter) this.dom.btnHumanEnter.addEventListener('click', () => this.applyScenario(1));
    if (this.dom.btnHumanExit) this.dom.btnHumanExit.addEventListener('click', () => this.applyScenario(2));
    if (this.dom.btnHumanMid) this.dom.btnHumanMid.addEventListener('click', () => this.applyScenario(3));
    if (this.dom.btnHumanSudden) this.dom.btnHumanSudden.addEventListener('click', () => this.applyScenario(4));
    if (this.dom.btnAnimalDog) this.dom.btnAnimalDog.addEventListener('click', () => this.applyScenario(5));
    if (this.dom.btnAnimalDeer) this.dom.btnAnimalDeer.addEventListener('click', () => this.applyScenario(6));
    if (this.dom.btnAnimalCow) this.dom.btnAnimalCow.addEventListener('click', () => this.applyScenario(7));
    if (this.dom.btnAnimalElephant) this.dom.btnAnimalElephant.addEventListener('click', () => this.applyScenario(8));
    if (this.dom.btnAnimalCowSudden) this.dom.btnAnimalCowSudden.addEventListener('click', () => this.applyScenario(9));
    // Power Source Weight Tier Buttons
    if (this.dom.btnTier1) this.dom.btnTier1.addEventListener('click', () => this.testWeightTier(1));
    if (this.dom.btnTier2) this.dom.btnTier2.addEventListener('click', () => this.testWeightTier(2));
    if (this.dom.btnTier3) this.dom.btnTier3.addEventListener('click', () => this.testWeightTier(3));
    if (this.dom.btnTier4) this.dom.btnTier4.addEventListener('click', () => this.testWeightTier(4));
    if (this.dom.btnClearObstacles) {
      this.dom.btnClearObstacles.addEventListener('click', () => {
        this.obstacles.clearAllObstacles();
        this.obstacles.resetCollected(this.train.captureNet);
      });
    }

    // Scenario Stepper Dock Buttons (1-by-1 Scenarios Toolbar 1 to 10)
    if (this.dom.btnScenPrev) {
      this.dom.btnScenPrev.addEventListener('click', () => this.prevScenario());
    }
    if (this.dom.btnScenNext) {
      this.dom.btnScenNext.addEventListener('click', () => this.nextScenario());
    }
    for (let i = 1; i <= 10; i++) {
      const btn = document.getElementById(`btn-scen-${i}`);
      if (btn) {
        btn.addEventListener('click', () => this.applyScenario(i));
      }
    }
    if (this.dom.btnScenCam) {
      this.dom.btnScenCam.addEventListener('click', () => {
        this.setCameraMode('target');
        this.focusOnTarget(true);
      });
    }
    if (this.dom.btnScenShock) {
      this.dom.btnScenShock.addEventListener('click', () => this.fireElectricShockPulse());
    }
    if (this.dom.btnScenReplay) {
      this.dom.btnScenReplay.addEventListener('click', () => this.replayCurrentScenario());
    }

    // Toggle AI Kavach Safety Panel (Top bar button)
    const btnToggleKavach = document.getElementById('btn-toggle-kavach');
    if (btnToggleKavach && this.dom.kavachCard) {
      btnToggleKavach.addEventListener('click', () => {
        const isClosed = this.dom.kavachCard.classList.toggle('closed');
        btnToggleKavach.classList.toggle('active', !isClosed);
      });
    }

    // Minimize AI Kavach Card
    if (this.dom.btnKavachMinimize && this.dom.kavachCard) {
      this.dom.btnKavachMinimize.addEventListener('click', () => {
        this.dom.kavachCard.classList.toggle('closed');
        if (btnToggleKavach) {
          btnToggleKavach.classList.remove('active');
        }
      });
    }
  }

  // ---------------------------------------------------------
  // Floating Console Helper Methods
  // ---------------------------------------------------------
  togglePause() {
    this.isPaused = !this.isPaused;
    if (this.dom.btnRunPause) {
      this.dom.btnRunPause.innerText = this.isPaused ? '⏸ PAUSED' : '▶ RUNNING';
      this.dom.btnRunPause.classList.toggle('paused', this.isPaused);
    }
  }

  updateSpeedPresetButtons(spd) {
    document.querySelectorAll('.speed-preset-btn').forEach(btn => {
      const s = parseInt(btn.dataset.speed, 10);
      btn.classList.toggle('active', s === spd);
    });
  }

  toggleAiSensorMode() {
    this.aiSensorAuto = !this.aiSensorAuto;
    if (this.dom.btnAiSensorMode) {
      this.dom.btnAiSensorMode.innerText = this.aiSensorAuto ? '🛡️ AI SENSOR: AUTO' : '🛡️ AI SENSOR: MANUAL';
      this.dom.btnAiSensorMode.classList.toggle('active-cyan', this.aiSensorAuto);
    }
  }

  fireElectricShockPulse() {
    let target = this.obstacles.obstacles.find(o => !o.isCollected && !o.isCleared);
    if (!target) {
      target = this.obstacles.spawnHumanAhead('mid', this.physics.trackProgress, this.track.totalLength, 70, false);
    }
    const specs = target ? this.obstacles.getTailoredShockSpecs(target) : null;
    const activeIndices = specs ? specs.activeIndices : [0, 1, 2, 3];
    if (target) {
      this.obstacles.triggerDeterrence(target, this.audio, this.train);
    }
    if (this.train && this.train.pulseShockEmitters) {
      this.train.pulseShockEmitters(1.0, activeIndices);
      setTimeout(() => {
        if (this.train && this.train.pulseShockEmitters) this.train.pulseShockEmitters(0);
      }, 1000);
    }
    if (this.audio) {
      this.audio.playElectricShockDischarge(target ? target.type : 'human', target ? target.mass : 72);
    }
    if (this.dom.btnConsoleShock) {
      const pCount = specs ? specs.powerSourcesCount : 4;
      this.dom.btnConsoleShock.innerText = `⚡ E-SHOCK: FIRED (${pCount}X)`;
      setTimeout(() => {
        if (this.dom.btnConsoleShock) this.dom.btnConsoleShock.innerText = '⚡ E-SHOCK: ACTIVE';
      }, 1200);
    }
  }

  toggleCaptureNet() {
    const state = this.train.toggleCaptureNet(this.audio);
    if (this.dom.btnConsoleNet) {
      this.dom.btnConsoleNet.innerText = `🪤 NET: ${state ? 'DEPLOYED' : 'RETRACTED'}`;
      this.dom.btnConsoleNet.classList.toggle('active-amber', state);
    }
  }

  resetRun() {
    this.physics.reset();
    this.physics.setTargetSpeed(120);
    this.updateSpeedPresetButtons(120);
    this.obstacles.resetCollected(this.train.captureNet);
    this.obstacles.initDefaultObstacles();
    this.obstacles.setTrain(this.train);
    this.train.setCaptureNetState(false);
    if (this.dom.btnConsoleNet) {
      this.dom.btnConsoleNet.innerText = '🪤 NET: RETRACTED';
      this.dom.btnConsoleNet.classList.remove('active-amber');
    }
    if (this.isPaused) {
      this.togglePause();
    }
    if (this.dom.btnConsoleEmergency) {
      this.dom.btnConsoleEmergency.classList.remove('active');
    }
  }

  toggleAutoSpin() {
    this.autoSpin = !this.autoSpin;
    if (this.dom.btnAutoSpin) {
      this.dom.btnAutoSpin.classList.toggle('active', this.autoSpin);
    }
  }

  updateTelemetryTicker() {
    const t = this.lastTelemetry;
    if (this.dom.tickerStatus) {
      if (t && t.targetDetected) {
        this.dom.tickerStatus.innerText = t.action;
        this.dom.tickerStatus.style.color = t.canCollect ? '#34d399' : '#f59e0b';
      } else {
        this.dom.tickerStatus.innerText = 'ACTIVE MONITORING (1 km)';
        this.dom.tickerStatus.style.color = '#34d399';
      }
    }
  }
  // ---------------------------------------------------------
  // Camera Switching
  // ---------------------------------------------------------
  setCameraMode(mode) {
    if (mode === 'chase') mode = 'orbit';
    this.cameraMode = mode;
    this.isRailfanInitialized = false;

    // Update active UI tool button across both toolbars
    document.querySelectorAll('[data-cam]').forEach(b => {
      const bCam = b.dataset.cam;
      const isActive = (bCam === mode) || (mode === 'orbit' && bCam === 'chase');
      b.classList.toggle('active', isActive);
    });

    if (mode === 'orbit' || mode === 'drone' || mode === 'target') {
      this.controls.enabled = true;
    } else {
      this.controls.enabled = false;
    }

    if (mode === 'target') {
      this.focusOnTarget(true);
    }
  }

  // ---------------------------------------------------------
  // Focus RX TARGET Camera directly on the Human Obstacle (Head-to-Toe 3/4 Orbit)
  // ---------------------------------------------------------
  focusOnTarget(forceReposition = true) {
    let targetObs = this.obstacles.obstacles.find(o => !o.isCollected && o.mesh);
    if (!targetObs || !targetObs.mesh) {
      const aheadProg = (this.physics.trackProgress + (75 / this.track.totalLength)) % 1.0;
      const spot = this.track.getTrackTransform(aheadProg, 0);
      const camPos = spot.position.clone().add(new THREE.Vector3(2.5, 1.8, 4.0));
      this.camera.position.copy(camPos);
      this.controls.target.copy(spot.position.clone().add(new THREE.Vector3(0, 1.0, 0)));
      this.controls.update();
      return;
    }

    let centerOffsetY = 1.15;
    let camDist = 3.6;
    let latDist = 2.0;
    let heightOff = 0.45;

    if (targetObs.type === 'dog') {
      centerOffsetY = 0.38;
      camDist = 2.4;
      latDist = 1.4;
      heightOff = 0.30;
    } else if (targetObs.type === 'deer') {
      centerOffsetY = 0.82;
      camDist = 3.6;
      latDist = 1.8;
      heightOff = 0.40;
    } else if (targetObs.type === 'cow') {
      centerOffsetY = 1.05;
      camDist = 5.0;
      latDist = 2.6;
      heightOff = 0.60;
    } else if (targetObs.type === 'elephant') {
      centerOffsetY = 1.85;
      camDist = 8.5;
      latDist = 4.5;
      heightOff = 1.20;
    } else if (targetObs.type === 'boar') {
      centerOffsetY = 0.55;
      camDist = 3.0;
      latDist = 1.6;
      heightOff = 0.35;
    }

    const targetPos = targetObs.mesh.position;
    const targetCenter = targetPos.clone().add(new THREE.Vector3(0, centerOffsetY, 0));

    const transform = this.track.getTrackTransform(targetObs.progress, 0);
    const tangent = transform.tangent ? transform.tangent.clone().normalize() : new THREE.Vector3(0, 0, 1);
    const normal = transform.normal ? transform.normal.clone().normalize() : new THREE.Vector3(1, 0, 0);
    const up = new THREE.Vector3(0, 1, 0);

    // 3/4 front-lateral perspective framing the full obstacle + face + eyes + antlers facing the approaching train
    const camOffset = tangent.clone().negate().multiplyScalar(camDist)
      .add(normal.clone().multiplyScalar(latDist))
      .add(up.clone().multiplyScalar(heightOff));
    const idealCamPos = targetCenter.clone().add(camOffset);

    if (forceReposition) {
      this.camera.position.copy(idealCamPos);
    }
    this.controls.target.copy(targetCenter);
    this.camera.lookAt(targetCenter);
    this.controls.update();
  }

  // ---------------------------------------------------------
  // One-by-One Scenario Execution Suite (Applies 1 Scenario in Isolation)
  // ---------------------------------------------------------
  applyScenario(index = 1, forceRepositionCam = true) {
    this.currentScenario = index;
    const obs = this.obstacles.applyScenario(index, this.physics.trackProgress, this.track.totalLength);

    if (index === 10) {
      // Auto-switch to Coach Shield flank view to observe the Coach Side Power Sources in action
      this.setCameraMode('action');
      if (this.dom.btnCamAction) {
        document.querySelectorAll('.viewport-btn').forEach(btn => {
          btn.classList.toggle('active', btn.dataset.cam === 'action');
        });
      }
    } else {
      // Auto-switch to RX TARGET view to immediately observe the scenario and its animations
      this.setCameraMode('target');
      this.focusOnTarget(forceRepositionCam);
    }

    // Synchronize Scenario UI Buttons (1 through 10)
    for (let i = 1; i <= 10; i++) {
      const btn = document.getElementById(`btn-scen-${i}`);
      if (btn) btn.classList.toggle('active', i === index);
    }

    if (this.dom.btnHumanEnter) this.dom.btnHumanEnter.classList.toggle('active', index === 1);
    if (this.dom.btnHumanExit) this.dom.btnHumanExit.classList.toggle('active', index === 2);
    if (this.dom.btnHumanMid) this.dom.btnHumanMid.classList.toggle('active', index === 3);
    if (this.dom.btnHumanSudden) this.dom.btnHumanSudden.classList.toggle('active', index === 4);
    if (this.dom.btnAnimalDog) this.dom.btnAnimalDog.classList.toggle('active', index === 5);
    if (this.dom.btnAnimalDeer) this.dom.btnAnimalDeer.classList.toggle('active', index === 6);
    if (this.dom.btnAnimalCow) this.dom.btnAnimalCow.classList.toggle('active', index === 7);
    if (this.dom.btnAnimalElephant) this.dom.btnAnimalElephant.classList.toggle('active', index === 8);
    if (this.dom.btnAnimalCowSudden) this.dom.btnAnimalCowSudden.classList.toggle('active', index === 9);

    // Deactivate power source tier buttons when running a numbered scenario
    for (let t = 1; t <= 4; t++) {
      const tb = document.getElementById(`btn-tier-${t}`);
      if (tb) tb.classList.remove('active');
    }

    // Update Scenario Information HUD Card
    this.updateScenarioHUD(index);
  }

  // Dedicated interactive tester for weight-tiered power sources (1x, 2x, 3x, 4x)
  testWeightTier(tier = 1) {
    const obs = this.obstacles.spawnWeightTierObstacle(
      tier,
      this.physics.trackProgress,
      this.track.totalLength
    );
    this.currentScenario = null;

    // Deselect standard scenario buttons
    for (let i = 1; i <= 10; i++) {
      const btn = document.getElementById(`btn-scen-${i}`);
      if (btn) btn.classList.remove('active');
    }
    ['btnHumanEnter', 'btnHumanExit', 'btnHumanMid', 'btnHumanSudden', 'btnAnimalDog', 'btnAnimalDeer', 'btnAnimalCow', 'btnAnimalElephant', 'btnAnimalCowSudden'].forEach(k => {
      if (this.dom[k]) this.dom[k].classList.remove('active');
    });

    // Highlight the active weight-tier button
    for (let t = 1; t <= 4; t++) {
      const tb = document.getElementById(`btn-tier-${t}`);
      if (tb) tb.classList.toggle('active', t === tier);
    }

    // Auto-switch to RX TARGET view to observe deterrence arc
    this.setCameraMode('target');
    this.focusOnTarget(true);

    const specs = this.obstacles.getTailoredShockSpecs(obs);

    const badgeEl = document.getElementById('scen-card-badge');
    const titleEl = document.getElementById('scen-card-title');
    const leadEl = document.getElementById('scen-leg-lead');
    const trailEl = document.getElementById('scen-leg-trail');
    const descEl = document.getElementById('scen-card-desc');

    if (badgeEl) badgeEl.innerText = `WEIGHT TIER TEST • TIER ${specs.tier} / 4`;
    if (titleEl) titleEl.innerText = `${specs.tier}. ${obs.name.toUpperCase()}`;
    if (leadEl) leadEl.innerText = `POWER SOURCES: ${specs.powerSourcesCount} / 4 ACTIVE [${specs.activeLabels.join(', ')}]`;
    if (trailEl) trailEl.innerText = `SPECS: ${specs.voltage} • ${specs.current} • ${specs.energy} (${specs.compliance})`;
    if (descEl) descEl.innerText = specs.desc;
  }

  prevScenario() {
    const nextIdx = this.currentScenario <= 1 ? 10 : this.currentScenario - 1;
    this.applyScenario(nextIdx, true);
  }

  nextScenario() {
    const nextIdx = this.currentScenario >= 10 ? 1 : this.currentScenario + 1;
    this.applyScenario(nextIdx, true);
  }

  replayCurrentScenario() {
    this.applyScenario(this.currentScenario || 1, true);
  }

  updateScenarioHUD(index) {
    const badgeEl = document.getElementById('scen-card-badge');
    const titleEl = document.getElementById('scen-card-title');
    const leadEl = document.getElementById('scen-leg-lead');
    const trailEl = document.getElementById('scen-leg-trail');
    const descEl = document.getElementById('scen-card-desc');

    const meta = [
      null,
      {
        badge: 'SCENARIO 1 / 10 • 800M-80M ELECTRICITY ONLY',
        title: '1. HUMAN ENTER ON TRACK (72 KG)',
        lead: 'LEAD LEG: ON RAIL HEAD (+32 cm)',
        trail: 'TRAILING LEG: ON GROUND (0 cm)',
        desc: 'Inside lead foot steps UP onto elevated rail (+32cm). Trailing foot on ground (0cm). Early detection at 800m-80m uses ONLY non-lethal electricity to deter human safely.'
      },
      {
        badge: 'SCENARIO 2 / 10 • 800M-80M ELECTRICITY ONLY',
        title: '2. HUMAN EXIT TO TRACK (70 KG)',
        lead: 'LEAD LEG: ON GROUND LEVEL (0 cm)',
        trail: 'TRAILING LEG: ON RAIL HEAD (+32 cm)',
        desc: 'Outside lead foot reaches DOWN to ground (0cm). Trailing foot pushes off elevated rail (+32cm). Early 800m-80m electricity ensures rapid egress off track.'
      },
      {
        badge: 'SCENARIO 3 / 10 • 800M-80M ELECTRICITY ONLY',
        title: '3. HUMAN MID-TRACK (74 KG)',
        lead: 'POSITION: TRACK CENTERLINE (x = 0.00m)',
        trail: 'FEET: PLANTED ON SLEEPERS BETWEEN RAILS',
        desc: 'Walking along track centerline between rails. AI LiDAR & Camera detect at 800m; non-lethal electric shock pulse deters off track before 80m. No capture net used.'
      },
      {
        badge: 'SCENARIO 4 / 10 • 80M-0M SUDDEN (NET OPEN)',
        title: '4. HUMAN SUDDEN DASH (72 KG ≤ 150 KG)',
        lead: 'INTRUSION: FAST SPRINT FROM BUSHES (<80M)',
        trail: 'SAFETY: NO ELECTRICITY • CAPTURE NET DEPLOYS',
        desc: 'Sudden emergence at 75m! High-voltage shock is DISABLED for sudden safety. Weight 72kg ≤ 150kg triggers automatic capture net deployment and scoop at 14m.'
      },
      {
        badge: 'SCENARIO 5 / 10 • 80M-0M SUDDEN (NET OPEN)',
        title: '5. STRAY DOG SUDDEN INTRUSION (22 KG)',
        lead: 'SPECIES: CANIS LUPUS FAMILIARIS (22 KG)',
        trail: 'SAFETY: NO ELECTRICITY • CAPTURE NET DEPLOYS',
        desc: 'Stray dog darts across ballast at 72m! NO electricity is fired. Weight 22kg is well under 150kg limit, opening front capture net to rescue dog into cradle.'
      },
      {
        badge: 'SCENARIO 6 / 10 • 80M-0M SUDDEN (NET OPEN)',
        title: '6. SPOTTED DEER SUDDEN BOUND (48 KG)',
        lead: 'SPECIES: AXIS AXIS / CHITAL (48 KG)',
        trail: 'SAFETY: NO ELECTRICITY • CAPTURE NET DEPLOYS',
        desc: 'Spotted deer bounds onto track at 76m! NO electricity is used. Payload 48kg is within 150kg safety rating, smoothly scooping deer without harm.'
      },
      {
        badge: 'SCENARIO 7 / 10 • 800M-80M ONLY ELECTRICITY',
        title: '7. INDIAN ZEBU COW ON TRACK (360 KG)',
        lead: 'SPECIES: BOS INDICUS (360 KG > 350 KG)',
        trail: 'SAFETY: ONLY ELECTRICITY (800M-80M) • NET LOCKED',
        desc: 'Heavy cattle grazing 650m ahead. Weight 360kg > 350kg: Net is LOCKED. Non-lethal electric shock (All 4 power sources active) clears cow off track safely before 80m.'
      },
      {
        badge: 'SCENARIO 8 / 10 • 800M-80M ONLY ELECTRICITY',
        title: '8. WILD ASIAN ELEPHANT (3,800 KG)',
        lead: 'SPECIES: ELEPHAS MAXIMUS (3,800 KG > 150 KG)',
        trail: 'SAFETY: QUAD ELECTRICITY (800M-80M) • NET LOCKED',
        desc: 'Massive elephant 720m ahead. Net is strictly LOCKED (>150kg limit). Quad 7.8kV/3.8mA non-lethal shock pulse deters elephant off track without injury.'
      },
      {
        badge: 'SCENARIO 9 / 10 • WEIGHT LIMIT TEST (>150KG)',
        title: '9. COW SUDDEN INTRUSION (360 KG > 150 KG)',
        lead: 'SUDDEN (<80M): 360 KG EXCEEDS 150 KG CAPACITY',
        trail: 'SAFETY: NET LOCKED • NO ELECTRICITY • E-BRAKE',
        desc: 'CRITICAL WEIGHT LIMIT TEST: 360kg cow enters suddenly at 75m. Net CANNOT open (>150kg structural lock prevents damage). NO electricity. Emergency brakes slam!'
      },
      {
        badge: 'SCENARIO 10 / 10 • ACTIVE 2-3M PERIMETER GUARD',
        title: '10. COACH FLANK HUMAN & ANIMAL (2-3M REPEL)',
        lead: 'TARGETS: HUMAN (2.3M) & COW (2.5M) BESIDE COACHES',
        trail: 'POWER: ACTIVE 2-3M FIRED • PUSHED AWAY INTO SAFETY',
        desc: 'Both a human (2.3m) and a 360kg cow (2.5m) intrude into the coach flank 2-3M danger zone. The nearest coach Power Sources fire high-voltage electro-kinetic pulses and push both away from the train!'
      }
    ][index];

    if (!meta) return;
    if (badgeEl) badgeEl.innerText = meta.badge;
    if (titleEl) titleEl.innerText = meta.title;
    if (leadEl) leadEl.innerText = meta.lead;
    if (trailEl) trailEl.innerText = meta.trail;
    if (descEl) descEl.innerText = meta.desc;
  }

  cycleCamera() {
    const modes = ['orbit', 'cab', 'target', 'action', 'drone', 'net'];
    const idx = modes.indexOf(this.cameraMode);
    const nextMode = modes[(idx + 1) % modes.length];
    this.setCameraMode(nextMode);
  }

  // ---------------------------------------------------------
  // Slow-Motion Time-Warp Controls (Preserves Train Speed)
  // ---------------------------------------------------------
  cycleSlowMotion() {
    this.timeScaleIndex = (this.timeScaleIndex + 1) % this.timeScales.length;
    this.timeScale = this.timeScales[this.timeScaleIndex];
    this.isRescueSlowMo = false;
    this.updateSlowMoUI();
  }

  setSlowMotion(scale) {
    this.timeScale = scale;
    this.timeScaleIndex = this.timeScales.indexOf(scale);
    if (this.timeScaleIndex === -1) this.timeScaleIndex = 0;
    this.isRescueSlowMo = false;
    this.updateSlowMoUI();
  }

  updateSlowMoUI() {
    const activeScale = this.isRescueSlowMo ? 0.25 : this.timeScale;
    const isSlow = activeScale < 1.0;
    const label = isSlow ? `⏱️ SLOW-MO: ${activeScale}x` : '⏱️ SLOW-MO: 1x';

    const btnTop = document.getElementById('btn-slow-mo');
    const badge = document.getElementById('slowmo-badge');

    if (btnTop) {
      btnTop.innerText = label;
      btnTop.classList.toggle('active', isSlow);
      btnTop.style.background = isSlow ? '#0284c7' : 'rgba(3, 105, 161, 0.4)';
    }
    if (badge) {
      badge.style.display = isSlow ? 'block' : 'none';
      if (this.isRescueSlowMo) {
        badge.innerText = `⚡ AI KAVACH RESCUE CAM (0.25x SLOW-MO) • SPEED: ${Math.round(this.physics.speedKmh)} KM/H`;
      } else {
        badge.innerText = `⏱️ SLOW MOTION (${activeScale}x) • TRAIN SPEED: ${Math.round(this.physics.speedKmh)} KM/H`;
      }
    }
  }

  // ---------------------------------------------------------
  // Train Configuration (WAP-7 High-Speed Electric)
  // ---------------------------------------------------------
  setTrain(type = 'electric') {
    this.train.setTrainType('electric');
    this.physics.isElectric = true;
    this.cab = new CabInterior(this.train.locoCar);

    const titleEl = document.getElementById('train-title');
    const shedEl = document.getElementById('loco-shed');
    const locoClassEl = document.getElementById('loco-class');

    if (titleEl) titleEl.innerText = '12301 RAJDHANI EXPRESS';
    if (shedEl) shedEl.innerText = 'GZB WAP-7 #30201';
    if (locoClassEl) locoClassEl.innerText = 'Electric 25kV AC (6,350 HP)';
    if (this.dom.oheVal) this.dom.oheVal.innerText = '25.0 kV';
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

    if (this.cameraMode === 'orbit' || this.cameraMode === 'chase') {
      // ORBIT 360°: Smooth orbit camera with damping and auto-spin
      this.controls.target.copy(locoPos).add(new THREE.Vector3(0, 2.5, 0));
      if (this.camera.position.y < locoPos.y + 1.2) {
        this.camera.position.y = locoPos.y + 1.2;
      }
      this.controls.autoRotate = this.autoSpin;
      this.controls.autoRotateSpeed = 2.0;
      this.controls.update();

    } else if (this.cameraMode === 'target') {
      // RX TARGET: Camera placed ahead at target/obstacle focused directly on the character/animal (head-to-toe 3/4 orbit)
      let targetObs = this.obstacles.obstacles.find(o => !o.isCollected && o.mesh);
      if (targetObs && targetObs.mesh) {
        let centerOffsetY = 1.15;
        if (targetObs.type === 'dog') centerOffsetY = 0.38;
        else if (targetObs.type === 'deer') centerOffsetY = 0.82;
        else if (targetObs.type === 'cow') centerOffsetY = 1.05;
        else if (targetObs.type === 'elephant') centerOffsetY = 1.85;
        else if (targetObs.type === 'boar') centerOffsetY = 0.55;

        const targetPos = targetObs.mesh.position;
        const targetCenter = targetPos.clone().add(new THREE.Vector3(0, centerOffsetY, 0));

        // Smoothly maintain OrbitControls focus on the target's center of mass
        this.controls.target.lerp(targetCenter, 0.18);
        this.controls.minDistance = 1.0;
        this.controls.maxDistance = 35.0;
        this.controls.update();
      } else {
        const aheadProg = (this.physics.trackProgress + (75 / this.track.totalLength)) % 1.0;
        const spot = this.track.getTrackTransform(aheadProg, 0);
        const lookTarget = spot.position.clone().add(new THREE.Vector3(0, 1.0, 0));
        this.controls.target.lerp(lookTarget, 0.15);
        this.controls.update();
      }

    } else if (this.cameraMode === 'cab') {
      // TX CAB: Driver Seat inside Cockpit looking out front windshield
      const eyeOffset = new THREE.Vector3(0.55, 2.4, this.train.locoLength / 2 - 1.2).applyEuler(locoRot);
      this.camera.position.copy(locoPos).add(eyeOffset);

      // Look direction + mouse yaw/pitch
      const lookDir = forward.clone();
      lookDir.applyAxisAngle(up, this.cabYaw);
      lookDir.applyAxisAngle(right, this.cabPitch);
      this.camera.lookAt(this.camera.position.clone().add(lookDir));

    } else if (this.cameraMode === 'action') {
      // COACH SHIELD: Low-angle front-left 3/4 perspective tracking locomotive nose, capture net, and rails
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

    } else if (this.cameraMode === 'net') {
      // CAPTURE NET: Dedicated Close-Up Capture Net & Scoop Action Cam
      const fwdDist = this.train.locoLength / 2 + 4.9;
      const camOffset = forward.clone().multiplyScalar(fwdDist)
        .add(right.clone().multiplyScalar(-2.5))
        .add(up.clone().multiplyScalar(1.2));
      const lookTarget = locoPos.clone()
        .add(forward.clone().multiplyScalar(this.train.locoLength / 2 + 1.6))
        .add(right.clone().multiplyScalar(0.1))
        .add(up.clone().multiplyScalar(0.7));
      this.camera.position.copy(locoPos).add(camOffset);
      this.camera.lookAt(lookTarget);

    } else if (this.cameraMode === 'drone') {
      // TOP RADAR: High bird's-eye vantage point
      this.controls.target.copy(locoPos);
      this.controls.autoRotate = this.autoSpin;
      this.controls.autoRotateSpeed = 1.5;
      this.controls.update();

    } else if (this.cameraMode === 'railfan') {
      // Fixed trackside spotter camera
      if (!this.isRailfanInitialized) {
        const aheadProg = (this.physics.trackProgress + (80 / this.track.totalLength)) % 1.0;
        const spot = this.track.getTrackTransform(aheadProg, 0);
        this.railfanPos.copy(spot.position).add(spot.normal.clone().multiplyScalar(6.5)).setY(spot.position.y + 1.6);
        this.camera.position.copy(this.railfanPos);
        this.isRailfanInitialized = true;
      }

      this.camera.lookAt(locoPos.clone().add(new THREE.Vector3(0, 2.0, 0)));
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
    }
  }

  // ---------------------------------------------------------
  // Update HUD Gauges & Signals
  // ---------------------------------------------------------
  updateHUD() {
    const p = this.physics;

    // Digital Speed in Floating Console Pod (Ref: media_1793808764475_89ecfc40.jpg)
    if (this.dom.consoleSpeedVal) {
      this.dom.consoleSpeedVal.innerText = Math.round(p.speedKmh);
    }

    // Console Emergency Brake Button State Sync
    if (this.dom.btnConsoleEmergency) {
      this.dom.btnConsoleEmergency.classList.toggle('active', p.emergencyBrake);
    }

    // Console Net Button State Sync
    if (this.dom.btnConsoleNet && this.train && this.train.captureNetDeployed !== undefined) {
      const isNetOut = this.train.captureNetDeployed;
      this.dom.btnConsoleNet.innerText = `🪤 NET: ${isNetOut ? 'DEPLOYED' : 'RETRACTED'}`;
      this.dom.btnConsoleNet.classList.toggle('active-amber', isNetOut);
    }

    // Live Technical Telemetry Ticker update
    this.updateTelemetryTicker();

    // Station distance (Top route card)
    if (this.dom.stationDistText) {
      const distToStationMeters = ((this.track.stationProgress - p.trackProgress + 1.0) % 1.0) * this.track.totalLength;
      if (distToStationMeters < 1000) {
        this.dom.stationDistText.innerText = `${Math.round(distToStationMeters)} m`;
      } else {
        this.dom.stationDistText.innerText = `${(distToStationMeters / 1000).toFixed(1)} km`;
      }
    }

    // Track Signalling
    this.track.updateSignals(p.trackProgress);

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

      if (this.dom.kavachTargetSpec) {
        if (t.tailoredSpec && t.tailoredLabel) {
          this.dom.kavachTargetSpec.innerText = `${t.tailoredLabel} [${t.tailoredSpec}]`;
          this.dom.kavachTargetSpec.style.color = '#38bdf8';
        } else {
          this.dom.kavachTargetSpec.innerText = 'STANDBY (1 km)';
          this.dom.kavachTargetSpec.style.color = '#94a3b8';
        }
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

      // Dynamic Alert Notification Pill for AI Detection & Rescue Events
      if (t.alertMessage) {
        if (t.alertMessage !== this.lastDisplayedAlert) {
          this.lastDisplayedAlert = t.alertMessage;
          this.dom.alertBanner.style.display = 'block';
          this.dom.alertBanner.style.opacity = '1';
          if (t.alertType === 'hazard') {
            this.dom.alertBanner.style.background = 'rgba(185, 28, 28, 0.92)';
            this.dom.alertBanner.style.borderColor = '#ef4444';
          } else if (t.alertType === 'success') {
            this.dom.alertBanner.style.background = 'rgba(5, 150, 105, 0.92)';
            this.dom.alertBanner.style.borderColor = '#10b981';
          } else {
            this.dom.alertBanner.style.background = 'rgba(180, 83, 9, 0.92)';
            this.dom.alertBanner.style.borderColor = '#f59e0b';
          }
          this.dom.alertBanner.innerText = t.alertMessage;

          // Auto-hide after 3.8s so it never stays permanently across screen
          clearTimeout(this.alertBannerTimeout);
          this.alertBannerTimeout = setTimeout(() => {
            if (this.dom.alertBanner) {
              this.dom.alertBanner.style.opacity = '0';
              setTimeout(() => {
                if (this.dom.alertBanner) this.dom.alertBanner.style.display = 'none';
              }, 300);
            }
          }, 3800);
        }
      }
    } else {
      if (!this.lastDisplayedAlert && this.dom.alertBanner) {
        this.dom.alertBanner.style.display = 'none';
      }
    }
  }

  // ---------------------------------------------------------
  // Main Animation / Game Loop
  // ---------------------------------------------------------
  animate() {
    requestAnimationFrame(this.animate);

    const rawDt = Math.min(this.clock.getDelta(), 0.1);

    // Pause handling: keep camera active, but freeze physical world
    if (this.isPaused) {
      this.updateCamera();
      this.updateHUD();
      this.renderer.render(this.scene, this.camera);
      return;
    }

    // Automated Cinematic Slow-Motion Trigger during close-range rescue events
    if (this.autoSlowMo && this.lastTelemetry && this.lastTelemetry.targetDetected && this.lastTelemetry.canCollect) {
      if (this.lastTelemetry.distance <= 48 && !this.isRescueSlowMo) {
        this.isRescueSlowMo = true;
        this.rescueSlowMoTimer = 3.2; // Hold slow motion for 3.2s so player clearly observes scoop
        this.updateSlowMoUI();
      }
    }

    if (this.isRescueSlowMo) {
      this.rescueSlowMoTimer -= rawDt;
      if (this.rescueSlowMoTimer <= 0) {
        this.isRescueSlowMo = false;
        this.updateSlowMoUI();
      }
    }

    // Effective time-warp scale (manual scale or automated rescue slow-mo)
    const effectiveTimeScale = this.isRescueSlowMo ? 0.25 : this.timeScale;
    const dt = rawDt * effectiveTimeScale;

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
      this.track.totalLength,
      this.aiSensorAuto,
      this.train
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

