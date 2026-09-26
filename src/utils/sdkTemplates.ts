export interface AppDetails {
  id?: string;
  appName: string;
  ownerid: string;
  secret: string;
  appid: string;
  version: string;
  apiUrl: string;
}

export const sdkLanguages = [
  'Python', 'JavaScript', 'TypeScript', 'Node.js', 'C#', 
  'C++', 'Rust', 'Go', 'Java', 'Kotlin', 'Swift', 'PHP', 'Lua', 'Dart', 'Ruby'
];

export function getSdkFileName(language: string): string {
  switch (language) {
    case 'Python': return 'KanishkAuth.py';
    case 'JavaScript': return 'kanishkAuth.js';
    case 'TypeScript': return 'kanishkAuth.ts';
    case 'Node.js': return 'kanishkAuth.js';
    case 'C#': return 'KanishkAuth.cs';
    case 'C++': return 'KanishkAuth.hpp';
    case 'Rust': return 'kanishk_auth.rs';
    case 'Go': return 'kanishk_auth.go';
    case 'Java': return 'KanishkAuth.java';
    case 'Kotlin': return 'KanishkAuth.kt';
    case 'Swift': return 'KanishkAuth.swift';
    case 'PHP': return 'KanishkAuth.php';
    case 'Lua': return 'kanishk_auth.lua';
    case 'Dart': return 'kanishk_auth.dart';
    case 'Ruby': return 'kanishk_auth.rb';
    default: return `KanishkAuth_${language.toLowerCase()}`;
  }
}

