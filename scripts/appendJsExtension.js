import  fs from 'fs';
import path from 'path';
function appendJsExtension(dir) {
const files = fs.readdirSync(dir);

files.forEach(file => {
  const filePath = path.join(dir, file);
  const stat = fs.lstatSync(filePath);

  if (stat.isDirectory()) {
    appendJsExtension(filePath);  // Recursively process directories
  } else if (file.endsWith('.js') || file.endsWith('.d.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    
    // Regular expression to match import and export from paths, but exclude ones that already have a .js or other extensions
    content = content.replace(/(import\s.*?['"]|export\s.*?from\s+['"])(\..*?)(?<!\.js)(['"])/g, (match, p1, p2, p3) => {
      const newPath = p2 + '.js';
      const fullPath = path.resolve(path.dirname(filePath), newPath);
      if (fs.existsSync(fullPath)) {
        return p1 + newPath + p3;
      } else {
        return match; // Leave unchanged if file doesn't exist
      }
    });
    
    fs.writeFileSync(filePath, content, 'utf8');
  }
});
}
// Process the 'dist' directory (or your compiled output directory)
appendJsExtension('./dist');