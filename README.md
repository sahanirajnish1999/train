# Indian Railways WAP-7 Train Simulator & AI Safety Recovery Suite

High-speed 3D WebGL train simulator modeling the Indian Railways WAP-7 electric locomotive (6,350 HP, 25kV AC OHE) with an advanced AI obstacle detection, weight-tiered non-lethal electric deterrence, and inflatable capture net recovery system.

## Features
- **WAP-7 High-Speed Electric Locomotive**: 160 km/h service speed, realistic cab physics, pneumatic air brakes, and dynamic OHE catenary.
- **AI Track Clearance & Non-Lethal Deterrence (800m - 80m)**:
  - Weight-Tiered Power Sources (1x to 4x) for target clearance off track.
  - Directional coach side guards (2-3m flank repulsion).
  - Thick high-voltage electric rays (4.8px core + 9.5px glowing plasma beam) targeted at mid-body.
- **Automatic Inflatable Scoop Net (80m - 0m)**:
  - Deploys automatically within 80m for obstacles under or equal to 150 kg.
  - Strictly locked for hazards over 150 kg with emergency brake engagement.
- **Bilingual IR Infrastructure**: Ratlam Junction station, dual high-level platforms, FOB, level crossings, and scenic Indian flora.

## Quick Start
```bash
# Install dependencies
npm install

# Build client bundle
npm run build

# Start local server (http://localhost:3000/)
npm start
```