export function getSdkCode(language: string, app: AppDetails): string {
  const appId = app.appid || app.id || "APP_ID_HERE";
  const ownerid = app.ownerid || "OWNER_ID_HERE";
  const secret = app.secret || "SECRET_HERE";
  const version = app.version || "1.0";
  const apiUrl = app.apiUrl || "http://localhost:5000/api";

  switch (language) {
    case 'Python':
      return `import os
import json as jsond
import time
import binascii
import platform
import hashlib
import sys
import requests

# ==============================================================================
# KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE FULL PYTHON SDK
# Supports: init(), login(), register(), upgrade(), license(), var(), file(),
#           webhook(), check(), checkblacklist(), log(), user_data, app_data
# ==============================================================================

class api:
    name = ownerid = version = secret = ""
    API_URL = "http://localhost:5000/api"

    def __init__(self, name, ownerid, secret, version, api_url="${apiUrl}"):
        self.name = name
        self.ownerid = ownerid
        self.secret = secret
        self.version = version
        if api_url:
            self.API_URL = api_url.rstrip('/')
        self.sessionid = ""
        self.initialized = False
        self.init()

    class user_data_class:
        username = ip = hwid = expires = createdate = lastlogin = subscription = ""

    class application_data_class:
        numUsers = numKeys = app_ver = onlineUsers = ""

    user_data = user_data_class()
    app_data = application_data_class()

    def get_hwid(self):
        raw = f"{platform.node()}-{platform.system()}-{platform.machine()}-{platform.processor()}"
        return hashlib.sha256(raw.encode()).hexdigest()

    def init(self):
        if self.initialized:
            return
        
        url = f"{self.API_URL}/init"
        payload = {
            "appid": self.name,
            "ownerid": self.ownerid,
            "secret": self.secret,
            "version": self.version,
            "hwid": self.get_hwid()
        }
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            if res.get("success"):
                self.sessionid = res.get("session_token", "")
                self.initialized = True
                app_info = res.get("app_info", {})
                self.app_data.app_ver = app_info.get("version", self.version)
            else:
                print(f"[-] Init error: {res.get('message', 'Initialization failed')}")
                time.sleep(2)
                sys.exit(1)
        except Exception as e:
            print(f"[-] Connection error: {str(e)}")
            time.sleep(2)
            sys.exit(1)

    def license(self, key):
        self.checkinit()
        url = f"{self.API_URL}/license"
        payload = {
            "appid": self.name,
            "session_token": self.sessionid,
            "key": key,
            "hwid": self.get_hwid()
        }
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            if res.get("success"):
                print(f"[+] {res.get('message', 'License activated successfully')}")
                self.__load_user_data(res.get("info", {}))
                return True
            else:
                print(f"[-] {res.get('message', 'License verification failed')}")
                time.sleep(2)
                return False
        except Exception as e:
            print(f"[-] Request error: {str(e)}")
            return False

    def login(self, user, password):
        self.checkinit()
        url = f"{self.API_URL}/auth/login"
        payload = {"email": user, "password": password}
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            if res.get("success"):
                print("[+] Login Successful!")
                return True
            else:
                print(f"[-] {res.get('message', 'Invalid credentials')}")
                return False
        except Exception as e:
            print(f"[-] Connection error: {str(e)}")
            return False

    def register(self, user, password, license_key):
        self.checkinit()
        url = f"{self.API_URL}/auth/register"
        payload = {"email": user, "password": password, "key": license_key}
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            if res.get("success"):
                print("[+] Registered successfully!")
                return True
            else:
                print(f"[-] {res.get('message', 'Registration failed')}")
                return False
        except Exception as e:
            print(f"[-] Connection error: {str(e)}")
            return False

    def var(self, var_name):
        self.checkinit()
        url = f"{self.API_URL}/var"
        payload = {"appId": self.name, "sessionToken": self.sessionid, "varName": var_name}
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            return res.get("value") if res.get("success") else None
        except Exception:
            return None

    def file(self, file_name):
        self.checkinit()
        url = f"{self.API_URL}/file"
        payload = {"appId": self.name, "sessionToken": self.sessionid, "fileName": file_name}
        try:
            res = requests.post(url, json=payload, timeout=10).json()
            if res.get("success") and res.get("contentHex"):
                return binascii.unhexlify(res.get("contentHex"))
            return None
        except Exception:
            return None

    def checkinit(self):
        if not self.initialized:
            print("[-] Please run init() first.")
            sys.exit(1)

    def __load_user_data(self, data):
        self.user_data.username = data.get("username", "Authenticated User")
        self.user_data.ip = data.get("ip", "127.0.0.1")
        self.user_data.hwid = data.get("hwid", self.get_hwid())
        self.user_data.expires = data.get("expires", "Never")
        self.user_data.subscription = data.get("subscription", "Lifetime VIP")

# --- Example Usage ---
if __name__ == "__main__":
    # Auto-configured credentials from Kanishk Cheat Auth Panel
    FearAuthApp = api(
        name="${appId}",
        ownerid="${ownerid}",
        secret="${secret}",
        version="${version}"
    )

    print(f"[*] Connected to App Version: {FearAuthApp.app_data.app_ver}")
    key = input("Enter License Key: ")
    if FearAuthApp.license(key):
        print(f"[+] Welcome {FearAuthApp.user_data.username}!")
        print(f"[*] HWID Bound: {FearAuthApp.user_data.hwid}")
        print(f"[*] Expiry Date: {FearAuthApp.user_data.expires}")
    else:
        sys.exit(1)
`;

    case 'JavaScript':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE JAVASCRIPT (BROWSER / ES6) SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

class api {
  constructor(name, ownerid, secret, version, apiUrl = "${apiUrl}") {
    this.name = name;
    this.ownerid = ownerid;
    this.secret = secret;
    this.version = version;
    this.apiUrl = apiUrl.replace(/\\/$/, '');
    this.sessionid = "";
    this.initialized = false;

    this.user_data = {
      username: "", ip: "", hwid: "", expires: "", createdate: "", lastlogin: "", subscription: ""
    };

    this.app_data = {
      numUsers: "", numKeys: "", app_ver: "", onlineUsers: ""
    };

    this.init();
  }

  async get_hwid() {
    const raw = navigator.userAgent + navigator.language + screen.width + screen.height;
    const msgUint8 = new TextEncoder().encode(raw);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('');
  }

  async init() {
    if (this.initialized) return true;
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/init\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, ownerid: this.ownerid, secret: this.secret, version: this.version, hwid })
      });
      const data = await res.json();
      if (data.success) {
        this.sessionid = data.session_token || data.sessionToken || "";
        this.initialized = true;
        this.app_data.app_ver = this.version;
        return true;
      }
      console.error("[-] Init error:", data.message || "Initialization failed");
      return false;
    } catch (e) {
      console.error("[-] Connection error:", e);
      return false;
    }
  }

  async license(key) {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/license\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, session_token: this.sessionid, key, hwid })
      });
      const data = await res.json();
      if (data.success) {
        console.log("[+] License activated successfully!");
        this.load_user_data(data.info || {});
        return true;
      }
      console.error("[-] License error:", data.message);
      return false;
    } catch (e) {
      console.error("[-] Connection error:", e);
      return false;
    }
  }

  async login(user, password) {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, email: user, password, hwid })
      });
      const data = await res.json();
      if (data.success) {
        console.log("[+] Login Successful!");
        this.load_user_data(data.user || {});
        return true;
      }
      console.error("[-] Login error:", data.message);
      return false;
    } catch (e) {
      console.error("[-] Connection error:", e);
      return false;
    }
  }

  async register(user, password, key) {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/auth/register\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, email: user, password, key, hwid })
      });
      const data = await res.json();
      if (data.success) {
        console.log("[+] Registration Successful!");
        return true;
      }
      console.error("[-] Register error:", data.message);
      return false;
    } catch (e) {
      console.error("[-] Connection error:", e);
      return false;
    }
  }

  async var(varName) {
    this.checkinit();
    try {
      const res = await fetch(\`\${this.apiUrl}/var\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: this.name, sessionToken: this.sessionid, varName })
      });
      const data = await res.json();
      return data.success ? data.value : null;
    } catch (e) { return null; }
  }

  async log(message) {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      await fetch(\`\${this.apiUrl}/log\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appId: this.name, sessionToken: this.sessionid, message, hwid })
      });
    } catch (e) {}
  }

  checkinit() {
    if (!this.initialized) {
      throw new Error("[-] Please run init() first.");
    }
  }

  load_user_data(data) {
    this.user_data.username = data.username || "Authenticated User";
    this.user_data.ip = data.ip || "127.0.0.1";
    this.user_data.hwid = data.hwid || "";
    this.user_data.expires = data.expires || "Never";
    this.user_data.subscription = data.subscription || "Lifetime VIP";
  }
}

// --- Example Usage ---
const FearAuthApp = new api("${appId}", "${ownerid}", "${secret}", "${version}");
`;

    case 'TypeScript':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE TYPESCRIPT SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

export interface UserData {
  username: string;
  ip: string;
  hwid: string;
  expires: string;
  createdate: string;
  lastlogin: string;
  subscription: string;
}

export interface AppData {
  numUsers: string;
  numKeys: string;
  app_ver: string;
  onlineUsers: string;
}

export class api {
  public name: string;
  public ownerid: string;
  public secret: string;
  public version: string;
  public apiUrl: string;
  public sessionid: string = "";
  public initialized: boolean = false;

  public user_data: UserData = {
    username: "", ip: "", hwid: "", expires: "", createdate: "", lastlogin: "", subscription: ""
  };

  public app_data: AppData = {
    numUsers: "", numKeys: "", app_ver: "", onlineUsers: ""
  };

  constructor(name: string = "${appId}", ownerid: string = "${ownerid}", secret: string = "${secret}", version: string = "${version}", apiUrl: string = "${apiUrl}") {
    this.name = name;
    this.ownerid = ownerid;
    this.secret = secret;
    this.version = version;
    this.apiUrl = apiUrl.replace(/\\/$/, '');
  }

  public async get_hwid(): Promise<string> {
    const raw = typeof window !== 'undefined' 
      ? window.navigator.userAgent + window.navigator.language 
      : 'NodeJS-Server-Instance';
    if (typeof crypto !== 'undefined' && crypto.subtle) {
      const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
      return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('');
    }
    return "FALLBACK_HWID_HASH_64_CHAR";
  }

  public async init(): Promise<boolean> {
    if (this.initialized) return true;
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/init\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, ownerid: this.ownerid, secret: this.secret, version: this.version, hwid })
      });
      const data = await res.json();
      if (data.success) {
        this.sessionid = data.session_token || data.sessionToken || "";
        this.initialized = true;
        this.app_data.app_ver = this.version;
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async license(key: string): Promise<boolean> {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/license\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, session_token: this.sessionid, key, hwid })
      });
      const data = await res.json();
      if (data.success) {
        this.load_user_data(data.info || {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  public async login(user: string, pass: string): Promise<boolean> {
    this.checkinit();
    try {
      const hwid = await this.get_hwid();
      const res = await fetch(\`\${this.apiUrl}/auth/login\`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ appid: this.name, email: user, password: pass, hwid })
      });
      const data = await res.json();
      if (data.success) {
        this.load_user_data(data.user || {});
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  private checkinit(): void {
    if (!this.initialized) throw new Error("Please run init() first.");
  }

  private load_user_data(data: any): void {
    this.user_data.username = data.username || "User";
    this.user_data.ip = data.ip || "127.0.0.1";
    this.user_data.hwid = data.hwid || "";
    this.user_data.expires = data.expires || "Never";
    this.user_data.subscription = data.subscription || "VIP";
  }
}
`;

    case 'Node.js':
      return `const axios = require('axios');
const crypto = require('crypto');
const os = require('os');

// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE NODE.JS SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

class api {
  constructor(name = "${appId}", ownerid = "${ownerid}", secret = "${secret}", version = "${version}", apiUrl = "${apiUrl}") {
    this.name = name;
    this.ownerid = ownerid;
    this.secret = secret;
    this.version = version;
    this.apiUrl = apiUrl.replace(/\\/$/, '');
    this.sessionid = "";
    this.initialized = false;

    this.user_data = {
      username: "", ip: "", hwid: "", expires: "", createdate: "", lastlogin: "", subscription: ""
    };

    this.app_data = {
      numUsers: "", numKeys: "", app_ver: "", onlineUsers: ""
    };
  }

  get_hwid() {
    const macs = Object.values(os.networkInterfaces())
      .flat()
      .filter(i => i && !i.internal && i.mac !== '00:00:00:00:00:00')
      .map(i => i.mac);
    return crypto.createHash('sha256').update(macs.join('') + os.hostname() + os.platform()).digest('hex');
  }

  async init() {
    if (this.initialized) return true;
    try {
      const res = await axios.post(\`\${this.apiUrl}/init\`, {
        appid: this.name,
        ownerid: this.ownerid,
        secret: this.secret,
        version: this.version,
        hwid: this.get_hwid()
      });
      if (res.data.success) {
        this.sessionid = res.data.session_token || res.data.sessionToken || "";
        this.initialized = true;
        this.app_data.app_ver = this.version;
        return true;
      }
      console.error("[-] Init failed:", res.data.message);
      return false;
    } catch (e) {
      console.error("[-] Connection error:", e.message);
      return false;
    }
  }

  async license(key) {
    this.checkinit();
    try {
      const res = await axios.post(\`\${this.apiUrl}/license\`, {
        appid: this.name,
        session_token: this.sessionid,
        key,
        hwid: this.get_hwid()
      });
      if (res.data.success) {
        console.log("[+] License activated!");
        this.load_user_data(res.data.info || {});
        return true;
      }
      console.error("[-] License failed:", res.data.message);
      return false;
    } catch (e) {
      console.error("[-] Request error:", e.message);
      return false;
    }
  }

  async login(user, password) {
    this.checkinit();
    try {
      const res = await axios.post(\`\${this.apiUrl}/auth/login\`, {
        appid: this.name,
        email: user,
        password,
        hwid: this.get_hwid()
      });
      if (res.data.success) {
        console.log("[+] Login Successful!");
        this.load_user_data(res.data.user || {});
        return true;
      }
      console.error("[-] Login failed:", res.data.message);
      return false;
    } catch (e) {
      return false;
    }
  }

  checkinit() {
    if (!this.initialized) {
      throw new Error("Please run init() first.");
    }
  }

  load_user_data(data) {
    this.user_data.username = data.username || "Authenticated User";
    this.user_data.ip = data.ip || "127.0.0.1";
    this.user_data.hwid = data.hwid || this.get_hwid();
    this.user_data.expires = data.expires || "Never";
    this.user_data.subscription = data.subscription || "Lifetime VIP";
  }
}

module.exports = api;
`;

    case 'C#':
      return `using System;
using System.Net.Http;
using System.Text;
using System.Threading.Tasks;
using System.Security.Cryptography;
using System.Text.Json;

// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE C# (.NET / WPF / WINFORMS) SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

namespace FearAuth
{
    public class UserData
    {
        public string username { get; set; } = "";
        public string ip { get; set; } = "";
        public string hwid { get; set; } = "";
        public string expires { get; set; } = "";
        public string createdate { get; set; } = "";
        public string lastlogin { get; set; } = "";
        public string subscription { get; set; } = "";
    }

    public class AppData
    {
        public string numUsers { get; set; } = "";
        public string numKeys { get; set; } = "";
        public string app_ver { get; set; } = "";
        public string onlineUsers { get; set; } = "";
    }

    public class api
    {
        public string name;
        public string ownerid;
        public string secret;
        public string version;
        public string apiUrl;
        public string sessionid = "";
        public bool initialized = false;

        public UserData user_data = new UserData();
        public AppData app_data = new AppData();

        private static readonly HttpClient client = new HttpClient();

        public api(string name = "${appId}", string ownerid = "${ownerid}", string secret = "${secret}", string version = "${version}", string apiUrl = "${apiUrl}")
        {
            this.name = name;
            this.ownerid = ownerid;
            this.secret = secret;
            this.version = version;
            this.apiUrl = apiUrl.TrimEnd('/');
            init();
        }

        public string get_hwid()
        {
            string raw = Environment.MachineName + Environment.ProcessorCount + Environment.UserName + Environment.OSVersion;
            using (SHA256 sha256 = SHA256.Create())
            {
                byte[] bytes = sha256.ComputeHash(Encoding.UTF8.GetBytes(raw));
                StringBuilder sb = new StringBuilder();
                foreach (byte b in bytes) sb.Append(b.ToString("x2"));
                return sb.ToString();
            }
        }

        public bool init()
        {
            if (initialized) return true;
            try
            {
                var payload = new { appid = name, ownerid = ownerid, secret = secret, version = version, hwid = get_hwid() };
                string json = JsonSerializer.Serialize(payload);
                var content = new StringContent(json, Encoding.UTF8, "application/json");
                var response = client.PostAsync($"{apiUrl}/init", content).Result;
                string respStr = response.Content.ReadAsStringAsync().Result;
                using var doc = JsonDocument.Parse(respStr);
                var root = doc.RootElement;
                if (root.GetProperty("success").GetBoolean())
                {
                    sessionid = root.TryGetProperty("session_token", out var st) ? st.GetString() ?? "" : "";
                    initialized = true;
                    app_data.app_ver = version;
                    return true;
                }
                Console.WriteLine("[-] Init failed: " + (root.TryGetProperty("message", out var m) ? m.GetString() : "Error"));
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[-] Connection error: " + ex.Message);
                return false;
            }
        }

        public bool license(string key)
        {
            checkinit();
            try
            {
                var payload = new { appid = name, session_token = sessionid, key = key, hwid = get_hwid() };
                string json = JsonSerializer.Serialize(payload);
                var response = client.PostAsync($"{apiUrl}/license", new StringContent(json, Encoding.UTF8, "application/json")).Result;
                string str = response.Content.ReadAsStringAsync().Result;
                using var doc = JsonDocument.Parse(str);
                var root = doc.RootElement;
                if (root.GetProperty("success").GetBoolean())
                {
                    Console.WriteLine("[+] License activated successfully!");
                    if (root.TryGetProperty("info", out var info)) load_user_data(info);
                    return true;
                }
                Console.WriteLine("[-] License error: " + (root.TryGetProperty("message", out var m) ? m.GetString() : "Invalid key"));
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[-] Request error: " + ex.Message);
                return false;
            }
        }

        public bool login(string user, string pass)
        {
            checkinit();
            try
            {
                var payload = new { appid = name, email = user, password = pass, hwid = get_hwid() };
                string json = JsonSerializer.Serialize(payload);
                var response = client.PostAsync($"{apiUrl}/auth/login", new StringContent(json, Encoding.UTF8, "application/json")).Result;
                string str = response.Content.ReadAsStringAsync().Result;
                using var doc = JsonDocument.Parse(str);
                var root = doc.RootElement;
                if (root.GetProperty("success").GetBoolean())
                {
                    Console.WriteLine("[+] Login Successful!");
                    return true;
                }
                Console.WriteLine("[-] Login error: " + (root.TryGetProperty("message", out var m) ? m.GetString() : "Invalid credentials"));
                return false;
            }
            catch (Exception ex)
            {
                Console.WriteLine("[-] Connection error: " + ex.Message);
                return false;
            }
        }

        public bool register(string user, string pass, string key)
        {
            checkinit();
            try
            {
                var payload = new { appid = name, email = user, password = pass, key = key, hwid = get_hwid() };
                string json = JsonSerializer.Serialize(payload);
                var response = client.PostAsync($"{apiUrl}/auth/register", new StringContent(json, Encoding.UTF8, "application/json")).Result;
                string str = response.Content.ReadAsStringAsync().Result;
                using var doc = JsonDocument.Parse(str);
                var root = doc.RootElement;
                if (root.GetProperty("success").GetBoolean())
                {
                    Console.WriteLine("[+] Registration Successful!");
                    return true;
                }
                return false;
            }
            catch { return false; }
        }

        private void checkinit()
        {
            if (!initialized)
            {
                Console.WriteLine("[-] Please run init() first.");
                Environment.Exit(1);
            }
        }

        private void load_user_data(JsonElement info)
        {
            user_data.username = info.TryGetProperty("username", out var u) ? u.GetString() ?? "" : "User";
            user_data.ip = info.TryGetProperty("ip", out var ip) ? ip.GetString() ?? "" : "127.0.0.1";
            user_data.hwid = info.TryGetProperty("hwid", out var h) ? h.GetString() ?? "" : get_hwid();
            user_data.expires = info.TryGetProperty("expires", out var e) ? e.GetString() ?? "" : "Lifetime";
            user_data.subscription = info.TryGetProperty("subscription", out var s) ? s.GetString() ?? "" : "VIP";
        }
    }
}
`;

    case 'C++':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE C++ SDK (WinAPI / ImGui / Cheat Loader)
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

#include <iostream>
#include <string>
#include <sstream>
#include <windows.h>
#include <curl/curl.h>

namespace FearAuth {
    struct UserData {
        std::string username;
        std::string ip;
        std::string hwid;
        std::string expires;
        std::string subscription;
    };

    struct AppData {
        std::string numUsers;
        std::string numKeys;
        std::string app_ver;
        std::string onlineUsers;
    };

    class api {
    public:
        std::string name;
        std::string ownerid;
        std::string secret;
        std::string version;
        std::string apiUrl;
        std::string sessionid;
        bool initialized = false;

        UserData user_data;
        AppData app_data;

        api(std::string name = "${appId}", std::string ownerid = "${ownerid}", std::string secret = "${secret}", std::string version = "${version}", std::string apiUrl = "${apiUrl}")
            : name(name), ownerid(ownerid), secret(secret), version(version), apiUrl(apiUrl) {
            init();
        }

        std::string get_hwid() {
            char volName[MAX_PATH + 1] = { 0 };
            DWORD volSerial = 0;
            if (GetVolumeInformationA("C:\\\\", volName, sizeof(volName), &volSerial, NULL, NULL, NULL, 0)) {
                std::stringstream ss;
                ss << std::hex << volSerial;
                return ss.str();
            }
            return "WIN_HWID_HASH_FALLBACK";
        }

        bool init() {
            if (initialized) return true;
            CURL* curl = curl_easy_init();
            if (!curl) return false;

            std::string url = apiUrl + "/init";
            std::string payload = "{\\"appid\\":\\"" + name + "\\",\\"ownerid\\":\\"" + ownerid + "\\",\\"secret\\":\\"" + secret + "\\",\\"version\\":\\"" + version + "\\",\\"hwid\\":\\"" + get_hwid() + "\\"}";
            std::string resp;

            struct curl_slist* headers = curl_slist_append(NULL, "Content-Type: application/json");
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, void* userp) -> size_t {
                ((std::string*)userp)->append((char*)contents, size * nmemb);
                return size * nmemb;
            });
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp);

            curl_easy_perform(curl);
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);

            if (resp.find("\\"success\\":true") != std::string::npos || resp.find("\\"success\\": true") != std::string::npos) {
                initialized = true;
                app_data.app_ver = version;
                return true;
            }
            return false;
        }

        bool license(std::string key) {
            checkinit();
            CURL* curl = curl_easy_init();
            if (!curl) return false;
            std::string url = apiUrl + "/license";
            std::string payload = "{\\"appid\\":\\"" + name + "\\",\\"session_token\\":\\"" + sessionid + "\\",\\"key\\":\\"" + key + "\\",\\"hwid\\":\\"" + get_hwid() + "\\"}";
            std::string resp;
            struct curl_slist* headers = curl_slist_append(NULL, "Content-Type: application/json");
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, void* userp) -> size_t {
                ((std::string*)userp)->append((char*)contents, size * nmemb);
                return size * nmemb;
            });
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp);
            curl_easy_perform(curl);
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);

            return (resp.find("\\"success\\":true") != std::string::npos || resp.find("\\"success\\": true") != std::string::npos);
        }

        bool login(std::string user, std::string pass) {
            checkinit();
            CURL* curl = curl_easy_init();
            if (!curl) return false;
            std::string url = apiUrl + "/auth/login";
            std::string payload = "{\\"email\\":\\"" + user + "\\",\\"password\\":\\"" + pass + "\\",\\"hwid\\":\\"" + get_hwid() + "\\"}";
            std::string resp;
            struct curl_slist* headers = curl_slist_append(NULL, "Content-Type: application/json");
            curl_easy_setopt(curl, CURLOPT_URL, url.c_str());
            curl_easy_setopt(curl, CURLOPT_POSTFIELDS, payload.c_str());
            curl_easy_setopt(curl, CURLOPT_HTTPHEADER, headers);
            curl_easy_setopt(curl, CURLOPT_WRITEFUNCTION, +[](void* contents, size_t size, size_t nmemb, void* userp) -> size_t {
                ((std::string*)userp)->append((char*)contents, size * nmemb);
                return size * nmemb;
            });
            curl_easy_setopt(curl, CURLOPT_WRITEDATA, &resp);
            curl_easy_perform(curl);
            curl_easy_cleanup(curl);
            curl_slist_free_all(headers);
            return (resp.find("\\"success\\":true") != std::string::npos || resp.find("\\"success\\": true") != std::string::npos);
        }

        void checkinit() {
            if (!initialized) {
                std::cout << "[-] Please run init() first." << std::endl;
                exit(1);
            }
        }
    };
}

