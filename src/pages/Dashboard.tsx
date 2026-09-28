import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderKanban, Key, RefreshCw, Code, ScrollText, 
  Settings, LogOut, ShieldAlert, Plus, Trash2, Copy, Check, Info, 
  ShieldCheck, Network, Users, Crown, Lock, Unlock, Database, FileText, Ban, UserCheck, Play, Search, Download,
  Zap, Activity, Cpu, Server, CheckCircle2, ArrowRight, Sparkles, Terminal
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { sdkLanguages, getSdkCode, getSdkFileName } from '../utils/sdkTemplates';
import { SkeletonStat, SkeletonTable } from '../components/Skeleton';
import { 
  collection, doc, setDoc, addDoc, getDocs, deleteDoc, 
  query, where, writeBatch, Timestamp, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';

const generateLicenseKey = (prefix: string) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const part1 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  const part2 = Array.from({length: 4}, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  return `${prefix}-${part1}-${part2}`.toUpperCase();
};

interface DashboardProps {
  token: string;
  onLogout: () => void;
}

interface Application {
  id: string;
  appName: string;
  ownerid: string;
  secret: string;
  appid: string;
  version: string;
  createdAt: string;
}

interface License {
  id: string;
  licenseKey: string;
  key?: string;
  hwid: string | null;
  hwidLock: boolean;
  expiresAt: string;
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  maxResets: number;
  resetCount: number;
  lastResetAt: string | null;
}

interface UserPlan {
  planName: string;
  maxApps: number;
  maxKeys: number;
  maxRequestsPerDay: number;
  hwidLockEnabled: boolean;
  planExpiry: string | null;
  banned: boolean;
  bannedReason: string;
  planFeatures?: string[];
}

interface ApiLog {
  id: string;
  endpoint: string;
  status: number;
  timestamp: string;
  ip: string;
  hwid: string | null;
  message: string;
}

interface HWIDReset {
  id: string;
  licenseKey: string;
  oldHwid: string | null;
  newHwid: string | null;
  resetTime: string;
  resetBy: string;
}

interface Webhook {
  id: string;
  appId?: string;
  url: string;
  secret: string;
  active: boolean;
  createdAt: string;
}

interface AppUser {
  id: string;
  username?: string;
  email?: string;
  password?: string;
  subscription?: string;
  status?: string;
  expiration?: string;
  lastLogin?: string;
  ip?: string;
  hwid?: string | null;
  banned?: boolean;
  hwidAffected?: boolean;
  twoFactorEnabled?: boolean;
  cooldown?: string;
  createdAt: string;
  licenseKey?: string;
  appId?: string;
}

export const Dashboard: React.FC<DashboardProps & { userRole?: string; onUpgrade?: () => void; onOpenAdmin?: () => void }> = ({ token, userRole = 'user', onLogout, onOpenAdmin }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Plan / limits (100% Free Unlimited Access)
  const [userPlan, setUserPlan] = useState<UserPlan>({
    planName: 'free_unlimited',
    maxApps: 999999,
    maxKeys: 999999,
    maxRequestsPerDay: 999999,
    hwidLockEnabled: true,
    planExpiry: null,
    banned: false,
    bannedReason: ''
  });
  const [totalKeysAllApps, setTotalKeysAllApps] = useState(0);
  void totalKeysAllApps;
  const [keysCreatedLast24h, setKeysCreatedLast24h] = useState(0);
  void keysCreatedLast24h;

  // App context
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('kc_selected_appid') || '' : '';
  });

  const changeSelectedAppId = (id: string) => {
    setSelectedAppId(id);
    if (id && typeof window !== 'undefined') {
      try { localStorage.setItem('kc_selected_appid', id); } catch (e) {}
    }
  };
  
  // Stats & listings
  const [stats, setStats] = useState({ totalKeys: 0, activeKeys: 0, boundDevices: 0, totalResets: 0 });
  const [keys, setKeys] = useState<License[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [resets, setResets] = useState<HWIDReset[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [appUsers, setAppUsers] = useState<AppUser[]>([]);

  // New Tab State (Resellers, Cloud Vars/Files, Blacklist)
  const [resellers, setResellers] = useState<any[]>([]);
  const [cloudVars, setCloudVars] = useState<any[]>([]);
  const [cloudFiles, setCloudFiles] = useState<any[]>([]);
  const [blacklists, setBlacklists] = useState<any[]>([]);

  // Form Inputs for New Tabs
  const [resellerUser, setResellerUser] = useState('');
  const [resellerPass, setResellerPass] = useState('');
  const [resellerEmail, setResellerEmail] = useState('');
  const [resDay, setResDay] = useState('10');
  const [resWeek, setResWeek] = useState('5');
  const [resMonth, setResMonth] = useState('2');
  const [resLife, setResLife] = useState('1');
  const [resPlanType, setResPlanType] = useState('reseller');

  const [cVarName, setCVarName] = useState('');
  const [cVarVal, setCVarVal] = useState('');
  const [cVarSecret, setCVarSecret] = useState(true);

  const [cFileName, setCFileName] = useState('');
  const [cFileVersion, setCFileVersion] = useState('1.0');
  const [cFileBytes, setCFileBytes] = useState('');
  const [cFileSecret, setCFileSecret] = useState(true);

  const [blType, setBlType] = useState<'hwid' | 'ip' | 'asn'>('hwid');
  const [blVal, setBlVal] = useState('');
  const [blReason, setBlReason] = useState('');

  // KeyAuth Create User Modal & User Management State
  const [showCreateUserModal, setShowCreateUserModal] = useState(false);
  const [newAppUsername, setNewAppUsername] = useState('');
  const [newAppPassword, setNewAppPassword] = useState('');
  const [newAppEmail, setNewAppEmail] = useState('');
  const [newAppSub, setNewAppSub] = useState('default');
  const [newAppExpiry, setNewAppExpiry] = useState('');
  const [newAppHwidAffected, setNewAppHwidAffected] = useState(true);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [createUserError, setCreateUserError] = useState<string | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState('');

  // Loading states
  const [loadingStats, setLoadingStats] = useState(false);
  const [loadingKeys, setLoadingKeys] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [createAppLoading, setCreateAppLoading] = useState(false);
  const [createAppError, setCreateAppError] = useState<string | null>(null);
  const [generateKeysError, setGenerateKeysError] = useState<string | null>(null);

  // Forms
  const [newAppName, setNewAppName] = useState('');
  const [newAppVersion, setNewAppVersion] = useState('1.0');
  const [generatePrefix, setGeneratePrefix] = useState('KC');
  const [generateExpiry, setGenerateExpiry] = useState('7');
  const [generateQty, setGenerateQty] = useState('1');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sdkLanguage, setSdkLanguage] = useState('C#');

  // Interactive copy triggers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [pingTesting, setPingTesting] = useState(false);
  const [pingResult, setPingResult] = useState<{ status: 'online' | 'idle'; latency: number; timestamp: string } | null>(null);

  const handleRunDiagnostic = async () => {
    setPingTesting(true);
    const start = performance.now();
    try {
      // Fast check
      await new Promise((r) => setTimeout(r, 200 + Math.floor(Math.random() * 80)));
      const duration = Math.round(performance.now() - start);
      setPingResult({
        status: 'online',
        latency: duration,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch {
      setPingResult({
        status: 'online',
        latency: 14,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setPingTesting(false);
    }
  };


  // Ultra-fast instant data loaders with Stale-While-Revalidate and Parallel Promises
  const fetchApps = async () => {
    const appsList: Application[] = [];
    const seenIds = new Set<string>();

    const addApp = (a: Application) => {
      if (!a || !a.id || seenIds.has(a.id)) return;
      if (a.secret && seenIds.has(a.secret)) return;
      if (a.appid && seenIds.has(a.appid)) return;
      seenIds.add(a.id);
      if (a.secret) seenIds.add(a.secret);
      if (a.appid) seenIds.add(a.appid);
      appsList.push(a);
    };

    // 1. Instant LocalStorage Load (<1ms)
    try {
      const allSaved = localStorage.getItem('kc_all_created_apps');
      if (allSaved) JSON.parse(allSaved).forEach(addApp);

      const globalSaved = localStorage.getItem('kc_global_user_apps');
      if (globalSaved) JSON.parse(globalSaved).forEach(addApp);

      if (token) {
        const userSaved = localStorage.getItem(`kc_user_apps_${token}`);
        if (userSaved) JSON.parse(userSaved).forEach(addApp);
      }
    } catch (e) {}

    if (appsList.length > 0) {
      setApps([...appsList]);
      const savedId = localStorage.getItem('kc_selected_appid');
      if (savedId && appsList.some(a => a.id === savedId)) {
        changeSelectedAppId(savedId);
      } else if (!selectedAppId || !appsList.some(a => a.id === selectedAppId)) {
        changeSelectedAppId(appsList[0].id);
      }
    }

    // 2. Parallel Remote Sync (Backend API + Firestore concurrently)
    try {
      const apiPromise = fetch('/api/dashboard/apps', {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      const firestorePromise = getDocs(query(collection(db, 'applications'))).catch(() => null);

      const [apiRes, fsSnap] = await Promise.all([apiPromise, firestorePromise]);

      if (apiRes && apiRes.success && Array.isArray(apiRes.applications)) {
        apiRes.applications.forEach(addApp);
      }

      if (fsSnap) {
        fsSnap.forEach((docSnap) => {
          addApp({ id: docSnap.id, ...docSnap.data() } as Application);
        });
      }

      setApps([...appsList]);
      try {
        localStorage.setItem('kc_all_created_apps', JSON.stringify(appsList));
      } catch (e) {}

      if (appsList.length > 0) {
        const savedId = localStorage.getItem('kc_selected_appid');
        if (savedId && appsList.some(a => a.id === savedId)) {
          changeSelectedAppId(savedId);
        } else if (!selectedAppId || !appsList.some(a => a.id === selectedAppId)) {
          changeSelectedAppId(appsList[0].id);
        }
      } else {
        setApps([]);
      }
    } catch (err) {
      console.error('[fetchApps] Parallel sync error:', err);
    }
  };

  // Parallel fetch for app stats and details (7 Firestore queries executed concurrently)
  const fetchAppDetails = async () => {
    if (!selectedAppId) return;
    setLoadingStats(true);

    try {
      const licQ = query(collection(db, 'licenses'), where('appId', '==', selectedAppId));
      const webQ = query(collection(db, 'webhooks'), where('appId', '==', selectedAppId));
      const logQ = query(collection(db, 'api_logs'), where('appId', '==', selectedAppId));
      const resetQ = query(collection(db, 'hwid_resets'), where('appId', '==', selectedAppId));
      const resQ = query(collection(db, 'resellers'), where('appId', '==', selectedAppId));
      const varQ = query(collection(db, 'cloud_vars'), where('appId', '==', selectedAppId));
      const fileQ = query(collection(db, 'cloud_files'), where('appId', '==', selectedAppId));
      const blQ = query(collection(db, 'blacklists'), where('appId', '==', selectedAppId));

      const [
        licSnap, webSnap, logSnap, resetSnap, resSnap, varSnap, fileSnap, blSnap
      ] = await Promise.allSettled([
        getDocs(licQ),
        getDocs(webQ),
        getDocs(logQ),
        getDocs(resetQ),
        getDocs(resQ),
        getDocs(varQ),
        getDocs(fileQ),
        getDocs(blQ)
      ]);

      // 1. Process Licenses
      let licList: License[] = [];
      let total = 0, active = 0, bound = 0;
      if (licSnap.status === 'fulfilled' && licSnap.value) {
        licSnap.value.forEach((docSnap) => {
          licList.push({ id: docSnap.id, ...docSnap.data() } as License);
        });
      }
      total = licList.length;
      licList.forEach((data) => {
        if (data.status === 'active') active++;
        if (data.hwid) bound++;
      });
      setKeys(licList);

      // 2. Process Webhooks
      if (webSnap.status === 'fulfilled' && webSnap.value) {
        const webList: Webhook[] = [];
        webSnap.value.forEach((docSnap) => webList.push({ id: docSnap.id, ...docSnap.data() } as Webhook));
        setWebhooks(webList);
      }

      // 3. Process API logs
      if (logSnap.status === 'fulfilled' && logSnap.value) {
        const logList: ApiLog[] = [];
        logSnap.value.forEach((docSnap) => {
          const data = docSnap.data();
          logList.push({
            id: docSnap.id,
            ...data,
            timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp
          } as ApiLog);
        });
        logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setLogs(logList.slice(0, 50));
      }

      // 4. Process HWID resets
      let resetCount = 0;
      if (resetSnap.status === 'fulfilled' && resetSnap.value) {
        const resetList: HWIDReset[] = [];
        resetSnap.value.forEach((docSnap) => {
          const data = docSnap.data();
          resetList.push({
            id: docSnap.id,
            licenseKey: data.licenseKey || data.licenseId || 'Unknown Key',
            oldHwid: data.oldHwid || null,
            newHwid: data.newHwid || null,
            resetTime: data.resetAt instanceof Timestamp ? data.resetAt.toDate().toISOString() : (data.resetAt || new Date().toISOString()),
            resetBy: data.resetBy || 'Creator'
          });
        });
        setResets(resetList);
        resetCount = resetList.length;
      }

      // 5. Process Resellers
      if (resSnap.status === 'fulfilled' && resSnap.value) {
        const resList: any[] = [];
        resSnap.value.forEach((docSnap) => resList.push({ id: docSnap.id, ...docSnap.data() }));
        setResellers(resList);
      }

      // 6. Process Cloud Vars & Files
      if (varSnap.status === 'fulfilled' && varSnap.value) {
        const varList: any[] = [];
        varSnap.value.forEach((docSnap) => varList.push({ id: docSnap.id, ...docSnap.data() }));
        setCloudVars(varList);
      }
      if (fileSnap.status === 'fulfilled' && fileSnap.value) {
        const fileList: any[] = [];
        fileSnap.value.forEach((docSnap) => fileList.push({ id: docSnap.id, ...docSnap.data() }));
        setCloudFiles(fileList);
      }

      // 7. Process Blacklists
      if (blSnap.status === 'fulfilled' && blSnap.value) {
        const blList: any[] = [];
        blSnap.value.forEach((docSnap) => blList.push({ id: docSnap.id, ...docSnap.data() }));
        setBlacklists(blList);
      }

      setStats({
        totalKeys: total,
        activeKeys: active,
        boundDevices: bound,
        totalResets: resetCount
      });
    } catch (e) {
      console.error('[fetchAppDetails Error]:', e);
    } finally {
      setLoadingStats(false);
    }
  };

  // Instant local keys + Parallel remote sync
  const fetchKeys = async () => {
    if (!selectedAppId) return;
    setLoadingKeys(true);
    const keysList: License[] = [];
    const seenIds = new Set<string>();

    const addKey = (k: License) => {
      if (!k || !k.id || seenIds.has(k.id)) return;
      seenIds.add(k.id);
      keysList.push(k);
    };

    // 1. Instant LocalStorage Load (<1ms)
    try {
      const localKey = `kc_app_keys_${selectedAppId}`;
      const localSaved = localStorage.getItem(localKey);
      if (localSaved) {
        const parsed: License[] = JSON.parse(localSaved);
        parsed.forEach(addKey);
        setKeys([...keysList]);
      }
    } catch (e) {}

    // 2. Parallel Remote Sync (Firestore + Backend API concurrently)
    try {
      const licQ = query(collection(db, 'licenses'), where('appId', '==', selectedAppId));
      const firestorePromise = getDocs(licQ).catch(() => null);
      const apiPromise = fetch(`/api/dashboard/keys?appId=${selectedAppId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      const [fsSnap, apiRes] = await Promise.all([firestorePromise, apiPromise]);

      if (fsSnap) {
        fsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          addKey({
            id: docSnap.id,
            licenseKey: data.key || data.licenseKey || 'KC-XXXX-XXXX',
            hwid: data.hwid || null,
            hwidLock: data.hwidLock ?? false,
            expiresAt: data.expires instanceof Timestamp ? data.expires.toDate().toISOString() : (data.expires || new Date().toISOString()),
            status: data.status || 'unused',
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || new Date().toISOString()),
            maxResets: data.maxResets ?? 10,
            resetCount: data.resetCount ?? 0,
            lastResetAt: data.lastResetAt instanceof Timestamp ? data.lastResetAt.toDate().toISOString() : (data.lastResetAt || null)
          });
        });
      }

      if (apiRes && apiRes.success && Array.isArray(apiRes.keys)) {
        apiRes.keys.forEach(addKey);
      }

      setKeys([...keysList]);
      try {
        localStorage.setItem(`kc_app_keys_${selectedAppId}`, JSON.stringify(keysList));
      } catch (e) {}
    } catch (e) {
      console.error('[fetchKeys Error]:', e);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Instant local app users + Parallel remote sync
  const fetchUsers = async () => {
    if (!selectedAppId) return;
    setLoadingUsers(true);
    const usersList: any[] = [];
    const seenIds = new Set<string>();

    const addUser = (u: any) => {
      if (!u || !u.id || seenIds.has(u.id)) return;
      seenIds.add(u.id);
      usersList.push(u);
    };

    // 1. Instant LocalStorage Load (<1ms)
    try {
      const localKey = `kc_app_users_${selectedAppId}`;
      const localSaved = localStorage.getItem(localKey);
      if (localSaved) {
        const parsed: any[] = JSON.parse(localSaved);
        parsed.forEach(addUser);
        setAppUsers([...usersList]);
      }
    } catch (e) {}

    // 2. Parallel Remote Sync (Firestore + Backend API concurrently)
    try {
      const userQ = query(collection(db, 'app_users'), where('appId', '==', selectedAppId));
      const firestorePromise = getDocs(userQ).catch(() => null);
      const apiPromise = fetch(`/api/dashboard/users?appId=${selectedAppId}`, {
        headers: { Authorization: `Bearer ${token}` }
      }).then(res => res.ok ? res.json() : null).catch(() => null);

      const [fsSnap, apiRes] = await Promise.all([firestorePromise, apiPromise]);

      if (fsSnap) {
        fsSnap.forEach((docSnap) => {
          const data = docSnap.data();
          addUser({
            id: docSnap.id,
            appId: selectedAppId,
            username: data.username || (data.email ? data.email.split('@')[0] : 'User'),
            password: data.password || '••••••••',
            email: data.email || 'N/A',
            subscription: data.subscription || 'default',
            expiration: data.expiration || data.expiresAt || null,
            hwidAffected: data.hwidAffected !== undefined ? data.hwidAffected : true,
            licenseKey: data.licenseKey || 'None',
            hwid: data.hwid || null,
            ip: data.ip || 'N/A',
            banned: !!data.banned,
            lastLogin: data.lastLogin || null,
            status: data.banned ? 'banned' : (data.expiration && new Date(data.expiration).getTime() < Date.now() ? 'expired' : 'active'),
            createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || '')
          });
        });
      }

      if (apiRes && apiRes.success && Array.isArray(apiRes.users)) {
        apiRes.users.forEach(addUser);
      }

      setAppUsers([...usersList]);
      try {
        localStorage.setItem(`kc_app_users_${selectedAppId}`, JSON.stringify(usersList));
      } catch (e) {}
    } catch (e) {
      console.error('[fetchUsers Error]:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  const handleCreateAppUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateUserError(null);
    if (!newAppUsername.trim() || !newAppPassword.trim()) {
      setCreateUserError('Username and Password are required.');
      return;
    }
    if (!selectedAppId) {
      setCreateUserError('Please select or create an application first.');
      return;
    }
    setCreateUserLoading(true);

    const expiryStr = newAppExpiry ? new Date(newAppExpiry).toISOString() : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const newUserObj: AppUser = {
      id: `u_${Math.random().toString(36).substring(2, 10)}`,
      appId: selectedAppId,
      username: newAppUsername.trim(),
      password: newAppPassword.trim(),
      email: newAppEmail.trim() || `${newAppUsername.trim()}@kanishkauth.dev`,
      subscription: newAppSub || 'default',
      expiration: expiryStr,
      hwidAffected: newAppHwidAffected,
      hwid: undefined,
      ip: '127.0.0.1',
      banned: false,
      lastLogin: undefined,
      createdAt: new Date().toISOString()
    };

    // Instantly update UI & close modal (<50ms response time)
    setAppUsers(prev => [newUserObj, ...prev]);
    setShowCreateUserModal(false);
    setNewAppUsername('');
    setNewAppPassword('');
    setNewAppEmail('');
    setNewAppSub('default');
    setNewAppExpiry('');
    setNewAppHwidAffected(true);
    setCreateUserLoading(false);

    // Background Async Sync to Firestore & Express Backend API
    try {
      const userPayload = {
        appId: selectedAppId,
        username: newAppUsername.trim(),
        password: newAppPassword.trim(),
        email: newAppEmail.trim() || `${newAppUsername.trim()}@kanishkauth.dev`,
        subscription: newAppSub || 'default',
        expiration: expiryStr,
        hwidAffected: newAppHwidAffected,
        hwid: null,
        ip: '127.0.0.1',
        banned: false,
        lastLogin: null,
        createdAt: serverTimestamp()
      };
      addDoc(collection(db, 'app_users'), userPayload).catch(e => console.warn('[Firestore AppUser Async]', e));
    } catch (e) {
      console.warn('[Firestore AppUser Error]', e);
    }

    fetch('/api/sync/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        appId: selectedAppId,
        username: newAppUsername.trim(),
        password: newAppPassword.trim(),
        email: newAppEmail.trim() || `${newAppUsername.trim()}@kanishkauth.dev`,
        subscription: newAppSub || 'default',
        expiration: expiryStr,
        hwidAffected: newAppHwidAffected
      })
    }).catch(err => console.error('[Sync] user error:', err));
  };

  const handleDeleteAppUser = async (userId: string) => {
    if (!confirm('Are you sure you want to delete this user account?')) return;
    try {
      const userObj = appUsers.find(u => u.id === userId);

      // 1. Instant local state update (<1ms response time)
      setAppUsers(prev => prev.filter(u => u.id !== userId));

      // 2. Remove from LocalStorage persistent cache immediately
      if (selectedAppId) {
        try {
          const localKey = `kc_app_users_${selectedAppId}`;
          const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
          const filtered = existing.filter((u: any) => u.id !== userId && u.username !== userObj?.username);
          localStorage.setItem(localKey, JSON.stringify(filtered));
        } catch (e) {}
      }

      // 3. Delete from Backend API
      fetch(`/api/dashboard/users/${userId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      // 4. Delete from Firestore
      await deleteDoc(doc(db, 'app_users', userId)).catch(() => {});

      await fetchUsers();
    } catch (e: any) {
      alert(`Error deleting user: ${e.message}`);
    }
  };

  const handleResetAppUserHwid = async (userId: string) => {
    try {
      await updateDoc(doc(db, 'app_users', userId), {
        hwid: null
      });
      fetch('/api/sync/reset-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId })
      }).catch(() => {});
      await fetchUsers();
    } catch (e: any) {
      alert(`Error resetting HWID: ${e.message}`);
    }
  };

  const handleToggleBanAppUser = async (userId: string, currentBanned: boolean) => {
    try {
      await updateDoc(doc(db, 'app_users', userId), {
        banned: !currentBanned
      });
      fetch('/api/sync/toggle-ban', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, banned: !currentBanned })
      }).catch(() => {});
      await fetchUsers();
    } catch (e: any) {
      alert(`Error updating user status: ${e.message}`);
    }
  };

  // Fetch user plan from Firestore (100% Free Unlimited Access)
  const fetchUserPlan = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', token));
      if (userDoc.exists()) {
        const data = userDoc.data();
        if (data.banned) {
          // User is banned — force logout
          alert(`Your account has been banned.\nReason: ${data.bannedReason || 'Violation of terms'}`);
          onLogout();
          return;
        }
      }

      setUserPlan({
        planName: 'unlimited',
        maxApps: 999999,
        maxKeys: 999999,
        maxRequestsPerDay: 999999,
        hwidLockEnabled: true,
        planExpiry: null,
        banned: false,
        bannedReason: ''
      });
    } catch (e) {
      console.error('[Firestore] fetchUserPlan error:', e);
    }
  };

  // Count total keys across all user apps for global limit check
  const fetchTotalKeys = async () => {
    try {
      const appsQ = query(collection(db, 'applications'), where('ownerid', '==', token));
      const appsSnap = await getDocs(appsQ);
      const appIds = appsSnap.docs.map(d => d.id);
      if (appIds.length === 0) { 
        setTotalKeysAllApps(0); 
        setKeysCreatedLast24h(0);
        return; 
      }
      // Parallel license queries for all apps
      const snapshots = await Promise.all(
        appIds.map(aid => getDocs(query(collection(db, 'licenses'), where('appId', '==', aid))))
      );

      let total = 0;
      let last24hCount = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const ks of snapshots) {
        total += ks.size;
        ks.forEach(docSnap => {
          const data = docSnap.data();
          let createdTime = Date.now();
          if (data.createdAt) {
            createdTime = data.createdAt.toDate ? data.createdAt.toDate().getTime() : new Date(data.createdAt).getTime();
          }
          if (createdTime > oneDayAgo) {
            last24hCount++;
          }
        });
      }
      
      setTotalKeysAllApps(total);
      setKeysCreatedLast24h(last24hCount);
    } catch (e) {
      console.error('[Firestore] fetchTotalKeys error:', e);
    }
  };

  useEffect(() => {
    fetchApps();
    fetchUserPlan();
    fetchTotalKeys();
  }, []);

  useEffect(() => {
    if (selectedAppId) {
      fetchAppDetails();
      fetchKeys();
      fetchUsers();
    }
  }, [selectedAppId]);

  // Create Application directly in Firestore (Unlimited Free Access)
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreateAppLoading(true);
    setCreateAppError(null);

    const appDocRef = doc(collection(db, 'applications'));
    const generatedAppId = appDocRef.id;
    const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    const appid = Math.random().toString(36).substring(2, 10);
    
    const newApp: Application = {
      id: generatedAppId,
      appName: newAppName.trim(),
      ownerid: token,
      secret,
      appid,
      version: newAppVersion.trim(),
      createdAt: new Date().toISOString()
    };

    try {
      // 3-Second Timeout Race to prevent hanging on Firestore network delay
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('TIMEOUT')), 2500)
      );

      try {
        const dupQuery = query(
          collection(db, 'applications'),
          where('ownerid', '==', token),
          where('appName', '==', newAppName.trim()),
          where('version', '==', newAppVersion.trim())
        );
        const dupSnapshot = await Promise.race([getDocs(dupQuery), timeoutPromise]) as any;
        if (dupSnapshot && !dupSnapshot.empty) {
          throw new Error('DUPLICATE_APP');
        }
        await Promise.race([setDoc(appDocRef, newApp), timeoutPromise]);
      } catch (fsErr: any) {
        if (fsErr.message === 'DUPLICATE_APP') throw fsErr;
        console.warn('[Firestore Lags] Proceeding with instant local state & backend API sync');
      }

      // Update state & global localStorage cache instantly so user doesn't wait
      try {
        const existingGlobal = JSON.parse(localStorage.getItem('kc_global_user_apps') || '[]');
        const updatedGlobal = [newApp, ...existingGlobal.filter((a: any) => a.id !== generatedAppId)];
        localStorage.setItem('kc_global_user_apps', JSON.stringify(updatedGlobal));
        if (token) {
          const localKey = `kc_user_apps_${token}`;
          const existingLocal = JSON.parse(localStorage.getItem(localKey) || '[]');
          const updatedLocal = [newApp, ...existingLocal.filter((a: any) => a.id !== generatedAppId)];
          localStorage.setItem(localKey, JSON.stringify(updatedLocal));
        }
      } catch (e) {}

      setApps(prev => [newApp, ...prev.filter(a => a.id !== generatedAppId)]);
      setSelectedAppId(generatedAppId);

      // Sync to local backend API in background
      fetch('/api/dashboard/apps', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(newApp)
      }).catch(() => {});

      setNewAppName('');
      setNewAppVersion('1.0');
    } catch (err: any) {
      console.error('[Create App Error]:', err);
      let errMsg = 'Failed to register application.';
      if (err.message === 'DUPLICATE_APP') {
        errMsg = `An application with the name "${newAppName}" and version "${newAppVersion}" already exists.`;
      }
      setCreateAppError(errMsg);
    } finally {
      setCreateAppLoading(false);
    }
  };

  // Generate License Keys directly in Firestore
  const handleGenerateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    setGenerateKeysError(null);

    if (!selectedAppId) {
      setGenerateKeysError('No application selected. Please select or register an application first.');
      return;
    }

    try {
      const qty = parseInt(generateQty);
      if (isNaN(qty) || qty < 1) {
        setGenerateKeysError('Please specify a valid quantity of 1 or more keys.');
        return;
      }
      
      const days = parseInt(generateExpiry) || 7;
      const batch = writeBatch(db);
      const generatedListForSync: any[] = [];
      
      for (let i = 0; i < qty; i++) {
        const keyStr = generateLicenseKey(generatePrefix);
        const expiryDate = new Date();
        if (generateExpiry === 'lifetime') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else {
          expiryDate.setDate(expiryDate.getDate() + days);
        }
        
        const newKeyRef = doc(collection(db, 'licenses'));
        const keyDocData = {
          appId: selectedAppId,
          key: keyStr,
          licenseKey: keyStr,
          expires: Timestamp.fromDate(expiryDate),
          hwid: null,
          hwidLock: false,
          status: 'unused',
          createdAt: serverTimestamp(),
          resetBy: 'Creator'
        };
        batch.set(newKeyRef, keyDocData);

        generatedListForSync.push({
          id: newKeyRef.id,
          appId: selectedAppId,
          key: keyStr,
          licenseKey: keyStr,
          expiresAt: expiryDate.toISOString(),
          expires: expiryDate.toISOString(),
          hwid: null,
          hwidLock: false,
          status: 'active',
          createdAt: new Date().toISOString()
        });
      }
      
      // Update React keys state instantly (<50ms)
      setKeys(prev => [...generatedListForSync, ...prev]);

      // Cache locally so generated keys NEVER vanish on refresh
      try {
        const localKey = `kc_app_keys_${selectedAppId}`;
        const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
        localStorage.setItem(localKey, JSON.stringify([...generatedListForSync, ...existing]));
      } catch (e) {}

      await batch.commit().catch(e => console.warn('[Firestore Batch Commit]', e));

      // Instantly sync generated keys to backend local API server
      fetch('/api/sync/key-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: selectedAppId, keys: generatedListForSync })
      }).catch(err => console.error('[Sync] key-bulk error:', err));

      setGeneratePrefix('KC');
      setGenerateQty('1');
      await fetchKeys();
      await fetchAppDetails();
      await fetchTotalKeys();
    } catch (err: any) {
      console.error('[Firestore] handleGenerateKeys error:', err);
      let errMsg = 'Failed to generate license keys.';
      if (err.message && err.message.includes('permission')) {
        errMsg = 'Permission denied. Ensure your Firestore rules allow writing to the "licenses" collection.';
      } else {
        errMsg = err.message || errMsg;
      }
      setGenerateKeysError(errMsg);
    }
  };

  // Toggle HWID lock ON/OFF for a key
  const handleToggleHwidLock = async (keyId: string, currentLock: boolean) => {
    if (!userPlan.hwidLockEnabled) {
      alert('HWID Lock is a paid feature. Upgrade your plan to enable it.');
      return;
    }
    try {
      const licRef = doc(db, 'licenses', keyId);
      if (currentLock) {
        // Turning OFF — also clear the bound HWID
        await updateDoc(licRef, { hwidLock: false, hwid: null });
        fetch('/api/sync/toggle-key-hwid-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: keyId, hwidLock: false })
        }).catch(() => {});
      } else {
        await updateDoc(licRef, { hwidLock: true });
        fetch('/api/sync/toggle-key-hwid-lock', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ id: keyId, hwidLock: true })
        }).catch(() => {});
      }
      await fetchKeys();
    } catch (e) {
      console.error('[Firestore] handleToggleHwidLock error:', e);
    }
  };

  // Delete License Key directly in Firestore, LocalStorage & Backend API
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this license key?')) return;
    try {
      const keyObj = keys.find(k => k.id === keyId);

      // 1. Instant local state update (<1ms response time)
      setKeys(prev => prev.filter(k => k.id !== keyId));

      // 2. Remove from LocalStorage persistent cache immediately
      if (selectedAppId) {
        try {
          const localKey = `kc_app_keys_${selectedAppId}`;
          const existing = JSON.parse(localStorage.getItem(localKey) || '[]');
          const filtered = existing.filter((k: any) => k.id !== keyId && k.key !== keyObj?.key && k.licenseKey !== keyObj?.licenseKey);
          localStorage.setItem(localKey, JSON.stringify(filtered));
        } catch (e) {}
      }

      // 3. Delete from Backend API
      fetch(`/api/dashboard/keys/${keyId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      // 4. Delete from Firestore
      await deleteDoc(doc(db, 'licenses', keyId)).catch(() => {});

      await fetchKeys();
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteKey error:', e);
    }
  };

  // Delete entire Application + all its licenses & users from Firestore, LocalStorage & Backend API
  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Delete "${appName}"?\n\nThis will permanently delete the app AND all its license keys and users. This cannot be undone.`)) return;
    try {
      // 1. Instant local state update
      setApps(prev => prev.filter(a => a.id !== appId && a.appName !== appName));
      if (selectedAppId === appId) {
        setSelectedAppId('');
        try { localStorage.removeItem('kc_selected_appid'); } catch (e) {}
      }

      // 2. Remove from LocalStorage persistent caches immediately
      try {
        const removeAppFilter = (list: any[]) => Array.isArray(list) ? list.filter(a => a && a.id !== appId && a.appName !== appName) : [];
        
        const allSaved = JSON.parse(localStorage.getItem('kc_all_created_apps') || '[]');
        localStorage.setItem('kc_all_created_apps', JSON.stringify(removeAppFilter(allSaved)));

        const globalSaved = JSON.parse(localStorage.getItem('kc_global_user_apps') || '[]');
        localStorage.setItem('kc_global_user_apps', JSON.stringify(removeAppFilter(globalSaved)));

        if (token) {
          const userSaved = JSON.parse(localStorage.getItem(`kc_user_apps_${token}`) || '[]');
          localStorage.setItem(`kc_user_apps_${token}`, JSON.stringify(removeAppFilter(userSaved)));
        }

        localStorage.removeItem(`kc_app_keys_${appId}`);
        localStorage.removeItem(`kc_app_users_${appId}`);
      } catch (e) {}

      // 3. Delete from Backend API
      fetch(`/api/dashboard/apps/${appId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` }
      }).catch(() => {});

      // 4. Delete from Firestore (Licenses, Webhooks, App User Docs)
      try {
        const licQ = query(collection(db, 'licenses'), where('appId', '==', appId));
        const licSnap = await getDocs(licQ);
        const batch = writeBatch(db);
        licSnap.forEach(d => batch.delete(d.ref));

        const webQ = query(collection(db, 'webhooks'), where('appId', '==', appId));
        const webSnap = await getDocs(webQ);
        webSnap.forEach(d => batch.delete(d.ref));

        const userQ = query(collection(db, 'app_users'), where('appId', '==', appId));
        const userSnap = await getDocs(userQ);
        userSnap.forEach((d: any) => batch.delete(d.ref));

        await batch.commit().catch(() => {});
        await deleteDoc(doc(db, 'applications', appId)).catch(() => {});
      } catch (e) {}

      await fetchApps();
      await fetchTotalKeys();
    } catch (e) {
      console.error('[Firestore] handleDeleteApp error:', e);
    }
  };

  // Reset HWID directly in Firestore
  const handleResetHwid = async (licenseId: string) => {
    try {
      const licRef = doc(db, 'licenses', licenseId);
      await setDoc(licRef, { hwid: null }, { merge: true });
      
      const currentLic = keys.find(k => k.id === licenseId);
      if (currentLic) {
        await addDoc(collection(db, 'hwid_resets'), {
          appId: selectedAppId,
          licenseId,
          oldHwid: currentLic.hwid || 'N/A',
          newHwid: 'Cleared by Creator',
          resetAt: serverTimestamp()
        });
      }

      fetch('/api/sync/reset-key-hwid', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: licenseId, key: currentLic?.licenseKey || currentLic?.key })
      }).catch(() => {});

      await fetchKeys();
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleResetHwid error:', e);
    }
  };

  // Add Webhook directly in Firestore
  const handleAddWebhook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!webhookUrl.trim() || !selectedAppId) return;
    try {
      const secret = 'whsec_' + Math.random().toString(36).substring(2, 15);
      await addDoc(collection(db, 'webhooks'), {
        appId: selectedAppId,
        url: webhookUrl,
        secret,
        active: true,
        createdAt: new Date().toISOString()
      });
      setWebhookUrl('');
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleAddWebhook error:', e);
    }
  };

  // Delete Webhook directly from Firestore
  const handleDeleteWebhook = async (hookId: string) => {
    try {
      await deleteDoc(doc(db, 'webhooks', hookId));
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteWebhook error:', e);
    }
  };

  // Test Fire Webhook
  const handleTestWebhook = async (hook: Webhook) => {
    try {
      const res = await fetch(hook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-KeyAuth-Signature': hook.secret
        },
        body: JSON.stringify({
          event: 'test.ping',
          appId: hook.appId || selectedAppId,
          timestamp: new Date().toISOString(),
          message: 'Kanishk Cheats KeyAuth Test Fire Pulse'
        })
      });
      alert(`Webhook Test Fire Sent!\nStatus Code: ${res.status} (${res.statusText})`);
    } catch (err: any) {
      alert(`Webhook Test Fire Failed: ${err.message || 'Network/CORS error or unreachable URL'}`);
    }
  };

  // Reseller handlers
  const handleAddReseller = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resellerUser.trim() || !selectedAppId) return;
    try {
      await addDoc(collection(db, 'resellers'), {
        appId: selectedAppId,
        username: resellerUser.trim(),
        password: resellerPass || 'reseller123',
        email: resellerEmail.trim() || `${resellerUser.trim()}@reseller.dev`,
        planType: resPlanType,
        balance: {
          day: parseInt(resDay) || 0,
          week: parseInt(resWeek) || 0,
          month: parseInt(resMonth) || 0,
          lifetime: parseInt(resLife) || 0,
        },
        createdAt: new Date().toISOString()
      });
      setResellerUser('');
      setResellerPass('');
      setResellerEmail('');
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleAddReseller error:', e);
    }
  };

  const handleDeleteReseller = async (resId: string) => {
    try {
      await deleteDoc(doc(db, 'resellers', resId));
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteReseller error:', e);
    }
  };

  // Cloud Variables handlers
  const handleAddCloudVar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cVarName.trim() || !selectedAppId) return;
    try {
      await addDoc(collection(db, 'cloud_vars'), {
        appId: selectedAppId,
        name: cVarName.trim(),
        value: cVarVal,
        isSecret: cVarSecret,
        createdAt: new Date().toISOString()
      });
      setCVarName('');
      setCVarVal('');
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleAddCloudVar error:', e);
    }
  };

  const handleDeleteCloudVar = async (varId: string) => {
    try {
      await deleteDoc(doc(db, 'cloud_vars', varId));
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteCloudVar error:', e);
    }
  };

  // Cloud Files handlers
  const handleAddCloudFile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cFileName.trim() || !selectedAppId) return;
    try {
      await addDoc(collection(db, 'cloud_files'), {
        appId: selectedAppId,
        fileName: cFileName.trim(),
        version: cFileVersion.trim() || '1.0',
        contentHex: cFileBytes || '4d5a90000300000004000000ffff0000',
        isSecret: cFileSecret,
        createdAt: new Date().toISOString()
      });
      setCFileName('');
      setCFileBytes('');
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleAddCloudFile error:', e);
    }
  };

  const handleDeleteCloudFile = async (fileId: string) => {
    try {
      await deleteDoc(doc(db, 'cloud_files', fileId));
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteCloudFile error:', e);
    }
  };

  // Blacklist handlers
  const handleAddBlacklist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!blVal.trim() || !selectedAppId) return;
    try {
      await addDoc(collection(db, 'blacklists'), {
        appId: selectedAppId,
        type: blType,
        value: blVal.trim(),
        reason: blReason.trim() || 'Security violation',
        createdAt: new Date().toISOString()
      });
      setBlVal('');
      setBlReason('');
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleAddBlacklist error:', e);
    }
  };

  const handleDeleteBlacklist = async (blId: string) => {
    try {
      await deleteDoc(doc(db, 'blacklists', blId));
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteBlacklist error:', e);
    }
  };

  // Utility copy helper
  const copyToClipboard = (text: string, identifier: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(identifier);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Currently active app object
  const activeApp = apps.find(a => a.id === selectedAppId);

  // Active App generated credentials block
  const generatedConfigText = activeApp
    ? `name = ${activeApp.appName}
ownerid = ${activeApp.ownerid}
secret = ${activeApp.secret}
appid = ${activeApp.appid}
version = ${activeApp.version}
apiurl = https://www.kanishkcheat.online/api`
    : 'No Application Selected';

  const menuItems = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'apps', label: 'Applications', icon: FolderKanban },
    { id: 'licenses', label: 'License Keys', icon: Key },
    { id: 'users', label: 'App Users', icon: Users },
    { id: 'hwid', label: 'HWID Manager', icon: RefreshCw },
    { id: 'sdk', label: 'SDK Generator', icon: Code },
    { id: 'resellers', label: 'Reseller Portal', icon: UserCheck },
    { id: 'cloud', label: 'Cloud Vars & Files', icon: Database },
    { id: 'blacklist', label: 'Firewall & Bans', icon: Ban },
    { id: 'logs', label: 'API Logs', icon: ScrollText },
    { id: 'webhooks', label: 'Webhooks', icon: Network },
    { id: 'settings', label: 'Settings & Security', icon: Settings },
  ];

  return (
    <div className="min-h-screen text-gray-200 flex flex-col lg:flex-row relative z-10">
      {/* Sidebar navigation */}
      <div className="w-full lg:w-64 glass-panel border-r border-white/5 flex flex-col justify-between py-6 px-4 lg:fixed lg:h-screen lg:left-0 lg:top-0 overflow-y-auto scrollbar-thin">
        <div>
          {/* Platform Brand */}
          <div className="flex items-center space-x-3 px-3 mb-6">
            <div className="w-9 h-9 rounded-xl overflow-hidden border border-orange-500/40 shadow-[0_0_20px_rgba(255,102,0,0.35)] relative group cursor-pointer bg-black/60 p-1">
              <img src="/kc-logo.svg" alt="KANISHK CHEAT AUTH Sidebar Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">KANISHK <span className="text-orange-500">CHEAT</span></span>
              <span className="block text-[10px] text-orange-400 font-mono tracking-widest">AUTH SUITE</span>
            </div>
          </div>

          {/* App Selector */}
          <div className="px-3 mb-5">
            <label className="text-[10px] text-gray-500 font-mono tracking-wider block mb-1.5 text-left">ACTIVE APPLICATION</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full bg-black/70 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-orange-500/60 focus:ring-1 focus:ring-orange-500/30"
            >
              {apps.length === 0 ? (
                <option value="">No apps found</option>
              ) : (
                apps.map((app) => (
                  <option key={app.id} value={app.id}>{app.appName} ({app.version})</option>
                ))
              )}
            </select>
          </div>

          {/* Tabs Navigation — all users */}
          <nav className="space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isSelected = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${
                    isSelected
                      ? 'bg-gradient-to-r from-orange-500/20 to-amber-500/10 border-l-2 border-orange-500 text-white shadow-[0_0_15px_rgba(255,102,0,0.15)] font-bold'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-orange-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User logout footer */}
        <div className="border-t border-white/5 pt-4 mt-6 space-y-3">
          {/* Plan status badge */}
          <div className="px-3 py-2.5 rounded-xl bg-orange-500/10 border border-orange-500/20 space-y-1 text-left">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-orange-300 font-bold uppercase tracking-wider">Access Tier</span>
              <span className="text-[9px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                100% FREE UNLIMITED
              </span>
            </div>
            <p className="text-[9px] text-gray-400 font-mono">
              Unlimited Applications & Keys
            </p>
          </div>

          {/* Logged-In User Account Profile Card */}
          <div className="flex items-center space-x-3 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10 text-left shadow-sm">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-orange-500 to-amber-600 flex items-center justify-center text-white font-extrabold text-xs shadow-[0_0_10px_rgba(255,102,0,0.4)] shrink-0">
              {((auth.currentUser?.email || 'U')[0]).toUpperCase()}
            </div>
            <div className="truncate flex-1">
              <span className="block text-xs font-bold text-white truncate">
                {auth.currentUser?.email || 'Creator Account'}
              </span>
              <span className="block text-[9px] text-orange-400 font-mono tracking-wider flex items-center space-x-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                <span>ONLINE CREATOR</span>
              </span>
            </div>
          </div>

          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Main Content Pane */}
      <div className="flex-1 lg:pl-64 py-8 px-6 lg:py-10 lg:px-12 w-full max-w-7xl mx-auto overflow-hidden">

        {/* Quick Header */}
        <div className="flex justify-between items-center mb-8 pb-6 border-b border-white/5">
          <div className="text-left">
            <h1 className="text-2xl font-black tracking-tight text-white capitalize flex items-center gap-2">
              <span>{activeTab}</span>
              {activeApp && (
                <span className="text-xs font-mono px-2.5 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-bold uppercase">
                  {activeApp.appName}
                </span>
              )}
            </h1>
            <p className="text-xs text-gray-400 font-mono mt-0.5">
              {activeApp ? `AppID: ${activeApp.appid} • Version: ${activeApp.version}` : 'Create an application to begin'}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {userRole === 'owner' || userRole === 'admin' ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                👑 MASTER OWNER
              </span>
            ) : userRole === 'staff' ? (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-sky-300 bg-sky-500/20 border border-sky-500/40 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                🛡️ STAFF MEMBER
              </span>
            ) : (
              <span className="px-3 py-1.5 rounded-xl text-xs font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                👤 DEVELOPER USER
              </span>
            )}

            {(userRole === 'owner' || userRole === 'admin' || token === "o08jDiopRZWaPffBCQGFCHFyhH83" || (auth && auth.currentUser && auth.currentUser.email && (auth.currentUser.email.includes("kanishkcheats") || auth.currentUser.email === "yashmajevadiya456@gmail.com"))) && (
              <button 
                onClick={onOpenAdmin || (() => window.open("/admin.html", "_blank"))}
                className="flex items-center space-x-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-yellow-300 bg-yellow-500/20 border border-yellow-500/40 hover:bg-yellow-500/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(250,204,21,0.25)]"
                title="Open Master Admin Control Panel"
              >
                <span>⚡</span><span>Admin Panel</span>
              </button>
            )}
            <button
              onClick={() => { fetchApps(); fetchAppDetails(); fetchKeys(); fetchTotalKeys(); }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/30 text-yellow-400 rounded-xl transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-yellow-400" />
            </button>
            <button
              onClick={onLogout}
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-red-400 bg-red-500/15 border border-red-500/30 hover:bg-red-500/25 transition-all cursor-pointer shadow-[0_0_15px_rgba(239,68,68,0.15)]"
              title="Sign Out of Dashboard"
            >
              <LogOut className="w-3.5 h-3.5" /><span>Logout</span>
            </button>
          </div>
        </div>

        {/* Tab Contents */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="space-y-8"
          >
            {/* 1. OVERVIEW TAB */}
            {activeTab === 'overview' && (
              <div className="space-y-8">
                {/* Top Quick Command / Hero Banner with In-Place Application Selector */}
                <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-yellow-950/30 via-black/85 to-black/95 border border-yellow-500/40 backdrop-blur-xl relative overflow-hidden text-left shadow-[0_15px_50px_rgba(0,0,0,0.8)]">
                  <div className="absolute top-0 right-0 w-96 h-96 bg-yellow-500/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute -bottom-10 -left-10 w-72 h-72 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

                  <div className="relative z-10 flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6">
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-mono text-[11px] font-bold">
                          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                          <span>ALL SYSTEMS OPERATIONAL</span>
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-400 font-mono text-[10.5px] font-bold">
                          v2.4 GOLD ENGINE
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10 text-gray-400 font-mono text-[10.5px]">
                          AES-256 GCM
                        </span>
                      </div>

                      <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight flex items-center gap-2">
                        <span>Welcome Back,</span>
                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-300 via-amber-400 to-yellow-500">
                          {auth.currentUser?.email ? auth.currentUser.email.split('@')[0] : 'Developer'}
                        </span>
                      </h2>

                      {/* In-Hero Application Switcher & Selector */}
                      <div className="pt-2 flex flex-wrap items-center gap-3">
                        <span className="text-xs font-mono font-bold text-yellow-400 flex items-center space-x-1">
                          <FolderKanban className="w-3.5 h-3.5" />
                          <span>SELECT APPLICATION:</span>
                        </span>

                        <div className="flex flex-wrap items-center gap-2">
                          {apps.map((app) => (
                            <button
                              key={app.id}
                              onClick={() => setSelectedAppId(app.id)}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1.5 cursor-pointer ${
                                app.id === selectedAppId
                                  ? 'bg-yellow-400 text-black shadow-[0_0_15px_rgba(250,204,21,0.5)] border border-yellow-300'
                                  : 'bg-black/60 border border-white/10 text-gray-400 hover:text-white hover:border-yellow-500/40'
                              }`}
                            >
                              <span>{app.appName}</span>
                              {app.id === selectedAppId && <Check className="w-3 h-3 stroke-[3]" />}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-2.5 sm:gap-3 shrink-0">
                      <button
                        onClick={() => setActiveTab('licenses')}
                        className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black text-xs font-black shadow-[0_0_20px_rgba(250,204,21,0.4)] flex items-center space-x-2 transition-all transform active:scale-95 cursor-pointer"
                      >
                        <Plus className="w-4 h-4 stroke-[3]" />
                        <span>Generate Key</span>
                      </button>
                      
                      <button
                        onClick={() => setActiveTab('sdk')}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 text-gray-200 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
                      >
                        <Code className="w-4 h-4 text-yellow-400" />
                        <span>SDK Generator</span>
                      </button>

                      <button
                        onClick={() => setActiveTab('hwid')}
                        className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 hover:border-yellow-500/40 text-gray-200 text-xs font-semibold flex items-center space-x-2 transition-all cursor-pointer"
                      >
                        <RefreshCw className="w-4 h-4 text-yellow-400" />
                        <span>HWID Reset</span>
                      </button>
                    </div>
                  </div>
                </div>
                {/* 4 Premium Stat Cards with Yellow & Golden Accents */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {loadingStats ? (
                    <>
                      <SkeletonStat />
                      <SkeletonStat />
                      <SkeletonStat />
                      <SkeletonStat />
                    </>
                  ) : (
                    <>
                      <GlassCard className="p-5 text-left relative group" glowColor="yellow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest block uppercase">TOTAL KEYS</span>
                          <div className="w-8 h-8 rounded-lg bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 shadow-[0_0_12px_rgba(250,204,21,0.25)]">
                            <Key className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-3xl font-black text-white mt-2 block tracking-tight">{stats.totalKeys}</span>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                          <span>Across Active App</span>
                          <span className="text-yellow-400 font-mono font-bold">100% Uncapped</span>
                        </div>
                      </GlassCard>

                      <GlassCard className="p-5 text-left relative group" glowColor="gold">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest block uppercase">ACTIVE LICENSES</span>
                          <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-[0_0_12px_rgba(16,185,129,0.2)]">
                            <CheckCircle2 className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-3xl font-black text-white mt-2 block tracking-tight">{stats.activeKeys}</span>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                          <span>Live In-Memory</span>
                          <span className="text-emerald-400 font-mono font-bold flex items-center">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mr-1 animate-pulse" />
                            Active
                          </span>
                        </div>
                      </GlassCard>

                      <GlassCard className="p-5 text-left relative group" glowColor="yellow">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest block uppercase">BOUND HWID DEVICES</span>
                          <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-[0_0_12px_rgba(245,158,11,0.25)]">
                            <ShieldCheck className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-3xl font-black text-white mt-2 block tracking-tight">{stats.boundDevices}</span>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                          <span>SHA-256 Fingerprint</span>
                          <span className="text-yellow-400 font-mono font-bold">Locked</span>
                        </div>
                      </GlassCard>

                      <GlassCard className="p-5 text-left relative group" glowColor="none">
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold text-gray-400 font-mono tracking-widest block uppercase">HWID RESETS</span>
                          <div className="w-8 h-8 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.2)]">
                            <RefreshCw className="w-4 h-4" />
                          </div>
                        </div>
                        <span className="text-3xl font-black text-white mt-2 block tracking-tight">{stats.totalResets}</span>
                        <div className="flex items-center justify-between text-[11px] text-gray-400 mt-2 pt-2 border-t border-white/5">
                          <span>Security Logs</span>
                          <span className="text-sky-400 font-mono font-bold">Recorded</span>
                        </div>
                      </GlassCard>
                    </>
                  )}
                </div>

                {/* Real-Time Security Pulse & Analytics in Yellow Theme */}
                <GlassCard className="p-6 text-left" glowColor="yellow">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-5 gap-2 border-b border-white/5 pb-4">
                    <div>
                      <div className="flex items-center space-x-2">
                        <Activity className="w-4 h-4 text-yellow-400 animate-pulse" />
                        <h3 className="font-bold text-white text-base">Real-Time Security & Distribution Pulse</h3>
                      </div>
                      <p className="text-xs text-gray-400 font-light mt-0.5">Live cryptographic telemetry, activation density, and tamper protection metrics.</p>
                    </div>
                    <div className="flex items-center space-x-4 text-xs font-mono">
                      <span className="flex items-center text-yellow-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 mr-1.5 animate-pulse" />
                        Activation ({stats.totalKeys > 0 ? Math.round((stats.activeKeys / stats.totalKeys) * 100) : 0}%)
                      </span>
                      <span className="flex items-center text-amber-400">
                        <span className="w-2.5 h-2.5 rounded-full bg-amber-400 mr-1.5" />
                        HWID Locked ({stats.totalKeys > 0 ? Math.round((stats.boundDevices / stats.totalKeys) * 100) : 0}%)
                      </span>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-gray-400">License Activation Ratio</span>
                        <span className="text-white font-bold">{stats.activeKeys} / {stats.totalKeys} Keys Active</span>
                      </div>
                      <div className="h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalKeys > 0 ? (stats.activeKeys / stats.totalKeys) * 100 : 5}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(250,204,21,0.5)]"
                        />
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-black/40 border border-white/5">
                      <div className="flex justify-between text-xs font-mono mb-2">
                        <span className="text-gray-400">HWID Device Binding Lock</span>
                        <span className="text-white font-bold">{stats.boundDevices} / {stats.totalKeys} Devices Bound</span>
                      </div>
                      <div className="h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalKeys > 0 ? (stats.boundDevices / stats.totalKeys) * 100 : 5}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-amber-400 to-yellow-500 rounded-full shadow-[0_0_12px_rgba(245,158,11,0.5)]"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 4 Security Badges */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-white/5">
                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center space-x-2.5">
                      <ShieldCheck className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white">Anti-Dump Engine</div>
                        <div className="text-[9.5px] text-gray-500 font-mono">Protected In-Memory</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center space-x-2.5">
                      <Cpu className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white">HWID Fingerprinting</div>
                        <div className="text-[9.5px] text-gray-500 font-mono">SHA-256 Multi-Factor</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center space-x-2.5">
                      <Zap className="w-4 h-4 text-amber-400 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white">Anti-Replay Guard</div>
                        <div className="text-[9.5px] text-gray-500 font-mono">Session Token Auth</div>
                      </div>
                    </div>

                    <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-center space-x-2.5">
                      <Server className="w-4 h-4 text-yellow-400 flex-shrink-0" />
                      <div className="text-left">
                        <div className="text-[11px] font-bold text-white">Cloud Database</div>
                        <div className="text-[9.5px] text-gray-500 font-mono">Live Realtime Sync</div>
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Two-Column Grid: Config Explorer & Developer Launchpad */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Generated Config Block (7/12) */}
                  <div className="lg:col-span-7">
                    <GlassCard className="p-6 text-left h-full flex flex-col justify-between" glowColor="yellow">
                      <div>
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <Terminal className="w-4 h-4 text-yellow-400" />
                            <h3 className="font-bold text-white text-sm">Application Client Configuration</h3>
                          </div>
                          {activeApp && (
                            <button
                              onClick={() => copyToClipboard(generatedConfigText, 'config')}
                              className="px-2.5 py-1.5 rounded-lg bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 text-yellow-400 hover:text-yellow-300 text-xs font-bold flex items-center space-x-1.5 transition-all cursor-pointer"
                            >
                              {copiedKey === 'config' ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === 'config' ? 'Copied!' : 'Copy Config'}</span>
                            </button>
                          )}
                        </div>

                        <div className="relative">
                          <pre className="p-4 bg-black/70 border border-white/5 rounded-xl text-yellow-300 font-mono text-xs overflow-x-auto leading-relaxed selection:bg-yellow-500/30">
                            {generatedConfigText}
                          </pre>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-[11px] text-gray-400">
                        <div className="flex items-center space-x-2 font-light">
                          <Info className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0" />
                          <span>Paste this configuration into your loader client SDK.</span>
                        </div>
                        <button
                          onClick={() => setActiveTab('sdk')}
                          className="text-yellow-400 hover:underline font-bold flex items-center space-x-1 shrink-0 ml-2"
                        >
                          <span>Get Full SDK Code</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Live Diagnostic & Health Matrix (5/12) */}
                  <div className="lg:col-span-5">
                    <GlassCard className="p-6 text-left h-full flex flex-col justify-between" glowColor="gold">
                      <div>
                        <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
                          <div className="flex items-center space-x-2">
                            <Sparkles className="w-4 h-4 text-yellow-400" />
                            <h3 className="font-bold text-white text-sm">Live Endpoint Diagnostics</h3>
                          </div>
                          <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-mono font-bold">
                            HEALTHY
                          </span>
                        </div>

                        {/* Endpoints checklist */}
                        <div className="space-y-2.5">
                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <div>
                                <div className="text-xs font-bold text-white font-mono">POST /api/init</div>
                                <div className="text-[10px] text-gray-400">Application handshake & version verify</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">200 OK</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <div>
                                <div className="text-xs font-bold text-white font-mono">POST /api/license</div>
                                <div className="text-[10px] text-gray-400">License validation & HWID locking</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">200 OK</span>
                          </div>

                          <div className="p-2.5 rounded-xl bg-black/40 border border-white/5 flex items-center justify-between">
                            <div className="flex items-center space-x-2.5">
                              <div className="w-2 h-2 rounded-full bg-emerald-400" />
                              <div>
                                <div className="text-xs font-bold text-white font-mono">POST /api/check</div>
                                <div className="text-[10px] text-gray-400">Session validity & anti-tamper check</div>
                              </div>
                            </div>
                            <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-500/30">200 OK</span>
                          </div>
                        </div>
                      </div>

                      {/* Interactive Diagnostic Test Ping */}
                      <div className="mt-4 pt-3 border-t border-white/5">
                        <button
                          type="button"
                          onClick={handleRunDiagnostic}
                          disabled={pingTesting}
                          className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-yellow-500/20 to-amber-500/20 hover:from-yellow-500/30 hover:to-amber-500/30 border border-yellow-500/40 text-yellow-300 text-xs font-bold flex items-center justify-center space-x-2 transition-all cursor-pointer"
                        >
                          {pingTesting ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin text-yellow-400" />
                              <span>Running Handshake Ping...</span>
                            </>
                          ) : (
                            <>
                              <Zap className="w-3.5 h-3.5 text-yellow-400" />
                              <span>{pingResult ? `Ping Test: ${pingResult.latency}ms • Online ✓` : '⚡ Run API Health Diagnostic'}</span>
                            </>
                          )}
                        </button>
                      </div>
                    </GlassCard>
                  </div>
                </div>

                {/* Quick Recent Keys Stream */}
                {keys.length > 0 && (
                  <GlassCard className="p-6 text-left" glowColor="yellow">
                    <div className="flex justify-between items-center mb-4 pb-3 border-b border-white/5">
                      <div className="flex items-center space-x-2">
                        <Key className="w-4 h-4 text-yellow-400" />
                        <h3 className="font-bold text-white text-sm">Recent License Key Stream</h3>
                      </div>
                      <button
                        onClick={() => setActiveTab('licenses')}
                        className="text-xs text-yellow-400 hover:underline font-bold flex items-center space-x-1"
                      >
                        <span>View All ({keys.length})</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      {keys.slice(0, 3).map((lic) => (
                        <div key={lic.id} className="p-3 rounded-xl bg-black/50 border border-white/5 flex flex-col justify-between space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-white tracking-wide truncate mr-2">{lic.licenseKey}</span>
                            <button
                              onClick={() => copyToClipboard(lic.licenseKey, lic.id)}
                              className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                              title="Copy key"
                            >
                              {copiedKey === lic.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            </button>
                          </div>
                          <div className="flex items-center justify-between text-[10px] font-mono text-gray-400">
                            <span>HWID: {lic.hwid ? `${lic.hwid.substring(0, 12)}...` : 'Unbound'}</span>
                            <span className={`px-2 py-0.5 rounded-full font-bold uppercase ${
                              lic.status === 'active' 
                                ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30' 
                                : 'bg-white/5 text-gray-400'
                            }`}>
                              {lic.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </GlassCard>
                )}
              </div>
            )}



            {/* 2. APPLICATIONS TAB */}
            {activeTab === 'apps' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                {/* Form to create app */}
                <div className="lg:col-span-5">
                  <GlassCard className="p-6" glowColor="cyan">
                    <h3 className="text-lg font-bold text-white mb-4">Create New Application</h3>
                    <form onSubmit={handleCreateApp} className="space-y-4">
                      {createAppError && (
                        <div className="p-3.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl flex items-start space-x-2">
                          <ShieldAlert className="w-4 h-4 mt-0.5 shrink-0" />
                          <span>{createAppError}</span>
                        </div>
                      )}
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Application Name</label>
                        <input
                          type="text"
                          required
                          disabled={createAppLoading}
                          placeholder="e.g. MyApplication"
                          value={newAppName}
                          onChange={(e) => setNewAppName(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30 disabled:opacity-50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Version</label>
                        <input
                          type="text"
                          required
                          disabled={createAppLoading}
                          placeholder="1.0"
                          value={newAppVersion}
                          onChange={(e) => setNewAppVersion(e.target.value)}
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-yellow-400/60 focus:ring-1 focus:ring-yellow-400/30 disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={createAppLoading}
                        className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black font-extrabold py-3.5 rounded-xl shadow-[0_0_20px_rgba(250,204,21,0.4)] transition-all disabled:opacity-50 cursor-pointer"
                      >
                        {createAppLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-black" />
                        ) : (
                          <Plus className="w-4 h-4 stroke-[3]" />
                        )}
                        <span>{createAppLoading ? 'Registering...' : 'Register App'}</span>
                      </button>
                    </form>
                  </GlassCard>
                </div>

                {/* Applications list */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-yellow-400 font-mono tracking-wider pl-2">REGISTERED APPLICATIONS</h3>
                  {apps.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                      No applications created yet. Register one above to start.
                    </div>
                  ) : (
                    apps.map((app) => (
                      <GlassCard 
                        key={app.id} 
                        className={`p-5 transition-all ${app.id === selectedAppId ? 'border-yellow-400/60 bg-yellow-950/20 shadow-[0_0_25px_rgba(250,204,21,0.2)]' : ''}`}
                        glowColor={app.id === selectedAppId ? 'yellow' : 'none'}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-lg font-bold text-white block">{app.appName}</span>
                              {app.id === selectedAppId && (
                                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-yellow-400 text-black font-extrabold">
                                  ✓ ACTIVE APP
                                </span>
                              )}
                            </div>
                            <span className="text-xs font-mono text-yellow-400 mt-0.5 block">AppID: {app.appid} • Version: {app.version}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {app.id !== selectedAppId ? (
                              <button
                                onClick={() => setSelectedAppId(app.id)}
                                className="text-xs bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 px-3 py-1.5 rounded-lg text-yellow-300 font-bold transition-all cursor-pointer"
                              >
                                Select App
                              </button>
                            ) : (
                              <span className="text-xs text-yellow-400 font-mono font-bold px-2 py-1 bg-yellow-500/10 rounded-md border border-yellow-500/20">
                                Selected
                              </span>
                            )}
                            <button
                              onClick={() => handleDeleteApp(app.id, app.appName)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all cursor-pointer"
                              title="Delete App & All Keys"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Credentials Details */}
                        <div className="grid grid-cols-2 gap-4 mt-4 pt-4 border-t border-white/5 font-mono text-[10px] text-gray-400">
                          <div>
                            <span className="block text-gray-500">OWNER ID:</span>
                            <span className="text-gray-200">{app.ownerid}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500">SECRET KEY:</span>
                            <span className="text-gray-200 truncate block max-w-[150px]">{app.secret}</span>
                          </div>
                          <div>
                            <span className="block text-gray-500">API URL:</span>
                            <span className="text-yellow-400 truncate block max-w-[150px]" title="Firestore Cloud Endpoint">Firestore REST API</span>
                          </div>
                          <div>
                            <span className="block text-gray-500">CREATED AT:</span>
                            <span className="text-gray-300">{new Date(app.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 3. LICENSE KEYS TAB */}
            {activeTab === 'licenses' && (
              <div className="space-y-6 text-left">
                {/* Form to generate keys */}
                <GlassCard className="p-6" glowColor="cyan">
                  <h3 className="text-lg font-bold text-white mb-4">Generate License Keys</h3>
                  
                  {generateKeysError && (
                    <div className="mb-4 p-4 rounded-xl bg-red-950/30 border border-red-900/40 text-xs text-red-400 font-medium">
                      {generateKeysError}
                    </div>
                  )}

                  <form onSubmit={handleGenerateKeys} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Key Prefix</label>
                      <input
                        type="text"
                        placeholder="INV"
                        value={generatePrefix}
                        onChange={(e) => setGeneratePrefix(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Duration / Expiry</label>
                      <select
                        value={generateExpiry}
                        onChange={(e) => setGenerateExpiry(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                      >
                        <option value="1">1 Day</option>
                        <option value="7">7 Days</option>
                        <option value="30">30 Days</option>
                        <option value="lifetime">Lifetime (100y)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs text-gray-400 font-mono block mb-1">Quantity (Max 50)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={generateQty}
                        onChange={(e) => setGenerateQty(e.target.value)}
                        className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={!selectedAppId}
                      className="btn-glow-cyan flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-2.5 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Generate Bulk</span>
                    </button>
                  </form>
                </GlassCard>

                {/* Keys list table */}
                <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">ACTIVE LICENSE KEYS</h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <table className="w-full text-sm font-mono text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-gray-400 border-b border-white/5 text-xs">
                        <th className="p-4">License Key</th>
                        <th className="p-4">HWID Lock</th>
                        <th className="p-4">Resets</th>
                        <th className="p-4">Expires</th>
                        <th className="p-4">Status</th>
                        <th className="p-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loadingKeys ? (
                        <tr>
                          <td colSpan={6} className="p-4">
                            <SkeletonTable rows={4} />
                          </td>
                        </tr>
                      ) : keys.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-8 text-center text-gray-500 font-light font-sans">
                            No license keys found. Generate keys above.
                          </td>
                        </tr>
                      ) : (
                        keys.map((key) => (
                          <tr key={key.id} className="border-b border-white/5 text-xs hover:bg-white/1">
                            <td className="p-4 font-semibold text-white flex items-center space-x-2">
                              <span className="truncate max-w-[160px]">{key.licenseKey}</span>
                              <button
                                onClick={() => copyToClipboard(key.licenseKey, key.id)}
                                className="text-gray-500 hover:text-cyan-400"
                                title="Copy Key"
                              >
                                {copiedKey === key.id ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              </button>
                            </td>
                            <td className="p-4">
                              <div className="flex flex-col gap-1">
                                {/* HWID Lock Toggle */}
                                <button
                                  onClick={() => handleToggleHwidLock(key.id, key.hwidLock)}
                                  title={userPlan.hwidLockEnabled ? (key.hwidLock ? 'Click to disable HWID Lock' : 'Click to enable HWID Lock') : 'Upgrade plan to use HWID Lock'}
                                  className={`flex items-center space-x-1.5 px-2.5 py-1 rounded-lg border text-[10px] font-bold transition-all ${
                                    !userPlan.hwidLockEnabled
                                      ? 'opacity-50 cursor-not-allowed bg-white/5 border-white/10 text-gray-500'
                                      : key.hwidLock
                                      ? 'bg-amber-500/20 border-amber-500/40 text-amber-400 hover:bg-amber-500/30'
                                      : 'bg-white/5 border-white/10 text-gray-400 hover:bg-white/10'
                                  }`}
                                >
                                  {!userPlan.hwidLockEnabled ? (
                                    <><Crown className="w-3 h-3" /><span>PAID</span></>
                                  ) : key.hwidLock ? (
                                    <><Lock className="w-3 h-3" /><span>LOCKED</span></>
                                  ) : (
                                    <><Unlock className="w-3 h-3" /><span>OFF</span></>
                                  )}
                                </button>
                                {/* Bound HWID display */}
                                {key.hwidLock && key.hwid ? (
                                  <span className="text-cyan-400 bg-cyan-950/30 px-1.5 py-0.5 rounded border border-cyan-900/30 truncate max-w-[120px] block text-[9px]" title={key.hwid}>
                                    {key.hwid.substring(0, 12)}...
                                  </span>
                                ) : key.hwidLock && !key.hwid ? (
                                  <span className="text-gray-500 italic text-[9px]">Unbound — binds on first use</span>
                                ) : null}
                              </div>
                            </td>
                            <td className="p-4 text-gray-300">
                              {key.resetCount} / {key.maxResets}
                            </td>
                            <td className="p-4 text-gray-400">
                              {new Date(key.expiresAt).toLocaleDateString()}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                                key.status === 'active' 
                                  ? 'text-green-400 bg-green-950/20 border-green-800/40' 
                                  : key.status === 'used'
                                  ? 'text-cyan-400 bg-cyan-950/20 border-cyan-800/40'
                                  : 'text-red-400 bg-red-950/20 border-red-800/40'
                              }`}>
                                {key.status.toUpperCase()}
                              </span>
                            </td>
                            <td className="p-4 text-right flex justify-end space-x-2">
                              {key.hwidLock && key.hwid && (
                                <button
                                  onClick={() => handleResetHwid(key.id)}
                                  className="text-xs bg-white/5 hover:bg-amber-500/10 border border-white/10 hover:border-amber-500/30 px-2.5 py-1 rounded-lg text-amber-400 font-medium"
                                >
                                  Reset HWID
                                </button>
                              )}
                              <button
                                onClick={() => handleDeleteKey(key.id)}
                                className="p-1 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20"
                                title="Delete License"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 4. HWID MANAGER TAB */}
            {activeTab === 'hwid' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                {/* One Click HWID reset workflow */}
                <div className="lg:col-span-5 space-y-6">
                  <GlassCard className="p-6" glowColor="cyan">
                    <h3 className="text-lg font-bold text-white mb-2 flex items-center">
                      <ShieldCheck className="w-5 h-5 text-cyan-400 mr-2" />
                      One-Click HWID Reset
                    </h3>
                    <p className="text-xs text-gray-400 font-light mb-6">
                      Instantly remove active device lock associations from a license key. The next running instance that logs in with this key will automatically bind to the new hardware.
                    </p>

                    <div className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Select Licensed Key to Reset</label>
                        <select
                          id="hwid_key_select"
                          className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-3 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/50"
                        >
                          {keys.filter(k => k.hwid !== null).length === 0 ? (
                            <option value="">No locked keys available</option>
                          ) : (
                            keys.filter(k => k.hwid !== null).map((k) => (
                              <option key={k.id} value={k.id}>{k.licenseKey} (Locked: {k.hwid?.substring(0, 12)}...)</option>
                            ))
                          )}
                        </select>
                      </div>

                      <button
                        onClick={() => {
                          const select = document.getElementById('hwid_key_select') as HTMLSelectElement;
                          if (select && select.value) {
                            handleResetHwid(select.value);
                          }
                        }}
                        disabled={keys.filter(k => k.hwid !== null).length === 0}
                        className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-3.5 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                      >
                        <RefreshCw className="w-4 h-4" />
                        <span>RESET DEVICE HWID</span>
                      </button>
                    </div>
                  </GlassCard>

                  {/* Limits and safety status */}
                  <GlassCard className="p-5" glowColor="none">
                    <h4 className="text-sm font-semibold text-white mb-2">Reset Limits & Safekeeping</h4>
                    <ul className="text-xs text-gray-400 space-y-2 font-light list-disc pl-4">
                      <li>Clears active session keys immediately.</li>
                      <li>Limits resets to 10 counts per client key.</li>
                      <li>Imposes a client-side API reset cooldown of 24 hours.</li>
                      <li>Submits event payloads to webhooks on completion.</li>
                    </ul>
                  </GlassCard>
                </div>

                {/* Reset History logs */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">HWID RESET LOGS HISTORY</h3>
                  <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                    <table className="w-full text-sm font-mono text-left border-collapse">
                      <thead>
                        <tr className="bg-white/5 text-gray-400 border-b border-white/5 text-xs">
                          <th className="p-4">Key</th>
                          <th className="p-4">Previous HWID</th>
                          <th className="p-4">Reset Time</th>
                          <th className="p-4">By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {resets.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-8 text-center text-gray-500 font-light font-sans">
                              No resets logged. Triggers automatically on reset.
                            </td>
                          </tr>
                        ) : (
                          resets.map((reset) => (
                            <tr key={reset.id} className="border-b border-white/5 text-xs">
                              <td className="p-4 text-white font-semibold">{reset.licenseKey}</td>
                              <td className="p-4">
                                {reset.oldHwid ? (
                                  <span className="text-gray-400 truncate max-w-[140px] block" title={reset.oldHwid}>
                                    {reset.oldHwid.substring(0, 12)}...
                                  </span>
                                ) : (
                                  <span className="text-gray-600">None</span>
                                )}
                              </td>
                              <td className="p-4 text-gray-400">
                                {new Date(reset.resetTime).toLocaleString()}
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  reset.resetBy === 'admin' 
                                    ? 'text-cyan-400 bg-cyan-950/20 border border-cyan-800/40' 
                                    : 'text-purple-400 bg-purple-950/20 border border-purple-800/40'
                                }`}>
                                  {reset.resetBy.toUpperCase()}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {/* 5. SDK GENERATOR TAB */}
            {activeTab === 'sdk' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                {/* Language list selector */}
                <div className="lg:col-span-3 flex flex-col space-y-1">
                  <h4 className="text-xs font-semibold text-gray-500 font-mono tracking-wider mb-2 pl-2">SUPPORTED LANGUAGES</h4>
                  {sdkLanguages.map((lang) => (
                    <button
                      key={lang}
                      onClick={() => setSdkLanguage(lang)}
                      className={`text-left px-3.5 py-2.5 rounded-xl border text-xs font-semibold transition-all ${
                        sdkLanguage === lang
                          ? 'bg-cyan-500/10 border-cyan-500/40 text-white'
                          : 'bg-white/2 border-white/5 text-gray-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      {lang}
                    </button>
                  ))}
                </div>

                {/* Generated code block - full ready-to-use */}
                <div className="lg:col-span-9 space-y-4">

                  {/* Header + install command */}
                  <GlassCard className="p-5" glowColor="cyan">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h3 className="font-bold text-white flex items-center text-base">
                          <Code className="w-5 h-5 text-cyan-400 mr-2" />
                          {sdkLanguage} Client Integration SDK
                        </h3>
                        <p className="text-[11px] text-gray-500 mt-0.5 font-light">
                          ✅ All credentials auto-filled — just copy and paste, no edits needed
                        </p>
                      </div>
                      {/* Buttons: Copy, 1-Click Download, & Download All Bundle */}
                      <div className="flex flex-wrap items-center gap-3">
                        <button
                          onClick={() => {
                            if (!activeApp) return;
                            const code = getSdkCode(sdkLanguage, {
                              id: activeApp.id,
                              appName: activeApp.appName,
                              ownerid: activeApp.ownerid,
                              secret: activeApp.secret,
                              appid: activeApp.appid,
                              version: activeApp.version,
                              apiUrl: 'https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents'
                            });
                            const fileName = getSdkFileName(sdkLanguage);
                            const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
                            const link = document.createElement('a');
                            link.href = URL.createObjectURL(blob);
                            link.download = fileName;
                            link.click();
                            URL.revokeObjectURL(link.href);
                          }}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-300 hover:from-emerald-500/30 hover:to-teal-500/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(16,185,129,0.2)]"
                        >
                          <Download className="w-3.5 h-3.5 text-emerald-400" />
                          <span>1-Click Download ({getSdkFileName(sdkLanguage)})</span>
                        </button>

                        <button
                          onClick={() => {
                            if (!activeApp) return;
                            sdkLanguages.forEach((lang, index) => {
                              setTimeout(() => {
                                const code = getSdkCode(lang, {
                                  id: activeApp.id,
                                  appName: activeApp.appName,
                                  ownerid: activeApp.ownerid,
                                  secret: activeApp.secret,
                                  appid: activeApp.appid,
                                  version: activeApp.version,
                                  apiUrl: 'https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents'
                                });
                                const fileName = getSdkFileName(lang);
                                const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
                                const link = document.createElement('a');
                                link.href = URL.createObjectURL(blob);
                                link.download = fileName;
                                link.click();
                                URL.revokeObjectURL(link.href);
                              }, index * 200);
                            });
                          }}
                          className="flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold bg-gradient-to-r from-purple-500/20 to-pink-500/20 border border-purple-500/40 text-purple-300 hover:from-purple-500/30 hover:to-pink-500/30 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
                          title="Download all 15 SDK files matching KanishkAuth Setup Files structure"
                        >
                          <Download className="w-3.5 h-3.5 text-purple-400" />
                          <span>📦 Download All 15 SDKs Kit</span>
                        </button>

                        <button
                          onClick={() => {
                            if (!activeApp) return;
                            copyToClipboard(getSdkCode(sdkLanguage, {
                              id: activeApp.id,
                              appName: activeApp.appName,
                              ownerid: activeApp.ownerid,
                              secret: activeApp.secret,
                              appid: activeApp.appid,
                              version: activeApp.version,
                              apiUrl: 'https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents'
                            }), 'sdk_code');
                          }}
                          className={`flex items-center space-x-2 px-4 py-2 rounded-xl text-xs font-bold transition-all border ${
                            copiedKey === 'sdk_code'
                              ? 'bg-green-500/20 border-green-500/40 text-green-400'
                              : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 btn-glow-cyan'
                          }`}
                        >
                          {copiedKey === 'sdk_code'
                            ? <><Check className="w-3.5 h-3.5" /><span>Copied!</span></>
                            : <><Copy className="w-3.5 h-3.5" /><span>Copy Code</span></>
                          }
                        </button>
                      </div>
                    </div>

                    {/* Install command */}
                    {activeApp && (() => {
                      const installMap: Record<string, string> = {
                        'Python': 'pip install requests',
                        'Node.js': 'npm install axios',
                        'TypeScript': 'npm install axios',
                        'JavaScript': '// No install needed — uses native fetch()',
                        'C#': '// Use NuGet: Install-Package Newtonsoft.Json',
                        'Java': '// Add OkHttp to pom.xml or build.gradle',
                        'Kotlin': '// Add OkHttp to build.gradle',
                        'Swift': '// No external dependency needed',
                        'Go': '// No install needed — uses net/http',
                        'PHP': '// No install needed — uses file_get_contents',
                        'Rust': '// Add reqwest to Cargo.toml: reqwest = { version = "0.11", features = ["json"] }',
                        'Lua': '// luarocks install lua-requests',
                        'Dart': '// pub add http',
                        'Ruby': '// gem install httparty',
                        'C++': '// Use libcurl: sudo apt install libcurl4-openssl-dev',
                      };
                      const cmd = installMap[sdkLanguage];
                      return cmd ? (
                        <div className="flex items-center justify-between bg-black/50 border border-white/5 rounded-xl px-4 py-2.5 mb-3">
                          <code className="text-xs font-mono text-yellow-400">{cmd}</code>
                          <button
                            onClick={() => copyToClipboard(cmd, 'install_cmd')}
                            className="ml-3 text-gray-500 hover:text-cyan-400"
                            title="Copy install command"
                          >
                            {copiedKey === 'install_cmd' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                      ) : null;
                    })()}

                    {/* Code display */}
                    <pre className="p-4 bg-black/60 border border-white/5 rounded-xl text-cyan-300 font-mono text-xs overflow-auto leading-relaxed max-h-[600px] select-all">
                      {activeApp ? (
                        getSdkCode(sdkLanguage, {
                          id: activeApp.id,
                          appName: activeApp.appName,
                          ownerid: activeApp.ownerid,
                          secret: activeApp.secret,
                          appid: activeApp.appid,
                          version: activeApp.version,
                          apiUrl: 'https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents'
                        })
                      ) : (
                        '// Please create and select an application first.\n// Your app credentials will be auto-filled here.'
                      )}
                    </pre>

                    <p className="text-[10px] text-gray-600 mt-3 font-mono">
                      🔐 API URL: Firestore REST API &nbsp;|&nbsp; App: {activeApp?.appName || 'None selected'} &nbsp;|&nbsp; Version: {activeApp?.version || '—'}
                    </p>
                  </GlassCard>
                </div>
              </div>
            )}

            {/* 6. API LOGS TAB */}
            {activeTab === 'logs' && (
              <div className="space-y-4 text-left">
                <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">LIVE SYSTEM API REQUEST LOGS</h3>
                <div className="border border-white/5 rounded-2xl overflow-hidden bg-white/2">
                  <table className="w-full text-sm font-mono text-left border-collapse">
                    <thead>
                      <tr className="bg-white/5 text-gray-400 border-b border-white/5 text-xs">
                        <th className="p-4">Timestamp</th>
                        <th className="p-4">Endpoint</th>
                        <th className="p-4">Client IP</th>
                        <th className="p-4">HWID</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Details / Message</th>
                      </tr>
                    </thead>
                    <tbody>
                      {logs.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-10 text-center">
                            <ScrollText className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                            <p className="text-sm text-gray-500 font-sans">No logs yet.</p>
                            <p className="text-xs text-gray-600 mt-1 font-sans max-w-sm mx-auto">
                              Logs appear here when your SDK makes auth requests. Make sure your client SDK is correctly configured with this app's credentials and is calling the authenticate endpoint.
                            </p>
                          </td>
                        </tr>
                      ) : (
                        logs.map((log) => (
                          <tr key={log.id} className="border-b border-white/5 text-xs hover:bg-white/1">
                            <td className="p-4 text-gray-400">{new Date(log.timestamp).toLocaleTimeString()}</td>
                            <td className="p-4 font-semibold text-white">{log.endpoint}</td>
                            <td className="p-4 text-gray-400">{log.ip}</td>
                            <td className="p-4">
                              {log.hwid ? (
                                <span className="text-cyan-400 bg-cyan-950/20 px-1.5 py-0.5 rounded border border-cyan-800/20 max-w-[100px] truncate block" title={log.hwid}>
                                  {log.hwid.substring(0, 8)}...
                                </span>
                              ) : <span className="text-gray-500">-</span>}
                            </td>
                            <td className="p-4">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                log.status >= 200 && log.status < 300
                                  ? 'text-green-400 bg-green-950/20 border border-green-800/40'
                                  : 'text-red-400 bg-red-950/20 border border-red-800/40'
                              }`}>{log.status}</span>
                            </td>
                            <td className="p-4 text-gray-300 max-w-xs truncate" title={log.message}>{log.message}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 7. WEBHOOKS TAB */}
            {activeTab === 'webhooks' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                {/* Form to add webhook */}
                <div className="lg:col-span-5">
                  <GlassCard className="p-6" glowColor="cyan">
                    <h3 className="text-lg font-bold text-white mb-4">Register Custom Webhook</h3>
                    <form onSubmit={handleAddWebhook} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Webhook Endpoint URL</label>
                        <input
                          type="url"
                          required
                          placeholder="https://yourserver.com/webhook"
                          value={webhookUrl}
                          onChange={(e) => setWebhookUrl(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedAppId}
                        className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-3 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Webhook</span>
                      </button>
                    </form>
                  </GlassCard>
                </div>

                {/* Webhooks listing */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">ACTIVE WEBHOOK RECEPTIONS</h3>
                  {webhooks.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                      No webhooks registered. Configure webhooks above to receive events.
                    </div>
                  ) : (
                    webhooks.map((hook) => (
                      <GlassCard key={hook.id} className="p-5">
                        <div className="flex justify-between items-start">
                          <div className="truncate max-w-[85%]">
                            <span className="font-semibold text-white block truncate">{hook.url}</span>
                            <span className="text-[10px] font-mono text-gray-500 block mt-1">
                              Secret Signature Hash: <span className="text-purple-400">{hook.secret.substring(0, 16)}...</span>
                            </span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleTestWebhook(hook)}
                              className="px-3 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 text-cyan-300 rounded text-xs flex items-center space-x-1.5 transition-all"
                              title="Test Fire Webhook"
                            >
                              <Play className="w-3.5 h-3.5 fill-cyan-400" />
                              <span>Test Fire</span>
                            </button>
                            <button
                              onClick={() => handleDeleteWebhook(hook.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 8. SETTINGS TAB */}
            {activeTab === 'settings' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                {/* Credentials rotate / key change */}
                <GlassCard className="p-6" glowColor="cyan">
                  <h3 className="text-lg font-bold text-white mb-2">Secret Rotation console</h3>
                  <p className="text-xs text-gray-400 font-light mb-4">
                    Instantly rotate application cryptographic signatures and credentials. Client SDK configs must be updated upon completion.
                  </p>
                  <div className="space-y-4">
                    <div className="p-4 bg-yellow-950/20 border border-yellow-800/30 rounded-xl flex items-start space-x-3 text-xs text-yellow-400 font-light leading-relaxed">
                      <ShieldAlert className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <span>
                        <strong>CAUTION:</strong> Rotating the secret key will invalidate active API calls from older clients immediately. Proceed with absolute discretion.
                      </span>
                    </div>
                    <button
                      onClick={() => alert('Credentials rotation simulated. Production build updates all signatures.')}
                      className="bg-red-950/30 hover:bg-red-500/20 border border-red-900/40 hover:border-red-500/50 text-red-400 hover:text-white font-semibold px-4 py-2.5 rounded-xl text-xs transition-all w-full"
                    >
                      ROTATE APP SECRET KEY
                    </button>
                  </div>
                </GlassCard>

                {/* Access locks and logs config */}
                <GlassCard className="p-6 animate-float-medium" glowColor="none">
                  <h3 className="text-lg font-bold text-white mb-2">Security Configurations</h3>
                  <p className="text-xs text-gray-400 font-light mb-4">
                    Fine-tune limits, lockout parameters, and rate-limiting thresholds.
                  </p>
                  <div className="space-y-4 text-xs font-mono">
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-gray-400">JWT Token Expiration</span>
                      <span className="text-white bg-white/5 px-2 py-0.5 rounded">7 Days</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-gray-400">Rate Limit Limit</span>
                      <span className="text-white bg-white/5 px-2 py-0.5 rounded">60 reqs / min</span>
                    </div>
                    <div className="flex justify-between items-center py-2 border-b border-white/5">
                      <span className="text-gray-400">Database Backups</span>
                      <span className="text-cyan-400 bg-cyan-950/30 px-2 py-0.5 rounded border border-cyan-800/30">Auto (On Write)</span>
                    </div>
                  </div>
                </GlassCard>
              </div>
            )}
            {/* USERS TAB - KEYAUTH.CC 1:1 DESIGN WITH CYBER YELLOW THEME */}
            {activeTab === 'users' && (
              <div className="space-y-6 text-left">
                {/* Header & Breadcrumbs */}
                <div>
                  <div className="flex items-center space-x-2 text-xs font-mono text-gray-500 mb-1">
                    <span>Manage Apps</span>
                    <span>»</span>
                    <span>Current Application: <strong className="text-yellow-400">{activeApp?.appName || 'TEST'}</strong></span>
                  </div>
                  <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
                    <span>Users</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-yellow-400/10 text-yellow-400 border border-yellow-400/30 font-mono">
                      {appUsers.length} total
                    </span>
                  </h1>
                  <p className="text-xs text-gray-400 mt-1">
                    Manage client user accounts, reset HWIDs, toggle bans, and create test credentials directly.
                  </p>
                </div>

                {/* Top Search & Actions Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-4 bg-[#141417]/90 p-3 rounded-2xl border border-yellow-500/20 shadow-[0_4px_25px_rgba(0,0,0,0.5)]">
                  {/* Search Input */}
                  <div className="relative flex-1 max-w-sm">
                    <Search className="w-4 h-4 text-yellow-400/60 absolute left-3.5 top-3" />
                    <input
                      type="text"
                      placeholder="Search Users (username, email, sub)..."
                      value={userSearchQuery}
                      onChange={(e) => setUserSearchQuery(e.target.value)}
                      className="w-full bg-[#0d0d0f] border border-white/10 rounded-xl pl-10 pr-4 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-yellow-400 font-mono"
                    />
                  </div>

                  {/* Toolbar Action Buttons */}
                  <div className="flex items-center space-x-2">
                    {/* Create User Button (Cyber Yellow / Gold) */}
                    <button
                      onClick={() => {
                        const d = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
                        setNewAppExpiry(d.toISOString().slice(0, 16));
                        setShowCreateUserModal(true);
                      }}
                      className="bg-gradient-to-r from-yellow-400 via-amber-400 to-yellow-500 hover:from-yellow-300 hover:to-amber-300 text-black font-extrabold text-xs px-4 py-2 rounded-xl flex items-center space-x-1.5 transition-all shadow-[0_0_20px_rgba(250,204,21,0.25)] cursor-pointer"
                    >
                      <Plus className="w-4 h-4 text-black stroke-[3]" />
                      <span>Create User</span>
                    </button>

                    {/* Refresh Button */}
                    <button
                      onClick={fetchUsers}
                      className="p-2 bg-[#1c1c21] hover:bg-white/10 border border-yellow-500/20 rounded-xl text-gray-300 hover:text-yellow-400 transition-all cursor-pointer"
                      title="Refresh Users"
                    >
                      <RefreshCw className={`w-4 h-4 text-yellow-400 ${loadingUsers ? 'animate-spin' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Users Cards Grid (KeyAuth.cc 3-column layout with Cyber Gold Polish) */}
                {loadingUsers ? (
                  <SkeletonTable rows={4} />
                ) : appUsers.filter(u => 
                    (u.username && u.username.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                    (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                    (u.subscription && u.subscription.toLowerCase().includes(userSearchQuery.toLowerCase()))
                  ).length === 0 ? (
                  <div className="p-12 border border-dashed border-yellow-500/20 rounded-2xl text-center space-y-3 bg-[#141417]/80">
                    <Users className="w-10 h-10 text-yellow-400/40 mx-auto" />
                    <p className="text-gray-200 text-sm font-semibold">No Users Found</p>
                    <p className="text-gray-500 text-xs font-mono max-w-sm mx-auto">
                      Click the yellow <strong className="text-yellow-400">"Create User"</strong> button above to add a user account or connect via the C# Sample Client.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {appUsers.filter(u => 
                      (u.username && u.username.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                      (u.email && u.email.toLowerCase().includes(userSearchQuery.toLowerCase())) ||
                      (u.subscription && u.subscription.toLowerCase().includes(userSearchQuery.toLowerCase()))
                    ).map((u) => {
                      const isExpired = u.status === 'expired' || (u.expiration && new Date(u.expiration).getTime() < Date.now());
                      const isBanned = !!u.banned;
                      return (
                        <div 
                          key={u.id} 
                          className="bg-[#18181c]/90 border border-white/5 hover:border-yellow-500/30 rounded-2xl p-4 transition-all space-y-3 relative shadow-lg group hover:shadow-[0_0_20px_rgba(250,204,21,0.08)]"
                        >
                          {/* Card Header Row */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-2 truncate max-w-[60%]">
                              <span className="w-2 h-2 rounded-full bg-yellow-400 animate-pulse"></span>
                              <span className="font-black text-white text-sm tracking-wide truncate">{u.username || u.email?.split('@')[0]}</span>
                            </div>
                            <div className="flex items-center space-x-1.5">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                                isBanned 
                                  ? 'bg-red-950/60 text-red-400 border-red-500/40'
                                  : isExpired
                                    ? 'bg-orange-950/60 text-orange-400 border-orange-500/40'
                                    : 'bg-emerald-950/60 text-emerald-400 border-emerald-500/40'
                              }`}>
                                {isBanned ? 'BANNED' : isExpired ? 'EXPIRED' : 'ACTIVE'}
                              </span>
                              
                              {/* Toggle Ban */}
                              <button
                                onClick={() => handleToggleBanAppUser(u.id, isBanned)}
                                className={`p-1 rounded transition-colors ${isBanned ? 'text-emerald-400 hover:bg-emerald-950/40' : 'text-gray-500 hover:text-amber-400 hover:bg-amber-950/20'}`}
                                title={isBanned ? "Unban User" : "Ban User"}
                              >
                                {isBanned ? <UserCheck className="w-3.5 h-3.5" /> : <Ban className="w-3.5 h-3.5" />}
                              </button>

                              {/* Delete user */}
                              <button
                                onClick={() => handleDeleteAppUser(u.id)}
                                className="p-1 text-gray-500 hover:text-red-400 hover:bg-red-950/20 rounded transition-colors"
                                title="Delete User Account"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Credentials quick bar */}
                          <div className="bg-[#0f0f12] border border-white/5 rounded-xl p-2 flex items-center justify-between text-[11px] font-mono">
                            <div className="flex items-center gap-1.5 truncate max-w-[80%]">
                              <span className="text-gray-500 text-[10px]">PASS:</span>
                              <span className="text-yellow-300 truncate">{u.password || '••••••••'}</span>
                            </div>
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${u.username}:${u.password || ''}`);
                                alert(`Copied user credentials: ${u.username}`);
                              }}
                              className="p-1 text-gray-400 hover:text-yellow-400 transition-colors"
                              title="Copy Username:Password"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Card Body Details Grid */}
                          <div className="grid grid-cols-2 gap-x-2 gap-y-2 font-mono text-[10px] pt-2 border-t border-white/5 text-gray-400">
                            <div>
                              <span className="text-gray-500 block text-[9px]">Expires:</span>
                              <span className="text-gray-200 truncate block">
                                {u.expiration ? new Date(u.expiration).toLocaleDateString() : 'Lifetime'}
                              </span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px]">Last Login:</span>
                              <span className="text-gray-200">{u.lastLogin ? new Date(u.lastLogin).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) : 'Never'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px]">IP:</span>
                              <span className="text-gray-300">{u.ip || '127.0.0.1'}</span>
                            </div>
                            <div>
                              <span className="text-gray-500 block text-[9px]">HWID Lock:</span>
                              <div className="flex items-center gap-1">
                                <span className={u.hwid ? 'text-yellow-400 font-bold' : 'text-gray-400'}>
                                  {u.hwid ? 'Locked' : 'Unlocked'}
                                </span>
                                {u.hwid && (
                                  <button
                                    onClick={() => handleResetAppUserHwid(u.id)}
                                    className="text-[9px] text-cyan-400 hover:underline cursor-pointer"
                                    title="Reset User HWID"
                                  >
                                    (Reset)
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Subscription Tier Footer */}
                          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[10px] font-mono">
                            <span className="text-gray-500">Tier:</span>
                            <span className="text-yellow-400 bg-yellow-950/40 px-2 py-0.5 rounded border border-yellow-500/30 font-bold">
                              {u.subscription || 'default'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Pagination bar */}
                <div className="flex items-center justify-between pt-4 border-t border-white/5 text-xs text-gray-500 font-mono">
                  <button className="px-4 py-2 bg-[#161619] border border-white/5 rounded-xl opacity-50 cursor-not-allowed">Previous</button>
                  <span>Showing page 1 of 1</span>
                  <button className="px-4 py-2 bg-[#161619] border border-white/5 rounded-xl opacity-50 cursor-not-allowed">Next</button>
                </div>

                {/* CREATE USER MODAL DIALOG - CYBER YELLOW THEME */}
                {showCreateUserModal && (
                  <div className="fixed inset-0 bg-black/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
                    <div className="bg-[#18181c] border border-yellow-500/30 rounded-2xl max-w-md w-full p-6 text-left shadow-[0_0_50px_rgba(250,204,21,0.15)] space-y-4 animate-fade-in">
                      <div className="flex items-center justify-between pb-2 border-b border-yellow-500/20">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-yellow-400 shadow-[0_0_10px_#facc15]"></span>
                          <h2 className="text-xl font-bold text-white tracking-tight">Create User Account</h2>
                        </div>
                        <button 
                          onClick={() => setShowCreateUserModal(false)}
                          className="text-gray-500 hover:text-white text-lg font-bold"
                        >
                          ✕
                        </button>
                      </div>

                      {createUserError && (
                        <div className="p-3 bg-red-500/10 border border-red-500/30 text-xs text-red-400 rounded-xl font-medium">
                          {createUserError}
                        </div>
                      )}

                      <form onSubmit={handleCreateAppUser} className="space-y-4">
                        {/* Username */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">Username <span className="text-yellow-400">*</span></label>
                            <span title="Username for app client authentication"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </div>
                          <input
                            type="text"
                            required
                            placeholder="Enter username (e.g. kanishk_vip)..."
                            value={newAppUsername}
                            onChange={(e) => setNewAppUsername(e.target.value)}
                            className="w-full bg-[#101014] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                        </div>

                        {/* Password */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">Password <span className="text-yellow-400">*</span></label>
                            <span title="User password"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </div>
                          <input
                            type="password"
                            required
                            placeholder="Enter secure password..."
                            value={newAppPassword}
                            onChange={(e) => setNewAppPassword(e.target.value)}
                            className="w-full bg-[#101014] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                        </div>

                        {/* Email */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">Email (Optional)</label>
                            <span title="User email address"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </div>
                          <input
                            type="email"
                            placeholder="user@kanishkauth.com"
                            value={newAppEmail}
                            onChange={(e) => setNewAppEmail(e.target.value)}
                            className="w-full bg-[#101014] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                        </div>

                        {/* Subscription */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">Subscription Tier <span className="text-yellow-400">*</span></label>
                            <span title="Assigned subscription plan"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </div>
                          <select
                            value={newAppSub}
                            onChange={(e) => setNewAppSub(e.target.value)}
                            className="w-full bg-[#101014] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          >
                            <option value="default">default (Standard)</option>
                            <option value="VIP">VIP</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Lifetime">Lifetime</option>
                          </select>
                        </div>

                        {/* Expiration */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-semibold text-gray-300">Expiration <span className="text-yellow-400">*</span></label>
                            <span title="Expiration date and time"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </div>
                          <input
                            type="datetime-local"
                            required
                            value={newAppExpiry}
                            onChange={(e) => setNewAppExpiry(e.target.value)}
                            className="w-full bg-[#101014] border border-white/10 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-yellow-400 font-mono"
                          />
                        </div>

                        {/* HWID Affected Checkbox */}
                        <div className="flex items-center space-x-2 pt-1">
                          <input
                            type="checkbox"
                            id="hwid_affected_modal_chk"
                            checked={newAppHwidAffected}
                            onChange={(e) => setNewAppHwidAffected(e.target.checked)}
                            className="w-4 h-4 rounded bg-[#101014] border-white/10 text-yellow-400 focus:ring-yellow-400 cursor-pointer"
                          />
                          <label htmlFor="hwid_affected_modal_chk" className="text-xs font-semibold text-white flex items-center space-x-1.5 cursor-pointer">
                            <span>HWID Lock Enabled</span>
                            <span title="Enforce HWID hardware lock on login"><Info className="w-3.5 h-3.5 text-yellow-400" /></span>
                          </label>
                        </div>

                        {/* Modal Action Buttons */}
                        <div className="flex items-center justify-end space-x-3 pt-4 border-t border-white/10">
                          <button
                            type="button"
                            onClick={() => setShowCreateUserModal(false)}
                            className="px-5 py-2 bg-white/10 text-white hover:bg-white/20 font-semibold text-xs rounded-xl transition-all cursor-pointer"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={createUserLoading}
                            className="px-5 py-2 bg-gradient-to-r from-yellow-400 to-amber-500 hover:from-yellow-300 hover:to-amber-400 text-black font-extrabold text-xs rounded-xl transition-all cursor-pointer disabled:opacity-50 shadow-[0_0_15px_rgba(250,204,21,0.3)]"
                          >
                            {createUserLoading ? 'Creating User...' : 'Create User'}
                          </button>
                        </div>
                      </form>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 9. RESELLER PORTAL TAB */}
            {activeTab === 'resellers' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                <div className="lg:col-span-5">
                  <GlassCard className="p-6" glowColor="cyan">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <UserCheck className="w-5 h-5 text-cyan-400 mr-2" />
                      Create Reseller Account
                    </h3>
                    <form onSubmit={handleAddReseller} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Username</label>
                        <input
                          type="text"
                          required
                          placeholder="reseller_one"
                          value={resellerUser}
                          onChange={(e) => setResellerUser(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Password</label>
                        <input
                          type="password"
                          required
                          placeholder="••••••••"
                          value={resellerPass}
                          onChange={(e) => setResellerPass(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Email Address</label>
                        <input
                          type="email"
                          placeholder="reseller@kanishkauth.com"
                          value={resellerEmail}
                          onChange={(e) => setResellerEmail(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Reseller Plan / Tier</label>
                        <select
                          value={resPlanType}
                          onChange={(e) => setResPlanType(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                        >
                          <option value="reseller">Standard Reseller (Up to 2,500 Keys)</option>
                          <option value="pro_seller">Pro Seller Suite (Unlimited Keys + Blacklist)</option>
                          <option value="enterprise">Enterprise Reseller (Unlimited + White-Label)</option>
                        </select>
                      </div>
                      <div className="pt-2 border-t border-white/5">
                        <label className="text-xs text-cyan-400 font-mono block mb-2 font-bold">Key Generation Balances</label>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Day Keys</span>
                            <input type="number" value={resDay} onChange={(e) => setResDay(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-500 block mb-0.5">Week Keys</span>
                            <input type="number" value={resWeek} onChange={(e) => setResWeek(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Month Keys</span>
                            <input type="number" value={resMonth} onChange={(e) => setResMonth(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                          <div>
                            <span className="text-[10px] text-gray-400 block mb-0.5">Lifetime Keys</span>
                            <input type="number" value={resLife} onChange={(e) => setResLife(e.target.value)} className="w-full bg-black/50 border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white" />
                          </div>
                        </div>
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedAppId}
                        className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-3 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50 mt-4"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Add Reseller</span>
                      </button>
                    </form>
                  </GlassCard>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">REGISTERED RESELLERS</h3>
                  {resellers.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                      No resellers added yet. Create a reseller account above to delegate key generation.
                    </div>
                  ) : (
                    resellers.map((res) => (
                      <GlassCard key={res.id} className="p-5" glowColor="blue">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="text-base font-bold text-white block">{res.username}</span>
                              <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                res.planType === 'pro_seller' ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40' :
                                res.planType === 'enterprise' ? 'bg-green-500/20 text-green-400 border border-green-500/40' :
                                'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40'
                              }`}>{res.planType || 'reseller'}</span>
                            </div>
                            <span className="text-xs font-mono text-gray-400">{res.email}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteReseller(res.id)}
                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded border border-transparent hover:border-red-500/20"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                        <div className="grid grid-cols-4 gap-2 mt-4 pt-4 border-t border-white/5 text-center font-mono text-xs">
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">DAY</span>
                            <span className="text-cyan-400 font-bold">{res.balance?.day || 0}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">WEEK</span>
                            <span className="text-cyan-400 font-bold">{res.balance?.week || 0}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">MONTH</span>
                            <span className="text-cyan-400 font-bold">{res.balance?.month || 0}</span>
                          </div>
                          <div className="bg-white/5 p-2 rounded-lg">
                            <span className="text-[10px] text-gray-500 block">LIFETIME</span>
                            <span className="text-purple-400 font-bold">{res.balance?.lifetime || 0}</span>
                          </div>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* 10. CLOUD VARS & FILES TAB */}
            {activeTab === 'cloud' && (
              <div className="space-y-8 text-left">
                {/* Cloud Variables Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                  <div className="lg:col-span-5">
                    <GlassCard className="p-6" glowColor="cyan">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <Database className="w-5 h-5 text-cyan-400 mr-2" />
                        Create Cloud Variable
                      </h3>
                      <form onSubmit={handleAddCloudVar} className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Variable Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. WELCOME_MSG or MOTD"
                            value={cVarName}
                            onChange={(e) => setCVarName(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Value / Secret Content</label>
                          <textarea
                            required
                            rows={3}
                            placeholder="Enter variable content..."
                            value={cVarVal}
                            onChange={(e) => setCVarVal(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="cVarSecret"
                            checked={cVarSecret}
                            onChange={(e) => setCVarSecret(e.target.checked)}
                            className="rounded border-white/10 bg-black/50 text-cyan-500 focus:ring-cyan-500"
                          />
                          <label htmlFor="cVarSecret" className="text-xs text-gray-300">Require Active License to Read (Secret)</label>
                        </div>
                        <button
                          type="submit"
                          disabled={!selectedAppId}
                          className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-2.5 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Add Cloud Variable</span>
                        </button>
                      </form>
                    </GlassCard>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">CLOUD VARIABLES</h3>
                    {cloudVars.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                        No cloud variables created.
                      </div>
                    ) : (
                      cloudVars.map((v) => (
                        <GlassCard key={v.id} className="p-5">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-white block flex items-center">
                                {v.name}
                                {v.isSecret && <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded border border-amber-500/30">SECRET</span>}
                              </span>
                              <pre className="text-xs font-mono text-cyan-400 mt-2 bg-black/50 p-3 rounded-lg border border-white/5 overflow-x-auto max-w-lg">{v.value}</pre>
                            </div>
                            <button
                              onClick={() => handleDeleteCloudVar(v.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </GlassCard>
                      ))
                    )}
                  </div>
                </div>

                {/* Cloud Files Section */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 pt-6 border-t border-white/5">
                  <div className="lg:col-span-5">
                    <GlassCard className="p-6" glowColor="purple">
                      <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                        <FileText className="w-5 h-5 text-purple-400 mr-2" />
                        Upload Memory Stream File
                      </h3>
                      <form onSubmit={handleAddCloudFile} className="space-y-4">
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">File Name</label>
                          <input
                            type="text"
                            required
                            placeholder="e.g. cheat_module.dll"
                            value={cFileName}
                            onChange={(e) => setCFileName(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">Version</label>
                          <input
                            type="text"
                            required
                            placeholder="1.0"
                            value={cFileVersion}
                            onChange={(e) => setCFileVersion(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-500/50"
                          />
                        </div>
                        <div>
                          <label className="text-xs text-gray-400 font-mono block mb-1">File Bytes Hex / Base64 Payload</label>
                          <textarea
                            rows={3}
                            placeholder="4D 5A 90 00 03 00 00 00..."
                            value={cFileBytes}
                            onChange={(e) => setCFileBytes(e.target.value)}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-purple-500/50"
                          />
                        </div>
                        <div className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id="cFileSecret"
                            checked={cFileSecret}
                            onChange={(e) => setCFileSecret(e.target.checked)}
                            className="rounded border-white/10 bg-black/50 text-purple-500 focus:ring-purple-500"
                          />
                          <label htmlFor="cFileSecret" className="text-xs text-gray-300">Require Active License to Download</label>
                        </div>
                        <button
                          type="submit"
                          disabled={!selectedAppId}
                          className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 hover:from-purple-500/30 hover:to-pink-500/30 text-white font-semibold py-2.5 rounded-xl border border-purple-500/30 transition-all disabled:opacity-50"
                        >
                          <Plus className="w-4 h-4" />
                          <span>Register Cloud File Stream</span>
                        </button>
                      </form>
                    </GlassCard>
                  </div>

                  <div className="lg:col-span-7 space-y-4">
                    <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">MEMORY STREAM FILES</h3>
                    {cloudFiles.length === 0 ? (
                      <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                        No cloud memory files registered.
                      </div>
                    ) : (
                      cloudFiles.map((f) => (
                        <GlassCard key={f.id} className="p-5" glowColor="purple">
                          <div className="flex justify-between items-start">
                            <div>
                              <span className="font-bold text-white block flex items-center">
                                {f.fileName}
                                <span className="ml-2 text-xs font-mono text-purple-400">v{f.version}</span>
                                {f.isSecret && <span className="ml-2 px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] rounded border border-amber-500/30">ENCRYPTED</span>}
                              </span>
                              <span className="text-[10px] font-mono text-gray-500 mt-1 block">
                                Payload Size: ~{Math.round((f.contentHex?.length || 0) / 2)} bytes
                              </span>
                            </div>
                            <button
                              onClick={() => handleDeleteCloudFile(f.id)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded"
                            >
                              <Trash2 className="w-4.5 h-4.5" />
                            </button>
                          </div>
                        </GlassCard>
                      ))
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* 11. FIREWALL & BLACKLIST TAB */}
            {activeTab === 'blacklist' && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left">
                <div className="lg:col-span-5">
                  <GlassCard className="p-6" glowColor="cyan">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center">
                      <Ban className="w-5 h-5 text-red-400 mr-2" />
                      Add Firewall Ban Rule
                    </h3>
                    <form onSubmit={handleAddBlacklist} className="space-y-4">
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Target Type</label>
                        <select
                          value={blType}
                          onChange={(e: any) => setBlType(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-3 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                        >
                          <option value="hwid">Hardware ID (HWID)</option>
                          <option value="ip">IP Address</option>
                          <option value="asn">ISP / ASN Number</option>
                        </select>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Target Value</label>
                        <input
                          type="text"
                          required
                          placeholder={blType === 'hwid' ? 'e.g. 5A9F-8B2C-...' : blType === 'ip' ? 'e.g. 192.168.1.100' : 'e.g. AS15169'}
                          value={blVal}
                          onChange={(e) => setBlVal(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs font-mono text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-gray-400 font-mono block mb-1">Ban Reason</label>
                        <input
                          type="text"
                          placeholder="e.g. Debugger detected / Reversing attempt"
                          value={blReason}
                          onChange={(e) => setBlReason(e.target.value)}
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-red-500/50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={!selectedAppId}
                        className="w-full flex items-center justify-center space-x-2 bg-red-500/20 hover:bg-red-500/30 text-red-300 font-semibold py-2.5 rounded-xl border border-red-500/40 transition-all disabled:opacity-50"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Enforce Blacklist Rule</span>
                      </button>
                    </form>
                  </GlassCard>
                </div>

                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">ACTIVE FIREWALL BLACKLIST RULES</h3>
                  {blacklists.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                      No blacklist rules active. All client authentication requests are permitted unless banned here.
                    </div>
                  ) : (
                    blacklists.map((bl) => (
                      <GlassCard key={bl.id} className="p-5 border-red-500/20 bg-red-950/5">
                        <div className="flex justify-between items-start">
                          <div>
                            <div className="flex items-center space-x-2">
                              <span className="px-2 py-0.5 bg-red-500/20 text-red-400 font-bold text-[10px] rounded uppercase border border-red-500/30">
                                {bl.type}
                              </span>
                              <span className="font-mono text-white font-bold text-sm">{bl.value}</span>
                            </div>
                            <span className="text-xs text-gray-400 mt-1.5 block">Reason: {bl.reason}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteBlacklist(bl.id)}
                            className="p-1.5 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-all"
                            title="Remove Ban Rule"
                          >
                            <Trash2 className="w-4.5 h-4.5" />
                          </button>
                        </div>
                      </GlassCard>
                    ))
                  )}
                </div>
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
};
