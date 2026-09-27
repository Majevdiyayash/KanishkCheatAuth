const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/FEARAUTH ENTERPRISE/g, 'KANISHK CHEAT AUTH ENTERPRISE');
  content = content.replace(/FEARAUTH/g, 'KANISHK CHEAT AUTH');
  content = content.replace(/FearAuthApp/g, 'KanishkAuthApp');
  content = content.replace(/FearAuth/g, 'KanishkAuth');
  content = content.replace(/fearauth/g, 'kanishkauth');
  content = content.replace(/Fear Auth/g, 'Kanishk Auth');

  content = content.replace(/INNOVATOR CHEATS/gi, 'KANISHK CHEAT');
  content = content.replace(/INNOVATOR AUTH/gi, 'KANISHK CHEAT AUTH');
  content = content.replace(/INNOVATOR KEYAUTH/gi, 'KANISHK CHEAT AUTH');
  content = content.replace(/INNOVATOR/gi, 'KANISHK CHEAT');
  content = content.replace(/Innovator/gi, 'Kanishk Cheat');
  content = content.replace(/innovator/gi, 'kanishkcheat');
  content = content.replace(/inovaaters/gi, 'kanishkcheat');

  if (content !== original) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated: ${filePath}`);
  }
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    if (file === 'node_modules' || file === 'dist' || file === '.git') continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      scanDir(fullPath);
    } else {
      replaceInFile(fullPath);
    }
  }
}

console.log('Starting total project branding replacement...');
scanDir('E:\\KANISH CHEAT GITHUB\\src');
scanDir('E:\\KANISH CHEAT GITHUB\\server');
scanDir('E:\\KANISH CHEAT GITHUB\\public');
replaceInFile('E:\\KANISH CHEAT GITHUB\\index.html');
replaceInFile('E:\\KANISH CHEAT GITHUB\\.env');
replaceInFile('E:\\KANISH CHEAT GITHUB\\.env.example');
replaceInFile('E:\\KANISH CHEAT GITHUB\\render.yaml');
replaceInFile('E:\\KANISH CHEAT GITHUB\\run_dev.bat');
console.log('Total project branding replacement complete!');
