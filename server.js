const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const nbt = require('prismarine-nbt');
const zlib = require('zlib');
const cors = require('cors');

// Import format-specific parsers
const { 
  parseClassicSchematic, 
  parseLitematicDimensions, 
  parseLitematicBlocks, 
  parseWorldEditSchematic 
} = require('./parsers/schematic-parsers');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Configure multer storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    cb(null, `${Date.now()}-${file.originalname}`);
  }
});

const upload = multer({ storage });

// API endpoint to upload schematics
app.post('/api/upload', upload.single('schematic'), async (req, res) => {
  try {
    const filePath = req.file.path;
    console.log(`Processing file: ${filePath}`);
    
    // Process the schematic file
    const schematicData = await processSchematic(filePath);
    
    // Store processed data (or reference) for later retrieval
    const schematicId = path.basename(filePath, path.extname(filePath));
    
    // Make sure directory exists
    if (!fs.existsSync('public/schematics')) {
      fs.mkdirSync('public/schematics', { recursive: true });
    }
    
    // Log some information about the processed schematic
    console.log(`Schematic dimensions: ${schematicData.dimensions.width}x${schematicData.dimensions.height}x${schematicData.dimensions.length}`);
    console.log(`Total blocks: ${schematicData.blocks.length}`);
    
    // Save processed data to a JSON file for retrieval
    fs.writeFileSync(
      `public/schematics/${schematicId}.json`, 
      JSON.stringify(schematicData)
    );
    
    res.json({ 
      success: true, 
      message: 'Schematic uploaded successfully',
      schematicId,
      dimensions: schematicData.dimensions,
      format: schematicData.format
    });
  } catch (error) {
    console.error('Error processing schematic:', error);
    // Send more detailed error information
    res.status(500).json({ 
      success: false, 
      message: `Failed to process schematic: ${error.message}`,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined 
    });
  }
});

// Function to process different schematic formats
async function processSchematic(filePath) {
  try {
    console.log(`Reading file: ${filePath}`);
    const fileBuffer = fs.readFileSync(filePath);
    const fileExt = path.extname(filePath).toLowerCase();
    console.log(`File extension: ${fileExt}`);
    
    let parsed;
    
    if (fileExt === '.schematic') {
      // Classic MCEdit schematic format
      console.log('Parsing as MCEdit schematic');
      const parseResult = await nbt.parse(fileBuffer);
      parsed = parseResult.parsed;
      
      console.log('NBT parsing successful');
      
      // Debug information
      if (parsed.Width) console.log(`Width: ${parsed.Width.value}`);
      if (parsed.Height) console.log(`Height: ${parsed.Height.value}`);
      if (parsed.Length) console.log(`Length: ${parsed.Length.value}`);
      if (parsed.Blocks) console.log(`Has blocks data: ${parsed.Blocks.value.length} blocks`);
      
      return {
        format: 'schematic',
        dimensions: {
          width: parsed.Width.value,
          height: parsed.Height.value,
          length: parsed.Length.value
        },
        blocks: parseClassicSchematic(parsed)
      };
    } else if (fileExt === '.nbt' || fileExt === '.litematic') {
      // Litematica format
      console.log('Parsing as Litematica format');
      const parseResult = await nbt.parse(fileBuffer);
      parsed = parseResult.parsed;
      
      return {
        format: 'litematic',
        dimensions: parseLitematicDimensions(parsed),
        blocks: parseLitematicBlocks(parsed)
      };
    } else if (fileExt === '.schem') {
      // WorldEdit schematic format
      console.log('Parsing as WorldEdit schem format');
      // Some .schem files may be compressed with gzip
      let dataBuffer;
      try {
        dataBuffer = zlib.gunzipSync(fileBuffer);
        console.log('Decompressed with gzip');
      } catch (e) {
        // If decompression fails, try without it
        console.log('Gzip decompression failed, trying direct parse');
        dataBuffer = fileBuffer;
      }
      
      const parseResult = await nbt.parse(dataBuffer);
      parsed = parseResult.parsed;
      
      return {
        format: 'schem',
        dimensions: {
          width: parsed.Width.value,
          height: parsed.Height.value,
          length: parsed.Length.value
        },
        blocks: parseWorldEditSchematic(parsed)
      };
    } else {
      throw new Error(`Unsupported schematic format: ${fileExt}`);
    }
  } catch (error) {
    console.error('Processing error:', error);
    throw error; // Re-throw to be caught by the upload handler
  }
}

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Create required directories if they don't exist
  const requiredDirs = ['uploads', 'public/schematics', 'public/textures'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
});
