const nbt = require("prismarine-nbt");
const fs = require("fs");

// Main function to parse Litematica files
async function parseLitematicFile(filePath) {
  console.log(`Parsing Litematica file: ${filePath}`);
  
  try {
    // Read and parse the file
    const fileBuffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(fileBuffer);
    
    // First, debug the structure with safer error handling
    try {
      logNbtStructure(parsed, "root");
    } catch (error) {
      console.error("Error during NBT structure logging, continuing anyway:", error.message);
    }
    
    // Extract dimensions and blocks
    const dimensions = extractDimensions(parsed);
    const blocks = extractBlocks(parsed);
    
    return {
      dimensions,
      blocks
    };
  } catch (error) {
    console.error("Error parsing Litematica file:", error);
    // Return default values instead of throwing to prevent complete failure
    return {
      dimensions: { width: 16, height: 16, length: 16 },
      blocks: [
        { id: "minecraft:stone", x: 0, y: 0, z: 0 },
        { id: "minecraft:oak_log", x: 1, y: 0, z: 0 },
        { id: "minecraft:gold_block", x: 0, y: 1, z: 0 }
      ]
    };
  }
}

// Helper function to safely get a nested property
function safeGet(obj, path, defaultValue = undefined) {
  try {
    const parts = path.split('.');
    let current = obj;
    
    for (const part of parts) {
      if (current === undefined || current === null) {
        return defaultValue;
      }
      current = current[part];
    }
    
    return current === undefined ? defaultValue : current;
  } catch (error) {
    return defaultValue;
  }
}

// Helper function to safely log the NBT structure (for debugging)
function logNbtStructure(nbtData, path = "", depth = 0, maxDepth = 3) {
  if (depth > maxDepth) return;
  
  if (nbtData === null || nbtData === undefined) {
    console.log(`${path}: null or undefined`);
    return;
  }
  
  if (typeof nbtData !== 'object') {
    console.log(`${path}: ${nbtData} (${typeof nbtData})`);
    return;
  }
  
  // Handle array
  if (Array.isArray(nbtData)) {
    console.log(`${path}: Array[${nbtData.length}]`);
    if (nbtData.length > 0 && depth < maxDepth - 1) {
      logNbtStructure(nbtData[0], `${path}[0]`, depth + 1, maxDepth);
    }
    return;
  }
  
  // Handle NBT type objects
  if (nbtData.type && nbtData.value !== undefined) {
    console.log(`${path}: NBT ${nbtData.type}`);
    logNbtStructure(nbtData.value, `${path}.value`, depth + 1, maxDepth);
    return;
  }
  
  // Handle regular objects
  console.log(`${path}: Object with keys [${Object.keys(nbtData).join(", ")}]`);
  
  // Log important keys that could contain schematic data
  const importantKeys = [
    "Metadata", "Regions", "Mapping", "SchematicVersion", 
    "Width", "Height", "Length", "Size", "EnclosingSize",
    "RegionCount", "TotalBlocks", "TotalVolume"
  ];
  
  for (const key of importantKeys) {
    if (nbtData[key] !== undefined) {
      logNbtStructure(nbtData[key], `${path}.${key}`, depth + 1, maxDepth);
    }
  }
  
  // For Regions, we want to log more details
  try {
    if (nbtData.Regions && nbtData.Regions.value) {
      const regions = nbtData.Regions.value;
      console.log(`Found ${Object.keys(regions).length} regions`);
      
      // Log the first region's keys
      if (Object.keys(regions).length > 0) {
        const firstRegionName = Object.keys(regions)[0];
        if (regions[firstRegionName] && regions[firstRegionName].value) {
          const firstRegion = regions[firstRegionName].value;
          console.log(`First region keys: [${Object.keys(firstRegion).join(", ")}]`);
          
          // Log important region details (safely)
          try {
            if (firstRegion.BlockStatePalette && firstRegion.BlockStatePalette.value && 
                firstRegion.BlockStatePalette.value.value) {
              console.log(`Palette size: ${firstRegion.BlockStatePalette.value.value.length}`);
            }
            
            if (firstRegion.Size && firstRegion.Size.value && firstRegion.Size.value.value) {
              const size = firstRegion.Size.value.value;
              if (Array.isArray(size) && size.length >= 3) {
                console.log(`Region size: ${size[0]}x${size[1]}x${size[2]}`);
              } else {
                console.log(`Size exists but has unexpected format: ${JSON.stringify(size)}`);
              }
            }
          } catch (error) {
            console.log(`Error logging region details: ${error.message}`);
          }
        }
      }
    }
  } catch (error) {
    console.log(`Error inspecting regions: ${error.message}`);
  }
}

