// ====================================================================
// Indian Railways Real-World Train Physics Simulation
// Accurately models WAP-7 & WDP-4D tractive curves, Davis resistance,
// graduated air brakes (A9/SA9), BP/FP/BC pressures, inertia & momentum
// ====================================================================

export class TrainPhysics {
  constructor() {
    // Train Mass & Dimensions
    this.locoMassTonnes = 123;   // WAP-7 weight: 123 metric tonnes
    this.coachCount = 8;         // 8 LHB/ICF coaches
    this.coachMassTonnes = 45;   // ~45 tonnes per coach
    this.totalMassTonnes = this.locoMassTonnes + (this.coachCount * this.coachMassTonnes); // 483 tonnes
    this.massKg = this.totalMassTonnes * 1000;

    // Locomotive Power
    this.maxPowerWatts = 4740000; // 6,350 HP = 4.74 MW (WAP-7)
    this.maxStartingTE = 460000;  // 460 kN starting tractive effort
    this.maxSpeedKmh = 160;       // Service speed ceiling (Upgraded to 160 km/h Indian Railways semi-high speed standard)

    // Dynamic State
    this.speedMs = 0;             // Speed in meters / second
    this.speedKmh = 0;            // Speed in km / h
    this.targetSpeedKmh = 120;    // Target cruise speed preset (0, 40, 80, 120, 160)
    this.distanceTraveled = 0;    // Meters
    this.trackProgress = 0;       // 0.0 to 1.0 along the track spline
    this.acceleration = 0;        // m/s^2

    // Pilot Controls
    this.reverser = 1;            // 1: Forward, 0: Neutral, -1: Reverse
    this.notch = 0;               // 0 to 8
    this.throttlePercent = 0;     // 0.0 to 1.0
    this.trainBrakePercent = 0;   // 0.0 to 1.0 (A-9)
    this.locoBrakePercent = 0;    // 0.0 to 1.0 (SA-9)
    this.emergencyBrake = false;  // Slam brake

    // Pneumatic Air Pressures (kg/cm²)
    this.bpPressure = 5.0;        // Brake Pipe (Standard: 5.0 kg/cm²)
    this.fpPressure = 6.0;        // Feed Pipe (Standard: 6.0 kg/cm²)
    this.bcPressure = 0.0;        // Brake Cylinder (0.0 to 3.8 kg/cm²)

    // Electrical / Engine Systems
    this.isElectric = true;
    this.pantographRaised = true; // For WAP-7
    this.circuitBreakerClosed = true; // VCB closed
    this.oheVoltage = 25.0;       // 25 kV AC OHE line voltage
    this.tractiveEffortKn = 0;
    this.tractionAmps = 0;

    // Environmental / Track interaction
    this.currentGradient = 0.0;   // Slope (rise/run)
    this.curveRadius = 0;         // Track curvature
    this.rollTilt = 0;            // Superelevation cant banking
    this.wheelSlip = false;
    this.sandersActive = false;
  }

  setTargetSpeed(speed) {
    this.targetSpeedKmh = speed;
    if (speed === 0) {
      this.emergencyBrake = false;
      this.notch = 0;
      this.throttlePercent = 0;
      this.trainBrakePercent = 0.8;
    } else {
      this.emergencyBrake = false;
      this.trainBrakePercent = 0;
    }
  }

  reset() {
    this.speedMs = 0;
    this.speedKmh = 0;
    this.targetSpeedKmh = 120;
    this.distanceTraveled = 0;
    this.trackProgress = 0;
    this.acceleration = 0;
    this.notch = 0;
    this.throttlePercent = 0;
    this.trainBrakePercent = 0;
    this.emergencyBrake = false;
    this.bpPressure = 5.0;
    this.bcPressure = 0.0;
    this.reverser = 1;
    this.tractiveEffortKn = 0;
    this.tractionAmps = 0;
    this.rollTilt = 0;
  }

  // ---------------------------------------------------------
  // Control Inputs (Intuitive Manual Speed Management)
  // ---------------------------------------------------------
  setNotch(notch) {
    this.notch = Math.max(0, Math.min(8, notch));
    this.throttlePercent = this.notch / 8.0;

    // Throttling up automatically releases brakes and clears emergency state
    if (this.notch > 0) {
      this.emergencyBrake = false;
      this.trainBrakePercent = 0;
    }
  }

  notchUp() {
    this.targetSpeedKmh = null;
    this.emergencyBrake = false;
    this.trainBrakePercent = 0;
    this.setNotch(this.notch + 1);
  }

