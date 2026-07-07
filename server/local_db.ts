import fs from 'fs';
import path from 'path';

const DATA_DIR = path.join(process.cwd(), 'server', 'data');

// Ensure database directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

export interface User {
  id: string;
  email: string;
  passwordHash: string;
  createdAt: string;
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
  ownerId: string; // matches User.id
  appName: string;
  ownerid: string; // client credentials (e.g. AB12KQ)
  secret: string;  // client credentials (e.g. X82JKP91)
  appid: string;   // client credentials (e.g. APP_912)
  version: string;
  createdAt: string;
}

export interface License {
  id: string;
  appId: string;
  licenseKey: string; // INV-82KS-912P-AX71
  hwid: string | null;
  expiresAt: string; // ISO string
  status: 'active' | 'used' | 'expired';
  createdAt: string;
  maxResets: number;
  resetCount: number;
  lastResetAt: string | null;
}

export interface Session {
  id: string;
  appId: string;
  sessionToken: string;
  hwid: string | null;
  expiresAt: string;
  createdAt: string;
}

export interface HWIDReset {
  id: string;
  licenseKey: string;
  oldHwid: string | null;
  newHwid: string | null;
  resetTime: string;
  resetBy: string; // 'admin' | 'user'
}

export interface ApiLog {
  id: string;
  appId: string | null;
  licenseKey: string | null;
  endpoint: string;
  status: number;
  timestamp: string;
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

class LocalDB {
  private getFilePath(table: string): string {
    return path.join(DATA_DIR, `${table}.json`);
  }

  // Atomic read
  private readTable<T>(table: string): T[] {
    const filePath = this.getFilePath(table);
    if (!fs.existsSync(filePath)) {
      return [];
    }
    try {
      const content = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(content || '[]') as T[];
    } catch (error) {
      console.error(`Error reading database table ${table}:`, error);
      return [];
    }
  }

  // Atomic write (Write-to-temp-then-rename pattern to avoid corruption)
  private writeTable<T>(table: string, data: T[]): void {
    const filePath = this.getFilePath(table);
    const tempPath = `${filePath}.tmp`;
    try {
      const content = JSON.stringify(data, null, 2);
      fs.writeFileSync(tempPath, content, 'utf8');
      fs.renameSync(tempPath, filePath);
    } catch (error) {
      console.error(`Error writing database table ${table}:`, error);
      if (fs.existsSync(tempPath)) {
        try { fs.unlinkSync(tempPath); } catch {}
      }
    }
  }

  // Generic DB Operations
  public find<T>(table: string, predicate?: (item: T) => boolean): T[] {
    const list = this.readTable<T>(table);
    if (predicate) {
      return list.filter(predicate);
    }
    return list;
  }

  public findOne<T>(table: string, predicate: (item: T) => boolean): T | null {
    const list = this.readTable<T>(table);
    const item = list.find(predicate);
    return item || null;
  }

  public insert<T>(table: string, item: T): T {
    const list = this.readTable<T>(table);
    list.push(item);
    this.writeTable(table, list);
    return item;
  }

  public update<T extends { id: string }>(table: string, id: string, updates: Partial<T>): T | null {
    const list = this.readTable<T>(table);
    const idx = list.findIndex(x => x.id === id);
    if (idx === -1) return null;
    
    const updatedItem = { ...list[idx], ...updates };
    list[idx] = updatedItem;
    this.writeTable(table, list);
    return updatedItem;
  }

  public delete<T extends { id: string }>(table: string, id: string): boolean {
    const list = this.readTable<T>(table);
    const filtered = list.filter(x => x.id !== id);
    if (filtered.length === list.length) return false;
    this.writeTable(table, filtered);
    return true;
  }

  public deleteMany<T>(table: string, predicate: (item: T) => boolean): number {
    const list = this.readTable<T>(table);
    const keep = list.filter(x => !predicate(x));
    const deletedCount = list.length - keep.length;
    if (deletedCount > 0) {
      this.writeTable(table, keep);
    }
    return deletedCount;
  }
}

export const db = new LocalDB();
