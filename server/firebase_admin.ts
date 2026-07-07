import { initializeApp, getApps } from 'firebase/app';
import { 
  getFirestore, collection, doc, setDoc, getDoc, getDocs, 
  deleteDoc, query, where, writeBatch, Timestamp, serverTimestamp, 
  updateDoc, orderBy, limit as firestoreLimit, WhereFilterOp 
} from 'firebase/firestore';

// Firebase configuration matching frontend dashboard
const firebaseConfig = {
  apiKey: "AIzaSyBI5RmGtnrqL0InEKoXuLTp6zmDRreZBB8",
  authDomain: "keyauthweb-86eba.firebaseapp.com",
  projectId: "keyauthweb-86eba",
  storageBucket: "keyauthweb-86eba.firebasestorage.app",
  messagingSenderId: "66839697252",
  appId: "1:66839697252:web:4410edf2c50b4408684c71",
  measurementId: "G-BVJMNV0EY5"
};

// Initialize Firebase App for Node.js Backend
const app = !getApps().length ? initializeApp(firebaseConfig, 'backend-app') : getApps()[0];
export const adminDb = getFirestore(app);

// ============================================================================
// DATA INTERFACES
// ============================================================================

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
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
  ownerId?: string; // matches User.id
  appName: string;
  ownerid: string; // client credentials (e.g. AB12KQ or user uid)
  secret: string;  // client credentials (e.g. X82JKP91)
  appid: string;   // client credentials (e.g. APP_912)
  version: string;
  createdAt: string;
}

export interface License {
  id: string;
  appId: string;
  licenseKey?: string; // Legacy / backend field
  key?: string;        // Firestore dashboard field
  hwid: string | null;
  hwidLock?: boolean;
  expiresAt?: string;  // ISO string
  expires?: any;       // Firestore timestamp or ISO string
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
  nonce?: string; // For cryptographic Diffie-Hellman / AES verification
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
  resetBy: string; // 'admin' | 'user' | 'client_api' | 'reseller' | 'discord'
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
  appId: string; // app id or 'GLOBAL'
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
  isSecret: boolean; // if true, only delivered to active authenticated client sessions
  createdAt: string;
}

export interface CloudFile {
  id: string;
  appId: string;
  fileName: string;
  fileVersion: string;
  fileBytesHex: string; // hex encoded binary stream
  isSecret: boolean;
  createdAt: string;
}

// ============================================================================
// ASYNC FIRESTORE DATABASE HELPER
// ============================================================================

export class FirestoreDB {
  /**
   * Find documents in a Firestore collection matching optional filters
   */
  public async find<T>(
    collectionName: string, 
    filters?: { field: string; op: WhereFilterOp; value: any }[],
    limitCount?: number,
    orderByField?: { field: string; direction?: 'asc' | 'desc' }
  ): Promise<T[]> {
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
      const list: T[] = [];
      snapshot.forEach(docSnap => {
        const data = docSnap.data();
        list.push({ id: docSnap.id, ...data } as T);
      });
      return list;
    } catch (error) {
      console.error(`[FirestoreDB] Error finding in collection ${collectionName}:`, error);
      return [];
    }
  }

  /**
   * Find a single document matching filters
   */
  public async findOne<T>(
    collectionName: string, 
    filters: { field: string; op: WhereFilterOp; value: any }[]
  ): Promise<T | null> {
    const results = await this.find<T>(collectionName, filters, 1);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Get document by exact ID
   */
  public async getById<T>(collectionName: string, id: string): Promise<T | null> {
    try {
      const docRef = doc(adminDb, collectionName, id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return { id: docSnap.id, ...docSnap.data() } as T;
      }
      return null;
    } catch (error) {
      console.error(`[FirestoreDB] Error getById in ${collectionName}:`, error);
      return null;
    }
  }

  /**
   * Insert a new document (or overwrite with custom ID)
   */
  public async insert<T extends { id?: string }>(collectionName: string, item: T): Promise<T> {
    try {
      const id = item.id || `doc_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const docRef = doc(adminDb, collectionName, id);
      const dataToSave = { ...item };
      delete dataToSave.id; // Store ID in doc key, not duplicated unless needed
      
      await setDoc(docRef, { ...dataToSave, id });
      return { ...item, id } as T;
    } catch (error) {
      console.error(`[FirestoreDB] Error inserting into ${collectionName}:`, error);
      throw error;
    }
  }

  /**
   * Update an existing document by ID
   */
  public async update<T>(collectionName: string, id: string, updates: Partial<T>): Promise<T | null> {
    try {
      const docRef = doc(adminDb, collectionName, id);
      await updateDoc(docRef, updates as any);
      return await this.getById<T>(collectionName, id);
    } catch (error) {
      console.error(`[FirestoreDB] Error updating ${collectionName}/${id}:`, error);
      return null;
    }
  }

  /**
   * Delete a document by ID
   */
  public async delete(collectionName: string, id: string): Promise<boolean> {
    try {
      const docRef = doc(adminDb, collectionName, id);
      await deleteDoc(docRef);
      return true;
    } catch (error) {
      console.error(`[FirestoreDB] Error deleting ${collectionName}/${id}:`, error);
      return false;
    }
  }

  /**
   * Delete multiple documents matching a filter
   */
  public async deleteMany(
    collectionName: string, 
    filters: { field: string; op: WhereFilterOp; value: any }[]
  ): Promise<number> {
    try {
      const docsToDelete = await this.find<{ id: string }>(collectionName, filters);
      if (docsToDelete.length === 0) return 0;

      const batch = writeBatch(adminDb);
      docsToDelete.forEach(d => {
        batch.delete(doc(adminDb, collectionName, d.id));
      });
      await batch.commit();
      return docsToDelete.length;
    } catch (error) {
      console.error(`[FirestoreDB] Error deleteMany in ${collectionName}:`, error);
      return 0;
    }
  }
}

export const db = new FirestoreDB();
