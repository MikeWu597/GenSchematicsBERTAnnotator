/**
 * Test script for litematica parsing
 * Usage: node test-litematica.js path/to/your/file.litematic
 */

const fs = require('fs');
const path = require('path');
const { parseLitematicFile, logNbtStructure } = require('./parsers/litematica-parser');
const nbt = require('prismarine-nbt');

async function main() {
  // Get file path from command line argument
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: node test-litematica.js path/to/your/file.litematic');
    process.exit(1);
  }
  
  try {
    console.log(`Testing parsing of: ${filePath}`);
    
    // First, try the direct parsing approach
    console.log('\n=== DIRECT PARSING TEST ===');
    const { dimensions, blocks } = await parseLitematicFile(filePath);
    
    console.log('\nParsing results:');
    console.log(`Dimensions: ${dimensions.width}x${dimensions.height}x${dimensions.length}`);
    console.log(`Total blocks extracted: ${blocks.length}`);
    
    if (blocks.length > 0) {
      console.log('\nSample blocks:');
      blocks.slice(0, 5).forEach(block => console.log(block));
    }
    
    // Next, try dumping the raw NBT structure for analysis
    console.log('\n=== NBT STRUCTURE ANALYSIS ===');
    const fileBuffer = fs.readFileSync(filePath);
    const { parsed } = await nbt.parse(fileBuffer);
    
    // Output the first level structure for analysis
    console.log('\nNBT Root Structure:');
    Object.keys(parsed).forEach(key => {
      const value = parsed[key];
      if (value && value.type) {
        console.log(`${key}: ${value.type}`);
      } else {
        console.log(`${key}: ${typeof value}`);
      }
    });
    
    // Save a deep JSON representation for further analysis
    const outputPath = path.join(
      path.dirname(filePath),
      `${path.basename(filePath, path.extname(filePath))}_nbt_analysis.json`
    );
    
    // Function to sanitize circular references for JSON
    function sanitizeForJSON(obj, seen = new WeakSet()) {
      if (obj === null || obj === undefined) return obj;
      if (typeof obj !== 'object') return obj;
      if (seen.has(obj)) return '[Circular]';
      
      seen.add(obj);
      
      // Handle arrays
      if (Array.isArray(obj)) {
        return obj.map(item => sanitizeForJSON(item, seen));
      }
      
      // Handle objects
      const result = {};
      for (const key in obj) {
        try {
          // Skip function properties
          if (typeof obj[key] === 'function') continue;
          
          // Handle BigInt (convert to string)
          if (typeof obj[key] === 'bigint') {
            result[key] = obj[key].toString();
          } else {
            result[key] = sanitizeForJSON(obj[key], seen);
          }
        } catch (error) {
          result[key] = `[Error: ${error.message}]`;
        }
      }
      return result;
    }
    
    // Convert NBT to sanitized object and save to file
    try {
      const sanitized = sanitizeForJSON(parsed);
      fs.writeFileSync(outputPath, JSON.stringify(sanitized, null, 2));
      console.log(`\nDetailed NBT structure saved to: ${outputPath}`);
    } catch (error) {
      console.error('Error saving NBT analysis:', error);
    }
    
    console.log('\nTest completed successfully!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

main().catch(console.error);