  notchDown() {
    this.targetSpeedKmh = null;
    this.setNotch(this.notch - 1);
  }

  setTrainBrake(percent) {
    this.trainBrakePercent = Math.max(0, Math.min(1.0, percent));
    if (this.trainBrakePercent > 0.05) {
      this.targetSpeedKmh = null;
      this.notch = 0;
      this.throttlePercent = 0;
    }
  }

  applyBrake(amount = 0.1) {
    this.setTrainBrake(this.trainBrakePercent + amount);
  }

  releaseBrake(amount = 0.1) {
    this.setTrainBrake(Math.max(0, this.trainBrakePercent - amount));
  }

  triggerEmergencyBrake() {
    this.emergencyBrake = !this.emergencyBrake;
    if (this.emergencyBrake) {
      this.setTrainBrake(1.0);
      this.setNotch(0);
    } else {
      this.setTrainBrake(0.0);
    }
  }

  toggleReverser() {
    if (this.speedKmh < 1.0) {
      if (this.reverser === 1) this.reverser = 0;
      else if (this.reverser === 0) this.reverser = -1;
      else this.reverser = 1;
    }
  }

  togglePantograph() {
    this.pantographRaised = !this.pantographRaised;
  }

  // ---------------------------------------------------------
  // Physics Step (Delta Time in Seconds)
  // ---------------------------------------------------------
  update(dt, trackTotalLength = 2000, currentCurveRadius = 0, currentGradient = 0) {
    this.curveRadius = currentCurveRadius;
    this.currentGradient = currentGradient;

    // Automatic Target Speed / Cruise Autopilot (STOP, 40, 80, 120 CRUISE, 160 MAX)
    if (this.targetSpeedKmh !== null && !this.emergencyBrake) {
      if (this.targetSpeedKmh === 0) {
        this.notch = 0;
        this.throttlePercent = 0;
        if (this.speedKmh > 0.5) {
          this.trainBrakePercent = Math.min(0.85, 0.25 + (this.speedKmh / 25));
        } else {
          this.speedMs = 0;
          this.speedKmh = 0;
          this.trainBrakePercent = 0.6;
        }
      } else {
        const diff = this.targetSpeedKmh - this.speedKmh;
        if (diff > 2.0) {
          this.trainBrakePercent = 0;
          const notch = diff > 35 ? 8 : (diff > 18 ? 7 : (diff > 8 ? 6 : 5));
          this.setNotch(notch);
        } else if (diff < -2.0) {
          this.setNotch(0);
          this.trainBrakePercent = Math.min(0.55, Math.abs(diff) / 18);
        } else {
          this.trainBrakePercent = 0;
          const notch = this.targetSpeedKmh >= 150 ? 6 : (this.targetSpeedKmh >= 110 ? 4 : (this.targetSpeedKmh >= 70 ? 3 : 2));
          this.setNotch(notch);
        }
      }
    }

    // 1. Update Pneumatic Pressures
    if (this.emergencyBrake) {
      // Rapid BP dump to 0
      this.bpPressure = Math.max(0, this.bpPressure - 4.0 * dt);
      this.bcPressure = Math.min(3.8, this.bcPressure + 3.0 * dt);
    } else {
      // Graduated BP reduction: 5.0 -> 3.4 kg/cm²
      const targetBP = 5.0 - (this.trainBrakePercent * 1.6);
      if (this.bpPressure > targetBP) {
        this.bpPressure = Math.max(targetBP, this.bpPressure - 0.8 * dt);
      } else {
        this.bpPressure = Math.min(targetBP, this.bpPressure + 0.5 * dt); // Recharge
      }
      // BC pressure responds inversely to BP
      const targetBC = ((5.0 - this.bpPressure) / 1.6) * 3.8;
      this.bcPressure += (targetBC - this.bcPressure) * Math.min(1, 4.0 * dt);
    }

    // 2. Power & Traction Calculation
    let tractiveForce = 0;
    const canProduceTraction = (!this.isElectric || (this.pantographRaised && this.circuitBreakerClosed)) &&
                               this.reverser !== 0 &&
                               this.trainBrakePercent < 0.1;

    if (canProduceTraction && this.throttlePercent > 0) {
      // WAP-7 Tractive Effort Curve
      // Starting region (constant torque) up to transition speed (~35 km/h)
      const speed = Math.max(1.0, Math.abs(this.speedMs));
      const powerLimit = (this.maxPowerWatts * this.throttlePercent) / speed;
      const startingLimit = this.maxStartingTE * this.throttlePercent;

      tractiveForce = Math.min(startingLimit, powerLimit);

      // Wheel adhesion check (Wheel slip simulation on wet tracks or sudden full notch)
      const maxAdhesionForce = this.massKg * 9.81 * (this.sandersActive ? 0.32 : 0.25);
      if (tractiveForce > maxAdhesionForce) {
        this.wheelSlip = true;
        tractiveForce = maxAdhesionForce * 0.7; // Traction drops during slip
      } else {
        this.wheelSlip = false;
      }

      tractiveForce *= this.reverser;
    } else {
      this.wheelSlip = false;
    }

    this.tractiveEffortKn = Math.round(tractiveForce / 1000);
    this.tractionAmps = Math.round(Math.abs(tractiveForce) / 120);

    // 3. Train Resistance (Davis Equation for modern Indian passenger rake)
    // R = A + B*v + C*v^2
    const v = Math.abs(this.speedMs);
    const vKmh = v * 3.6;
    const Ra = 3000 + (this.totalMassTonnes * 6.5);            // Mechanical rolling resistance
    const Rb = (this.totalMassTonnes * 0.13) * vKmh;          // Flange friction
    const Rc = (0.0035 + (this.coachCount * 0.0006)) * (vKmh * vKmh) * 10; // Aerodynamic drag
    const totalDavisResistance = Ra + Rb + Rc;

    // Resistance opposes direction of travel
    const resistanceDirection = this.speedMs > 0.01 ? -1 : (this.speedMs < -0.01 ? 1 : 0);
    let resistanceForce = totalDavisResistance * resistanceDirection;

    // Gradient resistance (F = m * g * sin(theta))
    const gradientForce = -this.massKg * 9.81 * this.currentGradient;

    // 4. Braking Forces (Pneumatic Friction + Regenerative Dynamic Braking)
    let brakingForce = 0;
    if (this.bcPressure > 0.05) {
      // Retardation force proportional to Brake Cylinder pressure (up to 420 kN emergency)
      const brakeCoeff = (this.bcPressure / 3.8) * 380000;
      brakingForce = brakeCoeff * (this.speedMs > 0 ? -1 : (this.speedMs < 0 ? 1 : 0));
    }

    // Dynamic braking for electric loco when throttle is 0 and speed > 10 km/h
    if (this.isElectric && this.trainBrakePercent > 0.1 && vKmh > 10) {
      const dynamicBrakeForce = Math.min(220000, 220000 * this.trainBrakePercent) * (this.speedMs > 0 ? -1 : 1);
      brakingForce += dynamicBrakeForce;
    }

    // 5. Net Force and Acceleration
    const netForce = tractiveForce + resistanceForce + gradientForce + brakingForce;
    this.acceleration = netForce / this.massKg;

    // Integrate Velocity
    this.speedMs += this.acceleration * dt;

    // Stop threshold to prevent numerical jitter
    if (Math.abs(this.speedMs) < 0.05 && this.throttlePercent === 0 && this.bcPressure > 0.5) {
      this.speedMs = 0;
      this.acceleration = 0;
    }

    // Speed Ceiling clamp
    const maxSpeedMs = this.maxSpeedKmh / 3.6;
    this.speedMs = Math.max(-maxSpeedMs * 0.3, Math.min(maxSpeedMs, this.speedMs));
    this.speedKmh = Math.abs(this.speedMs * 3.6);

    // 6. Track Position Integration
    const deltaDistance = this.speedMs * dt;
    this.distanceTraveled += deltaDistance;

    // Update track loop progress (0.0 to 1.0)
    if (trackTotalLength > 0) {
      this.trackProgress = (this.trackProgress + (deltaDistance / trackTotalLength)) % 1.0;
      if (this.trackProgress < 0) this.trackProgress += 1.0;
    }

    // 7. Superelevation / Cant banking tilt on curves
    // Tilts train inward into curve: theta = v^2 / (g * R)
    if (this.curveRadius !== 0) {
      const centripetalAcc = (v * v) / Math.abs(this.curveRadius);
      const targetTilt = Math.max(-0.08, Math.min(0.08, (centripetalAcc / 9.81) * (this.curveRadius > 0 ? 1 : -1)));
      this.rollTilt += (targetTilt - this.rollTilt) * Math.min(1, 5.0 * dt);
    } else {
      this.rollTilt += (0 - this.rollTilt) * Math.min(1, 5.0 * dt);
    }
  }
}

