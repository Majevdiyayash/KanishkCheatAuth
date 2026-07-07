import React, { useState } from 'react';
import { ArrowLeft, Play, RefreshCw, Send, Terminal, Key, Shield, HelpCircle } from 'lucide-react';
import { GlassCard } from '../components/GlassCard';

interface DocsProps {
  onBack: () => void;
}

interface EndpointInfo {
  method: 'POST';
  path: string;
  desc: string;
  bodyFields: Array<{ name: string; type: string; required: boolean; desc: string }>;
  defaultBody: Record<string, any>;
}

export const Docs: React.FC<DocsProps> = ({ onBack }) => {
  const [selectedEndpoint, setSelectedEndpoint] = useState<string>('/api/init');
  const [requestBody, setRequestBody] = useState<string>('{}');
  const [apiResponse, setApiResponse] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [customSecret, setCustomSecret] = useState<string>('');

  const endpoints: Record<string, EndpointInfo> = {
    '/api/init': {
      method: 'POST',
      path: '/api/init',
      desc: 'Initializes a secure connection between the external application client and the licensing server. Returns a session token.',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID (e.g., APP_912)' },
        { name: 'ownerid', type: 'string', required: true, desc: 'Owner ID (e.g., AB12KQ)' },
        { name: 'secret', type: 'string', required: true, desc: 'Application Secret Key' },
        { name: 'version', type: 'string', required: true, desc: 'Client application version (e.g., 1.0)' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        ownerid: 'OWNER_DEMO',
        secret: 'secret_demo_value',
        version: '1.0'
      }
    },
    '/api/license': {
      method: 'POST',
      path: '/api/license',
      desc: 'Validates a license key and locks it to the client device Hardware ID (HWID).',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID' },
        { name: 'session_token', type: 'string', required: true, desc: 'Active Session Token from /api/init' },
        { name: 'key', type: 'string', required: true, desc: 'License key (e.g., INV-82KS-912P-AX71)' },
        { name: 'hwid', type: 'string', required: true, desc: 'Device Hardware ID for HWID Lock' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        session_token: 'sess_xxxxxxxxxxxxxxxx',
        key: 'INV-DEMO-KEY-1234',
        hwid: 'DESKTOP-HWID-FINGERPRINT'
      }
    },
    '/api/check': {
      method: 'POST',
      path: '/api/check',
      desc: 'Checks if the session token is still valid, authenticated, and has not expired.',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID' },
        { name: 'session_token', type: 'string', required: true, desc: 'Active Session Token' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        session_token: 'sess_xxxxxxxxxxxxxxxx'
      }
    },
    '/api/logout': {
      method: 'POST',
      path: '/api/logout',
      desc: 'Destroys the current session token on the server database, logging out the client.',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID' },
        { name: 'session_token', type: 'string', required: true, desc: 'Active Session Token' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        session_token: 'sess_xxxxxxxxxxxxxxxx'
      }
    },
    '/api/reset_hwid': {
      method: 'POST',
      path: '/api/reset_hwid',
      desc: 'Resets the HWID locks of a license key. Imposes a 24h client reset cooldown and decrements the reset count.',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID' },
        { name: 'key', type: 'string', required: true, desc: 'License key to reset' },
        { name: 'secret', type: 'string', required: true, desc: 'Application Secret Key' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        key: 'INV-DEMO-KEY-1234',
        secret: 'secret_demo_value'
      }
    },
    '/api/get_device': {
      method: 'POST',
      path: '/api/get_device',
      desc: 'Retrieves current active bound HWID and reset counts for a license key.',
      bodyFields: [
        { name: 'appid', type: 'string', required: true, desc: 'Your Application ID' },
        { name: 'key', type: 'string', required: true, desc: 'License key' },
        { name: 'secret', type: 'string', required: true, desc: 'Application Secret Key' }
      ],
      defaultBody: {
        appid: 'APP_DEMO',
        key: 'INV-DEMO-KEY-1234',
        secret: 'secret_demo_value'
      }
    }
  };

  const currentEndpoint = endpoints[selectedEndpoint];

  // Set default body on select
  const selectEndpoint = (path: string) => {
    setSelectedEndpoint(path);
    setRequestBody(JSON.stringify(endpoints[path].defaultBody, null, 2));
    setApiResponse(null);
  };

  const handleTestApi = async () => {
    setLoading(true);
    setApiResponse(null);
    try {
      let parsedBody;
      try {
        parsedBody = JSON.parse(requestBody);
      } catch (err) {
        throw new Error('Invalid JSON format in Request Body');
      }

      const headers: Record<string, string> = {
        'Content-Type': 'application/json'
      };

      if (customSecret) {
        headers['x-api-secret'] = customSecret;
      }

      const res = await fetch(selectedEndpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(parsedBody)
      });
      
      const data = await res.json();
      setApiResponse({
        status: res.status,
        statusText: res.statusText,
        data
      });
    } catch (error: any) {
      setApiResponse({
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen text-gray-200 py-12 px-6 max-w-7xl mx-auto z-10 relative">
      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between border-b border-white/10 pb-8 mb-12 gap-4">
        <div className="flex items-center space-x-4">
          <button 
            onClick={onBack}
            className="p-2.5 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition-all text-gray-400 hover:text-white"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-white">API DOCUMENTATION</h1>
            <p className="text-sm text-gray-500 font-mono mt-1">INNOVATOR CHEATS KeyAuth Core REST API v1.0.0</p>
          </div>
        </div>
        <div className="flex items-center bg-cyan-950/20 border border-cyan-800/30 px-4 py-2 rounded-lg">
          <Shield className="w-4 h-4 text-cyan-400 mr-2" />
          <span className="text-xs text-cyan-300 font-mono">ALL TRAFFIC SIGNED BY SHA-256</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Sidebar: List Endpoints */}
        <div className="lg:col-span-4 flex flex-col space-y-3">
          <h3 className="text-xs font-semibold text-gray-500 font-mono tracking-wider text-left pl-2">ENDPOINTS</h3>
          {Object.keys(endpoints).map((path) => {
            const ep = endpoints[path];
            const isSelected = selectedEndpoint === path;
            return (
              <button
                key={path}
                onClick={() => selectEndpoint(path)}
                className={`w-full text-left p-3.5 rounded-xl border transition-all flex items-center justify-between ${
                  isSelected 
                    ? 'bg-cyan-500/10 border-cyan-500/40 text-white shadow-[0_0_15px_rgba(0,240,255,0.05)]' 
                    : 'bg-white/2 border-white/5 text-gray-400 hover:bg-white/5 hover:border-white/10 hover:text-gray-200'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                    {ep.method}
                  </span>
                  <span className="font-mono text-sm font-semibold">{ep.path}</span>
                </div>
              </button>
            );
          })}
        </div>

        {/* Content & Interactive Tester Console */}
        <div className="lg:col-span-8 space-y-8">
          <GlassCard className="p-6 text-left" glowColor="cyan">
            {/* Endpoint Info */}
            <div className="mb-6 pb-6 border-b border-white/5">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-xs font-bold font-mono px-2 py-0.5 rounded bg-cyan-950/60 border border-cyan-800/40 text-cyan-400">
                  {currentEndpoint.method}
                </span>
                <span className="text-lg font-mono font-bold text-white">{currentEndpoint.path}</span>
              </div>
              <p className="text-gray-400 text-sm font-light leading-relaxed">{currentEndpoint.desc}</p>
            </div>

            {/* Request Parameters table */}
            <div className="mb-6">
              <h4 className="text-xs font-semibold text-gray-500 font-mono tracking-wider mb-3">REQUEST BODY PARAMETERS</h4>
              <div className="border border-white/5 rounded-xl overflow-hidden bg-white/2">
                <table className="w-full text-sm font-mono">
                  <thead>
                    <tr className="bg-white/5 text-gray-400 text-left border-b border-white/5">
                      <th className="p-3 text-xs">Parameter</th>
                      <th className="p-3 text-xs">Type</th>
                      <th className="p-3 text-xs">Required</th>
                      <th className="p-3 text-xs">Description</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentEndpoint.bodyFields.map((field) => (
                      <tr key={field.name} className="border-b border-white/5 text-xs">
                        <td className="p-3 font-semibold text-cyan-400">{field.name}</td>
                        <td className="p-3 text-gray-400">{field.type}</td>
                        <td className="p-3">
                          {field.required ? (
                            <span className="text-red-400/80 bg-red-950/30 px-1.5 py-0.5 rounded border border-red-900/30">YES</span>
                          ) : (
                            <span className="text-gray-500 bg-white/5 px-1.5 py-0.5 rounded">NO</span>
                          )}
                        </td>
                        <td className="p-3 text-gray-300 font-light">{field.desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Interactive API Sandbox */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-semibold text-gray-500 font-mono tracking-wider flex items-center">
                  <Terminal className="w-4 h-4 text-cyan-400 mr-2" />
                  SANDBOX RUNNER
                </h4>
                <div className="flex items-center space-x-2">
                  <label className="text-[10px] text-gray-500 font-mono">x-api-secret (header):</label>
                  <input
                    type="password"
                    placeholder="Optional Header API Secret"
                    value={customSecret}
                    onChange={(e) => setCustomSecret(e.target.value)}
                    className="bg-black/50 border border-white/10 rounded px-2 py-0.5 text-xs font-mono w-44 text-white focus:outline-none focus:border-cyan-500/50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* JSON Body editor */}
                <div className="flex flex-col">
                  <div className="text-[10px] text-gray-500 font-mono mb-1 text-left">REQUEST BODY (JSON)</div>
                  <textarea
                    value={requestBody}
                    onChange={(e) => setRequestBody(e.target.value)}
                    rows={8}
                    className="w-full bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-xs text-green-400 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20"
                  />
                </div>

                {/* API JSON response display */}
                <div className="flex flex-col">
                  <div className="text-[10px] text-gray-500 font-mono mb-1 text-left">SERVER RESPONSE</div>
                  <div className="flex-1 min-h-[160px] bg-black/60 border border-white/5 rounded-xl p-4 font-mono text-xs text-left overflow-auto">
                    {loading ? (
                      <div className="flex items-center justify-center h-full text-gray-500 space-x-2">
                        <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
                        <span>Sending payload...</span>
                      </div>
                    ) : apiResponse ? (
                      <pre className="text-gray-300">
                        {apiResponse.error ? (
                          <span className="text-red-400">{`Error: ${apiResponse.error}`}</span>
                        ) : (
                          <div>
                            <div className="mb-2 pb-1.5 border-b border-white/5 flex items-center justify-between">
                              <span className="text-gray-500">Status:</span>
                              <span className={apiResponse.status >= 200 && apiResponse.status < 300 ? 'text-green-400' : 'text-red-400'}>
                                {apiResponse.status} {apiResponse.statusText}
                              </span>
                            </div>
                            <span>{JSON.stringify(apiResponse.data, null, 2)}</span>
                          </div>
                        )}
                      </pre>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-gray-500">
                        <Play className="w-6 h-6 mb-1 text-gray-600" />
                        <span>Execute command to view response</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleTestApi}
                  disabled={loading}
                  className="flex items-center space-x-2 bg-gradient-to-r from-cyan-500/20 to-blue-500/20 hover:from-cyan-500 hover:to-blue-600 text-white font-medium px-6 py-2.5 rounded-xl border border-cyan-500/30 transition-all duration-300 disabled:opacity-50"
                >
                  <Send className="w-4 h-4" />
                  <span>Send Request</span>
                </button>
              </div>
            </div>
          </GlassCard>

          {/* Quick FAQ / Specs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
            <GlassCard className="p-5" glowColor="none">
              <div className="flex items-center space-x-3 mb-2">
                <Key className="w-5 h-5 text-cyan-400" />
                <h5 className="font-semibold text-white">License Key Formatting</h5>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                Generated keys follow the default structure <code>INV-[XXXX]-[XXXX]-[XXXX]</code> containing alpha-numeric values. Key creation limits can be modified or customized dynamically on request.
              </p>
            </GlassCard>
            <GlassCard className="p-5" glowColor="none">
              <div className="flex items-center space-x-3 mb-2">
                <HelpCircle className="w-5 h-5 text-purple-400" />
                <h5 className="font-semibold text-white">What is a Device Lock?</h5>
              </div>
              <p className="text-xs text-gray-400 leading-relaxed font-light">
                When a key calls the license API for the first time, its HWID gets locked to it. Any future validations from different HWIDs are rejected unless a dashboard admin or client API triggers a HWID Reset.
              </p>
            </GlassCard>
          </div>
        </div>
      </div>
    </div>
  );
};

