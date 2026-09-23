const fs = require('fs');
const path = require('path');

function processDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      processDir(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      content = content.replace(/rgba\(124,58,237/g, 'rgba(234,179,8');
      content = content.replace(/rgba\(139,92,246/g, 'rgba(234,179,8');
      content = content.replace(/rgba\(34,211,238/g, 'rgba(234,179,8');

      if (content !== originalContent) {
        console.log(`Updated shadows in ${fullPath}`);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('e:/BlockChain Project/Stakyfi project/frontend/src');
console.log('Done');
