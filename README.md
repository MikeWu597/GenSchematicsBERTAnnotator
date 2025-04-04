# Minecraft Schematic Viewer

A web-based 3D viewer for Minecraft schematics with optimized rendering for large structures.

## Features

- Support for multiple schematic formats (.schematic, .schem, .litematic)
- 3D visualization using Three.js and WebGL
- Layer-by-layer viewing
- Texture support with fallbacks
- Optimized rendering for large structures

## Installation

```bash
git clone https://github.com/Jopgood/minecraft-schematic-viewer.git
cd minecraft-schematic-viewer
npm install
npm start
```

## Usage

1. Open the application in your web browser
2. Upload your Minecraft schematic file
3. Explore the 3D model using the provided controls

## Performance Optimizations

- Texture atlas support
- Instanced rendering
- Occlusion culling
- Layer-based viewing
- Spatial partitioning (octree)
