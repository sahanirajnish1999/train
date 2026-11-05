// ============================================================================
// INDIAN RAILWAYS - REALISTIC 3D ENVIRONMENT
// Three.js | Dynamic Sky | Clouds | Sun | Weather | AI WAG-9 Train
// ============================================================================

import * as THREE from 'three';

export class Environment {
  constructor(scene, trackSystem) {
    this.scene = scene;
    this.trackSystem = trackSystem;

    // Lighting
    this.sunLight = null;
    this.ambientLight = null;
    this.hemiLight = null;

    // Atmosphere
    this.skyDome = null;
    this.sunDisc = null;
    this.sunGlow = null;
    this.clouds = [];
    this.stars = null;
    this.atmosphereTime = 0;

    // Weather
    this.currentWeather = 'day';
    this.rainParticles = null;
    this.rainGeo = null;

    // AI Train
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

  // ==========================================================================
  // SKY AND LIGHTING
  // ==========================================================================

  initSkyAndLighting() {
    const skyGeometry = new THREE.SphereGeometry(1800, 48, 32);

    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,

      uniforms: {
        topColor: { value: new THREE.Color(0x1678c8) },
        horizonColor: { value: new THREE.Color(0xc9e8f5) },
        bottomColor: { value: new THREE.Color(0x9bb7c5) },
        sunColor: { value: new THREE.Color(0xffe4a3) },
        sunDirection: {
          value: new THREE.Vector3(0.35, 0.55, 0.7).normalize()
        }
      },

      vertexShader: `
        varying vec3 vWorldDirection;

        void main() {
          vec4 worldPosition = modelMatrix * vec4(position, 1.0);
          vWorldDirection = normalize(worldPosition.xyz);

          gl_Position =
            projectionMatrix *
            modelViewMatrix *
            vec4(position, 1.0);
        }
      `,

      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform vec3 bottomColor;
        uniform vec3 sunColor;
        uniform vec3 sunDirection;

        varying vec3 vWorldDirection;

        void main() {
          float h = normalize(vWorldDirection).y;

          float upper = smoothstep(-0.08, 0.72, h);
          float lower = smoothstep(-0.45, -0.02, h);

          vec3 sky = mix(bottomColor, horizonColor, lower);
          sky = mix(sky, topColor, upper);

          float sun = pow(
            max(dot(normalize(vWorldDirection),
            normalize(sunDirection)), 0.0),
            180.0
          );

          float halo = pow(
            max(dot(normalize(vWorldDirection),
            normalize(sunDirection)), 0.0),
            12.0
          );

          sky += sunColor * (sun * 1.8 + halo * 0.16);

          gl_FragColor = vec4(sky, 1.0);
        }
      `
    });

    this.skyDome = new THREE.Mesh(skyGeometry, skyMaterial);
    this.skyDome.renderOrder = -1000;

    this.scene.add(this.skyDome);

    this.scene.background = new THREE.Color(0x9bc9e8);
    this.scene.fog = new THREE.FogExp2(0xb7d5e5, 0.00042);

    // Directional sunlight
    this.sunLight = new THREE.DirectionalLight(0xfff1d6, 2.3);

    this.sunLight.position.set(300, 450, 200);
    this.sunLight.castShadow = true;

    this.sunLight.shadow.mapSize.set(2048, 2048);
    this.sunLight.shadow.camera.near = 10;
    this.sunLight.shadow.camera.far = 1200;

    const d = 180;

    Object.assign(this.sunLight.shadow.camera, {
      left: -d,
      right: d,
      top: d,
      bottom: -d
    });

    this.sunLight.shadow.bias = -0.00015;
    this.sunLight.shadow.normalBias = 0.025;

    this.sunLight.target.position.set(0, 0, 0);

    this.scene.add(this.sunLight);
    this.scene.add(this.sunLight.target);

    // Hemisphere lighting
    this.hemiLight = new THREE.HemisphereLight(
      0xd9efff,
      0x59634c,
      1.25
    );

    this.hemiLight.position.set(0, 200, 0);
    this.scene.add(this.hemiLight);

    // Ambient lighting
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.28);
    this.scene.add(this.ambientLight);

    // Visible sun
    this.sunDisc = new THREE.Mesh(
      new THREE.SphereGeometry(13, 24, 16),
      new THREE.MeshBasicMaterial({
        color: 0xffedbd,
        fog: false
      })
    );

    this.sunDisc.position.set(650, 360, -900);
    this.scene.add(this.sunDisc);

    // Sun glow
    const glowCanvas = document.createElement('canvas');
    glowCanvas.width = 256;
    glowCanvas.height = 256;

    const glowCtx = glowCanvas.getContext('2d');

    const gradient = glowCtx.createRadialGradient(
      128, 128, 5,
      128, 128, 126
    );

    gradient.addColorStop(0, 'rgba(255,238,190,0.72)');
    gradient.addColorStop(0.22, 'rgba(255,218,150,0.28)');
    gradient.addColorStop(1, 'rgba(255,218,150,0)');

    glowCtx.fillStyle = gradient;
    glowCtx.fillRect(0, 0, 256, 256);

    this.sunGlow = new THREE.Sprite(
      new THREE.SpriteMaterial({
        map: new THREE.CanvasTexture(glowCanvas),
        color: 0xffe7b0,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending
      })
    );

    this.sunGlow.position.copy(this.sunDisc.position);
    this.sunGlow.scale.set(150, 150, 1);

    this.scene.add(this.sunGlow);

    this.initCloudLayer();
    this.initStarField();
  }

  // ==========================================================================
  // PROCEDURAL CLOUDS
  // ==========================================================================

  initCloudLayer() {
    const canvas = document.createElement('canvas');

    canvas.width = 512;
    canvas.height = 256;

    const ctx = canvas.getContext('2d');

    const gradient = ctx.createRadialGradient(
      256, 128, 20,
      256, 128, 220
    );

    gradient.addColorStop(0, 'rgba(255,255,255,0.78)');
    gradient.addColorStop(0.45, 'rgba(255,255,255,0.42)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 512, 256);

    const texture = new THREE.CanvasTexture(canvas);

    for (let i = 0; i < 18; i++) {
      const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 0.45,
        depthWrite: false,
        side: THREE.DoubleSide,
        fog: false
      });

      const cloud = new THREE.Mesh(
        new THREE.PlaneGeometry(150, 62),
        material
      );

      cloud.position.set(
        (Math.random() - 0.5) * 1500,
        115 + Math.random() * 150,
        (Math.random() - 0.5) * 1500
      );

      cloud.rotation.y = Math.random() * Math.PI;

      cloud.userData.drift = 1.2 + Math.random() * 2.2;

      this.scene.add(cloud);
      this.clouds.push(cloud);
    }
  }

  // ==========================================================================
  // NIGHT SKY STARS
  // ==========================================================================

  initStarField() {
    const count = 900;
    const positions = new Float32Array(count * 3);

    for (let i = 0; i < count; i++) {
      const radius = 1200;
      const theta = Math.random() * Math.PI * 2;
      const y = 80 + Math.random() * 900;

      const ring = Math.sqrt(
        Math.max(0, radius * radius - y * y)
      );

      positions[i * 3] = Math.cos(theta) * ring;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = Math.sin(theta) * ring;
    }

    const geometry = new THREE.BufferGeometry();

    geometry.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const material = new THREE.PointsMaterial({
      color: 0xeaf4ff,
      size: 2.4,
      transparent: true,
      opacity: 0,
      sizeAttenuation: false,
      depthWrite: false
    });

    this.stars = new THREE.Points(geometry, material);

    this.scene.add(this.stars);
  }

  // ==========================================================================
  // RAIN PARTICLE SYSTEM
  // ==========================================================================

  initRainSystem() {
    const rainCount = 4000;

    this.rainGeo = new THREE.BufferGeometry();

    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 160;
      positions[i + 1] = Math.random() * 80;
      positions[i + 2] = (Math.random() - 0.5) * 160;
    }

    this.rainGeo.setAttribute(
      'position',
      new THREE.BufferAttribute(positions, 3)
    );

    const rainMat = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.18,
      transparent: true,
      opacity: 0,
      depthWrite: false
    });

    this.rainParticles = new THREE.Points(
      this.rainGeo,
      rainMat
    );

    this.scene.add(this.rainParticles);
  }

  // ==========================================================================
  // WAG-9 LOCOMOTIVE AND ICF COACHES
  // ==========================================================================

  initAITrain() {
    // WAG-9 side texture
    const canvasL = document.createElement('canvas');

    canvasL.width = 1024;
    canvasL.height = 256;

    const ctxL = canvasL.getContext('2d');

    ctxL.fillStyle = '#166534';
    ctxL.fillRect(0, 0, 1024, 256);

    ctxL.fillStyle = '#facc15';
    ctxL.fillRect(0, 105, 1024, 45);

    ctxL.fillStyle = '#111';
    ctxL.font = 'bold 20px sans-serif';
    ctxL.textAlign = 'center';

    ctxL.fillText(
      'INDIAN RAILWAYS • भारतीय रेल • WAG-9 #31085',
      512,
      136
    );

    ctxL.fillStyle = '#1f2937';
    ctxL.fillRect(0, 210, 1024, 46);

    const wag9Tex = new THREE.CanvasTexture(canvasL);

    // WAG-9 front texture
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

    // Blue ICF passenger coach texture
    const canvasC = document.createElement('canvas');

    canvasC.width = 1024;
    canvasC.height = 256;

    const ctxC = canvasC.getContext('2d');

    ctxC.fillStyle = '#1e3a8a';
    ctxC.fillRect(0, 0, 1024, 256);

    ctxC.fillStyle = '#38bdf8';
    ctxC.fillRect(0, 55, 1024, 12);
    ctxC.fillRect(0, 185, 1024, 12);

    ctxC.fillStyle = '#0f172a';

    for (let i = 0; i < 11; i++) {
      ctxC.fillRect(75 + i * 80, 80, 54, 85);
    }

    const icfCoachTex = new THREE.CanvasTexture(canvasC);

    // Materials
    const materials = {
      wag9Side: new THREE.MeshStandardMaterial({
        map: wag9Tex,
        roughness: 0.35,
        metalness: 0.3
      }),

      wag9Front: new THREE.MeshStandardMaterial({
        map: wag9FrontTex,
        roughness: 0.35,
        metalness: 0.2
      }),

      coachSide: new THREE.MeshStandardMaterial({
        map: icfCoachTex,
        roughness: 0.35,
        metalness: 0.3
      }),

      roof: new THREE.MeshStandardMaterial({
        color: 0x64748b,
        roughness: 0.4,
        metalness: 0.5
      }),

      darkSteel: new THREE.MeshStandardMaterial({
        color: 0x1f242d,
        roughness: 0.6,
        metalness: 0.7
      }),

      wheelSteel: new THREE.MeshStandardMaterial({
        color: 0x6b7280,
        roughness: 0.2,
        metalness: 0.9
      }),

      cowcatcher: new THREE.MeshStandardMaterial({
        color: 0xdc2626,
        roughness: 0.4
      }),

      glass: new THREE.MeshPhysicalMaterial({
        color: 0x111e2e,
        roughness: 0.1,
        transmission: 0.5
      })
    };

    // ========================================================================
    // WAG-9 LOCOMOTIVE
    // ========================================================================

    this.aiLoco = new THREE.Group();

    const lWidth = 3.15;
    const lHeight = 3.1;
    const lLen = this.aiLocoLength;

    const locoMats = [
      materials.wag9Side,
      materials.wag9Side,
      materials.roof,
      materials.darkSteel,
      materials.wag9Front,
      materials.wag9Front
    ];

    const locoBody = new THREE.Mesh(
      new THREE.BoxGeometry(lWidth, lHeight, lLen),
      locoMats
    );

    locoBody.position.y = 1.95;
    locoBody.castShadow = true;
    locoBody.receiveShadow = true;

    this.aiLoco.add(locoBody);

    // Front windshields
    [-0.65, 0.65].forEach(x => {
      const win = new THREE.Mesh(
        new THREE.PlaneGeometry(0.95, 0.75),
        materials.glass
      );

      win.position.set(x, 2.5, lLen / 2 + 0.02);

      this.aiLoco.add(win);
    });

    // Headlight
    const hl = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 0.1, 16)
        .rotateX(Math.PI / 2),

      new THREE.MeshBasicMaterial({
        color: 0xffffff
      })
    );

    hl.position.set(0, 3.2, lLen / 2 + 0.06);

    this.aiLoco.add(hl);

    // Headlight beam
    const aiHeadlightBeam = new THREE.SpotLight(
      0xfffaed,
      7.0,
      130,
      Math.PI / 7,
      0.4,
      1.2
    );

    aiHeadlightBeam.position.set(
      0,
      3.2,
      lLen / 2 + 0.5
    );

    aiHeadlightBeam.target.position.set(
      0,
      0,
      lLen / 2 + 60
    );

    this.aiLoco.add(aiHeadlightBeam);
    this.aiLoco.add(aiHeadlightBeam.target);

    // Red cowcatcher
    const cowcatcher = new THREE.Mesh(
      new THREE.ConeGeometry(1.5, 0.65, 4)
        .rotateY(Math.PI / 4)
        .scale(1.1, 0.6, 0.8),

      materials.cowcatcher
    );

    cowcatcher.position.set(
      0,
      0.48,
      lLen / 2 + 0.3
    );

    this.aiLoco.add(cowcatcher);

    // Pantograph
    const panto = new THREE.Group();

    panto.position.set(
      0,
      3.55,
      -lLen * 0.28
    );

    const pArm1 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 1.3),
      materials.darkSteel
    );

    pArm1.position.set(0, 0.55, 0);
    pArm1.rotation.x = 0.65;

    const pArm2 = new THREE.Mesh(
      new THREE.CylinderGeometry(0.02, 0.02, 1.2),
      materials.darkSteel
    );

    pArm2.position.set(0, 1.15, 0);
    pArm2.rotation.x = -1.15;

    const pHead = new THREE.Mesh(
      new THREE.BoxGeometry(1.8, 0.04, 0.12),
      new THREE.MeshStandardMaterial({
        color: 0xd97706
      })
    );

    pHead.position.set(0, 1.75, 0);

    panto.add(pArm1, pArm2, pHead);
    this.aiLoco.add(panto);

    // Locomotive bogies
    this.buildAIBogie(
      this.aiLoco,
      lLen * 0.28,
      materials
    );

    this.buildAIBogie(
      this.aiLoco,
      -lLen * 0.28,
      materials
    );

    this.scene.add(this.aiLoco);

    // ========================================================================
    // TRAILING ICF COACHES
    // ========================================================================

    this.aiCoaches = [];

    for (let i = 0; i < this.aiCoachCount; i++) {
      const coach = new THREE.Group();

      const cWidth = 3.24;
      const cHeight = 2.75;
      const cLen = this.aiCoachLength;

      const coachMats = [
        materials.coachSide,
        materials.coachSide,
        materials.roof,
        materials.darkSteel,
        materials.roof,
        materials.roof
      ];

      const coachBody = new THREE.Mesh(
        new THREE.BoxGeometry(cWidth, cHeight, cLen),
        coachMats
      );

      coachBody.position.y = 1.9;
      coachBody.castShadow = true;
      coachBody.receiveShadow = true;

      coach.add(coachBody);

      // Curved roof
      const roofGeometry = new THREE.CylinderGeometry(
        cWidth / 2,
        cWidth / 2,
        cLen,
        16,
        1,
        false,
        0,
        Math.PI
      );

      roofGeometry
        .rotateZ(Math.PI / 2)
        .rotateY(Math.PI / 2);

      const cRoof = new THREE.Mesh(
        roofGeometry,
        materials.roof
      );

      cRoof.position.y = 3.25;
      cRoof.scale.set(1, 0.38, 1);

      coach.add(cRoof);

      // Coach bogies
      this.buildAIBogie(
        coach,
        cLen * 0.35,
        materials
      );

      this.buildAIBogie(
        coach,
        -cLen * 0.35,
        materials
      );

      this.scene.add(coach);
      this.aiCoaches.push(coach);
    }
  }

  // ==========================================================================
  // BOGIE AND WHEELS
  // ==========================================================================

  buildAIBogie(parent, zCenter, mats) {
    const bogie = new THREE.Group();

    bogie.position.set(0, 0, zCenter);

    const wheelRadius = 0.54;
    const railX = 0.838;

    [-1.2, 1.2].forEach(z => {
      const axle = new THREE.Group();

      axle.position.set(0, wheelRadius, z);

      const shaft = new THREE.Mesh(
        new THREE.CylinderGeometry(0.08, 0.08, 1.9)
          .rotateZ(Math.PI / 2),
        mats.darkSteel
      );

      axle.add(shaft);

      [-railX, railX].forEach(x => {
        const wheel = new THREE.Mesh(
          new THREE.CylinderGeometry(
            wheelRadius,
            wheelRadius,
            0.12,
            16
          ).rotateZ(Math.PI / 2),

          mats.wheelSteel
        );

        wheel.position.x = x;
        axle.add(wheel);
      });

      bogie.add(axle);
    });

    parent.add(bogie);
  }

  // ==========================================================================
  // WEATHER PRESETS
  // ==========================================================================

  setWeather(type) {
    const palettes = {
      day: {
        top: 0x1678c8,
        horizon: 0xc9e8f5,
        bottom: 0x9bb7c5,
        sun: 0xffe4a3,
        fog: 0xb7d5e5,
        density: 0.00042,
        sunlight: 2.3,
        ambient: 0.28,
        hemi: 1.25,
        clouds: 0.52,
        stars: 0,
        rain: 0,
        sunHeight: 360
      },

      sunset: {
        top: 0x382b62,
        horizon: 0xf59a68,
        bottom: 0x6d5260,
        sun: 0xffa35c,
        fog: 0xd18b76,
        density: 0.0009,
        sunlight: 2.0,
        ambient: 0.35,
        hemi: 0.9,
        clouds: 0.42,
        stars: 0,
        rain: 0,
        sunHeight: 95
      },

      night: {
        top: 0x030817,
        horizon: 0x172b48,
        bottom: 0x101b2a,
        sun: 0x8ba9d9,
        fog: 0x101b2a,
        density: 0.0012,
        sunlight: 0.2,
        ambient: 0.15,
        hemi: 0.3,
        clouds: 0.12,
        stars: 0.95,
        rain: 0,
        sunHeight: 360
      },

      monsoon: {
        top: 0x35485b,
        horizon: 0x71818c,
        bottom: 0x4b5c60,
        sun: 0x9eafbb,
        fog: 0x647482,
        density: 0.0018,
        sunlight: 0.8,
        ambient: 0.35,
        hemi: 0.7,
        clouds: 0.78,
        stars: 0,
        rain: 0.75,
        sunHeight: 360
      }
    };

    const p = palettes[type];

    if (!p) {
      console.warn('Unknown weather preset:', type);
      return;
    }

    this.currentWeather = type;

    // Sky colors
    this.skyDome.material.uniforms.topColor.value.setHex(p.top);

    this.skyDome.material.uniforms.horizonColor.value.setHex(
      p.horizon
    );

    this.skyDome.material.uniforms.bottomColor.value.setHex(
      p.bottom
    );

    this.skyDome.material.uniforms.sunColor.value.setHex(
      p.sun
    );

    // Scene atmosphere
    this.scene.background.setHex(p.horizon);
    this.scene.fog.color.setHex(p.fog);
    this.scene.fog.density = p.density;

    // Lighting
    this.sunLight.color.setHex(p.sun);
    this.sunLight.intensity = p.sunlight;

    this.ambientLight.intensity = p.ambient;
    this.hemiLight.intensity = p.hemi;

    // Clouds
    this.clouds.forEach(cloud => {
      cloud.material.opacity = p.clouds;
    });

    // Stars
    this.stars.material.opacity = p.stars;

    // Sun visibility
    this.sunDisc.visible = type !== 'night';
    this.sunGlow.visible = type !== 'night';

    // Rain
    this.rainParticles.material.opacity = p.rain;
  }

  // ==========================================================================
  // MAIN UPDATE LOOP
  // ==========================================================================

  update(dt, playerPosition) {
    this.atmosphereTime += dt;

    // ========================================================================
    // SKY AND ENVIRONMENT FOLLOW PLAYER
    // ========================================================================

    if (playerPosition) {
      this.skyDome.position.copy(playerPosition);
      this.stars.position.copy(playerPosition);

      // Sun position
      this.sunDisc.position.set(
        playerPosition.x + 650,
        playerPosition.y +
          (this.currentWeather === 'sunset' ? 95 : 360),
        playerPosition.z - 900
      );

      this.sunGlow.position.copy(this.sunDisc.position);

      // Moving clouds
      this.clouds.forEach(cloud => {
        cloud.position.x += cloud.userData.drift * dt;

        if (cloud.position.x > playerPosition.x + 850) {
          cloud.position.x = playerPosition.x - 850;
        }

        if (
          Math.abs(cloud.position.z - playerPosition.z) > 900
        ) {
          cloud.position.z =
            playerPosition.z +
            (Math.random() - 0.5) * 1500;
        }
      });
    }

    // ========================================================================
    // SUNLIGHT TRACKING
    // ========================================================================

    if (this.sunLight && playerPosition) {
      this.sunLight.position.set(
        playerPosition.x + 150,
        playerPosition.y + 250,
        playerPosition.z + 100
      );

      this.sunLight.target.position.copy(playerPosition);

      this.sunLight.target.updateMatrixWorld();
    }

    // ========================================================================
    // MONSOON RAIN ANIMATION
    // ========================================================================

    if (
      this.currentWeather === 'monsoon' &&
      this.rainParticles &&
      playerPosition
    ) {
      this.rainParticles.position.copy(playerPosition);

      const positions = this.rainGeo.attributes.position.array;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i] += 12 * dt;
        positions[i + 1] -= 85 * dt;
        positions[i + 2] += 4 * dt;

        if (positions[i + 1] < 0) {
          positions[i] = (Math.random() - 0.5) * 160;
          positions[i + 1] = 75 + Math.random() * 15;
          positions[i + 2] = (Math.random() - 0.5) * 160;
        }
      }

      this.rainGeo.attributes.position.needsUpdate = true;
    }

    // ========================================================================
    // ONCOMING AI TRAIN MOVEMENT - TRACK 2
    // ========================================================================

    if (
      this.aiLoco &&
      this.trackSystem &&
      this.trackSystem.totalLength > 0
    ) {
      const aiSpeedMs = this.aiSpeedKmh / 3.6;

      // Reverse direction
      this.aiTrainProgress -=
        (aiSpeedMs * dt) / this.trackSystem.totalLength;

      if (this.aiTrainProgress < 0) {
        this.aiTrainProgress += 1.0;
      }

      // Locomotive position
      const locoT = this.trackSystem.getCarTransform(
        this.aiTrainProgress,
        this.aiLocoLength,
        1
      );

      this.aiLoco.position.copy(locoT.position);

      this.aiLoco.lookAt(
        locoT.position.clone().sub(locoT.heading)
      );

      // Trailing coaches
      let cumDist =
        this.aiLocoLength / 2 +
        this.aiCouplerGap +
        this.aiCoachLength / 2;

      for (let i = 0; i < this.aiCoaches.length; i++) {
        const coachProg =
          (
            this.aiTrainProgress +
            cumDist / this.trackSystem.totalLength +
            1.0
          ) % 1.0;

        const coachT = this.trackSystem.getCarTransform(
          coachProg,
          this.aiCoachLength,
          1
        );

        const coachGroup = this.aiCoaches[i];

        coachGroup.position.copy(coachT.position);

        coachGroup.lookAt(
          coachT.position.clone().sub(coachT.heading)
        );

        cumDist +=
          this.aiCoachLength +
          this.aiCouplerGap;
      }
    }
  }

  // ==========================================================================
  // CLEANUP
  // ==========================================================================

  dispose() {
    const disposeObject = object => {
      if (!object) return;

      object.traverse(child => {
        if (child.geometry) {
          child.geometry.dispose();
        }

        if (child.material) {
          const materials = Array.isArray(child.material)
            ? child.material
            : [child.material];

          materials.forEach(material => {
            if (material.map) {
              material.map.dispose();
            }

            material.dispose();
          });
        }
      });

      this.scene.remove(object);
    };

    [
      this.skyDome,
      this.sunDisc,
      this.sunGlow,
      this.stars,
      this.rainParticles,
      this.aiLoco,
      ...this.aiCoaches,
      ...this.clouds
    ].forEach(disposeObject);

    if (this.sunLight) {
      this.scene.remove(
        this.sunLight,
        this.sunLight.target
      );
    }

    if (this.hemiLight) {
      this.scene.remove(this.hemiLight);
    }

    if (this.ambientLight) {
      this.scene.remove(this.ambientLight);
    }

    this.clouds = [];
    this.aiCoaches = [];
  }
}