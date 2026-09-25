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
      
      content = content.replace(/0xe74773D89650346293e09f607A8cCfcD2f4c4eab/g, '0x77D4Dd6149733845B0559f09fa798e07215d760C');
      content = content.replace(/STAKY/g, 'AURA');

      if (content !== originalContent) {
        console.log(`Updated ${fullPath}`);
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

processDir('e:/BlockChain Project/Stakyfi project/frontend/src');
console.log('Done');
