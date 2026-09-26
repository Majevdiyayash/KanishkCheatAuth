const fs = require('fs');
const file = 'D:/INNOVATORKEYAUTH/KEYAUTH/src/pages/Dashboard.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /<GlassCard className="p-6 text-left" glowColor="blue">[\s\S]*?auth\.login\("user@example\.com", "password123"\)`\}\}<\/div>\s*<\/GlassCard>\s*/;

const replacement = `
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
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
                    <GlassCard className="p-6 text-left" glowColor="blue">
                      {loadingUsers ? (
                        <SkeletonTable rows={5} />
                      ) : appUsers.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center space-y-3">
                          <Users className="w-10 h-10 text-gray-600" />
                          <p className="text-gray-400 text-sm">No users have registered yet.</p>
                          <p className="text-gray-600 text-xs font-mono">Users register via <span className="text-cyan-400">/api/client/register</span> using your SDK.</p>
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-xs font-mono text-left">
                            <thead>
                              <tr className="border-b border-white/5 text-gray-500 uppercase tracking-wider text-[10px]">
                                <th className="pb-3 pr-4">Email</th>
                                <th className="pb-3 pr-4">License Key</th>
                                <th className="pb-3">Joined</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                              {appUsers.map((u, i) => (
                                <tr key={i} className="hover:bg-white/[0.02] transition-colors">
                                  <td className="py-3 pr-4 text-white font-semibold">{u.email}</td>
                                  <td className="py-3 pr-4">
                                    {u.licenseKey ? (
                                      <span className="text-cyan-400 bg-cyan-950/20 border border-cyan-800/30 px-2 py-0.5 rounded">
                                        {u.licenseKey}
                                      </span>
                                    ) : (
                                      <span className="text-gray-600">—</span>
                                    )}
                                  </td>
                                  <td className="py-3 text-gray-400">
                                    {new Date(u.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      )}
                    </GlassCard>

                    <GlassCard className="p-5 text-left" glowColor="cyan">
                      <div className="flex items-center space-x-2 mb-3">
                        <Info className="w-4 h-4 text-cyan-400" />
                        <h4 className="text-sm font-semibold text-white">SDK Integration</h4>
                      </div>
                      <p className="text-xs text-gray-400 leading-relaxed">
                        App users are registered through your integrated SDK by calling the <code className="text-cyan-400 bg-cyan-950/20 px-1 rounded">register()</code> method.
                        Once registered, they can authenticate using <code className="text-cyan-400 bg-cyan-950/20 px-1 rounded">login()</code>.
                        Users are bound to your application's App ID and stored securely.
                      </p>
                      <div className="mt-3 font-mono text-xs bg-black/40 border border-white/5 rounded-xl p-4 text-green-400 whitespace-pre">{`// Register a new user via SDK\nauth.register("user@example.com", "password123")\n\n// Login after registration\nauth.login("user@example.com", "password123")`}</div>
                    </GlassCard>
                  </div>
                </div>
`;

if (content.match(regex)) {
  content = content.replace(regex, replacement);
  fs.writeFileSync(file, content, 'utf8');
  console.log("Patched successfully!");
} else {
  console.log("Regex not matched!");
}
