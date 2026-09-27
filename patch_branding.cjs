const fs = require('fs');
const path = require('path');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let original = content;

  // Replacements
  content = content.replace(/FEARAUTH ENTERPRISE/g, 'KANISHK CHEAT AUTH ENTERPRISE');
  content = content.replace(/FEARAUTH/g, 'KANISHK CHEAT AUTH');
  content = content.replace(/FearAuthApp/g, 'KanishkAuthApp');
  content = content.replace(/FearAuth/g, 'KanishkAuth');
  content = content.replace(/fearauth/g, 'kanishkauth');
  content = content.replace(/Fear Auth/g, 'Kanishk Auth');

  content = content.replace(/INNOVATOR CHEAT/g, 'KANISHK CHEAT');
  content = content.replace(/Innovator Cheat/g, 'Kanishk Cheat');
  content = content.replace(/innovatorcheat/g, 'kanishkcheat');
  content = content.replace(/INNOVATOR/g, 'KANISHK CHEAT');
  content = content.replace(/Innovator/g, 'Kanishk Cheat');
  content = content.replace(/innovator/g, 'kanishkcheat');
  content = content.replace(/inovaaters/g, 'kanishkcheat');

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
    } else if (/\.(ts|tsx|js|jsx|cs|html|json|md|py|c|cpp|hpp|h|rs|go|java|kt|swift|php|lua|dart|rb)$/i.test(file)) {
      replaceInFile(fullPath);
    }
  }
}

console.log('Starting branding replacement...');
scanDir('E:\\KANISH CHEAT GITHUB\\src');
scanDir('E:\\KANISH CHEAT GITHUB\\server');
replaceInFile('E:\\KANISH CHEAT GITHUB\\index.html');
console.log('Branding replacement complete!');
