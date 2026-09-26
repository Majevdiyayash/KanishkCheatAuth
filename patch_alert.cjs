const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
    "if (!newUsername.trim() || !newPassword || !selectedAppId) return;",
    "if (!selectedAppId) { alert('Please create or select an App first from the Overview tab!'); return; }\n    if (!newUsername.trim() || !newPassword) { alert('Username and Password are required.'); return; }"
);

fs.writeFileSync(file, content, 'utf8');
