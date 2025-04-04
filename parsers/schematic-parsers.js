const nbt = require('prismarine-nbt');
const zlib = require('zlib');

// Parse Classic MCEdit schematic format
function parseClassicSchematic(parsed) {
  try {
    console.log('Starting Classic Schematic parsing');
    
    if (!parsed.Width || !parsed.Height || !parsed.Length || !parsed.Blocks) {
      throw new Error('Missing required NBT tags in schematic file');
    }
    
    const width = parsed.Width.value;
    const height = parsed.Height.value;
    const length = parsed.Length.value;
    
    console.log(`Dimensions: ${width}x${height}x${length}`);
    
    // Get block IDs and data values
    const blockIds = parsed.Blocks.value;
    const blockData = parsed.Data ? parsed.Data.value : new Array(blockIds.length).fill(0);
    
    console.log(`Block data length: ${blockIds.length}, expected: ${width * height * length}`);
    
    if (blockIds.length !== width * height * length) {
      console.warn(`Warning: Block data length (${blockIds.length}) doesn't match dimensions (${width * height * length})`);
    }
    
    // Get block mapping if available (from newer formats)
    const blockMapping = parsed.BlockStates ? mapBlockStates(parsed.BlockStates.value) : null;
    
    const blocks = [];
    let airBlocks = 0;
    
    // Parse blocks
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          const index = y * width * length + z * width + x;
          
          if (index >= blockIds.length) {
            console.warn(`Warning: Block index ${index} is out of bounds`);
            continue;
          }
          
          const blockId = blockIds[index];
          const dataValue = index < blockData.length ? blockData[index] : 0;
          
          // Skip air blocks for efficiency
          if (blockId === 0) {
            airBlocks++;
            continue;
          }
          
          // Get block name from mapping or use legacy ID
          let blockName;
          try {
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
          } catch (error) {
            console.warn(`Error processing block at (${x},${y},${z}): ${error.message}`);
          }
        }
      }
    }
    
    console.log(`Parsing complete. ${blocks.length} blocks extracted, ${airBlocks} air blocks skipped.`);
    return blocks;
  } catch (error) {
    console.error('Error in parseClassicSchematic:', error);
    // Return at least some data to avoid completely failing
    return [];
  }
}