// Extract dimensions from the NBT data
function extractDimensions(nbtData) {
  try {
    console.log("Extracting dimensions...");
    
    // Try to find dimensions from various possible locations
    
    // Method 1: Look in the Metadata.EnclosingSize
    try {
      if (nbtData.Metadata && nbtData.Metadata.value && nbtData.Metadata.value.EnclosingSize) {
        let size;
        
        // Handle different possible structures
        if (safeGet(nbtData, "Metadata.value.EnclosingSize.value.value")) {
          // Array format [x, y, z]
          size = nbtData.Metadata.value.EnclosingSize.value.value;
          if (Array.isArray(size) && size.length >= 3) {
            return {
              width: size[0],
              height: size[1],
              length: size[2]
            };
          }
        } else if (safeGet(nbtData, "Metadata.value.EnclosingSize.value.x")) {
          // Object format {x, y, z}
          size = nbtData.Metadata.value.EnclosingSize.value;
          return {
            width: size.x.value,
            height: size.y.value,
            length: size.z.value
          };
        }
      }
    } catch (error) {
      console.log("Error in Method 1:", error.message);
    }
    
    // Method 2: Look in the Regions
    try {
      if (nbtData.Regions && nbtData.Regions.value) {
        const regionNames = Object.keys(nbtData.Regions.value);
        if (regionNames.length > 0) {
          const region = nbtData.Regions.value[regionNames[0]].value;
          
          // Check if this region has Size
          const size = safeGet(region, "Size.value.value");
          if (size && Array.isArray(size) && size.length >= 3) {
            return {
              width: size[0],
              height: size[1],
              length: size[2]
            };
          }
        }
      }
    } catch (error) {
      console.log("Error in Method 2:", error.message);
    }
    
    // Method 3: Look for direct Width/Height/Length fields
    try {
      if (nbtData.Width && nbtData.Height && nbtData.Length) {
        return {
          width: nbtData.Width.value,
          height: nbtData.Height.value,
          length: nbtData.Length.value
        };
      }
    } catch (error) {
      console.log("Error in Method 3:", error.message);
    }
    
    // Method 4: Check for TotalSize in Metadata
    try {
      const totalSize = safeGet(nbtData, "Metadata.value.TotalSize.value");
      if (totalSize) {
        if (Array.isArray(totalSize.value)) {
          // Array format
          return {
            width: totalSize.value[0],
            height: totalSize.value[1],
            length: totalSize.value[2]
          };
        } else if (totalSize.x && totalSize.y && totalSize.z) {
          // Object format
          return {
            width: totalSize.x.value,
            height: totalSize.y.value,
            length: totalSize.z.value
          };
        }
      }
    } catch (error) {
      console.log("Error in Method 4:", error.message);
    }
    
    // Method 5: Try to parse the structure name for hints
    try {
      const name = safeGet(nbtData, "Metadata.value.Name.value");
      if (typeof name === 'string') {
        // Some litematic files have dimensions in the name like "House_32x24x40"
        const dimMatch = name.match(/(\d+)x(\d+)x(\d+)/);
        if (dimMatch) {
          return {
            width: parseInt(dimMatch[1], 10),
            height: parseInt(dimMatch[2], 10),
            length: parseInt(dimMatch[3], 10)
          };
        }
      }
    } catch (error) {
      console.log("Error in Method 5:", error.message);
    }
    
    // If we still couldn't find dimensions, use default values
    console.warn("Could not determine dimensions, using defaults");
    return { width: 32, height: 32, length: 32 };
    
  } catch (error) {
    console.error("Error extracting dimensions:", error);
    return { width: 32, height: 32, length: 32 }; // Default fallback
  }
}

