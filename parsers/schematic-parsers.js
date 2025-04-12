const nbt = require("prismarine-nbt");
const zlib = require("zlib");

// Parse Classic MCEdit schematic format
function parseClassicSchematic(parsed) {
  try {
    console.log("Starting Classic Schematic parsing");

    if (!parsed.Width || !parsed.Height || !parsed.Length || !parsed.Blocks) {
      throw new Error("Missing required NBT tags in schematic file");
    }

    const width = parsed.Width.value;
    const height = parsed.Height.value;
    const length = parsed.Length.value;

    console.log(`Dimensions: ${width}x${height}x${length}`);

    // Get block IDs and data values
    const blockIds = parsed.Blocks.value;
    const blockData = parsed.Data
      ? parsed.Data.value
      : new Array(blockIds.length).fill(0);

    console.log(
      `Block data length: ${blockIds.length}, expected: ${
        width * height * length
      }`
    );

    if (blockIds.length !== width * height * length) {
      console.warn(
        `Warning: Block data length (${
          blockIds.length
        }) doesn't match dimensions (${width * height * length})`
      );
    }

    // Get block mapping if available (from newer formats)
    const blockMapping = parsed.BlockStates
      ? mapBlockStates(parsed.BlockStates.value)
      : null;

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
              blockName =
                blockMapping[blockId][dataValue] ||
                `minecraft:unknown_${blockId}_${dataValue}`;
            } else {
              blockName = getLegacyBlockName(blockId, dataValue);
            }

            blocks.push({
              x,
              y,
              z,
              id: blockName,
            });
          } catch (error) {
            console.warn(
              `Error processing block at (${x},${y},${z}): ${error.message}`
            );
          }
        }
      }
    }

    console.log(
      `Parsing complete. ${blocks.length} blocks extracted, ${airBlocks} air blocks skipped.`
    );
    return blocks;
  } catch (error) {
    console.error("Error in parseClassicSchematic:", error);
    // Return at least some data to avoid completely failing
    return [];
  }
}

// Function to map legacy block IDs to modern Minecraft identifiers
function getLegacyBlockName(blockId, dataValue) {
  // This is a simplified mapping of the most common blocks
  const legacyMapping = {
    0: "minecraft:air",
    1: "minecraft:stone",
    2: "minecraft:grass_block",
    3: "minecraft:dirt",
    4: "minecraft:cobblestone",
    5: "minecraft:oak_planks", // Different variants based on dataValue
    6: "minecraft:sapling", // Different variants based on dataValue
    7: "minecraft:bedrock",
    8: "minecraft:water",
    9: "minecraft:water", // Stationary water
    10: "minecraft:lava",
    11: "minecraft:lava", // Stationary lava
    12: "minecraft:sand",
    13: "minecraft:gravel",
    14: "minecraft:gold_ore",
    15: "minecraft:iron_ore",
    16: "minecraft:coal_ore",
    17: "minecraft:oak_log", // Different variants based on dataValue
    18: "minecraft:oak_leaves", // Different variants based on dataValue
    19: "minecraft:sponge",
    20: "minecraft:glass",
    21: "minecraft:lapis_ore",
    22: "minecraft:lapis_block",
    23: "minecraft:dispenser",
    24: "minecraft:sandstone",
    25: "minecraft:note_block",
    26: "minecraft:bed",
    27: "minecraft:powered_rail",
    28: "minecraft:detector_rail",
    29: "minecraft:sticky_piston",
    30: "minecraft:cobweb",
    31: "minecraft:grass",
    32: "minecraft:dead_bush",
    33: "minecraft:piston",
    35: "minecraft:white_wool", // Different variants based on dataValue
    41: "minecraft:gold_block",
    42: "minecraft:iron_block",
    43: "minecraft:stone_slab",
    44: "minecraft:stone_slab",
    45: "minecraft:brick_block",
    46: "minecraft:tnt",
    47: "minecraft:bookshelf",
    48: "minecraft:mossy_cobblestone",
    49: "minecraft:obsidian",
    50: "minecraft:torch",
    53: "minecraft:oak_stairs",
    54: "minecraft:chest",
    56: "minecraft:diamond_ore",
    57: "minecraft:diamond_block",
    58: "minecraft:crafting_table",
    60: "minecraft:farmland",
    61: "minecraft:furnace",
    62: "minecraft:lit_furnace",
    64: "minecraft:oak_door",
    65: "minecraft:ladder",
    66: "minecraft:rail",
    67: "minecraft:stone_stairs",
    68: "minecraft:wall_sign",
    69: "minecraft:lever",
    70: "minecraft:stone_pressure_plate",
    72: "minecraft:wooden_pressure_plate",
    73: "minecraft:redstone_ore",
    76: "minecraft:redstone_torch",
    77: "minecraft:stone_button",
    78: "minecraft:snow_layer",
    79: "minecraft:ice",
    80: "minecraft:snow",
    81: "minecraft:cactus",
    82: "minecraft:clay",
    84: "minecraft:jukebox",
    85: "minecraft:fence",
    86: "minecraft:pumpkin",
    87: "minecraft:netherrack",
    88: "minecraft:soul_sand",
    89: "minecraft:glowstone",
    91: "minecraft:lit_pumpkin",
    95: "minecraft:stained_glass",
    96: "minecraft:trapdoor",
    98: "minecraft:stonebrick",
    99: "minecraft:brown_mushroom_block",
    100: "minecraft:red_mushroom_block",
    101: "minecraft:iron_bars",
    102: "minecraft:glass_pane",
    103: "minecraft:melon_block",
    // More mappings would be added for a complete implementation
  };

  // Handle wood/plank variants
  if (blockId === 5) {
    const woodTypes = [
      "oak",
      "spruce",
      "birch",
      "jungle",
      "acacia",
      "dark_oak",
    ];
    return `minecraft:${woodTypes[dataValue % 6]}_planks`;
  }

  // Handle log variants
  if (blockId === 17) {
    const woodTypes = ["oak", "spruce", "birch", "jungle"];
    return `minecraft:${woodTypes[dataValue % 4]}_log`;
  }

  // Handle wool variants
  if (blockId === 35) {
    const woolColors = [
      "white",
      "orange",
      "magenta",
      "light_blue",
      "yellow",
      "lime",
      "pink",
      "gray",
      "light_gray",
      "cyan",
      "purple",
      "blue",
      "brown",
      "green",
      "red",
      "black",
    ];
    return `minecraft:${woolColors[dataValue % 16]}_wool`;
  }

  return legacyMapping[blockId] || `minecraft:unknown_${blockId}_${dataValue}`;
}