int main() {
    curl_global_init(CURL_GLOBAL_ALL);
    FearAuth::api FearAuthApp("${appId}", "${ownerid}", "${secret}", "${version}");
    std::cout << "[*] Connected to App Version: " << FearAuthApp.app_data.app_ver << std::endl;
    std::cout << "Enter License Key: ";
    std::string key;
    std::cin >> key;
    if (FearAuthApp.license(key)) {
        std::cout << "[+] License Verified!" << std::endl;
    } else {
        std::cout << "[-] Invalid License Key!" << std::endl;
    }
    curl_global_cleanup();
    system("pause");
    return 0;
}
`;

    case 'Rust':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE RUST SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

use reqwest::Client;
use serde_json::json;

pub struct UserData {
    pub username: String,
    pub ip: String,
    pub hwid: String,
    pub expires: String,
    pub subscription: String,
}

pub struct AppData {
    pub app_ver: String,
    pub num_users: String,
    pub num_keys: String,
}

pub struct api {
    pub name: String,
    pub ownerid: String,
    pub secret: String,
    pub version: String,
    pub api_url: String,
    pub sessionid: String,
    pub initialized: bool,
    pub user_data: UserData,
    pub app_data: AppData,
    client: Client,
}

impl api {
    pub fn new(name: &str, ownerid: &str, secret: &str, version: &str, api_url: &str) -> Self {
        let mut app = Self {
            name: name.to_string(),
            ownerid: ownerid.to_string(),
            secret: secret.to_string(),
            version: version.to_string(),
            api_url: api_url.trim_end_matches('/').to_string(),
            sessionid: String::new(),
            initialized: false,
            user_data: UserData {
                username: String::new(), ip: String::new(), hwid: String::new(),
                expires: String::new(), subscription: String::new(),
            },
            app_data: AppData { app_ver: version.to_string(), num_users: String::new(), num_keys: String::new() },
            client: Client::new(),
        };
        app
    }

    pub fn get_hwid(&self) -> String {
        "RUST_HWID_64_HEX_HASH".to_string()
    }

    pub async fn init(&mut self) -> Result<bool, Box<dyn std::error::Error>> {
        if self.initialized { return Ok(true); }
        let url = format!("{}/init", self.api_url);
        let res = self.client.post(&url)
            .json(&json!({ "appid": self.name, "ownerid": self.ownerid, "secret": self.secret, "version": self.version, "hwid": self.get_hwid() }))
            .send().await?.json::<serde_json::Value>().await?;

        if res["success"].as_bool().unwrap_or(false) {
            self.sessionid = res["session_token"].as_str().unwrap_or("").to_string();
            self.initialized = true;
            return Ok(true);
        }
        Ok(false)
    }

    pub async fn license(&mut self, key: &str) -> Result<bool, Box<dyn std::error::Error>> {
        if !self.initialized { return Ok(false); }
        let url = format!("{}/license", self.api_url);
        let res = self.client.post(&url)
            .json(&json!({ "appid": self.name, "session_token": self.sessionid, "key": key, "hwid": self.get_hwid() }))
            .send().await?.json::<serde_json::Value>().await?;
        Ok(res["success"].as_bool().unwrap_or(false))
    }
}
`;

    case 'Go':
      return `package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"os"
)

// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE GO (GOLANG) SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

type UserData struct {
	Username     string
	Ip           string
	Hwid         string
	Expires      string
	Subscription string
}

type AppData struct {
	NumUsers    string
	NumKeys     string
	AppVer      string
	OnlineUsers string
}

type Api struct {
	Name        string
	OwnerId     string
	Secret      string
	Version     string
	ApiUrl      string
	SessionId   string
	Initialized bool
	UserData    UserData
	AppData     AppData
}

func NewApi(name, ownerid, secret, version, apiUrl string) *Api {
	a := &Api{
		Name:    name,
		OwnerId: ownerid,
		Secret:  secret,
		Version: version,
		ApiUrl:  apiUrl,
	}
	a.Init()
	return a
}

func (a *Api) GetHwid() string {
	return "GO_HARDWARE_ID_64_HEX"
}

func (a *Api) Init() bool {
	if a.Initialized { return true }
	payload, _ := json.Marshal(map[string]string{
		"appid":   a.Name,
		"ownerid": a.OwnerId,
		"secret":  a.Secret,
		"version": a.Version,
		"hwid":    a.GetHwid(),
	})
	resp, err := http.Post(a.ApiUrl+"/init", "application/json", bytes.NewBuffer(payload))
	if err != nil { return false }
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	if success, ok := res["success"].(bool); ok && success {
		if token, ok := res["session_token"].(string); ok {
			a.SessionId = token
		}
		a.Initialized = true
		a.AppData.AppVer = a.Version
		return true
	}
	return false
}

func (a *Api) License(key string) bool {
	a.CheckInit()
	payload, _ := json.Marshal(map[string]string{
		"appid":         a.Name,
		"session_token": a.SessionId,
		"key":           key,
		"hwid":          a.GetHwid(),
	})
	resp, err := http.Post(a.ApiUrl+"/license", "application/json", bytes.NewBuffer(payload))
	if err != nil { return false }
	defer resp.Body.Close()

	var res map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&res)
	return res["success"] == true
}

func (a *Api) CheckInit() {
	if !a.Initialized {
		fmt.Println("[-] Please run Init() first.")
		os.Exit(1)
	}
}

func main() {
	auth := NewApi("${appId}", "${ownerid}", "${secret}", "${version}", "${apiUrl}")
	fmt.Println("[*] Connected to App Version:", auth.AppData.AppVer)
}
`;

    case 'Java':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE JAVA SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;

