import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  deleteDoc, query, where, writeBatch, Timestamp, serverTimestamp, 
  updateDoc, orderBy, limit as firestoreLimit, WhereFilterOp 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Firebase configuration matching frontend dashboard
const firebaseConfig = {
  apiKey: "AIzaSyBaAoUEm8ZGFm343C-oBsah95yHZ-ZRav4",
  authDomain: "innovator-keyauth.firebaseapp.com",
  projectId: "innovator-keyauth",
  storageBucket: "innovator-keyauth.firebasestorage.app",
  messagingSenderId: "1027761962877",
  appId: "1:1027761962877:web:c1937e694f781bbaaad614",
  measurementId: "G-45ZXCZ71CS"
};

// Initialize Firebase App for Node.js Backend
const app = !getApps().length ? initializeApp(firebaseConfig, 'backend-app') : getApps()[0];
export const adminDb = getFirestore(app);

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ============================================================================
// LOCAL JSON STORAGE FALLBACK HELPERS
// ============================================================================
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getLocalFile(collectionName: string) {
  return path.join(DATA_DIR, `${collectionName}.json`);
}

function readLocalCollection<T>(collectionName: string): T[] {
  const filePath = getLocalFile(collectionName);
  if (fs.existsSync(filePath)) {
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content) as T[];
    } catch {
      return [];
    }
  }
  return [];
}

function writeLocalCollection<T>(collectionName: string, items: T[]): void {
  const filePath = getLocalFile(collectionName);
  try {
    fs.writeFileSync(filePath, JSON.stringify(items, null, 2), 'utf8');
  } catch (err) {
    console.error(`[LocalDB Write Error ${collectionName}]:`, err);
  }
}

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
  role?: 'owner' | 'admin' | 'reseller' | 'user' | string;
  plan?: string;
  planExpiry?: string | null;
  banned?: boolean;
  bannedReason?: string;
}

export interface AppUser {
  id: string;
  appId: string;
  username: string;
  email: string;
  passwordHash: string;
  licenseKey: string;
  hwid: string | null;
  createdAt: string;
}

export interface Application {
  id: string;
  ownerId?: string;
  appName: string;
  ownerid: string;
  secret: string;
  appid: string;
  version: string;
  createdAt: string;
}

export interface License {
  id: string;
  appId: string;
  licenseKey?: string;
  key?: string;
  hwid: string | null;
  hwidLock?: boolean;
  expiresAt?: string;
  expires?: any;
  status: 'active' | 'used' | 'expired' | 'unused';
  createdAt: any;
  maxResets?: number;
  resetCount?: number;
  lastResetAt?: string | null;
  resetBy?: string;
}

export interface Session {
  id: string;
  appId: string;
  sessionToken: string;
  hwid: string | null;
  expiresAt: string;
  createdAt: string;
  nonce?: string;
}

export interface HWIDReset {
  id: string;
  appId?: string;
  licenseKey?: string;
  licenseId?: string;
  oldHwid: string | null;
  newHwid: string | null;
  resetTime?: string;
  resetAt?: any;
  resetBy: string;
}

export interface ApiLog {
  id: string;
  appId: string | null;
  licenseKey: string | null;
  endpoint: string;
  status: number;
  timestamp: any;
  ip: string;
  hwid: string | null;
  message: string;
}

export interface Webhook {
  id: string;
  appId: string;
  url: string;
  secret: string;
  active: boolean;
  createdAt: string;
}

export interface Reseller {
  id: string;
  appId: string;
  username: string;
  email: string;
  passwordHash: string;
  balanceDay: number;
  balanceWeek: number;
  balanceMonth: number;
  balanceLifetime: number;
  createdAt: string;
  active: boolean;
}

export interface Blacklist {
  id: string;
  appId: string;
  type: 'hwid' | 'ip' | 'asn' | 'useragent';
  value: string;
  reason: string;
  addedBy: string;
  createdAt: string;
}

export interface CloudVar {
  id: string;
  appId: string;
  varName: string;
  varValue: string;
  isSecret: boolean;
  createdAt: string;
}

export interface CloudFile {
  id: string;
  appId: string;
  fileName: string;
  fileVersion: string;
  fileBytesHex: string;
  isSecret: boolean;
  createdAt: string;
}

// ============================================================================
// ASYNC FIRESTORE + LOCAL JSON DATABASE HELPER
// ============================================================================

