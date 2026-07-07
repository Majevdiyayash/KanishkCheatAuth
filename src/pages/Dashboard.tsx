import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  LayoutDashboard, FolderKanban, Key, RefreshCw, Code, ScrollText, 
  Settings, LogOut, ShieldAlert, Plus, Trash2, Copy, Check, Info, 
  ShieldCheck, Network, Users, Crown, Lock, Unlock, Database, FileText, Ban, UserCheck, Play
} from 'lucide-react';
import { GlassCard } from '../components/GlassCard';
import { sdkLanguages, getSdkCode } from '../utils/sdkTemplates';
import { SkeletonStat, SkeletonTable } from '../components/Skeleton';
import { 
  collection, doc, setDoc, addDoc, getDocs, deleteDoc, 
  query, where, writeBatch, Timestamp, serverTimestamp, updateDoc, getDoc
} from 'firebase/firestore';
import { db } from '../lib/firebase';

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

export const Dashboard: React.FC<DashboardProps & { onUpgrade?: () => void }> = ({ token, onLogout, onUpgrade }) => {
  const [activeTab, setActiveTab] = useState<string>('overview');
  
  // Plan / limits
  const [userPlan, setUserPlan] = useState<UserPlan>({
    planName: 'free',
    maxApps: 1,
    maxKeys: 7,
    maxRequestsPerDay: 100,
    hwidLockEnabled: false,
    planExpiry: null,
    banned: false,
    bannedReason: ''
  });
  const [totalKeysAllApps, setTotalKeysAllApps] = useState(0);
  const [keysCreatedLast24h, setKeysCreatedLast24h] = useState(0);

  // App context
  const [apps, setApps] = useState<Application[]>([]);
  const [selectedAppId, setSelectedAppId] = useState<string>('');
  
  // Stats & listings
  const [stats, setStats] = useState({ totalKeys: 0, activeKeys: 0, boundDevices: 0, totalResets: 0 });
  const [keys, setKeys] = useState<License[]>([]);
  const [logs, setLogs] = useState<ApiLog[]>([]);
  const [resets, setResets] = useState<HWIDReset[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [appUsers, setAppUsers] = useState<{email: string; createdAt: string; licenseKey?: string}[]>([]);

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
  const [generatePrefix, setGeneratePrefix] = useState('INV');
  const [generateExpiry, setGenerateExpiry] = useState('7');
  const [generateQty, setGenerateQty] = useState('1');
  const [webhookUrl, setWebhookUrl] = useState('');
  const [sdkLanguage, setSdkLanguage] = useState('C#');

  // Interactive copy triggers
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Load applications directly from Firestore
  const fetchApps = async () => {
    try {
      const q = query(collection(db, 'applications'), where('ownerid', '==', token));
      const querySnapshot = await getDocs(q);
      const appsList: Application[] = [];
      querySnapshot.forEach((docSnap) => {
        appsList.push({ id: docSnap.id, ...docSnap.data() } as Application);
      });
      setApps(appsList);
      if (appsList.length > 0 && !selectedAppId) {
        setSelectedAppId(appsList[0].id);
      }
    } catch (err) {
      console.error('[Firestore] fetchApps error:', err);
    }
  };

  // Load app details (stats, keys, logs, resets, webhooks) from Firestore
  const fetchAppDetails = async () => {
    if (!selectedAppId) return;
    setLoadingStats(true);
    
    let total = 0;
    let active = 0;
    let bound = 0;
    let resetCount = 0;

    // 1. Fetch Licenses
    try {
      const licQ = query(collection(db, 'licenses'), where('appId', '==', selectedAppId));
      const licSnapshot = await getDocs(licQ);
      total = licSnapshot.size;
      licSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        if (data.status === 'active') active++;
        if (data.hwid) bound++;
      });
    } catch (e) {
      console.warn('[Firestore] Failed to fetch licenses:', e);
    }

    // 2. Fetch Webhooks
    try {
      const webQ = query(collection(db, 'webhooks'), where('appId', '==', selectedAppId));
      const webSnapshot = await getDocs(webQ);
      const webList: Webhook[] = [];
      webSnapshot.forEach((docSnap) => {
        webList.push({ id: docSnap.id, ...docSnap.data() } as Webhook);
      });
      setWebhooks(webList);
    } catch (e) {
      console.warn('[Firestore] Failed to fetch webhooks:', e);
    }

    // 3. Fetch API request logs
    try {
      const logQ = query(collection(db, 'api_logs'), where('appId', '==', selectedAppId));
      const logSnapshot = await getDocs(logQ);
      const logList: ApiLog[] = [];
      logSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        logList.push({ 
          id: docSnap.id, 
          ...data, 
          timestamp: data.timestamp instanceof Timestamp ? data.timestamp.toDate().toISOString() : data.timestamp 
        } as ApiLog);
      });
      logList.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
      setLogs(logList.slice(0, 50));
    } catch (e) {
      console.warn('[Firestore] Failed to fetch api_logs:', e);
    }

    // 4. Fetch HWID resets
    try {
      const resetQ = query(collection(db, 'hwid_resets'), where('appId', '==', selectedAppId));
      const resetSnapshot = await getDocs(resetQ);
      const resetList: HWIDReset[] = [];
      resetSnapshot.forEach((docSnap) => {
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
    } catch (e) {
      console.warn('[Firestore] Failed to fetch hwid_resets:', e);
    }

    // 5. Fetch Resellers
    try {
      const resQ = query(collection(db, 'resellers'), where('appId', '==', selectedAppId));
      const resSnap = await getDocs(resQ);
      const resList: any[] = [];
      resSnap.forEach((docSnap) => resList.push({ id: docSnap.id, ...docSnap.data() }));
      setResellers(resList);
    } catch (e) { console.warn('[Firestore] Failed to fetch resellers:', e); }

    // 6. Fetch Cloud Vars & Files
    try {
      const varQ = query(collection(db, 'cloud_vars'), where('appId', '==', selectedAppId));
      const varSnap = await getDocs(varQ);
      const varList: any[] = [];
      varSnap.forEach((docSnap) => varList.push({ id: docSnap.id, ...docSnap.data() }));
      setCloudVars(varList);

      const fileQ = query(collection(db, 'cloud_files'), where('appId', '==', selectedAppId));
      const fileSnap = await getDocs(fileQ);
      const fileList: any[] = [];
      fileSnap.forEach((docSnap) => fileList.push({ id: docSnap.id, ...docSnap.data() }));
      setCloudFiles(fileList);
    } catch (e) { console.warn('[Firestore] Failed to fetch cloud vars/files:', e); }

    // 7. Fetch Blacklists
    try {
      const blQ = query(collection(db, 'blacklists'), where('appId', '==', selectedAppId));
      const blSnap = await getDocs(blQ);
      const blList: any[] = [];
      blSnap.forEach((docSnap) => blList.push({ id: docSnap.id, ...docSnap.data() }));
      setBlacklists(blList);
    } catch (e) { console.warn('[Firestore] Failed to fetch blacklists:', e); }

    // Update state stats
    setStats({
      totalKeys: total,
      activeKeys: active,
      boundDevices: bound,
      totalResets: resetCount
    });
    setLoadingStats(false);
  };

  // Load license keys from Firestore
  const fetchKeys = async () => {
    if (!selectedAppId) return;
    setLoadingKeys(true);
    try {
      const licQ = query(collection(db, 'licenses'), where('appId', '==', selectedAppId));
      const licSnapshot = await getDocs(licQ);
      const keysList: License[] = [];
      licSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        keysList.push({ 
          id: docSnap.id,
          licenseKey: data.key || 'INV-XXXX-XXXX',
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
      setKeys(keysList);
    } catch (e) {
      console.error('[Firestore] fetchKeys error:', e);
    } finally {
      setLoadingKeys(false);
    }
  };

  // Load registered app users from Firestore
  const fetchUsers = async () => {
    if (!selectedAppId) return;
    setLoadingUsers(true);
    try {
      const userQ = query(collection(db, 'app_users'), where('appId', '==', selectedAppId));
      const userSnapshot = await getDocs(userQ);
      const usersList: any[] = [];
      userSnapshot.forEach((docSnap) => {
        const data = docSnap.data();
        usersList.push({
          email: data.email,
          createdAt: data.createdAt instanceof Timestamp ? data.createdAt.toDate().toISOString() : (data.createdAt || ''),
          licenseKey: data.licenseKey || 'None'
        });
      });
      setAppUsers(usersList);
    } catch (e) {
      console.error('[Firestore] fetchUsers error:', e);
    } finally {
      setLoadingUsers(false);
    }
  };

  // Fetch user plan from Firestore
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
        const planId = data.plan || 'free';
        if (planId === 'free') {
          setUserPlan({
            planName: 'free',
            maxApps: 1,
            maxKeys: 7,
            maxRequestsPerDay: 100,
            hwidLockEnabled: false,
            planExpiry: null,
            banned: false,
            bannedReason: ''
          });
        } else {
          // Fetch plan from plans collection or built-in fallbacks
          const planDoc = await getDoc(doc(db, 'plans', planId));
          const builtInPlans: Record<string, any> = {
            starter: { name: "Starter Tier", maxApps: 3, maxLicenseKeys: 50, maxRequestsPerDay: 5000, features: ["HWID Lock Protection", "AES-256 Session Shield"] },
            pro: { name: "Pro Shield", maxApps: 10, maxLicenseKeys: 500, maxRequestsPerDay: 50000, features: ["HWID Lock Protection", "Cloud Variables & Memory"] },
            reseller: { name: "Reseller Partner", maxApps: 25, maxLicenseKeys: 2500, maxRequestsPerDay: 250000, features: ["HWID Lock Protection", "Dedicated Reseller Portal"] },
            pro_seller: { name: "Pro Seller Suite", maxApps: 9999, maxLicenseKeys: 9999, maxRequestsPerDay: 9999, features: ["HWID Lock Protection", "Unlimited Apps & Keys", "Blacklist & Firewall Manager"] },
            enterprise: { name: "Enterprise Ultimate", maxApps: 9999, maxLicenseKeys: 9999, maxRequestsPerDay: 9999, features: ["HWID Lock Protection", "Everything in Pro Seller", "White-Label SDKs"] }
          };
          const pd = planDoc.exists() ? planDoc.data() : (builtInPlans[planId] || { name: planId.toUpperCase(), maxApps: 5, maxLicenseKeys: 100, maxRequestsPerDay: 1000, features: ["HWID Lock Protection"] });
          const features = pd.features || [];
          setUserPlan({
            planName: pd.name || planId,
            maxApps: pd.maxApps ?? 10,
            maxKeys: pd.maxLicenseKeys ?? 500,
            maxRequestsPerDay: pd.maxRequestsPerDay ?? 1000,
            hwidLockEnabled: features.some((f: string) => f.includes("HWID") || f.includes("Lock") || f.includes("Everything") || f.includes("Unlimited")),
            planExpiry: data.planExpiry || null,
            banned: false,
            bannedReason: '',
            planFeatures: features
          });
        }
      } else {
        // No doc yet — write free plan defaults
        await setDoc(doc(db, 'users', token), {
          plan: 'free',
          createdAt: new Date().toISOString()
        }, { merge: true });
      }
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
      let total = 0;
      let last24hCount = 0;
      const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;
      
      for (const aid of appIds) {
        const kq = query(collection(db, 'licenses'), where('appId', '==', aid));
        const ks = await getDocs(kq);
        total += ks.size;
        
        ks.forEach(docSnap => {
          const data = docSnap.data();
          let createdTime = Date.now(); // default to now if Firestore serverTimestamp is still null/pending sync
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

  // Create Application directly in Firestore
  const handleCreateApp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppName.trim()) return;
    setCreateAppLoading(true);
    setCreateAppError(null);
    try {
      // Plan limit check
      const appsCreatedLast24h = apps.filter(app => {
        const created = new Date(app.createdAt).getTime();
        return (Date.now() - created) < 24 * 60 * 60 * 1000;
      }).length;

      if (userPlan.planName === 'free') {
        if (appsCreatedLast24h >= 1) {
          throw new Error('PLAN_LIMIT_APPS_24H');
        }
      } else {
        if (apps.length >= userPlan.maxApps) {
          throw new Error('PLAN_LIMIT_APPS');
        }
      }

      // Security Check: Verify duplicate name + version
      const dupQuery = query(
        collection(db, 'applications'),
        where('ownerid', '==', token),
        where('appName', '==', newAppName.trim()),
        where('version', '==', newAppVersion.trim())
      );
      const dupSnapshot = await getDocs(dupQuery);
      if (!dupSnapshot.empty) {
        throw new Error('DUPLICATE_APP');
      }

      const appDocRef = doc(collection(db, 'applications'));
      const generatedAppId = appDocRef.id;
      const secret = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      const appid = Math.random().toString(36).substring(2, 10);
      
      const newApp = {
        appName: newAppName.trim(),
        ownerid: token,
        secret,
        appid,
        version: newAppVersion.trim(),
        createdAt: new Date().toISOString()
      };
      
      await setDoc(appDocRef, newApp);
      
      setNewAppName('');
      setNewAppVersion('1.0');
      await fetchApps();
      setSelectedAppId(generatedAppId);
    } catch (err: any) {
      console.error('[Firestore] handleCreateApp error:', err);
      let errMsg = 'Failed to register application.';
      if (err.message === 'PLAN_LIMIT_APPS_24H') {
        const recentApps = apps.filter(app => {
          const created = new Date(app.createdAt).getTime();
          return (Date.now() - created) < 24 * 60 * 60 * 1000;
        });
        const oldestRecent = Math.min(...recentApps.map(app => new Date(app.createdAt).getTime()));
        const timeRemaining = 24 * 60 * 60 * 1000 - (Date.now() - oldestRecent);
        const hoursRemaining = Math.max(1, Math.ceil(timeRemaining / (60 * 60 * 1000)));
        errMsg = `Free Plan Limit: You can only create 1 application every 24 hours. Please wait another ${hoursRemaining} hour${hoursRemaining === 1 ? '' : 's'} or upgrade to a premium plan.`;
      } else if (err.message === 'PLAN_LIMIT_APPS') {
        errMsg = `Your ${userPlan.planName.toUpperCase()} plan only allows ${userPlan.maxApps} application${userPlan.maxApps === 1 ? '' : 's'}. Upgrade your plan to create more apps.`;
      } else if (err.message === 'DUPLICATE_APP') {
        errMsg = `An application with the name "${newAppName}" and version "${newAppVersion}" already exists. Please change either the name or version.`;
      } else if (err.message && err.message.includes('permission')) {
        errMsg = 'Permission denied. Ensure your Firestore Database Rules allow writing to the "applications" collection.';
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
    
    console.log('[Auth Debug] Selected App ID:', selectedAppId);
    console.log('[Auth Debug] Total keys across all apps:', totalKeysAllApps);
    console.log('[Auth Debug] Plan max keys limit:', userPlan.maxKeys);
    console.log('[Auth Debug] Requested key quantity:', generateQty);

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

      // Plan limit check
      if (userPlan.planName === 'free') {
        if (keysCreatedLast24h + qty > 7) {
          const remaining = Math.max(0, 7 - keysCreatedLast24h);
          setGenerateKeysError(`Free Plan Limit: You can only generate 7 license keys per 24 hours. You have generated ${keysCreatedLast24h} keys in the last 24 hours and can only generate ${remaining} more. Please wait 24 hours from your last generation or upgrade to a premium plan.`);
          return;
        }
      } else {
        if (totalKeysAllApps + qty > userPlan.maxKeys) {
          const remaining = Math.max(0, userPlan.maxKeys - totalKeysAllApps);
          setGenerateKeysError(`Plan Limit Exceeded: Your ${userPlan.planName.toUpperCase()} plan allows a maximum of ${userPlan.maxKeys} license keys. You currently have ${totalKeysAllApps} keys across all apps and can only create ${remaining} more. Please delete unused keys or upgrade your plan to increase limits.`);
          return;
        }
      }

      const batch = writeBatch(db);
      
      for (let i = 0; i < qty; i++) {
        const keyStr = generateLicenseKey(generatePrefix);
        const expiryDate = new Date();
        if (generateExpiry === 'lifetime') {
          expiryDate.setFullYear(expiryDate.getFullYear() + 100);
        } else {
          expiryDate.setDate(expiryDate.getDate() + days);
        }
        
        const newKeyRef = doc(collection(db, 'licenses'));
        batch.set(newKeyRef, {
          appId: selectedAppId,
          key: keyStr,
          expires: Timestamp.fromDate(expiryDate),
          hwid: null,
          hwidLock: false,
          status: 'unused',
          createdAt: serverTimestamp(),
          resetBy: 'Creator'
        });
      }
      
      await batch.commit();
      setGeneratePrefix('INV');
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
      } else {
        await updateDoc(licRef, { hwidLock: true });
      }
      await fetchKeys();
    } catch (e) {
      console.error('[Firestore] handleToggleHwidLock error:', e);
    }
  };

  // Delete License Key directly in Firestore
  const handleDeleteKey = async (keyId: string) => {
    if (!confirm('Are you sure you want to delete this license key?')) return;
    try {
      await deleteDoc(doc(db, 'licenses', keyId));
      await fetchKeys();
      await fetchAppDetails();
    } catch (e) {
      console.error('[Firestore] handleDeleteKey error:', e);
    }
  };

  // Delete entire Application + all its licenses from Firestore
  const handleDeleteApp = async (appId: string, appName: string) => {
    if (!confirm(`Delete "${appName}"?\n\nThis will permanently delete the app AND all its license keys. This cannot be undone.`)) return;
    try {
      // Delete all licenses for this app first
      const licQ = query(collection(db, 'licenses'), where('appId', '==', appId));
      const licSnap = await getDocs(licQ);
      const batch = writeBatch(db);
      licSnap.forEach(d => batch.delete(d.ref));
      // Also delete webhooks for this app
      const webQ = query(collection(db, 'webhooks'), where('appId', '==', appId));
      const webSnap = await getDocs(webQ);
      webSnap.forEach(d => batch.delete(d.ref));
      await batch.commit();
      // Delete the app document
      await deleteDoc(doc(db, 'applications', appId));
      // Reset selection
      setSelectedAppId('');
      await fetchApps();
      await fetchTotalKeys();
    } catch (e) {
      console.error('[Firestore] handleDeleteApp error:', e);
      alert('Failed to delete app. Check console for details.');
    }
  };

  // Reset HWID directly in Firestore
  const handleResetHwid = async (licenseId: string) => {
    try {
      const licRef = doc(db, 'licenses', licenseId);
      await setDoc(licRef, { hwid: null }, { merge: true });
      
      // Log the reset operation
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
          message: 'Innovator Cheats KeyAuth Test Fire Pulse'
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
apiurl = https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents`
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
      <div className="w-full lg:w-64 glass-panel border-r border-white/5 flex flex-col justify-between py-6 px-4 lg:fixed lg:h-screen lg:left-0 lg:top-0">
        <div>
          {/* Platform Brand */}
          <div className="flex items-center space-x-3 px-3 mb-8">
            <div className="w-8 h-8 rounded-lg overflow-hidden border border-cyan-500/30 shadow-[0_0_15px_rgba(0,240,255,0.2)] relative group cursor-pointer">
              <img src="/hero-pic.webp" alt="INNOVATOR CHEATS Sidebar Logo" className="w-full h-full object-cover group-hover:opacity-0 transition-opacity duration-300" />
              <video src="/hero-video.mp4" autoPlay loop muted playsInline className="absolute inset-0 w-full h-full object-cover opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
            <div>
              <span className="font-extrabold text-sm tracking-wider text-white">INNOVATOR CHEATS</span>
              <span className="block text-[10px] text-cyan-400 font-mono tracking-widest">KEY AUTH SYS</span>
            </div>
          </div>

          {/* App Selector */}
          <div className="px-3 mb-6">
            <label className="text-[10px] text-gray-500 font-mono tracking-wider block mb-1.5 text-left">ACTIVE APPLICATION</label>
            <select
              value={selectedAppId}
              onChange={(e) => setSelectedAppId(e.target.value)}
              className="w-full bg-black/60 border border-white/10 rounded-xl px-3 py-2 text-xs font-semibold text-white focus:outline-none focus:border-cyan-500/50"
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
                  className={`w-full flex items-center space-x-3 px-3.5 py-3 rounded-xl text-sm font-semibold transition-all ${
                    isSelected
                      ? 'bg-cyan-500/10 border-l-2 border-cyan-400 text-white'
                      : 'text-gray-400 hover:bg-white/5 hover:text-white'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-cyan-400' : 'text-gray-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* User logout footer */}
        <div className="border-t border-white/5 pt-4 mt-6 space-y-3">
          {/* Plan usage */}
          <div className="px-3 py-3 rounded-xl bg-white/3 border border-white/5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-mono text-gray-500 uppercase tracking-wider">Plan</span>
              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                userPlan.planName === 'free' 
                  ? 'text-gray-400 bg-white/5 border-white/10' 
                  : 'text-amber-400 bg-amber-500/10 border-amber-500/30'
              }`}>
                {userPlan.planName === 'free' ? 'FREE' : userPlan.planName.toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                <span>Apps {userPlan.planName === 'free' && '(24h)'}</span>
                <span>
                  {userPlan.planName === 'free' 
                    ? `${apps.filter(app => (Date.now() - new Date(app.createdAt).getTime()) < 24*60*60*1000).length}/1` 
                    : `${apps.length}/${userPlan.maxApps}`}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  (userPlan.planName === 'free' 
                    ? apps.filter(app => (Date.now() - new Date(app.createdAt).getTime()) < 24*60*60*1000).length >= 1 
                    : apps.length >= userPlan.maxApps) ? 'bg-red-500' : 'bg-cyan-500'
                }`} style={{ width: `${Math.min(100, (
                  (userPlan.planName === 'free' 
                    ? apps.filter(app => (Date.now() - new Date(app.createdAt).getTime()) < 24*60*60*1000).length / 1
                    : apps.length / userPlan.maxApps) * 100))}%` }} />
              </div>
            </div>
            <div>
              <div className="flex justify-between text-[9px] text-gray-500 mb-1">
                <span>Keys {userPlan.planName === 'free' && '(24h)'}</span>
                <span>
                  {userPlan.planName === 'free' 
                    ? `${keysCreatedLast24h}/7` 
                    : `${totalKeysAllApps}/${userPlan.maxKeys}`}
                </span>
              </div>
              <div className="h-1 bg-white/10 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${
                  (userPlan.planName === 'free' 
                    ? keysCreatedLast24h >= 7 
                    : totalKeysAllApps >= userPlan.maxKeys) ? 'bg-red-500' : 'bg-purple-500'
                }`} style={{ width: `${Math.min(100, (
                  (userPlan.planName === 'free' 
                    ? keysCreatedLast24h / 7
                    : totalKeysAllApps / userPlan.maxKeys) * 100))}%` }} />
              </div>
            </div>
            {userPlan.planExpiry && (
              <p className="text-[9px] text-gray-500">Expires: {new Date(userPlan.planExpiry).toLocaleDateString()}</p>
            )}
          </div>

          {/* Upgrade / View Plans button (for all users so they can upgrade/change plan) */}
          {onUpgrade && (
            <button
              onClick={onUpgrade}
              className="w-full flex items-center justify-center space-x-2 px-3 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-gradient-to-r from-amber-500/10 to-orange-500/10 border border-amber-500/30 hover:from-amber-500/20 hover:to-orange-500/20 transition-all"
            >
              <Crown className="w-3.5 h-3.5" />
              <span>{userPlan.planName === 'free' ? 'Upgrade Plan' : 'Subscription Plans'}</span>
            </button>
          )}

          <button 
            onClick={onLogout}
            className="w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-sm font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out</span>
          </button>
        </div>

      </div>

      {/* Main Content Pane */}
      <div className="flex-1 lg:pl-64 py-8 px-6 lg:py-10 lg:px-12 w-full max-w-7xl mx-auto overflow-hidden">

        {/* Quick Header */}
        <div className="flex justify-between items-center mb-10 pb-6 border-b border-white/5">
          <div className="text-left">
            <h1 className="text-2xl font-bold tracking-tight text-white capitalize">{activeTab}</h1>
            <p className="text-xs text-gray-500 font-mono mt-0.5">
              {activeApp ? `AppID: ${activeApp.appid} | App: ${activeApp.appName}` : 'Create an application to begin'}
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <a 
              href="/admin.html"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-purple-300 bg-purple-500/15 border border-purple-500/30 hover:bg-purple-500/25 transition-all cursor-pointer shadow-[0_0_15px_rgba(168,85,247,0.2)]"
              title="Open Master Admin Panel"
            >
              <span>⚡</span><span>Admin Panel</span>
            </a>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="flex items-center space-x-1.5 px-3 py-2 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20 transition-all cursor-pointer"
              >
                <Crown className="w-3.5 h-3.5" /><span>{userPlan.planName === 'free' ? 'Upgrade' : 'Plans'}</span>
              </button>
            )}
            <button
              onClick={() => { fetchApps(); fetchAppDetails(); fetchKeys(); fetchTotalKeys(); }}
              className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all cursor-pointer"
              title="Refresh Data"
            >
              <RefreshCw className="w-4 h-4 text-cyan-400" />
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

        {/* Free Plan Upgrade & Status Banner */}
        {userPlan.planName === 'free' && (
          <div className="mb-8 p-4 rounded-2xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div className="flex items-center space-x-3 text-left">
              <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center flex-shrink-0">
                <Crown className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-white">Your Account is on the Free Subscription Plan</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  Allows creating 1 Application and 7 Keys every 24 hours. HWID lock, SDK downloads, and webhooks are restricted.
                  <span className="block mt-1 font-mono text-[10px] text-cyan-400">
                    24h Usage: Apps Created: {apps.filter(app => (Date.now() - new Date(app.createdAt).getTime()) < 24*60*60*1000).length}/1 | Keys Generated: {keysCreatedLast24h}/7
                  </span>
                </p>
              </div>
            </div>
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="flex-shrink-0 flex items-center space-x-1.5 px-4 py-2.5 rounded-xl text-xs font-bold text-amber-300 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 transition-all duration-200"
              >
                <Crown className="w-3.5 h-3.5" />
                <span>Upgrade Creator Plan</span>
              </button>
            )}
          </div>
        )}

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
                {/* Stats grid */}
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
                      <GlassCard className="p-5 text-left" glowColor="cyan">
                        <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest block uppercase">TOTAL KEYS</span>
                        <span className="text-3xl font-extrabold text-white mt-1 block">{stats.totalKeys}</span>
                      </GlassCard>
                      <GlassCard className="p-5 text-left" glowColor="blue">
                        <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest block uppercase">ACTIVE LICENSES</span>
                        <span className="text-3xl font-extrabold text-white mt-1 block">{stats.activeKeys}</span>
                      </GlassCard>
                      <GlassCard className="p-5 text-left" glowColor="purple">
                        <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest block uppercase">BOUND DEVICES</span>
                        <span className="text-3xl font-extrabold text-white mt-1 block">{stats.boundDevices}</span>
                      </GlassCard>
                      <GlassCard className="p-5 text-left" glowColor="none">
                        <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest block uppercase">HWID RESETS</span>
                        <span className="text-3xl font-extrabold text-white mt-1 block">{stats.totalResets}</span>
                      </GlassCard>
                    </>
                  )}
                </div>

                {/* Visual Analytics Bar */}
                <GlassCard className="p-6 text-left" glowColor="blue">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-2 border-b border-white/5 pb-4">
                    <div>
                      <h3 className="font-bold text-white text-base">Real-Time Security & Analytics Pulse</h3>
                      <p className="text-xs text-gray-400 font-light mt-0.5">Live distribution of active licenses and hardware fingerprint locks across your platform.</p>
                    </div>
                    <div className="flex items-center space-x-3 text-xs font-mono">
                      <span className="flex items-center text-cyan-400"><span className="w-2.5 h-2.5 rounded-full bg-cyan-400 mr-1.5 animate-pulse"></span>Active ({stats.totalKeys > 0 ? Math.round((stats.activeKeys / stats.totalKeys) * 100) : 0}%)</span>
                      <span className="flex items-center text-purple-400"><span className="w-2.5 h-2.5 rounded-full bg-purple-400 mr-1.5"></span>HWID Locked ({stats.totalKeys > 0 ? Math.round((stats.boundDevices / stats.totalKeys) * 100) : 0}%)</span>
                    </div>
                  </div>
                  
                  <div className="space-y-4">
                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-gray-400">License Activation Ratio</span>
                        <span className="text-white font-bold">{stats.activeKeys} / {stats.totalKeys} Keys Active</span>
                      </div>
                      <div className="h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalKeys > 0 ? (stats.activeKeys / stats.totalKeys) * 100 : 5}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-cyan-500 to-blue-500 rounded-full shadow-[0_0_10px_rgba(0,240,255,0.5)]"
                        />
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-gray-400">HWID Device Binding Lock</span>
                        <span className="text-white font-bold">{stats.boundDevices} / {stats.totalKeys} Devices Bound</span>
                      </div>
                      <div className="h-3 bg-black/60 rounded-full overflow-hidden p-0.5 border border-white/10">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${stats.totalKeys > 0 ? (stats.boundDevices / stats.totalKeys) * 100 : 5}%` }}
                          transition={{ duration: 1, ease: 'easeOut' }}
                          className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full shadow-[0_0_10px_rgba(189,0,255,0.5)]"
                        />
                      </div>
                    </div>
                  </div>
                </GlassCard>

                {/* Grid for Config and Video tutorial */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                  {/* Generated Config Block */}
                  <div className="lg:col-span-7">
                    <GlassCard className="p-6 text-left h-full flex flex-col justify-between" glowColor="cyan">
                      <div>
                        <div className="flex justify-between items-center mb-4 border-b border-white/5 pb-3">
                          <h3 className="font-semibold text-white text-sm">Generated App Configuration</h3>
                          {activeApp && (
                            <button
                              onClick={() => copyToClipboard(generatedConfigText, 'config')}
                              className="p-1.5 rounded bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 text-gray-400 hover:text-white text-xs flex items-center space-x-1"
                            >
                              {copiedKey === 'config' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                              <span>{copiedKey === 'config' ? 'Copied' : 'Copy Config'}</span>
                            </button>
                          )}
                        </div>
                        <pre className="p-4 bg-black/60 border border-white/5 rounded-xl text-green-400 font-mono text-xs overflow-x-auto leading-relaxed">
                          {generatedConfigText}
                        </pre>
                      </div>
                      <div className="flex items-center space-x-2 text-[10px] text-gray-500 mt-4 font-light">
                        <Info className="w-3.5 h-3.5 text-cyan-400" />
                        <span>Copy this config to initialize the client application SDK. Never share your secret key publicly.</span>
                      </div>
                    </GlassCard>
                  </div>

                  {/* Video Demo Player */}
                  <div className="lg:col-span-5">
                    <GlassCard className="p-6 text-left h-full flex flex-col justify-between overflow-hidden" glowColor="purple">
                      <div>
                        <span className="text-[10px] font-bold text-gray-500 font-mono tracking-widest block uppercase mb-3">
                          🎥 SYSTEM VIDEO TUTORIAL
                        </span>
                        <div className="relative rounded-xl overflow-hidden border border-white/10 aspect-video bg-black/60 shadow-[0_0_25px_rgba(139,0,255,0.08)]">
                          <video
                            src="/hero-video.mp4"
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent pointer-events-none" />
                        </div>
                      </div>
                      <p className="text-[11px] text-gray-400 mt-4 font-light leading-relaxed">
                        Watch how to initialize client-side SDK integration, bind HWID locking parameters, and call endpoint check methods.
                      </p>
                    </GlassCard>
                  </div>
                </div>
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
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
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
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                        />
                      </div>
                      <button
                        type="submit"
                        disabled={createAppLoading}
                        className="btn-glow-cyan w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-white font-semibold py-3 rounded-xl border border-cyan-500/30 transition-all disabled:opacity-50"
                      >
                        {createAppLoading ? (
                          <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        ) : (
                          <Plus className="w-4 h-4" />
                        )}
                        <span>{createAppLoading ? 'Registering...' : 'Register App'}</span>
                      </button>
                    </form>
                  </GlassCard>
                </div>

                {/* Applications list */}
                <div className="lg:col-span-7 space-y-4">
                  <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider pl-2">REGISTERED APPLICATIONS</h3>
                  {apps.length === 0 ? (
                    <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 font-light">
                      No applications created yet. Register one above to start.
                    </div>
                  ) : (
                    apps.map((app) => (
                      <GlassCard 
                        key={app.id} 
                        className={`p-5 transition-all ${app.id === selectedAppId ? 'border-cyan-500/30 bg-cyan-950/5' : ''}`}
                        glowColor={app.id === selectedAppId ? 'cyan' : 'none'}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <span className="text-lg font-bold text-white block">{app.appName}</span>
                            <span className="text-xs font-mono text-cyan-400">AppID: {app.appid} | Version: {app.version}</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            {app.id !== selectedAppId && (
                              <button
                                onClick={() => setSelectedAppId(app.id)}
                                className="text-xs bg-white/5 border border-white/10 hover:bg-white/10 px-3 py-1.5 rounded-lg text-white font-medium"
                              >
                                Select App
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteApp(app.id, app.appName)}
                              className="p-1.5 text-red-400 hover:bg-red-500/10 rounded-lg border border-transparent hover:border-red-500/20 transition-all"
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
                            <span className="text-cyan-400 truncate block max-w-[150px]" title="https://firestore.googleapis.com/v1/projects/keyauthweb-86eba/databases/(default)/documents">Firestore REST API</span>
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
                      {/* BIG prominent copy button */}
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
                        className={`flex items-center space-x-2 px-5 py-2.5 rounded-xl text-sm font-bold transition-all border ${
                          copiedKey === 'sdk_code'
                            ? 'bg-green-500/20 border-green-500/40 text-green-400'
                            : 'bg-cyan-500/20 border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 btn-glow-cyan'
                        }`}
                      >
                        {copiedKey === 'sdk_code'
                          ? <><Check className="w-4 h-4" /><span>Copied!</span></>
                          : <><Copy className="w-4 h-4" /><span>Copy Full SDK Code</span></>
                        }
                      </button>
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
            {/* USERS TAB */}
            {activeTab === 'users' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-lg font-bold text-white">App Users</h2>
                    <p className="text-xs text-gray-500 font-mono mt-0.5">Users who registered via your app's SDK</p>
                  </div>
                  <button
                    onClick={fetchUsers}
                    className="p-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all"
                    title="Refresh Users"
                  >
                    <RefreshCw className={`w-4 h-4 text-cyan-400 ${loadingUsers ? 'animate-spin' : ''}`} />
                  </button>
                </div>

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
                          placeholder="reseller@example.com"
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