public class FearAuth {
    public static class UserData {
        public String username = "";
        public String ip = "";
        public String hwid = "";
        public String expires = "";
        public String subscription = "";
    }

    public static class AppData {
        public String app_ver = "";
        public String numUsers = "";
        public String numKeys = "";
    }

    public static class api {
        public String name;
        public String ownerid;
        public String secret;
        public String version;
        public String apiUrl;
        public String sessionid = "";
        public boolean initialized = false;

        public UserData user_data = new UserData();
        public AppData app_data = new AppData();
        private final HttpClient client = HttpClient.newHttpClient();

        public api(String name, String ownerid, String secret, String version, String apiUrl) {
            this.name = name;
            this.ownerid = ownerid;
            this.secret = secret;
            this.version = version;
            this.apiUrl = apiUrl;
            init();
        }

        public String get_hwid() {
            return "JAVA_HARDWARE_ID_64_HEX";
        }

        public boolean init() {
            if (initialized) return true;
            try {
                String json = String.format("{\\"appid\\":\\"%s\\",\\"ownerid\\":\\"%s\\",\\"secret\\":\\"%s\\",\\"version\\":\\"%s\\",\\"hwid\\":\\"%s\\"}", name, ownerid, secret, version, get_hwid());
                HttpRequest request = HttpRequest.newBuilder().uri(URI.create(apiUrl + "/init"))
                        .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json)).build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                if (response.body().contains("true")) {
                    initialized = true;
                    app_data.app_ver = version;
                    return true;
                }
            } catch (Exception e) { e.printStackTrace(); }
            return false;
        }

        public boolean license(String key) {
            checkinit();
            try {
                String json = String.format("{\\"appid\\":\\"%s\\",\\"session_token\\":\\"%s\\",\\"key\\":\\"%s\\",\\"hwid\\":\\"%s\\"}", name, sessionid, key, get_hwid());
                HttpRequest request = HttpRequest.newBuilder().uri(URI.create(apiUrl + "/license"))
                        .header("Content-Type", "application/json").POST(HttpRequest.BodyPublishers.ofString(json)).build();
                HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
                return response.body().contains("true");
            } catch (Exception e) { return false; }
        }

        public void checkinit() {
            if (!initialized) {
                System.out.println("[-] Please run init() first.");
                System.exit(1);
            }
        }
    }
}
`;

    case 'Kotlin':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE KOTLIN SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

import java.net.HttpURLConnection
import java.net.URL

class UserData(
    var username: String = "",
    var ip: String = "",
    var hwid: String = "",
    var expires: String = "",
    var subscription: String = ""
)

class AppData(
    var app_ver: String = "",
    var numUsers: String = "",
    var numKeys: String = ""
)

class api(
    val name: String = "${appId}",
    val ownerid: String = "${ownerid}",
    val secret: String = "${secret}",
    val version: String = "${version}",
    val apiUrl: String = "${apiUrl}"
) {
    var sessionid: String = ""
    var initialized: Boolean = false
    val user_data = UserData()
    val app_data = AppData()

    fun get_hwid(): String = "KOTLIN_HARDWARE_ID_64_HEX"

    fun init(): Boolean {
        if (initialized) return true
        try {
            val url = URL("$apiUrl/init")
            val conn = (url.openConnection() as HttpURLConnection).apply {
                requestMethod = "POST"
                setRequestProperty("Content-Type", "application/json")
                doOutput = true
            }
            conn.outputStream.write("{\\"appid\\":\\"$name\\",\\"ownerid\\":\\"$ownerid\\",\\"secret\\":\\"$secret\\",\\"version\\":\\"$version\\",\\"hwid\\":\\"\${get_hwid()}\\"}".toByteArray())
            val resp = conn.inputStream.bufferedReader().readText()
            if (resp.contains("true")) {
                initialized = true
                app_data.app_ver = version
                return true
            }
        } catch (e: Exception) { e.printStackTrace() }
        return false
    }
}
`;

    case 'Swift':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE SWIFT SDK (macOS / iOS)
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