export class FirestoreDB {
  public async find<T extends { id?: string; email?: string }>(
    collectionName: string, 
    filters?: { field: string; op: WhereFilterOp; value: any }[],
    limitCount?: number,
    orderByField?: { field: string; direction?: 'asc' | 'desc' }
  ): Promise<T[]> {
    let firestoreList: T[] = [];
    try {
      const colRef = collection(adminDb, collectionName);
      let q: any = colRef;
      if (filters && filters.length > 0) {
        const whereClauses = filters.map(f => where(f.field, f.op, f.value));
        q = query(colRef, ...whereClauses);
      }
      if (orderByField) {
        q = query(q, orderBy(orderByField.field, orderByField.direction || 'desc'));
      }
      if (limitCount) {
        q = query(q, firestoreLimit(limitCount));
      }
      const snapshot = await getDocs(q);
      snapshot.forEach(docSnap => {
        firestoreList.push({ id: docSnap.id, ...docSnap.data() } as T);
      });
    } catch { }

    const localList = readLocalCollection<T>(collectionName);
    const mergedMap = new Map<string, T>();

    firestoreList.forEach(item => {
      const key = item.id || item.email?.toLowerCase() || JSON.stringify(item);
      mergedMap.set(key, item);
    });

    localList.forEach(item => {
      const key = item.id || item.email?.toLowerCase() || JSON.stringify(item);
      if (mergedMap.has(key)) {
        mergedMap.set(key, { ...mergedMap.get(key)!, ...item });
      } else {
        mergedMap.set(key, item);
      }
    });

    let results = Array.from(mergedMap.values());
    if (filters && filters.length > 0) {
      results = results.filter(item => {
        return filters.every(f => {
          const val = (item as any)[f.field];
          if (f.op === '==') return val == f.value;
          return true;
        });
      });
    }

    if (limitCount) {
      results = results.slice(0, limitCount);
    }
    return results;
  }

  public async findOne<T extends { id?: string; email?: string }>(
    collectionName: string, 
    filters: { field: string; op: WhereFilterOp; value: any }[]
  ): Promise<T | null> {
    const results = await this.find<T>(collectionName, filters, 1);
    return results.length > 0 ? results[0] : null;
  }

  public async getById<T extends { id?: string }>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(adminDb, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
    } catch { }

    const localList = readLocalCollection<T>(collectionName);
    const found = localList.find(i => i.id === id);
    return found || null;
  }

  public async insert<T extends { id?: string }>(collectionName: string, item: T): Promise<T> {
    const id = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const fullItem = { ...item, id } as T;

    // Save to Firestore (best-effort)
    try {
      const docRef = doc(adminDb, collectionName, id);
      const dataToSave = { ...fullItem };
      await setDoc(docRef, dataToSave);
    } catch (fsErr) {
      console.warn(`[Firestore DB Warning] setDoc permission bypassed for ${collectionName}:`, fsErr);
    }

    // Save to Local JSON DB (guaranteed persistence)
    const localList = readLocalCollection<T>(collectionName);
    const existingIndex = localList.findIndex(i => i.id === id);
    if (existingIndex >= 0) {
      localList[existingIndex] = fullItem;
    } else {
      localList.push(fullItem);
    }
    writeLocalCollection(collectionName, localList);

    return fullItem;
  }

  public async update<T extends { id?: string }>(collectionName: string, id: string, updates: Partial<T>): Promise<T | null> {
    // Try Firestore update
    try {
      const docRef = doc(adminDb, collectionName, id);
      await updateDoc(docRef, updates as any);
    } catch (fsErr) {
      console.warn(`[Firestore DB Warning] updateDoc permission bypassed for ${collectionName}/${id}:`, fsErr);
    }

    // Save to Local JSON DB
    const localList = readLocalCollection<T>(collectionName);
    const existingIndex = localList.findIndex(i => i.id === id);
    let updatedItem: T;
    if (existingIndex >= 0) {
      updatedItem = { ...localList[existingIndex], ...updates };
      localList[existingIndex] = updatedItem;
    } else {
      updatedItem = { id, ...updates } as any;
      localList.push(updatedItem);
    }
    writeLocalCollection(collectionName, localList);

    return updatedItem;
  }

  public async delete(collectionName: string, id: string): Promise<boolean> {
    try {
      const docRef = doc(adminDb, collectionName, id);
      await deleteDoc(docRef);
    } catch { }

    const localList = readLocalCollection<{ id?: string }>(collectionName);
    const filtered = localList.filter(i => i.id !== id);
    writeLocalCollection(collectionName, filtered);
    return true;
  }

  public async deleteMany(
    collectionName: string, 
    filters: { field: string; op: WhereFilterOp; value: any }[]
  ): Promise<number> {
    const docsToDelete = await this.find<{ id?: string }>(collectionName, filters);
    for (const d of docsToDelete) {
      if (d.id) await this.delete(collectionName, d.id);
    }
    return docsToDelete.length;
  }
}

export const db = new FirestoreDB();
