# 3D Model Assets for Indian Railways Train Simulator

This directory supports loading photorealistic 3D models (`.glb` / `.gltf`) directly into the simulator using Three.js `GLTFLoader`.

## Supported Model File Names:
- `human.glb` — 3D realistic human character (with skeletal animations or T-pose)
- `elephant.glb` — 3D realistic Asian elephant model
- `cow.glb` — 3D realistic Indian Zebu cow model
- `dog.glb` — 3D realistic Indian stray / Pariah dog model
- `deer.glb` — 3D realistic spotted deer / Chital model
- `boar.glb` — 3D realistic wild boar model

## How it Works:
1. When a model file (e.g. `cow.glb` or `elephant.glb`) is placed in this folder, the simulator automatically detects and loads it.
2. If a model file is not present, the simulator seamlessly uses its built-in high-detail procedural 3D organic meshes.
3. All gameplay systems (LiDAR detection, non-lethal electric shock deterrence, capture net scoops, and HUD telemetry) automatically adapt to both loaded GLTF models and procedural models.