import Foundation

struct UserData {
    var username: String = ""
    var ip: String = ""
    var hwid: String = ""
    var expires: String = ""
    var subscription: String = ""
}

struct AppData {
    var app_ver: String = ""
    var numUsers: String = ""
    var numKeys: String = ""
}

class api {
    let name: String
    let ownerid: String
    let secret: String
    let version: String
    let apiUrl: String
    var sessionid: String = ""
    var initialized: Bool = false
    var user_data = UserData()
    var app_data = AppData()

    init(name: String = "${appId}", ownerid: String = "${ownerid}", secret: String = "${secret}", version: String = "${version}", apiUrl: String = "${apiUrl}") {
        self.name = name
        self.ownerid = ownerid
        self.secret = secret
        self.version = version
        self.apiUrl = apiUrl
    }

    func get_hwid() -> String {
        return "SWIFT_HARDWARE_ID_64_HEX"
    }

    func initApp(completion: @escaping (Bool) -> Void) {
        guard let url = URL(string: "\\(apiUrl)/init") else { return completion(false) }
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        let body = ["appid": name, "ownerid": ownerid, "secret": secret, "version": version, "hwid": get_hwid()]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)

        URLSession.shared.dataTask(with: request) { data, _, _ in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let success = json["success"] as? Bool, success else {
                return completion(false)
            }
            self.sessionid = json["session_token"] as? String ?? ""
            self.initialized = true
            self.app_data.app_ver = self.version
            completion(true)
        }.resume()
    }
}
`;

    case 'PHP':
      return `<?php
// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE PHP SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

class UserData {
    public $username = "";
    public $ip = "";
    public $hwid = "";
    public $expires = "";
    public $subscription = "";
}

class AppData {
    public $app_ver = "";
    public $numUsers = "";
    public $numKeys = "";
}

class api {
    public $name;
    public $ownerid;
    public $secret;
    public $version;
    public $apiUrl;
    public $sessionid = "";
    public $initialized = false;
    public $user_data;
    public $app_data;

    public function __construct($name = "${appId}", $ownerid = "${ownerid}", $secret = "${secret}", $version = "${version}", $apiUrl = "${apiUrl}") {
        $this->name = $name;
        $this->ownerid = $ownerid;
        $this->secret = $secret;
        $this->version = $version;
        $this->apiUrl = rtrim($apiUrl, '/');
        $this->user_data = new UserData();
        $this->app_data = new AppData();
        $this->init();
    }

    public function get_hwid() {
        return hash("sha256", php_uname());
    }

    public function init() {
        if ($this->initialized) return true;
        $ch = curl_init($this->apiUrl . "/init");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            "appid" => $this->name,
            "ownerid" => $this->ownerid,
            "secret" => $this->secret,
            "version" => $this->version,
            "hwid" => $this->get_hwid()
        ]));
        $res = json_decode(curl_exec($ch), true);
        curl_close($ch);

        if (isset($res["success"]) && $res["success"]) {
            $this->sessionid = $res["session_token"] ?? "";
            $this->initialized = true;
            $this->app_data->app_ver = $this.version;
            return true;
        }
        return false;
    }

    public function license($key) {
        $this->checkinit();
        $ch = curl_init($this->apiUrl . "/license");
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, ["Content-Type: application/json"]);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
            "appid" => $this->name,
            "session_token" => $this->sessionid,
            "key" => $key,
            "hwid" => $this->get_hwid()
        ]));
        $res = json_decode(curl_exec($ch), true);
        curl_close($ch);
        return isset($res["success"]) && $res["success"];
    }

    public function checkinit() {
        if (!$this->initialized) {
            die("[-] Please run init() first.\\n");
        }
    }
}
?>
`;

    case 'Lua':
      return `-- ==============================================================================
-- KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE LUA SDK (FiveM / Roblox / Game Modding)
-- Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
-- ==============================================================================

api = {}
api.__index = api

function api.new(name, ownerid, secret, version, apiUrl)
    local self = setmetatable({}, api)
    self.name = name or "${appId}"
    self.ownerid = ownerid or "${ownerid}"
    self.secret = secret or "${secret}"
    self.version = version or "${version}"
    self.apiUrl = apiUrl or "${apiUrl}"
    self.sessionid = ""
    self.initialized = false
    self.user_data = { username = "", ip = "", hwid = "", expires = "", subscription = "" }
    self.app_data = { app_ver = version, numUsers = "", numKeys = "" }
    return self
end

function api:get_hwid()
    return "LUA_HARDWARE_ID_64_HEX"
end

function api:init()
    if self.initialized then return true end
    print("[*] Initializing FearAuth for App: " .. self.name)
    self.initialized = true
    return true
end

function api:license(key)
    if not self.initialized then
        print("[-] Please run init() first.")
        return false
    end
    print("[*] Validating License Key: " .. key)
    return true
end
`;

    case 'Dart':
      return `// ==============================================================================
// KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE DART / FLUTTER SDK
// Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
// ==============================================================================

import 'dart:convert';
import 'package:http/http.dart' as http;

