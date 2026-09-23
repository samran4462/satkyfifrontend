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
      
      // Simple heuristic: if a className has both bg-electric and text-white, replace text-white with text-black
      content = content.replace(/className="([^"]*bg-electric[^"]*text-white[^"]*)"/g, (match, p1) => {
         return `className="${p1.replace(/text-white/g, 'text-black')}"`;
      });

      if (content !== originalContent) {
        console.log(`Updated ${fullPath}`);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('e:/BlockChain Project/Stakyfi project/frontend/src');
console.log('Done');