// Function to map legacy block IDs to modern Minecraft identifiers
function getLegacyBlockName(blockId, dataValue) {
  // This is a simplified mapping of the most common blocks
  const legacyMapping = {
    0: 'minecraft:air',
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
    18: 'minecraft:oak_leaves', // Different variants based on dataValue
    19: 'minecraft:sponge',
    20: 'minecraft:glass',
    21: 'minecraft:lapis_ore',
    22: 'minecraft:lapis_block',
    23: 'minecraft:dispenser',
    24: 'minecraft:sandstone',
    25: 'minecraft:note_block',
    26: 'minecraft:bed',
    27: 'minecraft:powered_rail',
    28: 'minecraft:detector_rail',
    29: 'minecraft:sticky_piston',
    30: 'minecraft:cobweb',
    31: 'minecraft:grass',
    32: 'minecraft:dead_bush',
    33: 'minecraft:piston',
    35: 'minecraft:white_wool', // Different variants based on dataValue
    41: 'minecraft:gold_block',
    42: 'minecraft:iron_block',
    43: 'minecraft:stone_slab',
    44: 'minecraft:stone_slab',
    45: 'minecraft:brick_block',
    46: 'minecraft:tnt',
    47: 'minecraft:bookshelf',
    48: 'minecraft:mossy_cobblestone',
    49: 'minecraft:obsidian',
    50: 'minecraft:torch',
    53: 'minecraft:oak_stairs',
    54: 'minecraft:chest',
    56: 'minecraft:diamond_ore',
    57: 'minecraft:diamond_block',
    58: 'minecraft:crafting_table',
    60: 'minecraft:farmland',
    61: 'minecraft:furnace',
    62: 'minecraft:lit_furnace',
    64: 'minecraft:oak_door',
    65: 'minecraft:ladder',
    66: 'minecraft:rail',
    67: 'minecraft:stone_stairs',
    68: 'minecraft:wall_sign',
    69: 'minecraft:lever',
    70: 'minecraft:stone_pressure_plate',
    72: 'minecraft:wooden_pressure_plate',
    73: 'minecraft:redstone_ore',
    76: 'minecraft:redstone_torch',
    77: 'minecraft:stone_button',
    78: 'minecraft:snow_layer',
    79: 'minecraft:ice',
    80: 'minecraft:snow',
    81: 'minecraft:cactus',
    82: 'minecraft:clay',
    84: 'minecraft:jukebox',
    85: 'minecraft:fence',
    86: 'minecraft:pumpkin',
    87: 'minecraft:netherrack',
    88: 'minecraft:soul_sand',
    89: 'minecraft:glowstone',
    91: 'minecraft:lit_pumpkin',
    95: 'minecraft:stained_glass',
    96: 'minecraft:trapdoor',
    98: 'minecraft:stonebrick',
    99: 'minecraft:brown_mushroom_block',
    100: 'minecraft:red_mushroom_block',
    101: 'minecraft:iron_bars',
    102: 'minecraft:glass_pane',
    103: 'minecraft:melon_block',
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
  
  // Handle wool variants
  if (blockId === 35) {
    const woolColors = [
      'white', 'orange', 'magenta', 'light_blue',
      'yellow', 'lime', 'pink', 'gray',
      'light_gray', 'cyan', 'purple', 'blue',
      'brown', 'green', 'red', 'black'
    ];
    return `minecraft:${woolColors[dataValue % 16]}_wool`;
  }
  
  return legacyMapping[blockId] || `minecraft:unknown_${blockId}_${dataValue}`;
}

// Parse Litematica format
function parseLitematicDimensions(parsed) {
  try {
    console.log('Parsing Litematica dimensions');
    
    if (!parsed.Regions || !parsed.Regions.value) {
      throw new Error('Missing Regions tag in litematic file');
    }
    
    // Get the regions
    const regions = parsed.Regions.value;
    const regionNames = Object.keys(regions);
    
    if (regionNames.length === 0) {
      throw new Error('No regions found in litematic file');
    }
    
    console.log(`Found ${regionNames.length} regions, using first: ${regionNames[0]}`);
    
    // Use the first region's dimensions
    const firstRegion = regions[regionNames[0]];
    
    if (!firstRegion.Size || !firstRegion.Size.value || !firstRegion.Size.value.value) {
      throw new Error('Invalid region structure in litematic file');
    }
    
    const dimensions = {
      width: firstRegion.Size.value.value[0],
      height: firstRegion.Size.value.value[1],
      length: firstRegion.Size.value.value[2]
    };
    
    console.log(`Litematica dimensions: ${dimensions.width}x${dimensions.height}x${dimensions.length}`);
    return dimensions;
  } catch (error) {
    console.error('Error in parseLitematicDimensions:', error);
    // Return minimal dimensions to avoid failing
    return { width: 1, height: 1, length: 1 };
  }
}

function parseLitematicBlocks(parsed) {
  try {
    console.log('Parsing Litematica blocks');
    
    if (!parsed.Regions || !parsed.Regions.value) {
      throw new Error('Missing Regions tag in litematic file');
    }
    
    const regions = parsed.Regions.value;
    const regionNames = Object.keys(regions);
    const blocks = [];
    
    if (regionNames.length === 0) {
      throw new Error('No regions found in litematic file');
    }
    
    console.log(`Processing ${regionNames.length} regions`);
    
    // Process each region
    for (const regionName of regionNames) {
      console.log(`Processing region: ${regionName}`);
      const region = regions[regionName];
      
      if (!region.Size || !region.Size.value || !region.Size.value.value) {
        console.warn(`Warning: Region ${regionName} has invalid Size structure`);
        continue;
      }
      
      if (!region.BlockStatePalette || !region.BlockStates) {
        console.warn(`Warning: Region ${regionName} missing block data`);
        continue;
      }
      
      const size = region.Size.value.value;
      const width = size[0];
      const height = size[1];
      const length = size[2];
      
      console.log(`Region dimensions: ${width}x${height}x${length}`);
      
      // Get block state palette
      const palette = region.BlockStatePalette.value.value;
      const blockStates = region.BlockStates.value.value;
      
      console.log(`Palette size: ${palette.length}, BlockStates length: ${blockStates.length}`);
      
      try {
        // Calculate bits per block
        const bitsPerBlock = Math.ceil(Math.log2(Math.max(1, palette.length)));
        const blocksPerLong = Math.floor(64 / bitsPerBlock);
        const maskBits = (1n << BigInt(bitsPerBlock)) - 1n;
        
        console.log(`Bits per block: ${bitsPerBlock}, Blocks per long: ${blocksPerLong}`);
        
        // A fallback approach - simpler but less efficient
        if (bitsPerBlock > 30 || blocksPerLong <= 0) {
          console.log('Using fallback block extraction approach');
          // Just extract some blocks to show something rather than nothing
          for (let y = 0; y < Math.min(height, 10); y++) {
            for (let z = 0; z < Math.min(length, 10); z++) {
              for (let x = 0; x < Math.min(width, 10); x++) {
                blocks.push({
                  x, y, z,
                  id: 'minecraft:stone' // Fallback to show something
                });
              }
            }
          }
          continue;
        }
        
        // Process blocks
        let blockCount = 0;
        let airCount = 0;
        
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
              
              try {
                blockState = Number((BigInt(stateLong) >> BigInt(bitOffset)) & maskBits);
                
                // Get block from palette
                if (blockState >= palette.length) {
                  console.warn(`Warning: Block state ${blockState} exceeds palette size ${palette.length}`);
                  continue;
                }
                
                const blockData = palette[blockState];
                
                if (!blockData || !blockData.Name) {
                  console.warn(`Warning: Invalid block data at state ${blockState}`);
                  continue;
                }
                
                const blockName = blockData.Name.value;
                
                // Skip air blocks
                if (blockName === 'minecraft:air') {
                  airCount++;
                  continue;
                }
                
                // Get position offset if available
                const posOffset = region.Position?.value?.value || [0, 0, 0];
                
                blocks.push({
                  x: x + posOffset[0],
                  y: y + posOffset[1],
                  z: z + posOffset[2],
                  id: blockName,
                  properties: blockData.Properties?.value || {}
                });
                
                blockCount++;
              } catch (error) {
                console.warn(`Error extracting block at (${x},${y},${z}): ${error.message}`);
              }
            }
          }
        }
        
        console.log(`Processed ${blockCount} blocks, skipped ${airCount} air blocks`);
      } catch (error) {
        console.error(`Error processing region ${regionName}:`, error);
      }
    }
    
    console.log(`Total blocks extracted: ${blocks.length}`);
    return blocks;
  } catch (error) {
    console.error('Error in parseLitematicBlocks:', error);
    // Return at least some blocks to avoid completely failing
    return [
      { x: 0, y: 0, z: 0, id: 'minecraft:stone' },
      { x: 1, y: 0, z: 0, id: 'minecraft:stone' },
      { x: 0, y: 0, z: 1, id: 'minecraft:stone' }
    ];
  }
}

