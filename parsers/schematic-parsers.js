const nbt = require('prismarine-nbt');
const zlib = require('zlib');

// Parse Classic MCEdit schematic format
function parseClassicSchematic(parsed) {
  const width = parsed.Width.value;
  const height = parsed.Height.value;
  const length = parsed.Length.value;
  
  // Get block IDs and data values
  const blockIds = parsed.Blocks.value;
  const blockData = parsed.Data.value;
  
  // Get block mapping if available (from newer formats)
  const blockMapping = parsed.BlockStates ? mapBlockStates(parsed.BlockStates.value) : null;
  
  const blocks = [];
  
  // Parse blocks
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < width; x++) {
        const index = y * width * length + z * width + x;
        const blockId = blockIds[index];
        const dataValue = blockData[index];
        
        // Skip air blocks for efficiency
        if (blockId === 0) continue;
        
        // Get block name from mapping or use legacy ID
        let blockName;
        if (blockMapping && blockMapping[blockId]) {
          blockName = blockMapping[blockId][dataValue] || `minecraft:unknown_${blockId}_${dataValue}`;
        } else {
          blockName = getLegacyBlockName(blockId, dataValue);
        }
        
        blocks.push({
          x,
          y,
          z,
          id: blockName
        });
      }
    }
  }
  
  return blocks;
}

// Function to map legacy block IDs to modern Minecraft identifiers
function getLegacyBlockName(blockId, dataValue) {
  // This is a simplified mapping of the most common blocks
  const legacyMapping = {
    1: 'minecraft:stone',
    2: 'minecraft:grass_block',
    3: 'minecraft:dirt',
    4: 'minecraft:cobblestone',
    5: 'minecraft:oak_planks', // Different variants based on dataValue
    6: 'minecraft:sapling',    // Different variants based on dataValue
    7: 'minecraft:bedrock',
    8: 'minecraft:water',
    9: 'minecraft:water',      // Stationary water
    10: 'minecraft:lava',
    11: 'minecraft:lava',      // Stationary lava
    12: 'minecraft:sand',
    13: 'minecraft:gravel',
    14: 'minecraft:gold_ore',
    15: 'minecraft:iron_ore',
    16: 'minecraft:coal_ore',
    17: 'minecraft:oak_log',   // Different variants based on dataValue
    18: 'minecraft:oak_leaves' // Different variants based on dataValue
    // More mappings would be added for a complete implementation
  };
  
  // Handle wood/plank variants
  if (blockId === 5) {
    const woodTypes = ['oak', 'spruce', 'birch', 'jungle', 'acacia', 'dark_oak'];
    return `minecraft:${woodTypes[dataValue % 6]}_planks`;
  }
  
  // Handle log variants
  if (blockId === 17) {
    const woodTypes = ['oak', 'spruce', 'birch', 'jungle'];
    return `minecraft:${woodTypes[dataValue % 4]}_log`;
  }
  
  return legacyMapping[blockId] || `minecraft:unknown_${blockId}_${dataValue}`;
}

// Parse Litematica format
function parseLitematicDimensions(parsed) {
  // Get the regions
  const regions = parsed.Regions.value;
  const regionNames = Object.keys(regions);
  
  // Use the first region's dimensions
  const firstRegion = regions[regionNames[0]];
  
  return {
    width: firstRegion.Size.value.value[0],
    height: firstRegion.Size.value.value[1],
    length: firstRegion.Size.value.value[2]
  };
}

function parseLitematicBlocks(parsed) {
  const regions = parsed.Regions.value;
  const regionNames = Object.keys(regions);
  const blocks = [];
  
  // Process each region
  for (const regionName of regionNames) {
    const region = regions[regionName];
    const size = region.Size.value.value;
    const width = size[0];
    const height = size[1];
    const length = size[2];
    
    // Get block state palette
    const palette = region.BlockStatePalette.value.value;
    const blockStates = region.BlockStates.value.value;
    
    // Calculate bits per block
    const bitsPerBlock = Math.ceil(Math.log2(palette.length));
    const blocksPerLong = Math.floor(64 / bitsPerBlock);
    const maskBits = (1n << BigInt(bitsPerBlock)) - 1n;
    
    // Process blocks
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const index = y * width * length + z * width + x;
          const longIndex = Math.floor(index / blocksPerLong);
          const bitOffset = (index % blocksPerLong) * bitsPerBlock;
          
          if (longIndex >= blockStates.length) continue;
          
          // Extract block state from packed long
          let blockState;
          const stateLong = blockStates[longIndex];
          blockState = Number((BigInt(stateLong) >> BigInt(bitOffset)) & maskBits);
          
          // Get block from palette
          if (blockState >= palette.length) continue;
          
          const blockData = palette[blockState];
          const blockName = blockData.Name.value;
          
          // Skip air blocks
          if (blockName === 'minecraft:air') continue;
          
          // Get position offset if available
          const posOffset = region.Position?.value?.value || [0, 0, 0];
          
          blocks.push({
            x: x + posOffset[0],
            y: y + posOffset[1],
            z: z + posOffset[2],
            id: blockName,
            properties: blockData.Properties?.value || {}
          });
        }
      }
    }
  }
  
  return blocks;
}

// Parse WorldEdit .schem format
function parseWorldEditSchematic(parsed) {
  const width = parsed.Width.value;
  const height = parsed.Height.value;
  const length = parsed.Length.value;
  
  // Get palette
  const palette = parsed.Palette.value;
  const blockStatePalette = [];
  
  // Convert palette to array for easier indexing
  for (const [blockName, id] of Object.entries(palette)) {
    blockStatePalette[id] = blockName;
  }
  
  // Get block data
  const blockData = parsed.BlockData.value;
  
  // Handle offset
  const offset = [0, 0, 0];
  if (parsed.Offset) {
    offset[0] = parsed.Offset.value.value[0];
    offset[1] = parsed.Offset.value.value[1];
    offset[2] = parsed.Offset.value.value[2];
  }
  
  const blocks = [];
  let blockIndex = 0;
  
  // Parse blocks
  for (let y = 0; y < height; y++) {
    for (let z = 0; z < length; z++) {
      for (let x = 0; x < width; x++) {
        if (blockIndex >= blockData.length) continue;
        
        // Get block state from palette
        const blockStateId = blockData[blockIndex++];
        const blockName = blockStatePalette[blockStateId];
        
        // Skip air blocks
        if (blockName === 'minecraft:air') continue;
        
        blocks.push({
          x: x + offset[0],
          y: y + offset[1],
          z: z + offset[2],
          id: blockName
        });
      }
    }
  }
  
  return blocks;
}

// Utility function to map block states
function mapBlockStates(blockStates) {
  const mapping = {};
  
  for (const [blockName, stateInfo] of Object.entries(blockStates)) {
    const blockId = stateInfo.id;
    
    if (!mapping[blockId]) {
      mapping[blockId] = {};
    }
    
    // Map various state values
    for (const [metadata, metaInfo] of Object.entries(stateInfo.states)) {
      mapping[blockId][metadata] = `${blockName}`;
    }
  }
  
  return mapping;
}

// Export the parsers
module.exports = {
  parseClassicSchematic,
  parseLitematicDimensions,
  parseLitematicBlocks,
  parseWorldEditSchematic,
  getLegacyBlockName,
  mapBlockStates
};
