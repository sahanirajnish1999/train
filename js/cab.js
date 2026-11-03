// ====================================================================
// Indian Railways Loco Pilot 3D Interior Cabin (Driver Cockpit)
// Authentic master desk, functional physical levers, needles, dials
// ====================================================================

import * as THREE from 'three';

export class CabInterior {
  constructor(locoGroup) {
    this.locoGroup = locoGroup;
    this.cabGroup = new THREE.Group();
    // Position inside front cab of locomotive
    this.cabGroup.position.set(0, 2.2, 8.8);
    this.locoGroup.add(this.cabGroup);

    // Dynamic needle and lever references
    this.speedNeedle = null;
    this.teNeedle = null;
    this.bpNeedle = null;
    this.bcNeedle = null;
    this.throttleLever = null;
    this.brakeLever = null;
    this.reverserHandle = null;

    // Pilot Camera anchor point
    this.eyePosition = new THREE.Vector3(0.55, 0.45, -0.2); // Right-hand driver seat (Indian Railways standard)

    this.buildCockpit();
  }

  buildCockpit() {
    const darkConsoleMat = new THREE.MeshStandardMaterial({ color: 0x1a212b, roughness: 0.7, metalness: 0.2 });
    const deskMat = new THREE.MeshStandardMaterial({ color: 0x27303d, roughness: 0.5, metalness: 0.4 });
    const chromeMat = new THREE.MeshStandardMaterial({ color: 0xd1d5db, roughness: 0.2, metalness: 0.9 });
    const dialFaceMat = new THREE.MeshBasicMaterial({ color: 0x0a1017 });
    const needleMat = new THREE.MeshBasicMaterial({ color: 0xff1744 });
    const greenNeedleMat = new THREE.MeshBasicMaterial({ color: 0x00e676 });
    const glassMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, transparent: true, opacity: 0.15, roughness: 0.05 });

    // 1. Driver Control Desk Console (Angled curved dashboard)
    const deskGeo = new THREE.BoxGeometry(2.8, 0.8, 1.1);
    const desk = new THREE.Mesh(deskGeo, deskMat);
    desk.position.set(0, -0.3, 0.2);
    desk.rotation.x = -0.18; // Angled towards driver
    this.cabGroup.add(desk);

    // Front Cab Wall & Windshield Frame
    const frontWall = new THREE.Mesh(new THREE.BoxGeometry(3.0, 1.4, 0.1), darkConsoleMat);
    frontWall.position.set(0, 0.6, 0.75);
    this.cabGroup.add(frontWall);

    // Windshield Cutouts (Twin large front viewing panes)
    [-0.65, 0.65].forEach(x => {
      const pane = new THREE.Mesh(new THREE.PlaneGeometry(1.0, 0.8), glassMat);
      pane.position.set(x, 0.75, 0.76);
      this.cabGroup.add(pane);
    });

    // 2. Analog Speedometer Dial (0 to 160 km/h)
    const speedDialGroup = new THREE.Group();
    speedDialGroup.position.set(0.55, -0.05, 0.45);
    speedDialGroup.rotation.x = -0.35;

    const speedRim = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.03, 24).rotateX(Math.PI / 2), chromeMat);
    const speedFace = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.13, 0.035, 24).rotateX(Math.PI / 2), dialFaceMat);
    speedDialGroup.add(speedRim);
    speedDialGroup.add(speedFace);

    // Speedometer Needle
    this.speedNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.11, 0.005), needleMat);
    this.speedNeedle.position.set(0, 0.045, 0.02);
    this.speedNeedle.geometry.translate(0, 0.045, 0); // Pivot at base
    speedDialGroup.add(this.speedNeedle);
    this.cabGroup.add(speedDialGroup);

    // 3. Tractive Effort / Dynamic Brake Meter (kN)
    const teDialGroup = new THREE.Group();
    teDialGroup.position.set(0.24, -0.05, 0.45);
    teDialGroup.rotation.x = -0.35;

    const teRim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24).rotateX(Math.PI / 2), chromeMat);
    const teFace = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 24).rotateX(Math.PI / 2), dialFaceMat);
    teDialGroup.add(teRim);
    teDialGroup.add(teFace);

    this.teNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.09, 0.005), greenNeedleMat);
    this.teNeedle.position.set(0, 0.04, 0.02);
    this.teNeedle.geometry.translate(0, 0.04, 0);
    teDialGroup.add(this.teNeedle);
    this.cabGroup.add(teDialGroup);

    // 4. Brake Pipe & Brake Cylinder Dual Pressure Gauge (BP / BC)
    const brakeDialGroup = new THREE.Group();
    brakeDialGroup.position.set(0.86, -0.05, 0.45);
    brakeDialGroup.rotation.x = -0.35;

    const bpRim = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.03, 24).rotateX(Math.PI / 2), chromeMat);
    const bpFace = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.11, 0.035, 24).rotateX(Math.PI / 2), dialFaceMat);
    brakeDialGroup.add(bpRim);
    brakeDialGroup.add(bpFace);

    // BP Needle (Green)
    this.bpNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.09, 0.005), greenNeedleMat);
    this.bpNeedle.position.set(0, 0.04, 0.02);
    this.bpNeedle.geometry.translate(0, 0.04, 0);
    brakeDialGroup.add(this.bpNeedle);

    // BC Needle (Red)
    this.bcNeedle = new THREE.Mesh(new THREE.BoxGeometry(0.01, 0.08, 0.005), needleMat);
    this.bcNeedle.position.set(0, 0.035, 0.025);
    this.bcNeedle.geometry.translate(0, 0.035, 0);
    brakeDialGroup.add(this.bcNeedle);

    this.cabGroup.add(brakeDialGroup);

    // 5. Physical Throttle Master Controller Lever (Notch 0 to 8)
    const throttleQuadrant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.25), darkConsoleMat);
    throttleQuadrant.position.set(0.15, -0.2, 0.0);
    this.cabGroup.add(throttleQuadrant);

    this.throttleLever = new THREE.Group();
    this.throttleLever.position.set(0.15, -0.15, 0.0);
    const tShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.22), chromeMat);
    tShaft.position.y = 0.11;
    const tKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshStandardMaterial({ color: 0x111 }));
    tKnob.position.y = 0.22;
    this.throttleLever.add(tShaft);
    this.throttleLever.add(tKnob);
    this.cabGroup.add(this.throttleLever);

    // 6. Train Air Brake (A-9) Valve Lever
    const brakeQuadrant = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.15, 0.25), darkConsoleMat);
    brakeQuadrant.position.set(0.95, -0.2, 0.0);
    this.cabGroup.add(brakeQuadrant);

    this.brakeLever = new THREE.Group();
    this.brakeLever.position.set(0.95, -0.15, 0.0);
    const bShaft = new THREE.Mesh(new THREE.CylinderGeometry(0.015, 0.015, 0.2), chromeMat);
    bShaft.position.y = 0.1;
    const bKnob = new THREE.Mesh(new THREE.SphereGeometry(0.035, 12, 12), new THREE.MeshStandardMaterial({ color: 0xd32f2f }));
    bKnob.position.y = 0.2;
    this.brakeLever.add(bShaft);
    this.brakeLever.add(bKnob);
    this.cabGroup.add(this.brakeLever);

    // 7. Loco Pilot Ergonomic High-Back Chair
    const chairGroup = new THREE.Group();
    chairGroup.position.set(0.55, -0.5, -0.3);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.12, 0.5), new THREE.MeshStandardMaterial({ color: 0x222 }));
    const back = new THREE.Mesh(new THREE.BoxGeometry(0.48, 0.65, 0.1), new THREE.MeshStandardMaterial({ color: 0x222 }));
    back.position.set(0, 0.35, -0.22);
    chairGroup.add(seat);
    chairGroup.add(back);
    this.cabGroup.add(chairGroup);
  }

  // ---------------------------------------------------------
  // Update Dials and Physical Levers
  // ---------------------------------------------------------
  update(physics) {
    // Speedometer Needle Angle (0 to 160 km/h mapped to 135 deg to -135 deg)
    if (this.speedNeedle) {
      const maxSpd = 160;
      const spdRatio = Math.min(1.0, physics.speedKmh / maxSpd);
      const angle = (135 - spdRatio * 270) * (Math.PI / 180);
      this.speedNeedle.rotation.z = angle;
    }

    // Tractive Effort Needle (-300 kN to +460 kN)
    if (this.teNeedle) {
      const teRatio = Math.max(-0.5, Math.min(1.0, physics.tractiveEffortKn / 460));
      const angle = (90 - teRatio * 180) * (Math.PI / 180);
      this.teNeedle.rotation.z = angle;
    }

    // Brake Pipe Needle (5.0 bar is green at 0 deg, 0 bar at -120 deg)
    if (this.bpNeedle) {
      const bpRatio = physics.bpPressure / 5.0;
      this.bpNeedle.rotation.z = (bpRatio * 140 - 70) * (Math.PI / 180);
    }

    // Brake Cylinder Needle (0 to 3.8 bar)
    if (this.bcNeedle) {
      const bcRatio = physics.bcPressure / 3.8;
      this.bcNeedle.rotation.z = (-70 + bcRatio * 140) * (Math.PI / 180);
    }

    // Physical Throttle Lever Position
    if (this.throttleLever) {
      // Rotate lever back to front with notch
      const notchAngle = -0.5 + physics.throttlePercent * 1.0;
      this.throttleLever.rotation.x = notchAngle;
    }

    // Physical Brake Lever Position
    if (this.brakeLever) {
      const brakeAngle = -0.4 + physics.trainBrakePercent * 0.9;
      this.brakeLever.rotation.x = brakeAngle;
    }

    // Subtle cabin vibration & head bob based on speed and track bumps
    if (physics.speedKmh > 2) {
      const vibe = Math.sin(performance.now() * 0.02) * (physics.speedKmh * 0.0001);
      this.cabGroup.position.y = 2.2 + vibe;
    }
  }
}

