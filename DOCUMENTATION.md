# Minecraft Schematic Viewer Documentation

This document provides a comprehensive overview of the Minecraft Schematic Viewer project, its architecture, and how the various components work together.

## Table of Contents

1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [File Structure](#file-structure)
4. [Backend Implementation](#backend-implementation)
5. [Frontend Implementation](#frontend-implementation)
6. [Performance Optimizations](#performance-optimizations)
7. [Extending the System](#extending-the-system)
8. [Litematica Support](#litematica-support)

## Project Overview

The Minecraft Schematic Viewer is a web-based application that allows users to upload, view, and explore Minecraft schematic files in 3D. It supports multiple schematic formats and provides an optimized rendering pipeline to handle even large, complex structures efficiently.

### Supported Formats

- Classic MCEdit (.schematic)
- WorldEdit (.schem)
- Litematica (.litematic, .nbt)

## Architecture

The system follows a client-server architecture:

- **Backend (Node.js/Express)**: Handles file uploads, parses schematic files, and serves the processed data
- **Frontend (HTML/JavaScript/Three.js)**: Renders the 3D model and provides interactive controls

### Data Flow

1. User uploads a schematic file
2. Server parses the file based on its format
3. Processed data is stored as JSON
4. Frontend fetches the processed data
5. Three.js renders the 3D model using WebGL

## File Structure

```
minecraft-schematic-viewer/
├── server.js                 # Main server file
├── package.json              # Project dependencies
├── parsers/                  # Schematic format parsers
│   ├── schematic-parsers.js  # Parser implementations for classic formats
│   └── litematica-parser.js  # Specialized parser for litematica files
├── test-litematica.js        # Test script for litematica format
├── public/                   # Static files served by Express
│   ├── index.html            # Main HTML page
│   ├── css/                  # CSS styles
│   │   └── styles.css        # Main stylesheet
│   ├── js/                   # Frontend JavaScript
│   │   ├── app.js            # Main application logic
│   │   ├── viewer.js         # 3D renderer implementation
│   │   ├── TextureLoader.js  # Handles Minecraft textures
│   │   └── OrbitControls.js  # Camera controls
│   ├── schematics/           # Processed schematic data (generated)
│   └── textures/             # Block textures
├── uploads/                  # Temporary storage for uploaded files
```

## Backend Implementation

### Server (server.js)

The server is built using Express.js and provides:

- File upload endpoint (`/api/upload`)
- Schematic processing logic
- Static file serving

### Schematic Parsers (parsers/schematic-parsers.js)

The parsers module exports functions for handling different schematic formats:

- `parseClassicSchematic`: Handles MCEdit format (.schematic)
- `parseWorldEditSchematic`: Handles WorldEdit format (.schem)

Each parser extracts block data, converts legacy block IDs to modern Minecraft identifiers, and generates a standardized block array for the frontend.

### Litematica Parser (parsers/litematica-parser.js)

A specialized parser for handling Litematica (.litematic, .nbt) files:

- `parseLitematicFile`: Main function to parse litematica files
- `extractDimensions`: Gets dimensions from different possible NBT structures
- `extractBlocks`: Extracts block data from regions
- `logNbtStructure`: Helper for debugging NBT structure

The litematica parser includes robust error handling and fallbacks to ensure that something is always rendered, even if the exact format isn't recognized.

## Frontend Implementation

### Main Application (app.js)

Handles the user interface interactions:

- File selection and drag-and-drop
- Upload form submission
- View controls

### 3D Renderer (viewer.js)

The `SchematicViewer` class manages the Three.js scene and rendering:

- Initializes WebGL renderer, camera, and controls
- Loads and processes schematic data
- Creates instanced meshes for efficient rendering
- Implements layer-by-layer viewing
- Manages camera controls

### Texture Management (TextureLoader.js)

The `MinecraftTextureLoader` class handles Minecraft block textures:

- Loads texture atlas or individual textures
- Provides fallback colors for blocks without textures
- Creates Three.js materials for blocks

### Camera Controls (OrbitControls.js)

A simplified version of Three.js OrbitControls for camera navigation:

- Rotation, panning, and zooming
- Mouse wheel support
- Damping for smooth camera movement

## Performance Optimizations

The system includes several optimizations for handling large schematics:

### Backend Optimizations

1. **Selective Block Processing**: Air blocks are skipped to reduce data size
2. **Optimized Data Format**: Only essential block data is sent to the client
3. **Format Conversion**: All schematic formats are converted to a standardized format

### Frontend Optimizations

1. **Instanced Rendering**: Uses THREE.InstancedMesh for efficient rendering of repeated blocks
2. **Layer-based Viewing**: Allows viewing one layer at a time to reduce rendering load
3. **Texture Atlas**: Uses a single texture atlas to reduce GPU texture switches
4. **Visibility Culling**: Only visible blocks are rendered
5. **Material Batching**: Similar blocks share materials to reduce draw calls

## Extending the System

### Adding Support for New Block Types

To add support for new block types:

1. Update the legacy block mapping in `getLegacyBlockName()`
2. Add color mappings for the new blocks in `TextureLoader.js`
3. Add texture files to the `public/textures/blocks/` directory

### Adding Support for New Schematic Formats

To support a new schematic format:

1. Add a new parser function in `schematic-parsers.js` or create a specialized parser
2. Update the `processSchematic()` function in `server.js` to use the new parser
3. Add file extension handling in the upload form

### Improving Rendering Performance

For larger schematics, consider implementing:

1. **Chunk-based Rendering**: Divide the model into chunks and render only visible chunks
2. **Level of Detail (LOD)**: Render distant parts of the model with less detail
3. **Occlusion Culling**: Skip rendering blocks that are completely surrounded by other blocks
4. **WebWorkers**: Offload heavy computations to background threads

## Litematica Support

The viewer now includes comprehensive support for Litematica (.litematic) files, used by the popular Litematica mod for Minecraft.

### Litematica Format Structure

Litematica files use an NBT structure with these key components:

- **Metadata**: Contains information like schematic name, author, dimensions
- **Regions**: Contains block data for different regions of the structure
  - **BlockStatePalette**: List of block types used in the schematic
  - **BlockStates**: Compact array of indices into the palette

### Parsing Process

The litematica parser follows these steps:

1. Reads the file and parses the NBT structure
2. Extracts dimensions from various possible locations in the structure
3. Identifies and processes regions
4. Extracts block data using bit-packing algorithms
5. Creates a standardized block array for the viewer

### Testing Litematica Files

A test script is included to help debug issues with litematica files:

```bash
node test-litematica.js path/to/your/file.litematic
```

This script:
- Attempts to parse the litematica file
- Outputs dimensions and block counts
- Shows sample blocks
- Dumps the NBT structure for analysis
- Saves a detailed analysis file for further debugging

### Troubleshooting Litematica Files

If you encounter issues with a litematica file:

1. Run the test script to analyze the file structure
2. Check the NBT analysis output for the exact structure
3. Verify that the file was created with a compatible version of Litematica
4. For very large structures, be patient during loading as parsing can take time
