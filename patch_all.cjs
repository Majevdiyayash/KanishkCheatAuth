const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Add auth import
if (!content.includes("import { auth }")) {
    content = content.replace("import React,", "import { auth } from '../firebase/config';\nimport React,");
}

// 2. Add onOpenAdmin to props
content = content.replace(
    "export const Dashboard: React.FC<DashboardProps & { onUpgrade?: () => void }> = ({ token, onLogout, onUpgrade }) => {",
    "export const Dashboard: React.FC<DashboardProps & { onUpgrade?: () => void; onOpenAdmin?: () => void }> = ({ token, onLogout, onUpgrade, onOpenAdmin }) => {"
);

// 3. Add Admin Panel Button
const adminBtn = `          {/* Admin panel button */}
          {(token === "o08jDiopRZWaPffBCQGFCHFyhH83" || (auth && auth.currentUser && auth.currentUser.email && (auth.currentUser.email.includes("innovatorcheats") || auth.currentUser.email === "yashmajevadiya456@gmail.com"))) && (
            <button 
              onClick={onOpenAdmin || (() => window.open("/admin.html", "_blank"))}
              className="w-full mb-3 flex items-center justify-center space-x-2 p-3 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 rounded-xl text-red-400 font-bold transition-all"
            >
              <Settings className="w-5 h-5" />
              <span>Global Admin Panel</span>
            </button>
          )}

`;
if (!content.includes("Global Admin Panel")) {
    content = content.replace("          {onUpgrade && (", adminBtn + "          {onUpgrade && (");
}

// 4. Add states once
const statesReplacement = `  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newLicenseKey, setNewLicenseKey] = useState('');

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword || !selectedAppId) return;
    try {
      const res = await fetch('/api/dashboard/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: \`Bearer \${token}\` },
        body: JSON.stringify({
          appId: selectedAppId,
          username: newUsername.trim(),
          password: newPassword,
          email: newEmail.trim(),
          licenseKey: newLicenseKey.trim()
        })
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.message);
      
      setNewUsername('');
      setNewPassword('');
      setNewEmail('');
      setNewLicenseKey('');
      fetchUsers();
      alert('User created successfully!');
    } catch (err: any) {
      alert(\`Failed to create user: \${err.message}\`);
    }
  };

  // Load registered app users from Firestore`;

if (!content.includes("const handleCreateUser =")) {
    content = content.replace("  // Load registered app users from Firestore", statesReplacement);
}

// 5. Add UI logic once
const startStr = '<GlassCard className="p-6 text-left" glowColor="blue">';
const usersTabIdx = content.indexOf('{/* USERS TAB */}');
const startIndex = content.indexOf(startStr, usersTabIdx);

if (startIndex !== -1 && !content.includes("Create App User")) {
    const endStr = '</GlassCard>';
    const firstEnd = content.indexOf(endStr, startIndex) + endStr.length;
    const secondEnd = content.indexOf(endStr, firstEnd) + endStr.length;
    
    if (secondEnd !== -1) {
        const replacement = `                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                  <div className="lg:col-span-4">
                    <GlassCard className="p-6" glowColor="cyan">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <Users className="w-5 h-5 text-cyan-400 mr-2" />
                        Create App User
                      </h3>
                      <form onSubmit={handleCreateUser} className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Username</label>
                          <input type="text" required placeholder="user123" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Password</label>
                          <input type="password" required placeholder="••••••••" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Email (Optional)</label>
                          <input type="email" placeholder="user@example.com" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Link License Key (Optional)</label>
                          <input type="text" placeholder="INV-..." value={newLicenseKey} onChange={(e) => setNewLicenseKey(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50" />
                        </div>
                        <button type="submit" className="w-full py-3 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500/30 hover:to-blue-500/30 border border-cyan-500/30 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all duration-300">
                          Create User
                        </button>
                      </form>
                    </GlassCard>
                  </div>
                  
                  <div className="lg:col-span-8 space-y-6">
${content.substring(startIndex, secondEnd)}
                  </div>
                </div>`;
        
        content = content.substring(0, startIndex) + replacement + content.substring(secondEnd);
    }
}

fs.writeFileSync(file, content, 'utf8');
console.log("All patches applied successfully!");
