const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/server/index.ts';
let content = fs.readFileSync(file, 'utf8');

const regex = /app\.post\('\/api\/dashboard\/users'/g;
const matches = [...content.matchAll(regex)];
console.log(`Found ${matches.length} matches for POST /api/dashboard/users`);
