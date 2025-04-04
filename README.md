# Minecraft Schematic Viewer

A web-based 3D viewer for Minecraft schematics with optimized rendering for large structures.

## Features

- Support for multiple schematic formats (.schematic, .schem, .litematic)
- 3D visualization using Three.js and WebGL
- Layer-by-layer viewing
- Texture support with fallbacks
- Optimized rendering for large structures
- Robust error handling with fallback rendering

## Installation

```bash
git clone https://github.com/Jopgood/minecraft-schematic-viewer.git
cd minecraft-schematic-viewer
npm install
npm start
```

## Usage

1. Open the application in your web browser (http://localhost:3000)
2. Upload your Minecraft schematic file
3. Explore the 3D model using the provided controls

## Supported Schematic Formats

- **MCEdit format (.schematic)** - Classic schematic format, widely compatible
- **WorldEdit format (.schem)** - Modern format supporting newer block types
- **Litematica format (.litematic/.nbt)** - Used by the Litematica mod

## Controls

- **Left Mouse Button + Drag**: Rotate the view
- **Right Mouse Button + Drag**: Pan the view
- **Mouse Wheel**: Zoom in/out
- **Reset View**: Reset the camera position
- **Toggle Wireframe**: Switch between solid and wireframe rendering
- **Toggle Textures**: Switch between textured and colored blocks
- **Layer Slider**: View the schematic layer by layer

## Performance Optimizations

- Texture atlas support
- Instanced rendering
- Occlusion culling
- Layer-based viewing
- Spatial partitioning (octree)

## Troubleshooting

If you encounter issues with parsing schematic files:

1. **Check the file format**: Make sure your schematic is in one of the supported formats
2. **File corruption**: If you see error messages about missing data, the file might be corrupted
3. **Complex schematics**: Very large or complex schematics might take longer to process
4. **Console errors**: Check your browser's console for specific error messages

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Edge
- Safari (partial support)

## Known Limitations

- Very large schematics (>1 million blocks) may cause performance issues
- Some newer block types in 1.16+ versions might not render correctly
- Perfect rendering of complex blocks (e.g., stairs, slabs) is not supported
- Redstone components appear as simple blocks

## License

MIT
