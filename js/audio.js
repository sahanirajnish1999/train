// ====================================================================
// Indian Railways Procedural Sound Synthesizer (Web Audio API)
// No external audio files needed - 100% reliable, zero-latency synthesis
// ====================================================================

export class TrainAudio {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.masterGain = null;
    this.isElectric = true; // true = WAP-7, false = Diesel

    // Motor / Engine nodes
    this.motorGain = null;
    this.motorOscs = [];
    this.dieselGain = null;
    this.dieselOscs = [];
    this.turboOsc = null;
    this.turboGain = null;

    // Rail Clack nodes
    this.railGain = null;
    this.lastClackTime = 0;

    // Horn nodes
    this.hornGain = null;
    this.hornOscs = [];
    this.isHornPlaying = false;

    // Brake Hiss nodes
    this.brakeGain = null;
    this.brakeNoise = null;

    // Crossing Bell
    this.bellGain = null;
    this.lastBellTime = 0;
  }

  init() {
    if (this.ctx) return;
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();

      // Master Gain
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.setupElectricMotor();
      this.setupDieselEngine();
      this.setupRailClack();
      this.setupHorn();
      this.setupBrakes();
      this.setupBell();
    } catch (e) {
      console.warn("Web Audio API not supported or blocked", e);
    }
  }

  resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // ---------------------------------------------------------
  // WAP-7 VVVF 3-Phase AC Traction Motor Sound Synthesis
  // ---------------------------------------------------------
  setupElectricMotor() {
    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Multi-harmonic oscillators for the characteristic PWM inverter buzz
    const freqs = [120, 240, 360, 480];
    const types = ['sawtooth', 'triangle', 'square', 'sine'];

    for (let i = 0; i < 4; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = types[i];
      osc.frequency.setValueAtTime(freqs[i], this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(1200, this.ctx.currentTime);

      gain.gain.setValueAtTime(0.2 / (i + 1), this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.motorGain);
      osc.start();

      this.motorOscs.push({ osc, gain, filter, baseFreq: freqs[i] });
    }

    this.motorGain.connect(this.masterGain);
  }

  // ---------------------------------------------------------
  // WDP-4D / WDM-3D Diesel 16-Cylinder Engine & Turbo Sound
  // ---------------------------------------------------------
  setupDieselEngine() {
    this.dieselGain = this.ctx.createGain();
    this.dieselGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Low-frequency rumbling engine throb
    for (let i = 0; i < 3; i++) {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = i === 0 ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(45 + i * 22, this.ctx.currentTime);
      gain.gain.setValueAtTime(0.3 / (i + 1), this.ctx.currentTime);

      osc.connect(gain);
      gain.connect(this.dieselGain);
      osc.start();
      this.dieselOscs.push({ osc, gain, baseFreq: 45 + i * 22 });
    }

    // Turbocharger whistle
    this.turboOsc = this.ctx.createOscillator();
    this.turboGain = this.ctx.createGain();
    this.turboOsc.type = 'sine';
    this.turboOsc.frequency.setValueAtTime(800, this.ctx.currentTime);
    this.turboGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.turboOsc.connect(this.turboGain);
    this.turboGain.connect(this.dieselGain);
    this.turboOsc.start();

    this.dieselGain.connect(this.masterGain);
  }

  // ---------------------------------------------------------
  // Rail-Joint "Dhadak-Dhadak" Clickety-Clack Synthesizer
  // ---------------------------------------------------------
  setupRailClack() {
    this.railGain = this.ctx.createGain();
    this.railGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
    this.railGain.connect(this.masterGain);
  }

  triggerClack(intensity = 0.5) {
    if (!this.ctx || this.isMuted) return;

    // Dual-strike transient (front wheel hit, followed by rear wheel hit)
    const playAxleStrike = (delayMs, pitch) => {
      setTimeout(() => {
        if (!this.ctx) return;
        const now = this.ctx.currentTime;

        // Metallic rail ping
        const osc = this.ctx.createOscillator();
        const oscGain = this.ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(pitch, now);
        osc.frequency.exponentialRampToValueAtTime(80, now + 0.08);

        oscGain.gain.setValueAtTime(intensity * 0.4, now);
        oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

        // Sub thud
        const thud = this.ctx.createOscillator();
        const thudGain = this.ctx.createGain();
        thud.type = 'sine';
        thud.frequency.setValueAtTime(90, now);
        thud.frequency.exponentialRampToValueAtTime(30, now + 0.12);

        thudGain.gain.setValueAtTime(intensity * 0.7, now);
        thudGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

        osc.connect(oscGain);
        oscGain.connect(this.railGain);

        thud.connect(thudGain);
        thudGain.connect(this.railGain);

        osc.start(now);
        osc.stop(now + 0.09);
        thud.start(now);
        thud.stop(now + 0.13);
      }, delayMs);
    };

    // Bogie wheel pair hits
    playAxleStrike(0, 240);
    playAxleStrike(45, 210);
    playAxleStrike(200, 230);
    playAxleStrike(245, 200);
  }

  // ---------------------------------------------------------
  // Dual-Tone Indian Railways Pneumatic Air Horn
  // Low tone ~311 Hz (Eb4), High tone ~370 Hz (F#4)
  // ---------------------------------------------------------
  setupHorn() {
    this.hornGain = this.ctx.createGain();
    this.hornGain.gain.setValueAtTime(0.0, this.ctx.currentTime);

    // Chords and air resonance harmonics
    const tones = [
      { f: 311.13, type: 'sawtooth', gain: 0.35 },
      { f: 370.00, type: 'sawtooth', gain: 0.40 },
      { f: 622.25, type: 'triangle', gain: 0.20 },
      { f: 740.00, type: 'triangle', gain: 0.25 },
      { f: 932.33, type: 'sine', gain: 0.15 }
    ];

    tones.forEach(t => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = t.type;
      osc.frequency.setValueAtTime(t.f, this.ctx.currentTime);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(2200, this.ctx.currentTime);

      gain.gain.setValueAtTime(t.gain, this.ctx.currentTime);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.hornGain);
      osc.start();

      this.hornOscs.push({ osc, gain, filter });
    });

    this.hornGain.connect(this.masterGain);
  }

  startHorn(tone = 'dual') {
    if (!this.ctx || this.isHornPlaying) return;
    this.resume();
    this.isHornPlaying = true;

    const now = this.ctx.currentTime;
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(this.hornGain.gain.value, now);
    this.hornGain.gain.linearRampToValueAtTime(0.9, now + 0.06);
  }

  stopHorn() {
    if (!this.ctx || !this.isHornPlaying) return;
    this.isHornPlaying = false;

    const now = this.ctx.currentTime;
    this.hornGain.gain.cancelScheduledValues(now);
    this.hornGain.gain.setValueAtTime(this.hornGain.gain.value, now);
    // Smooth natural reverberation decay
    this.hornGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.45);
  }

  // ---------------------------------------------------------
  // Pneumatic Air Brake Exhaust Hiss
  // ---------------------------------------------------------
  setupBrakes() {
    this.brakeGain = this.ctx.createGain();
    this.brakeGain.gain.setValueAtTime(0.0, this.ctx.currentTime);
    this.brakeGain.connect(this.masterGain);
  }

  triggerBrakeHiss(intensity = 0.6) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Generate white noise buffer
    const bufferSize = this.ctx.sampleRate * 1.2;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }

    const whiteNoise = this.ctx.createBufferSource();
    whiteNoise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1400, now);
    filter.Q.setValueAtTime(2.0, now);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(intensity * 0.5, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.1);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(this.brakeGain);

    whiteNoise.start(now);
    whiteNoise.stop(now + 1.2);
  }

  // ---------------------------------------------------------
  // Level Crossing Warning Bell
  // ---------------------------------------------------------
  setupBell() {
    this.bellGain = this.ctx.createGain();
    this.bellGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
    this.bellGain.connect(this.masterGain);
  }

  triggerBell() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(840, now);
    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(1680, now);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.bellGain);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.36);
    osc2.stop(now + 0.36);
  }

  // ---------------------------------------------------------
  // Station Chime & Announcement Jingle (Ting-Tong-Ting)
  // ---------------------------------------------------------
  playStationChime() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const notes = [659.25, 554.37, 440.00]; // E5, C#5, A4

    notes.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const t = now + idx * 0.28;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, t);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.exponentialRampToValueAtTime(0.4, t + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.7);

      osc.connect(gain);
      gain.connect(this.masterGain);

      osc.start(t);
      osc.stop(t + 0.75);
    });
  }

  // ---------------------------------------------------------
  // Inflatable Capture Net Rapid Pneumatic Deployment Audio
  // ---------------------------------------------------------
  playPneumaticDeploySound() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      // 1. High-pressure gas burst
      const bufSize = Math.floor(this.ctx.sampleRate * 0.45);
      const buf = this.ctx.createBuffer(1, bufSize, this.ctx.sampleRate);
      const data = buf.getChannelData(0);
      for (let i = 0; i < bufSize; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.1));
      }
      const noise = this.ctx.createBufferSource();
      noise.buffer = buf;
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(1.8, now);
      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.9, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      noise.start(now);

      // 2. Heavy mechanical solenoid valve latch clack
      const clack = this.ctx.createOscillator();
      clack.type = 'triangle';
      clack.frequency.setValueAtTime(220, now);
      clack.frequency.exponentialRampToValueAtTime(45, now + 0.08);
      const clackGain = this.ctx.createGain();
      clackGain.gain.setValueAtTime(0.7, now);
      clackGain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);
      clack.connect(clackGain);
      clackGain.connect(this.masterGain);
      clack.start(now);
      clack.stop(now + 0.09);
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // AI Sensor Target Acquisition Ping
  // ---------------------------------------------------------
  playTargetAcquiredBeep(isHazard = false) {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      const freq = isHazard ? 880 : 1320;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = isHazard ? 'sawtooth' : 'sine';
      osc.frequency.setValueAtTime(freq, now);
      osc.frequency.setValueAtTime(freq * 1.25, now + 0.06);
      gain.gain.setValueAtTime(0.25, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // Obstacle Safely Collected Chime
  // ---------------------------------------------------------
  playRescueSuccessChime() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      [1046.5, 1318.5, 1567.98].forEach((f, idx) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const t = now + idx * 0.1;
        osc.type = 'sine';
        osc.frequency.setValueAtTime(f, t);
        gain.gain.setValueAtTime(0.3, t);
        gain.gain.exponentialRampToValueAtTime(0.001, t + 0.4);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(t);
        osc.stop(t + 0.45);
      });
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // Active Non-Lethal Deterrence Sound Effects (>150kg Animals)
  // ---------------------------------------------------------

  // 1. High-Voltage Track Electric Pulse / Arc Crackle
  playElectricShockDischarge() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;

      // High-voltage sharp capacitive arc crackle (noise burst + filter sweep)
      const bufferSize = this.ctx.sampleRate * 0.45;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        // High density random spark pulse spikes
        data[i] = (Math.random() * 2 - 1) * Math.exp(-i / (this.ctx.sampleRate * 0.12));
      }

      const noiseNode = this.ctx.createBufferSource();
      noiseNode.buffer = buffer;

      const bpf = this.ctx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(3200, now);
      bpf.frequency.exponentialRampToValueAtTime(1400, now + 0.4);
      bpf.Q.value = 4.0;

      const noiseGain = this.ctx.createGain();
      noiseGain.gain.setValueAtTime(0.75, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

      noiseNode.connect(bpf);
      bpf.connect(noiseGain);
      noiseGain.connect(this.masterGain);
      noiseNode.start(now);

      // Rapid high-voltage ionization zapping tones
      [420, 840, 1680].forEach((freq, idx) => {
        const zapOsc = this.ctx.createOscillator();
        const zapGain = this.ctx.createGain();
        zapOsc.type = 'sawtooth';
        zapOsc.frequency.setValueAtTime(freq + Math.random() * 120, now);
        zapOsc.frequency.exponentialRampToValueAtTime(180, now + 0.35);

        zapGain.gain.setValueAtTime(0.35 / (idx + 1), now);
        zapGain.gain.exponentialRampToValueAtTime(0.001, now + 0.38);

        zapOsc.connect(zapGain);
        zapGain.connect(this.masterGain);
        zapOsc.start(now);
        zapOsc.stop(now + 0.4);
      });
    } catch (e) {}
  }

  // 2. Indian Railways Plan Bee - Bio-Acoustic Honeybee Swarm Frequency
  playBeeSwarmSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      [280, 310, 345, 390].forEach(f => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();

        // 35Hz frequency vibrato simulating wing flutters of angry swarm
        lfo.frequency.setValueAtTime(34 + Math.random() * 8, now);
        lfoGain.gain.setValueAtTime(18, now);
        lfo.connect(osc.frequency);

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(f, now);

        gain.gain.setValueAtTime(0.18, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.9);

        osc.connect(gain);
        gain.connect(this.masterGain);

        lfo.start(now);
        osc.start(now);
        lfo.stop(now + 0.95);
        osc.stop(now + 0.95);
      });
    } catch (e) {}
  }

  // 3. Acoustic LRAD - Focused Directional Long-Range Siren Pulse
  playLRADSirenSound() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, now);
      osc.frequency.linearRampToValueAtTime(2600, now + 0.25);
      osc.frequency.linearRampToValueAtTime(1800, now + 0.55);

      gain.gain.setValueAtTime(0.55, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.65);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.7);
    } catch (e) {}
  }

  // 4. Pulsed Millimeter Wave / Active Denial Carrier Hum
  playActiveDenialHum() {
    if (!this.ctx || this.isMuted) return;
    try {
      this.resume();
      const now = this.ctx.currentTime;
      const sub = this.ctx.createOscillator();
      const carrier = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      sub.type = 'sine';
      sub.frequency.setValueAtTime(95, now); // 95Hz sub-bass thump representing 95GHz carrier pulse rate
      carrier.type = 'sawtooth';
      carrier.frequency.setValueAtTime(1420, now);

      gain.gain.setValueAtTime(0.40, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

      sub.connect(gain);
      carrier.connect(gain);
      gain.connect(this.masterGain);

      sub.start(now);
      carrier.start(now);
      sub.stop(now + 0.55);
      carrier.stop(now + 0.55);
    } catch (e) {}
  }

  // ---------------------------------------------------------
  // Main Audio Update Loop
  // ---------------------------------------------------------
  update(speedKmh, throttlePercent, brakePercent, isElectric = true) {
    if (!this.ctx || this.isMuted) return;

    this.isElectric = isElectric;
    const now = this.ctx.currentTime;
    const speedRatio = Math.min(speedKmh / 160, 1.2);

    // 1. Motor / Engine Sound Updates
    if (this.isElectric) {
      // Mute diesel
      this.dieselGain.gain.setTargetAtTime(0.0, now, 0.1);

      // WAP-7 VVVF Inverter Sound
      const motorVolume = Math.min(0.7, (throttlePercent * 0.5 + speedRatio * 0.4) * 0.6);
      this.motorGain.gain.setTargetAtTime(motorVolume, now, 0.1);

      // Stepped harmonic frequency climb based on speed
      this.motorOscs.forEach((m, idx) => {
        let f = m.baseFreq;
        if (speedKmh < 15) {
          // PWM stepping phase
          f = m.baseFreq * (1 + Math.floor(speedKmh / 4) * 0.5);
        } else if (speedKmh < 60) {
          f = m.baseFreq * (1.8 + (speedKmh - 15) * 0.04);
        } else {
          f = m.baseFreq * (3.6 + (speedKmh - 60) * 0.02);
        }
        m.osc.frequency.setTargetAtTime(f, now, 0.08);
      });
    } else {
      // Mute electric
      this.motorGain.gain.setTargetAtTime(0.0, now, 0.1);

      // Diesel 16-cylinder rumble
      const dieselVolume = 0.15 + throttlePercent * 0.55;
      this.dieselGain.gain.setTargetAtTime(dieselVolume, now, 0.1);

      this.dieselOscs.forEach(d => {
        const rpm = d.baseFreq * (1 + throttlePercent * 0.85);
        d.osc.frequency.setTargetAtTime(rpm, now, 0.15);
      });

      // Turbo whistle
      const turboVolume = Math.max(0, (throttlePercent - 0.2) * 0.35);
      this.turboGain.gain.setTargetAtTime(turboVolume, now, 0.2);
      this.turboOsc.frequency.setTargetAtTime(700 + throttlePercent * 1100, now, 0.2);
    }

    // 2. Track Joint Clickety-Clack
    if (speedKmh > 5) {
      // Interval between track joints in ms: distance = ~13 meters between rail welds
      // speed in m/s = speedKmh / 3.6
      const speedMs = speedKmh / 3.6;
      const intervalMs = Math.max(180, (13 / speedMs) * 1000);

      const currentTimeMs = performance.now();
      if (currentTimeMs - this.lastClackTime >= intervalMs) {
        const intensity = Math.min(1.0, 0.2 + speedRatio * 0.8);
        this.triggerClack(intensity);
        this.lastClackTime = currentTimeMs;
      }
    }
  }

  toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : 0.7, this.ctx.currentTime);
    }
    return this.isMuted;
  }
}

