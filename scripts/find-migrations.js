import fs from 'fs';
import path from 'path';

// Find the actual location of SQL files
function findSqlFiles(searchDir, depth = 0, maxDepth = 5) {
  if (depth > maxDepth) return [];
  
  const files = [];
  try {
    const entries = fs.readdirSync(searchDir);
    for (const entry of entries) {
      const fullPath = path.join(searchDir, entry);
      const stat = fs.statSync(fullPath);
      
      if (stat.isFile() && entry.endsWith('.sql')) {
        files.push(fullPath);
      } else if (stat.isDirectory() && entry !== 'node_modules' && !entry.startsWith('.')) {
        files.push(...findSqlFiles(fullPath, depth + 1, maxDepth));
      }
    }
  } catch (err) {
    // Skip unreadable directories
  }
  
  return files;
}

console.log('Current directory:', process.cwd());
console.log('\nSearching for SQL files...\n');

// Search from root
const found = findSqlFiles('/');
const migrationFiles = found.filter(f => 
  f.includes('001_core_schema') || 
  f.includes('002_impact_schema') || 
  f.includes('003_falak_schema')
).sort();

if (migrationFiles.length > 0) {
  console.log('Found migration files:');
  migrationFiles.forEach(f => {
    const size = fs.statSync(f).size;
    console.log(`  ${f} (${size} bytes)`);
  });
} else {
  console.log('No migration files found matching the pattern.');
  console.log('\nAll SQL files found:');
  const allSql = found.slice(0, 20);
  allSql.forEach(f => console.log(`  ${f}`));
  if (found.length > 20) {
    console.log(`  ... and ${found.length - 20} more`);
  }
}
