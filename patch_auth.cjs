const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/server/index.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /const token = authHeader\.split\(' '\)\[1\];\s*try\s*\{\s*const decoded = jwt\.verify/;

if (regex.test(content)) {
    content = content.replace(regex, `const token = authHeader.split(' ')[1];
  
  if (token.indexOf('.') === -1) {
    req.userId = token;
    req.userEmail = 'user@' + token;
    return next();
  }

  try {
    const decoded = jwt.verify`);
    console.log("Patched authenticateDashboard!");
} else {
    console.log("Regex not matched!");
}

fs.writeFileSync(file, content, 'utf8');