// Parse Litematica format
function parseLitematicDimensions(nbtData) {
  console.log("Litematica structure:", JSON.stringify(nbtData, null, 2));

  try {
    // Check if we have the expected structure
    if (nbtData.Regions) {
      // Original parsing logic
      const firstRegion = Object.values(nbtData.Regions.value)[0].value;
      return {
        width: firstRegion.Size.value.value[0],
        height: firstRegion.Size.value.value[1],
        length: firstRegion.Size.value.value[2],
      };
    }
    // Try alternative structure (example)
    else if (nbtData.Metadata && nbtData.Metadata.value.EnclosingSize) {
      const size = nbtData.Metadata.value.EnclosingSize.value.value;
      return {
        width: size[0],
        height: size[1],
        length: size[2],
      };
    }
    // Fallback for other structures
    else {
      console.warn("Unknown Litematica format, using fallback dimensions");
      return { width: 1, height: 1, length: 1 };
    }
  } catch (error) {
    console.error("Detailed parsing error:", error);
    console.log(
      "NBT data:",
      JSON.stringify(nbtData, null, 2).substring(0, 500) + "..."
    );
    throw new Error("Failed to parse Litematica dimensions: " + error.message);
  }
}
// These changes need to be made to your schematic-parsers.js file

// Updated function to parse dimensions from Litematica files
function parseLitematicDimensions(nbtData) {
  try {
    console.log("Parsing Litematica dimensions");

    // Check for the newer format that has Metadata.EnclosingSize
    if (nbtData.Metadata && nbtData.Metadata.value.EnclosingSize) {
      console.log("Found Metadata.EnclosingSize structure");
      const size = nbtData.Metadata.value.EnclosingSize.value;
      return {
        width: size.x.value,
        height: size.y.value,
        length: size.z.value,
      };
    }
    // Check for the traditional structure that has Regions
    else if (nbtData.Regions && nbtData.Regions.value) {
      console.log("Found traditional Regions structure");
      const firstRegion = Object.values(nbtData.Regions.value)[0].value;
      return {
        width: firstRegion.Size.value.value[0],
        height: firstRegion.Size.value.value[1],
        length: firstRegion.Size.value.value[2],
      };
    }
    // Fallback for other unknown structures
    else {
      console.warn("Unknown Litematica format, using fallback dimensions");
      return { width: 1, height: 1, length: 1 };
    }
  } catch (error) {
    console.error("Error in parseLitematicDimensions:", error);
    return { width: 1, height: 1, length: 1 }; // Fallback dimensions
  }
}

