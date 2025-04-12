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
  
  if (!fs.existsSync(filePath)) {
    console.error(`Error: File '${filePath}' does not exist.`);
    process.exit(1);
  }

  try {
    console.log(`Testing parsing of: ${filePath}`);
    console.log(`File size: ${(fs.statSync(filePath).size / 1024).toFixed(2)} KB`);
    
    // First, try the direct parsing approach
    console.log('\n=== DIRECT PARSING TEST ===');
    
    console.time('Parsing time');
    try {
      const { dimensions, blocks } = await parseLitematicFile(filePath);
      
      console.log('\nParsing results:');
      console.log(`Dimensions: ${dimensions.width}x${dimensions.height}x${dimensions.length}`);
      console.log(`Total blocks extracted: ${blocks.length}`);
      
      if (blocks.length > 0) {
        console.log('\nSample blocks:');
        blocks.slice(0, 5).forEach(block => console.log(block));
        
        // Count block types
        const blockTypes = {};
        blocks.forEach(block => {
          blockTypes[block.id] = (blockTypes[block.id] || 0) + 1;
        });
        
        console.log('\nBlock type distribution:');
        Object.entries(blockTypes)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 10)
          .forEach(([type, count]) => {
            console.log(`${type}: ${count} (${(count / blocks.length * 100).toFixed(1)}%)`);
          });
      }
    } catch (error) {
      console.error('\nError during parsing:', error);
    }
    console.timeEnd('Parsing time');
    
    // Next, try dumping the raw NBT structure for analysis
    console.log('\n=== NBT STRUCTURE ANALYSIS ===');
    try {
      console.time('NBT Analysis');
      const fileBuffer = fs.readFileSync(filePath);
      
      // Try to decompress if it might be gzipped
      let dataBuffer;
      try {
        const zlib = require('zlib');
        dataBuffer = zlib.gunzipSync(fileBuffer);
        console.log('File was successfully decompressed with gzip');
      } catch (e) {
        // If decompression fails, use the original buffer
        dataBuffer = fileBuffer;
        console.log('File does not appear to be gzipped');
      }
      
      const { parsed } = await nbt.parse(dataBuffer);
      
      // Output the first level structure for analysis
      console.log('\nNBT Root Structure:');
      try {
        Object.keys(parsed).forEach(key => {
          const value = parsed[key];
          if (value && value.type) {
            console.log(`${key}: ${value.type}`);
            
            // If it's a compound, show nested keys
            if (value.type === 'compound' && value.value) {
              console.log(`  Keys inside ${key}: [${Object.keys(value.value).join(', ')}]`);
            }
          } else {
            console.log(`${key}: ${typeof value}`);
          }
        });
        
        // Check for special keys that might indicate the format version
        if (parsed.Version) {
          console.log(`\nVersion found: ${parsed.Version.value}`);
        }
        if (parsed.MinecraftDataVersion) {
          console.log(`Minecraft Data Version: ${parsed.MinecraftDataVersion.value}`);
        }
        if (parsed.Metadata && parsed.Metadata.value.EnclosingSize) {
          const size = parsed.Metadata.value.EnclosingSize.value;
          console.log('Enclosing Size found:');
          console.log(size);
        }
        
        // Check for regions
        if (parsed.Regions && parsed.Regions.value) {
          const regions = parsed.Regions.value;
          console.log(`\nFound ${Object.keys(regions).length} regions:`);
          Object.keys(regions).forEach(regionName => {
            console.log(`- ${regionName}`);
          });
        }
      } catch (error) {
        console.error('Error analyzing NBT structure:', error);
      }
      
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
          const result = [];
          for (let i = 0; i < Math.min(obj.length, 1000); i++) {
            result.push(sanitizeForJSON(obj[i], seen));
          }
          if (obj.length > 1000) {
            result.push(`... and ${obj.length - 1000} more items`);
          }
          return result;
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
      console.timeEnd('NBT Analysis');
    } catch (error) {
      console.error('\nError during NBT analysis:', error);
    }
    
    console.log('\nTest completed!');
    
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

main().catch(console.error);
