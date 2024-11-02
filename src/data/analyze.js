const fs = require('fs');

// Read both files
const file1Content = fs.readFileSync('entitiesWithIcons-old.js', 'utf8');
const file2Content = fs.readFileSync('entitiesWithIcons-new.js', 'utf8');

// Function to extract keys from the content
function extractKeys(content) {
    // Match all lines that have a key followed by : true
    const keyPattern = /'([^']+)'\s*:\s*true/g;
    const matches = [...content.matchAll(keyPattern)];
    return new Set(matches.map(match => match[1]));
}

// Extract keys from both files
const keysOld = extractKeys(file1Content);
const keysNew = extractKeys(file2Content);

// Find keys that are in the new file but not in the old file
const uniqueToNew = [...keysNew].filter(key => !keysOld.has(key));

// Sort alphabetically for easier reading
uniqueToNew.sort();

console.log("Keys that exist only in the new file:");
console.log("\nTotal number of unique keys:", uniqueToNew.length);
console.log("\nHere are the new keys:\n");
uniqueToNew.forEach(key => console.log(`'${key}'`));
