const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const startStr = '<GlassCard className="p-6 text-left" glowColor="blue">';
const usersTabIdx = content.indexOf('{/* USERS TAB */}');
const startIndex = content.indexOf(startStr, usersTabIdx);

if (startIndex !== -1) {
    const endStr = '</GlassCard>';
    // Find the first GlassCard closing
    const firstEnd = content.indexOf(endStr, startIndex) + endStr.length;
    // Find the second GlassCard closing (SDK Integration)
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
        fs.writeFileSync(file, content, 'utf8');
        console.log("Patched UI successfully with double GlassCard logic!");
    } else {
        console.log("Could not find second end string.");
    }
} else {
    console.log("Could not find start string.");
}