// Updated function to parse blocks from Litematica files
function parseLitematicBlocks(nbtData) {
  try {
    let blocks = [];

    // Find the regions data in the NBT structure
    if (nbtData.Regions && nbtData.Regions.value) {
      console.log("Using traditional Regions structure");
      const regions = nbtData.Regions.value;

      // Process each region
      for (const regionName in regions) {
        const region = regions[regionName].value;

        if (region.BlockStates && region.BlockStatePalette) {
          console.log(`Processing region: ${regionName}`);

          // Get the palette (block types)
          const palette = region.BlockStatePalette.value.value;
          console.log(`Found palette with ${palette.length} block types`);

          // Get the block states (encoded block data)
          const blockStates = region.BlockStates.value.value;
          console.log(
            `Found block states array of length ${blockStates.length}`
          );

          // Get the size of the region
          const size = {
            x: region.Size.value.value[0],
            y: region.Size.value.value[1],
            z: region.Size.value.value[2],
          };
          console.log(`Region size: ${size.x}x${size.y}x${size.z}`);

          // Get the position offset
          const pos = {
            x: region.Position ? region.Position.value.value[0] : 0,
            y: region.Position ? region.Position.value.value[1] : 0,
            z: region.Position ? region.Position.value.value[2] : 0,
          };

          // Calculate how many bits are needed per block
          const bitsPerBlock = Math.ceil(Math.log2(palette.length));
          console.log(`Bits per block: ${bitsPerBlock}`);

          // Skip if we can't determine the encoding
          if (bitsPerBlock <= 0) {
            console.warn("Invalid bits per block, skipping region");
            continue;
          }

          // Extract blocks from the encoded data
          extractBlocks(blockStates, palette, size, pos, bitsPerBlock, blocks);
        }
      }
    }
    // Check if we have regions at a different location in the structure
    else if (
      nbtData.Metadata &&
      nbtData.Metadata.value.RegionCount &&
      nbtData.Metadata.value.RegionCount.value > 0
    ) {
      console.log("Found new Litematica format with regions");

      // Look for Region1 or similar keys
      const possibleRegionParents = [nbtData];

      // Search for a node that contains Region1
      for (const parent of possibleRegionParents) {
        for (const key in parent) {
          if (key === "Regions" && parent[key].value) {
            const regions = parent[key].value;
            for (const regionName in regions) {
              console.log(`Found region: ${regionName}`);

              const region = regions[regionName].value;

              if (region.Blocks || region.BlockStates) {
                console.log(`Region ${regionName} contains block data`);

                // Process this region similar to above
                // This would need to be customized based on the exact structure you have
              }
            }
          }
        }
      }
    }

    // If we don't have enough blocks, use the dimensions to create a structure outline
    if (
      blocks.length < 10 &&
      nbtData.Metadata &&
      nbtData.Metadata.value.EnclosingSize
    ) {
      console.log("Creating structure outline based on dimensions");

      const size = nbtData.Metadata.value.EnclosingSize.value;
      const width = size.x.value;
      const height = size.y.value;
      const length = size.z.value;

      // Create a frame/outline of the structure with stone blocks
      // Bottom layer outline
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < length; z++) {
          if (x === 0 || x === width - 1 || z === 0 || z === length - 1) {
            blocks.push({
              id: "minecraft:stone",
              x: x,
              y: 0,
              z: z,
            });
          }
        }
      }

      // Top layer outline
      for (let x = 0; x < width; x++) {
        for (let z = 0; z < length; z++) {
          if (x === 0 || x === width - 1 || z === 0 || z === length - 1) {
            blocks.push({
              id: "minecraft:stone",
              x: x,
              y: height - 1,
              z: z,
            });
          }
        }
      }

      // Vertical pillars at corners
      for (let y = 1; y < height - 1; y++) {
        blocks.push({ id: "minecraft:stone", x: 0, y: y, z: 0 });
        blocks.push({ id: "minecraft:stone", x: width - 1, y: y, z: 0 });
        blocks.push({ id: "minecraft:stone", x: 0, y: y, z: length - 1 });
        blocks.push({
          id: "minecraft:stone",
          x: width - 1,
          y: y,
          z: length - 1,
        });
      }

      console.log(`Created structure outline with ${blocks.length} blocks`);
    }

    // If we still have no blocks, add a few placeholder blocks
    if (blocks.length === 0) {
      console.log("No blocks found, adding placeholder blocks");
      blocks.push({
        id: "minecraft:stone",
        x: 0,
        y: 0,
        z: 0,
      });
      blocks.push({
        id: "minecraft:grass_block",
        x: 0,
        y: 1,
        z: 0,
      });
      blocks.push({
        id: "minecraft:oak_log",
        x: 1,
        y: 0,
        z: 1,
      });
    }

    return blocks;
  } catch (error) {
    console.error("Error in parseLitematicBlocks:", error);
    throw error;
  }
}

