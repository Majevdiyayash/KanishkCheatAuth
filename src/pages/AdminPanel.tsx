import { useState, useEffect } from 'react';
import { Shield, ShieldAlert, Trash2, Search, UserPlus } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { db, auth } from '../lib/firebase';
import { collection, getDocs, doc, updateDoc, deleteDoc, getDoc } from 'firebase/firestore';

interface UserRecord {
  id: string;
  email: string;
  role?: string;
  plan?: string;
  planExpiry?: string | null;
  banned?: boolean;
  bannedReason?: string;
  createdAt?: string;
}

interface AdminPanelProps {
  userEmail: string | null;
  userUid: string | null;
  onBackToDashboard: () => void;
}

export function AdminPanel({ userEmail, userUid, onBackToDashboard }: AdminPanelProps) {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Quick Role Assigner Form State
  const [assignEmail, setAssignEmail] = useState('');
  const [assignRole, setAssignRole] = useState('user');
  const [assignPlan, setAssignPlan] = useState('free');
  const [assignLoading, setAssignLoading] = useState(false);

  // Access check: Only authorized admin/owner emails, UIDs, or roles
  const [currentUserRole, setCurrentUserRole] = useState<string | null>(null);
  const currentEmail = userEmail || auth.currentUser?.email || '';

  useEffect(() => {
    // Clear legacy static demo users from localStorage if any
    try {
      localStorage.removeItem('kanishk_static_users');
    } catch (e) {}

    const uid = userUid || auth.currentUser?.uid;
    if (uid) {
      getDoc(doc(db, 'users', uid)).then(snap => {
        if (snap.exists()) {
          setCurrentUserRole(snap.data().role || 'user');
        }
      }).catch(console.error);
    }
  }, [userUid]);

  const isMasterOwner = 
    currentEmail.toLowerCase() === 'yashmajevadiya456@gmail.com' || 
    currentEmail.toLowerCase().includes('kanishkcheats') || 
    userUid === 'o08jDiopRZWaPffBCQGFCHFyhH83' ||
    auth.currentUser?.uid === 'o08jDiopRZWaPffBCQGFCHFyhH83' ||
    currentUserRole === 'admin' ||
    currentUserRole === 'owner';

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  useEffect(() => {
    if (isMasterOwner) {
      fetchUsers();
      const interval = setInterval(() => {
        fetchUsers(true);
      }, 5000);
      return () => clearInterval(interval);
    } else {
      setLoading(false);
    }
  }, [isMasterOwner]);

  const fetchUsers = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      // 1. Fetch from backend API
      let apiUsers: UserRecord[] = [];
      try {
        const res = await fetch('/api/admin/users', {
          headers: { Authorization: `Bearer ${userUid}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success) {
            apiUsers = data.users || [];
          }
        }
      } catch (e) {}

      // 2. Fetch from Firestore
      let fsUsers: UserRecord[] = [];
      try {
        const snap = await getDocs(collection(db, 'users'));
        snap.forEach(d => {
          const data = d.data();
          const email = data.email || 'No Email';
          const isOwner = email.toLowerCase() === 'yashmajevadiya456@gmail.com';
          fsUsers.push({
            id: d.id,
            email: email,
            role: isOwner ? 'owner' : (data.role || 'user'),
            plan: isOwner ? 'enterprise' : (data.plan || 'free'),
            planExpiry: data.planExpiry || null,
            banned: isOwner ? false : !!data.banned,
            bannedReason: isOwner ? '' : (data.bannedReason || ''),
            createdAt: data.createdAt || ''
          });
        });
      } catch (e) {}

      // Merge backend and Firestore users without duplicates
      const mergedMap = new Map<string, UserRecord>();
      apiUsers.forEach(u => {
        const isOwner = u.email.toLowerCase() === 'yashmajevadiya456@gmail.com';
        mergedMap.set(u.email.toLowerCase(), {
          ...u,
          role: isOwner ? 'owner' : u.role,
          banned: isOwner ? false : u.banned
        });
      });
      fsUsers.forEach(u => {
        const isOwner = u.email.toLowerCase() === 'yashmajevadiya456@gmail.com';
        const existing = mergedMap.get(u.email.toLowerCase());
        if (existing) {
          mergedMap.set(u.email.toLowerCase(), { 
            ...existing, 
            ...u, 
            role: isOwner ? 'owner' : (u.role || existing.role), 
            banned: isOwner ? false : (u.banned || existing.banned) 
          });
        } else {
          mergedMap.set(u.email.toLowerCase(), u);
        }
      });

      // Ensure Master Owner is always in the list if not fetched yet
      if (!mergedMap.has('yashmajevadiya456@gmail.com')) {
        mergedMap.set('yashmajevadiya456@gmail.com', {
          id: auth.currentUser?.uid || 'usr_owner_main',
          email: 'yashmajevadiya456@gmail.com',
          role: 'owner',
          plan: 'enterprise',
          banned: false,
          createdAt: new Date().toISOString()
        });
      }

      setUsers(Array.from(mergedMap.values()));
    } catch (err: any) {
      console.error('[Admin Panel Error]:', err);
    } finally {
      setLoading(false);
    }
  };

  // Quick Role Assignment by Email
  const handleAssignRoleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignEmail.trim()) {
      showToast('⚠️ Please enter a target user email address');
      return;
    }
    setAssignLoading(true);

    const targetEmail = assignEmail.trim().toLowerCase();
    if (targetEmail === 'yashmajevadiya456@gmail.com' && assignRole !== 'owner') {
      showToast('🛡️ Master Owner role cannot be changed or demoted.');
      setAssignLoading(false);
      return;
    }

    try {
      await fetch('/api/admin/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userUid}` },
        body: JSON.stringify({ email: targetEmail, role: assignRole, plan: assignPlan })
      });

      const snap = await getDocs(collection(db, 'users'));
      let targetUid: string | null = null;
      snap.forEach(d => {
        if (d.data().email?.toLowerCase() === targetEmail) targetUid = d.id;
      });
      if (targetUid) {
        await updateDoc(doc(db, 'users', targetUid), { role: assignRole, plan: assignPlan });
      }

      showToast(`✅ Permissions assigned to ${targetEmail}! Role: ${assignRole.toUpperCase()}`);
      setAssignEmail('');
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Assignment error: ${err.message}`);
    } finally {
      setAssignLoading(false);
    }
  };

  // Inline User Role Update
  const handleUpdateRole = async (userId: string, targetEmail: string, newRole: string) => {
    if (targetEmail.toLowerCase() === 'yashmajevadiya456@gmail.com') {
      showToast('🛡️ Master Owner role cannot be demoted or changed!');
      return;
    }
    try {
      await fetch('/api/admin/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userUid}` },
        body: JSON.stringify({ email: targetEmail, role: newRole })
      });
      if (userId) await updateDoc(doc(db, 'users', userId), { role: newRole });
      showToast(`✅ Updated role for ${targetEmail} to ${newRole.toUpperCase()}`);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Failed to update role: ${err.message}`);
    }
  };

  // Inline User Plan Update
  const handleUpdatePlan = async (userId: string, targetEmail: string, newPlan: string) => {
    try {
      await fetch('/api/admin/users/assign-role', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userUid}` },
        body: JSON.stringify({ email: targetEmail, plan: newPlan })
      });
      if (userId) await updateDoc(doc(db, 'users', userId), { plan: newPlan });
      showToast(`✅ Updated plan for ${targetEmail} to ${newPlan.toUpperCase()}`);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Failed to update plan: ${err.message}`);
    }
  };

  // Toggle Ban Status with Master Owner Immunity
  const handleToggleBan = async (user: UserRecord) => {
    if (user.email.toLowerCase() === 'yashmajevadiya456@gmail.com') {
      showToast('🛡️ Master Owner account is 100% IMMUNE and CANNOT be banned!');
      return;
    }

    const isBanned = !!user.banned;
    const reason = isBanned ? '' : (prompt('Enter ban reason:') || 'Violation of ToS rules');

    try {
      await fetch('/api/admin/users/ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userUid}` },
        body: JSON.stringify({ email: user.email, banned: !isBanned, reason })
      });
      if (user.id) await updateDoc(doc(db, 'users', user.id), { banned: !isBanned, bannedReason: reason });
      showToast(isBanned ? `✅ Unbanned ${user.email}` : `✅ Banned ${user.email}`);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Ban toggle error: ${err.message}`);
    }
  };

  // Delete User Account
  const handleDeleteUser = async (user: UserRecord) => {
    if (user.email.toLowerCase() === 'yashmajevadiya456@gmail.com' || user.email.toLowerCase() === 'yashmajevadiya456@email.com') {
      alert('🛡️ Cannot delete the primary Master Owner account.');
      return;
    }
    if (!confirm(`Are you sure you want to PERMANENTLY delete user account (${user.email})?`)) return;

    try {
      await fetch('/api/admin/users/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${userUid}` },
        body: JSON.stringify({ email: user.email, userId: user.id })
      });
      if (user.id) await deleteDoc(doc(db, 'users', user.id));
      showToast(`✅ Deleted account: ${user.email}`);
      fetchUsers();
    } catch (err: any) {
      showToast(`❌ Failed to delete user: ${err.message}`);
    }
  };

  // Security Lockout Screen for Non-Master Emails
  if (!isMasterOwner) {
    return (
      <div className="min-h-screen bg-[#030308] text-white flex items-center justify-center p-6">
        <GlassCard className="max-w-md w-full p-8 text-center border-red-500/30 space-y-6">
          <div className="w-16 h-16 rounded-3xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mx-auto text-red-400">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <h2 className="text-2xl font-extrabold text-white font-mono">ACCESS DENIED</h2>
            <p className="text-xs text-red-400 font-mono mt-2 uppercase tracking-wider">RESTRICTED MASTER OWNER ZONE</p>
          </div>
          <p className="text-xs text-gray-400 leading-relaxed font-sans">
            Only <strong className="text-white font-mono">yashmajevadiya456@gmail.com</strong> is authorized to access the Master Admin Panel and assign roles to users.
          </p>
          <div className="bg-black/60 border border-white/5 rounded-2xl p-4 text-xs font-mono text-gray-500">
            Current Logged User: <span className="text-gray-300">{currentEmail || 'Not Authenticated'}</span>
          </div>
          <button
            onClick={onBackToDashboard}
            className="w-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-400 border border-cyan-500/30 py-3 rounded-2xl text-xs font-bold font-mono transition-all"
          >
            ← Return to User Dashboard
          </button>
        </GlassCard>
      </div>
    );
  }

  const filteredUsers = users.filter(u => 
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (u.role && u.role.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (u.plan && u.plan.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="min-h-screen bg-[#030308] text-white font-sans selection:bg-cyan-500/30">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-black/90 border border-cyan-500/40 text-cyan-300 text-xs font-mono px-5 py-3 rounded-2xl shadow-2xl backdrop-blur-xl animate-fade-in">
          {toastMessage}
        </div>
      )}

      {/* Top Header */}
      <header className="border-b border-white/5 bg-black/40 backdrop-blur-xl sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-white font-mono tracking-tight flex items-center space-x-2">
                <span>MASTER ADMIN PANEL</span>
                <span className="text-[10px] bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 px-2.5 py-0.5 rounded-full font-bold">PRO</span>
              </h1>
              <p className="text-[11px] text-gray-500 font-mono">Central User Role & System Management</p>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className="hidden sm:flex items-center space-x-2 bg-white/5 border border-white/10 px-3 py-1.5 rounded-2xl text-xs font-mono text-gray-300">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>Owner: {currentEmail}</span>
            </div>
            <button
              onClick={onBackToDashboard}
              className="bg-white/5 hover:bg-white/10 text-gray-300 border border-white/10 px-4 py-2 rounded-2xl text-xs font-semibold font-mono transition-all"
            >
              ← User Dashboard
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 space-y-8">
        {/* Quick Assign Role Card */}
        <GlassCard className="p-6 border-cyan-500/20 space-y-5">
          <div className="flex items-center space-x-3 pb-4 border-b border-white/5">
            <div className="p-2.5 rounded-2xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">Assign Role & Permissions by Email</h2>
              <p className="text-xs text-gray-500 font-mono">Type any user email address to grant roles (Owner, Admin, Reseller, User) and subscription plans instantly</p>
            </div>
          </div>

          <form onSubmit={handleAssignRoleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="md:col-span-1">
              <label className="text-[11px] text-gray-400 font-mono block mb-1.5">User Email Address</label>
              <input
                type="email"
                placeholder="user@kanishkauth.com"
                value={assignEmail}
                onChange={(e) => setAssignEmail(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/50"
              />
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-mono block mb-1.5">System Role</label>
              <select
                value={assignRole}
                onChange={(e) => setAssignRole(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="user">User (Standard)</option>
                <option value="reseller">Reseller (Partner)</option>
                <option value="admin">Admin (Manager)</option>
                <option value="owner">Owner (Full Control)</option>
              </select>
            </div>

            <div>
              <label className="text-[11px] text-gray-400 font-mono block mb-1.5">Subscription Plan</label>
              <select
                value={assignPlan}
                onChange={(e) => setAssignPlan(e.target.value)}
                className="w-full bg-black/60 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
              >
                <option value="free">FREE ($0)</option>
                <option value="developer">DEVELOPER ($5/mo)</option>
                <option value="seller">SELLER ($10/mo)</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                type="submit"
                disabled={assignLoading}
                className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-mono font-bold py-2.5 rounded-2xl text-xs shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center space-x-2"
              >
                {assignLoading ? <span>Saving...</span> : <><span>Grant Permissions</span> →</>}
              </button>
            </div>
          </form>
        </GlassCard>

        {/* User Search & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-white font-mono">User Permission Directory</h2>
            <p className="text-xs text-gray-500 font-mono mt-0.5">MANAGE ROLES, SUBSCRIPTIONS, BAN STATUS, AND ACCESSIBILITY</p>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-gray-500 absolute left-3.5 top-3" />
            <input
              type="text"
              placeholder="Search by email, UID, role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-2xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-600 focus:outline-none focus:border-cyan-500/40"
            />
          </div>
        </div>

        {/* Registered Users Table */}
        <GlassCard className="overflow-hidden p-0 border-white/5">
          <div className="overflow-x-auto">
            <table className="w-full text-xs font-mono text-left border-collapse">
              <thead>
                <tr className="bg-white/5 text-gray-400 border-b border-white/5">
                  <th className="p-4">User Account</th>
                  <th className="p-4">Assign Role</th>
                  <th className="p-4">Assign Plan</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">Loading registered users...</td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-gray-500">No matching users found.</td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <td className="p-4">
                        <div className="flex items-center space-x-3">
                          <div className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs ${user.email.toLowerCase() === 'yashmajevadiya456@gmail.com' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'}`}>
                            {user.email.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <span className="text-white font-semibold block">{user.email}</span>
                            <span className="text-[10px] text-gray-600 font-mono block truncate max-w-[180px]">UID: {user.id}</span>
                          </div>
                        </div>
                      </td>

                      <td className="p-4">
                        <select
                          value={user.role || 'user'}
                          onChange={(e) => handleUpdateRole(user.id, user.email, e.target.value)}
                          className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/40"
                        >
                          <option value="user">User</option>
                          <option value="reseller">Reseller</option>
                          <option value="admin">Admin</option>
                          <option value="owner">Owner</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <select
                          value={user.plan || 'free'}
                          onChange={(e) => handleUpdatePlan(user.id, user.email, e.target.value)}
                          className="bg-black/60 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500/40"
                        >
                          <option value="free">FREE ($0)</option>
                          <option value="developer">DEVELOPER ($5/mo)</option>
                          <option value="seller">SELLER ($10/mo)</option>
                        </select>
                      </td>

                      <td className="p-4">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold border ${user.banned ? 'bg-red-950/30 text-red-400 border-red-500/30' : 'bg-green-950/30 text-green-400 border-green-500/30'}`}>
                          {user.banned ? 'BANNED' : 'ACTIVE'}
                        </span>
                      </td>

                      <td className="p-4 text-right space-x-2">
                        {user.email.toLowerCase() === 'yashmajevadiya456@gmail.com' ? (
                          <span className="px-3 py-1.5 rounded-xl text-[11px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                            🛡️ IMMUNE OWNER
                          </span>
                        ) : (
                          <>
                            <button
                              onClick={() => handleToggleBan(user)}
                              className={`px-3 py-1.5 rounded-xl text-[11px] font-semibold border transition-all ${user.banned ? 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'}`}
                            >
                              {user.banned ? 'Unban Account' : 'Ban Account'}
                            </button>
                            <button
                              onClick={() => handleDeleteUser(user)}
                              className="p-1.5 rounded-xl text-gray-500 hover:text-red-400 hover:bg-red-500/10 transition-all inline-flex items-center"
                              title="Delete Account"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </GlassCard>
      </main>
    </div>
  );
}