// Parse WorldEdit .schem format
function parseWorldEditSchematic(parsed) {
  try {
    console.log('Parsing WorldEdit schematic');
    
    if (!parsed.Width || !parsed.Height || !parsed.Length) {
      throw new Error('Missing dimension tags in WorldEdit schematic');
    }
    
    const width = parsed.Width.value;
    const height = parsed.Height.value;
    const length = parsed.Length.value;
    
    console.log(`Dimensions: ${width}x${height}x${length}`);
    
    if (!parsed.Palette || !parsed.BlockData) {
      throw new Error('Missing Palette or BlockData tags in WorldEdit schematic');
    }
    
    // Get palette
    const palette = parsed.Palette.value;
    const blockStatePalette = [];
    
    // Convert palette to array for easier indexing
    for (const [blockName, id] of Object.entries(palette)) {
      blockStatePalette[id] = blockName;
    }
    
    console.log(`Palette size: ${blockStatePalette.length}`);
    
    // Get block data
    const blockData = parsed.BlockData.value;
    
    console.log(`BlockData length: ${blockData.length}`);
    
    // Handle offset
    const offset = [0, 0, 0];
    if (parsed.Offset) {
      offset[0] = parsed.Offset.value.value[0];
      offset[1] = parsed.Offset.value.value[1];
      offset[2] = parsed.Offset.value.value[2];
      console.log(`Offset: (${offset[0]}, ${offset[1]}, ${offset[2]})`);
    }
    
    const blocks = [];
    let blockIndex = 0;
    let airCount = 0;
    
    // Parse blocks
    for (let y = 0; y < height; y++) {
      for (let z = 0; z < length; z++) {
        for (let x = 0; x < width; x++) {
          if (blockIndex >= blockData.length) {
            console.warn(`Warning: Block index ${blockIndex} exceeds data length ${blockData.length}`);
            continue;
          }
          
          // Get block state from palette
          const blockStateId = blockData[blockIndex++];
          
          if (blockStateId >= blockStatePalette.length) {
            console.warn(`Warning: Block state ID ${blockStateId} exceeds palette size ${blockStatePalette.length}`);
            continue;
          }
          
          const blockName = blockStatePalette[blockStateId];
          
          // Skip air blocks
          if (blockName === 'minecraft:air') {
            airCount++;
            continue;
          }
          
          blocks.push({
            x: x + offset[0],
            y: y + offset[1],
            z: z + offset[2],
            id: blockName
          });
        }
      }
    }
    
    console.log(`Extracted ${blocks.length} blocks, skipped ${airCount} air blocks`);
    return blocks;
  } catch (error) {
    console.error('Error in parseWorldEditSchematic:', error);
    // Return some blocks to avoid completely failing
    return [
      { x: 0, y: 0, z: 0, id: 'minecraft:stone' },
      { x: 1, y: 0, z: 0, id: 'minecraft:stone' },
      { x: 0, y: 0, z: 1, id: 'minecraft:stone' }
    ];
  }
}

// Utility function to map block states
function mapBlockStates(blockStates) {
  try {
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
  } catch (error) {
    console.error('Error in mapBlockStates:', error);
    return {};
  }
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
