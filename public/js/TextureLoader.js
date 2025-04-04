// TextureLoader.js - Helper class for loading and managing Minecraft textures

class MinecraftTextureLoader {
  constructor() {
    this.textureCache = new Map();
    this.atlasTexture = null;
    this.atlasMapping = null;
    this.textureLoader = new THREE.TextureLoader();
  }
  
  async loadAtlas() {
    try {
      // For development, create a mock atlas mapping if the real one isn't available
      this.createMockAtlasMapping();
      return true;
    } catch (error) {
      console.warn('Failed to load texture atlas:', error);
      return false;
    }
  }
  
  // Creates a simple color-based mock mapping for testing
  createMockAtlasMapping() {
    this.atlasMapping = {
      'minecraft:stone': { color: 0x888888 },
      'minecraft:dirt': { color: 0x8B4513 },
      'minecraft:grass_block': { color: 0x567D46 },
      'minecraft:oak_log': { color: 0x6D5032 },
      'minecraft:oak_planks': { color: 0xC8AD7F },
      'minecraft:sand': { color: 0xE9DAB2 },
      'minecraft:gravel': { color: 0x777777 },
      'minecraft:glass': { color: 0xC0F0F0, transparent: true },
      'minecraft:cobblestone': { color: 0x666666 },
      'minecraft:bedrock': { color: 0x444444 },
      'minecraft:water': { color: 0x3D50CD, transparent: true },
      'minecraft:lava': { color: 0xFF5400 },
      'minecraft:coal_ore': { color: 0x777777 },
      'minecraft:iron_ore': { color: 0xDDCCB5 },
      'minecraft:gold_ore': { color: 0xFCEE4B },
      'minecraft:diamond_ore': { color: 0x5DECF5 },
      'minecraft:redstone_ore': { color: 0xFF0000 },
      'minecraft:oak_leaves': { color: 0x2E502E, transparent: true }
    };
  }
  
  // Create materials for a block based on its color
  createMaterialsFromColor(blockId) {
    const mapping = this.atlasMapping[blockId] || { color: 0xAAAAAA };
    
    const material = new THREE.MeshLambertMaterial({ 
      color: mapping.color,
      transparent: mapping.transparent || false,
      opacity: mapping.transparent ? 0.8 : 1
    });
    
    return material;
  }
  
  // Get a color for a block type
  getBlockColor(blockId) {
    // Check if we have this block in our mapping
    if (this.atlasMapping && this.atlasMapping[blockId]) {
      return this.createMaterialsFromColor(blockId);
    }
    
    // Handle wood/plank variants
    if (blockId.includes('_planks')) {
      return this.createMaterialsFromColor('minecraft:oak_planks');
    }
    
    // Handle log variants
    if (blockId.includes('_log')) {
      return this.createMaterialsFromColor('minecraft:oak_log');
    }
    
    // Handle leaf variants
    if (blockId.includes('_leaves')) {
      return this.createMaterialsFromColor('minecraft:oak_leaves');
    }
    
    // Default color
    return new THREE.MeshLambertMaterial({ color: 0xAAAAAA });
  }
}
