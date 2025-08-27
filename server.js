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
    
    // 处理schematic文件
    console.log(`Processing queue file: ${filePath}`);
    const schematicData = await processSchematic(filePath);
    
    // 存储处理后的数据（或引用）以供后续检索
    const fileExt = path.extname(filePath);
    const schematicId = path.basename(filePath, fileExt);
    
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

// API endpoint to get list of schematic files in queue
app.get('/api/queue', (req, res) => {
  try {
    const queueDir = 'public/queue';
    if (!fs.existsSync(queueDir)) {
      fs.mkdirSync(queueDir, { recursive: true });
    }
    
    const files = fs.readdirSync(queueDir)
      .filter(file => path.extname(file) === '.schematic')
      .map(file => {
        const nameWithoutExt = path.basename(file, '.schematic');
        const txtFile = `${nameWithoutExt}.txt`;
        const hasAnnotation = fs.existsSync(path.join(queueDir, txtFile));
        return {
          name: file,
          nameWithoutExt,
          hasAnnotation
        };
      })
      .filter(file => !file.hasAnnotation); // Only return files without annotations
    
    res.json({ success: true, files });
  } catch (error) {
    console.error('Error reading queue:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to read queue: ${error.message}`
    });
  }
});

// API endpoint to process a file from the queue directory
app.post('/api/process-queue-file', async (req, res) => {
  try {
    const { filename } = req.body;
    const queueDir = 'public/queue';
    
    // 确保文件名不包含路径遍历攻击
    const sanitizedFilename = path.basename(filename);
    const filePath = path.join(queueDir, sanitizedFilename);
    
    // 检查文件是否存在
    if (!fs.existsSync(filePath)) {
      console.error(`Queue file not found: ${filePath}`);
      return res.status(404).json({ 
        success: false, 
        message: `File not found in queue: ${filename}` 
      });
    }
    
    // 检查文件是否为有效文件
    const stats = fs.statSync(filePath);
    if (!stats.isFile()) {
      console.error(`Queue path is not a file: ${filePath}`);
      return res.status(400).json({
        success: false,
        message: `Invalid queue file: ${filename}`
      });
    }
    
    // Process the schematic file
    const schematicData = await processSchematic(filePath);
    
    // Store processed data (or reference) for later retrieval
    const schematicId = path.basename(filePath, path.extname(filePath));
    
    // Make sure directory exists
    if (!fs.existsSync('public/schematics')) {
      fs.mkdirSync('public/schematics', { recursive: true });
    }
    
    // Save processed data to a JSON file for retrieval
    fs.writeFileSync(
      `public/schematics/${schematicId}.json`, 
      JSON.stringify(schematicData)
    );
    
    res.json({ 
      success: true, 
      message: 'Schematic processed successfully',
      schematicId,
      dimensions: schematicData.dimensions,
      format: schematicData.format
    });
  } catch (error) {
    console.error('Error processing queue schematic:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to process schematic: ${error.message}`
    });
  }
});

// API endpoint to save annotation for a schematic
app.post('/api/annotate/:schematicName', (req, res) => {
  try {
    const { schematicName } = req.params;
    const { annotation } = req.body;
    
    const queueDir = 'public/queue';
    const txtFilePath = path.join(queueDir, `${schematicName}.txt`);
    
    // Save annotation to file
    fs.writeFileSync(txtFilePath, annotation);
    
    res.json({ success: true, message: 'Annotation saved successfully' });
  } catch (error) {
    console.error('Error saving annotation:', error);
    res.status(500).json({ 
      success: false, 
      message: `Failed to save annotation: ${error.message}`
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
      if (parsed.value.size.value.value[0]) console.log(`Width: ${parsed.value.size.value.value[0]}`);
      if (parsed.value.size.value.value[1]) console.log(`Height: ${parsed.value.size.value.value[1]}`);
      if (parsed.value.size.value.value[2]) console.log(`Length: ${parsed.value.size.value.value[2]}`);
      if (parsed.Blocks) console.log(`Has blocks data: ${parsed.Blocks.value.length} blocks`);
      
      return {
        format: 'schematic',
        dimensions: {
          width: parsed.value.size.value.value[0],
          height: parsed.value.size.value.value[1],
          length: parsed.value.size.value.value[2]
        },
        blocks: parseClassicSchematic(parsed)
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
  const requiredDirs = ['uploads', 'public/schematics', 'public/textures', 'public/queue'];
  for (const dir of requiredDirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      console.log(`Created directory: ${dir}`);
    }
  }
});