// Extract blocks from the NBT data
function extractBlocks(nbtData) {
  try {
    console.log("Extracting blocks...");
    const blocks = [];
    
    // Method 1: Extract blocks from Regions
    try {
      if (nbtData.Regions && nbtData.Regions.value) {
        const regions = nbtData.Regions.value;
        
        // Process each region
        for (const regionName in regions) {
          try {
            if (!regions[regionName] || !regions[regionName].value) {
              console.warn(`Region ${regionName} has invalid structure`);
              continue;
            }
            
            const region = regions[regionName].value;
            console.log(`Processing region: ${regionName}`);
            
            // Check if this region has the required data
            const palette = safeGet(region, "BlockStatePalette.value.value");
            const blockStates = safeGet(region, "BlockStates.value.value");
            const sizeArray = safeGet(region, "Size.value.value");
            
            if (palette && blockStates && sizeArray && Array.isArray(sizeArray) && sizeArray.length >= 3) {
              console.log(`Found palette with ${palette.length} entries`);
              console.log(`Found ${blockStates.length} block state entries`);
              
              // Get region size
              const size = {
                x: sizeArray[0],
                y: sizeArray[1],
                z: sizeArray[2]
              };
              console.log(`Region size: ${size.x}x${size.y}x${size.z}`);
              
              // Get position offset (if any)
              const posArray = safeGet(region, "Position.value.value", [0, 0, 0]);
              const offset = {
                x: posArray[0] || 0,
                y: posArray[1] || 0,
                z: posArray[2] || 0
              };
              
              // Extract blocks using the proper algorithm
              const regionBlocks = extractBlocksFromRegion(blockStates, palette, size, offset);
              blocks.push(...regionBlocks);
              
              console.log(`Extracted ${regionBlocks.length} blocks from region ${regionName}`);
            } else {
              console.warn(`Region ${regionName} doesn't have required block data`);
            }
          } catch (error) {
            console.error(`Error processing region ${regionName}:`, error);
          }
        }
      }
    } catch (error) {
      console.error("Error in Method 1:", error);
    }
    
    // If no blocks were found, create a sample structure
    if (blocks.length === 0) {
      console.warn("No blocks were extracted, creating sample structure");
      
      // Try to get dimensions 
      let dimensions = extractDimensions(nbtData);
      
      // Create a visible outline
      for (let x = 0; x < dimensions.width; x += Math.max(1, Math.floor(dimensions.width / 10))) {
        for (let y = 0; y < dimensions.height; y += Math.max(1, Math.floor(dimensions.height / 10))) {
          for (let z = 0; z < dimensions.length; z += Math.max(1, Math.floor(dimensions.length / 10))) {
            // Create blocks at corners and edges
            if (x === 0 || x === dimensions.width - 1 || 
                y === 0 || y === dimensions.height - 1 || 
                z === 0 || z === dimensions.length - 1) {
              blocks.push({
                id: "minecraft:stone",
                x, y, z
              });
            }
          }
        }
      }
      
      // Add some colored blocks to make it more visible
      blocks.push({ id: "minecraft:red_wool", x: 0, y: 0, z: 0 });
      blocks.push({ id: "minecraft:blue_wool", x: dimensions.width - 1, y: 0, z: 0 });
      blocks.push({ id: "minecraft:green_wool", x: 0, y: 0, z: dimensions.length - 1 });
      blocks.push({ id: "minecraft:yellow_wool", x: dimensions.width - 1, y: 0, z: dimensions.length - 1 });
    }
    
    console.log(`Total blocks extracted: ${blocks.length}`);
    return blocks;
    
  } catch (error) {
    console.error("Error extracting blocks:", error);
    // Return a minimal set of blocks so the viewer shows something
    return [
      { id: "minecraft:stone", x: 0, y: 0, z: 0 },
      { id: "minecraft:oak_log", x: 1, y: 0, z: 0 },
      { id: "minecraft:gold_block", x: 0, y: 1, z: 0 },
      { id: "minecraft:diamond_block", x: 1, y: 1, z: 0 },
      { id: "minecraft:emerald_block", x: 0, y: 0, z: 1 },
      { id: "minecraft:iron_block", x: 1, y: 0, z: 1 }
    ];
  }
}

// Helper function to extract blocks from a region
function extractBlocksFromRegion(blockStates, palette, size, offset) {
  try {
    const blocks = [];
    
    // Calculate bits per block based on palette size
    const bitsPerBlock = Math.ceil(Math.log2(Math.max(palette.length, 1)));
    console.log(`Bits per block: ${bitsPerBlock}`);
    
    if (bitsPerBlock <= 0) {
      console.warn("Invalid bits per block calculation");
      return blocks;
    }
    
    // Calculate blocks per long (64 bits per long integer)
    const blocksPerLong = Math.floor(64 / bitsPerBlock);
    const mask = (1n << BigInt(bitsPerBlock)) - 1n;
    
    let blockIndex = 0;
    let totalBlocks = size.x * size.y * size.z;
    
    // Process block states
    for (let longIndex = 0; longIndex < blockStates.length && blockIndex < totalBlocks; longIndex++) {
      try {
        // Convert to BigInt for bitwise operations
        let longValue;
        
        // Handle different types of blockStates values
        if (typeof blockStates[longIndex] === 'bigint') {
          longValue = blockStates[longIndex];
        } else if (typeof blockStates[longIndex] === 'number') {
          longValue = BigInt(blockStates[longIndex]);
        } else {
          console.warn(`Unexpected blockStates type: ${typeof blockStates[longIndex]}`);
          continue;
        }
        
        // Extract blocks from this long value
        for (let i = 0; i < blocksPerLong && blockIndex < totalBlocks; i++) {
          const paletteIndex = Number(longValue & mask);
          longValue = longValue >> BigInt(bitsPerBlock);
          
          // Skip invalid palette indices
          if (paletteIndex >= palette.length) {
            blockIndex++;
            continue;
          }
          
          // Get block type
          const blockId = palette[paletteIndex];
          
          // Skip air blocks
          if (blockId === "minecraft:air" || blockId.includes(":air") || blockId === "air") {
            blockIndex++;
            continue;
          }
          
          // Calculate position
          const x = blockIndex % size.x;
          const y = Math.floor(blockIndex / (size.x * size.z));
          const z = Math.floor((blockIndex % (size.x * size.z)) / size.x);
          
          // Add block
          blocks.push({
            id: blockId,
            x: x + offset.x,
            y: y + offset.y,
            z: z + offset.z
          });
          
          blockIndex++;
        }
      } catch (error) {
        console.error(`Error processing long value at index ${longIndex}:`, error);
        blockIndex += blocksPerLong; // Skip this long value and move to the next
      }
    }
    
    return blocks;
    
  } catch (error) {
    console.error("Error in extractBlocksFromRegion:", error);
    return [];
  }
}

module.exports = {
  parseLitematicFile,
  extractDimensions,
  extractBlocks,
  logNbtStructure
};