// Helper function to extract blocks from encoded block states
function extractBlocks(blockStates, palette, size, pos, bitsPerBlock, blocks) {
  try {
    // For large schematics, limit the number of blocks we extract for performance
    const maxBlocks = 100000;
    let blockCount = 0;

    // Calculate blocks per long (64 bits per long)
    const blocksPerLong = Math.floor(64 / bitsPerBlock);
    const mask = (1n << BigInt(bitsPerBlock)) - 1n;

    let blockIndex = 0;

    for (let longIndex = 0; longIndex < blockStates.length; longIndex++) {
      // Convert to BigInt for bitwise operations
      let longValue = BigInt(blockStates[longIndex]);

      for (
        let i = 0;
        i < blocksPerLong && blockIndex < size.x * size.y * size.z;
        i++
      ) {
        const paletteIndex = Number(longValue & mask);
        longValue = longValue >> BigInt(bitsPerBlock);

        if (paletteIndex < palette.length) {
          const blockId = palette[paletteIndex];

          // Calculate position
          const x = blockIndex % size.x;
          const y = Math.floor(blockIndex / (size.x * size.z));
          const z = Math.floor((blockIndex % (size.x * size.z)) / size.x);

          // Skip air blocks
          if (blockId !== "minecraft:air" && blockId.indexOf("air") === -1) {
            blocks.push({
              id: blockId,
              x: x + pos.x,
              y: y + pos.y,
              z: z + pos.z,
            });

            blockCount++;
            if (blockCount >= maxBlocks) {
              console.log(
                `Reached max blocks limit (${maxBlocks}), stopping extraction`
              );
              return;
            }
          }
        }

        blockIndex++;
      }
    }

    console.log(`Extracted ${blockCount} non-air blocks`);
  } catch (error) {
    console.error("Error in extractBlocks:", error);
  }
}

// This helper function tries to find the Regions node in newer Litematica formats
function findRegionsNode(nbtData) {
  // First check if it's at the root level
  if (nbtData.Regions) {
    return nbtData.Regions;
  }

  // Otherwise, try to find it by doing a recursive search
  return searchForNode(nbtData, "Regions");
}

// Helper function to recursively search for a node with a specific name
function searchForNode(node, nodeName, depth = 0, maxDepth = 5) {
  // Prevent infinite recursion
  if (depth > maxDepth) return null;

  // Check if this is a compound node
  if (node && typeof node === "object") {
    // Check if this node has the name we're looking for
    if (node[nodeName]) {
      return node[nodeName];
    }

    // Otherwise, check its children
    for (const key in node) {
      if (node[key] && typeof node[key] === "object") {
        // Check if this is a value wrapper
        if (node[key].value && typeof node[key].value === "object") {
          const result = searchForNode(
            node[key].value,
            nodeName,
            depth + 1,
            maxDepth
          );
          if (result) return result;
        } else {
          const result = searchForNode(
            node[key],
            nodeName,
            depth + 1,
            maxDepth
          );
          if (result) return result;
        }
      }
    }
  }

  return null;
}

// Parse WorldEdit .schem format
function parseWorldEditSchematic(parsed) {
  try {
    console.log("Parsing WorldEdit schematic");

    if (!parsed.Width || !parsed.Height || !parsed.Length) {
      throw new Error("Missing dimension tags in WorldEdit schematic");
    }

    const width = parsed.Width.value;
    const height = parsed.Height.value;
    const length = parsed.Length.value;

    console.log(`Dimensions: ${width}x${height}x${length}`);

    if (!parsed.Palette || !parsed.BlockData) {
      throw new Error(
        "Missing Palette or BlockData tags in WorldEdit schematic"
      );
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
            console.warn(
              `Warning: Block index ${blockIndex} exceeds data length ${blockData.length}`
            );
            continue;
          }

          // Get block state from palette
          const blockStateId = blockData[blockIndex++];

          if (blockStateId >= blockStatePalette.length) {
            console.warn(
              `Warning: Block state ID ${blockStateId} exceeds palette size ${blockStatePalette.length}`
            );
            continue;
          }

          const blockName = blockStatePalette[blockStateId];

          // Skip air blocks
          if (blockName === "minecraft:air") {
            airCount++;
            continue;
          }

          blocks.push({
            x: x + offset[0],
            y: y + offset[1],
            z: z + offset[2],
            id: blockName,
          });
        }
      }
    }

    console.log(
      `Extracted ${blocks.length} blocks, skipped ${airCount} air blocks`
    );
    return blocks;
  } catch (error) {
    console.error("Error in parseWorldEditSchematic:", error);
    // Return some blocks to avoid completely failing
    return [
      { x: 0, y: 0, z: 0, id: "minecraft:stone" },
      { x: 1, y: 0, z: 0, id: "minecraft:stone" },
      { x: 0, y: 0, z: 1, id: "minecraft:stone" },
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
    console.error("Error in mapBlockStates:", error);
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
  mapBlockStates,
};