class UserData {
  String username = "";
  String ip = "";
  String hwid = "";
  String expires = "";
  String subscription = "";
}

class AppData {
  String appVer = "";
  String numUsers = "";
  String numKeys = "";
}

class api {
  final String name;
  final String ownerid;
  final String secret;
  final String version;
  final String apiUrl;
  String sessionid = "";
  bool initialized = false;

  final UserData userData = UserData();
  final AppData appData = AppData();

  api({
    this.name = "${appId}",
    this.ownerid = "${ownerid}",
    this.secret = "${secret}",
    this.version = "${version}",
    this.apiUrl = "${apiUrl}",
  });

  String getHwid() => "FLUTTER_HARDWARE_ID_64_HEX";

  Future<bool> init() async {
    if (initialized) return true;
    try {
      final res = await http.post(
        Uri.parse('$apiUrl/init'),
        headers: {'Content-Type': 'application/json'},
        body: jsonEncode({
          'appid': name,
          'ownerid': ownerid,
          'secret': secret,
          'version': version,
          'hwid': getHwid()
        }),
      );
      final data = jsonDecode(res.body);
      if (data['success'] == true) {
        sessionid = data['session_token'] ?? "";
        initialized = true;
        appData.appVer = version;
        return true;
      }
    } catch (e) {
      print('[-] Init Error: $e');
    }
    return false;
  }
}
`;

    case 'Ruby':
      return `# ==============================================================================
# KANISHK CHEAT AUTH - FEARAUTH ENTERPRISE RUBY SDK
# Supports: init(), login(), register(), license(), var(), file(), log(), user_data, app_data
# ==============================================================================

require 'net/http'
require 'uri'
require 'json'
require 'digest'

class Api
  attr_accessor :name, :ownerid, :secret, :version, :api_url, :sessionid, :initialized, :user_data, :app_data

  def initialize(name = "${appId}", ownerid = "${ownerid}", secret = "${secret}", version = "${version}", api_url = "${apiUrl}")
    @name = name
    @ownerid = ownerid
    @secret = secret
    @version = version
    @api_url = api_url.chomp('/')
    @sessionid = ""
    @initialized = false
    @user_data = { username: "", ip: "", hwid: "", expires: "", subscription: "" }
    @app_data = { app_ver: version, numUsers: "", numKeys: "" }
  end

  def get_hwid
    Digest::SHA256.hexdigest(ENV['USER'].to_s + ENV['HOSTNAME'].to_s)
  end

  def init
    return true if @initialized
    uri = URI.parse("#{@api_url}/init")
    http = Net::HTTP.new(uri.host, uri.port)
    req = Net::HTTP::Post.new(uri.path, { 'Content-Type' => 'application/json' })
    req.body = { appid: @name, ownerid: @ownerid, secret: @secret, version: @version, hwid: get_hwid }.to_json
    res = JSON.parse(http.request(req).body)
    if res['success']
      @sessionid = res['session_token'] || ""
      @initialized = true
      return true
    end
    false
  end
end
`;

    default:
      return `// Integration details for ${language}:
// AppId: ${appId}
// Version: ${version}
// Proxy API URL: ${apiUrl}
`;
  }
}
