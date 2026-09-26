const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /const fetchUsers = async \(\) => \{[\s\S]*?setLoadingUsers\(false\);\s*\}\s*\};/;
const match = content.match(regex);
if (match) {
    const newFetch = `const fetchUsers = async () => {
    if (!selectedAppId) return;
    setLoadingUsers(true);
    try {
      const res = await fetch(\`/api/dashboard/users?appId=\${selectedAppId}\`, {
        headers: { Authorization: \`Bearer \${token}\` }
      });
      const data = await res.json();
      if (data.success) {
        setAppUsers(data.users);
      } else {
        const q = query(collection(db, 'app_users'), where('appId', '==', selectedAppId));
        const snapshot = await getDocs(q);
        setAppUsers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AppUser)));
      }
    } catch (e) {
      console.error('[fetchUsers error]:', e);
    } finally {
      setLoadingUsers(false);
    }
  };`;
    content = content.replace(regex, newFetch);
    fs.writeFileSync(file, content, 'utf8');
    console.log("Patched fetchUsers with regex!");
} else {
    console.log("Regex didn't match fetchUsers");
}
