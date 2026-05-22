import React, { useState, useEffect } from 'react';
import { Code2, Settings, Eye, Trash2, Plus, AlertCircle, CheckCircle } from 'lucide-react';
import { useClientId } from '../../lib/useClientId';
import { EmbedScriptGenerator } from '../../components/EmbedScriptGenerator';
import { Modal, useModal } from '../../components/ModalManager';

interface EmbedToken {
  id: string;
  name: string;
  token: string;
  type: 'chatbot' | 'forms' | 'services' | 'all';
  createdAt: string;
  lastUsed?: string;
  active: boolean;
}

export default function HeadlessManager() {
  const { clientId } = useClientId();
  const [tokens, setTokens] = useState<EmbedToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [apiKey, setApiKey] = useState('');
  const scriptModal = useModal();
  const newTokenModal = useModal();
  const [newTokenName, setNewTokenName] = useState('');
  const [newTokenType, setNewTokenType] = useState<EmbedToken['type']>('all');

  useEffect(() => {
    if (clientId) {
      fetchTokens();
      fetchApiKey();
    }
  }, [clientId]);

  const fetchTokens = async () => {
    try {
      const res = await fetch('/v1/dashboard/headless/tokens', {
        headers: {
          'X-Client-Id': clientId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setTokens(data.data || []);
      }
    } catch (err) {
      console.error('[HeadlessManager] Error fetching tokens:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchApiKey = async () => {
    try {
      const res = await fetch('/v1/dashboard/api-key', {
        headers: {
          'X-Client-Id': clientId
        }
      });
      if (res.ok) {
        const data = await res.json();
        setApiKey(data.data?.apiKey || '');
      }
    } catch (err) {
      console.error('[HeadlessManager] Error fetching API key:', err);
    }
  };

  const createToken = async () => {
    if (!newTokenName.trim()) {
      alert('Token name is required');
      return;
    }

    try {
      const res = await fetch('/v1/dashboard/headless/tokens', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Client-Id': clientId
        },
        body: JSON.stringify({
          name: newTokenName,
          type: newTokenType
        })
      });

      if (res.ok) {
        const data = await res.json();
        setTokens([...tokens, data.data]);
        setNewTokenName('');
        setNewTokenType('all');
        newTokenModal.close();
      }
    } catch (err) {
      console.error('[HeadlessManager] Error creating token:', err);
    }
  };

  const deleteToken = async (tokenId: string) => {
    if (!confirm('Delete this token? Any active embeds using it will stop working.')) return;

    try {
      const res = await fetch(`/v1/dashboard/headless/tokens/${tokenId}`, {
        method: 'DELETE',
        headers: {
          'X-Client-Id': clientId
        }
      });

      if (res.ok) {
        setTokens(tokens.filter(t => t.id !== tokenId));
      }
    } catch (err) {
      console.error('[HeadlessManager] Error deleting token:', err);
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-100 mb-2">Headless Integration</h1>
          <p className="text-slate-400">Embed your services in any website</p>
        </div>
        <button
          onClick={() => newTokenModal.open()}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Token
        </button>
      </div>

      {/* Quick Start Guide */}
      <div className="rounded-lg bg-gradient-to-br from-blue-900/20 to-blue-800/10 border border-blue-600/30 p-6">
        <div className="flex gap-4">
          <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-blue-300 mb-2">How It Works</h3>
            <ol className="text-sm text-blue-200/80 space-y-1 list-decimal list-inside">
              <li>Generate embed scripts below</li>
              <li>Copy the script to your website's HTML</li>
              <li>All interactions automatically appear in your dashboard</li>
              <li>Manage forms, bookings, and chats from one place</li>
            </ol>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Embed Script Generator */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
            <h2 className="text-xl font-semibold text-slate-100 mb-6 flex items-center gap-2">
              <Code2 className="w-5 h-5" />
              Embed Scripts
            </h2>
            {clientId && apiKey ? (
              <EmbedScriptGenerator clientId={clientId} apiKey={apiKey} />
            ) : (
              <div className="text-center py-8 text-slate-400">
                <p>Loading configuration...</p>
              </div>
            )}
          </div>

          {/* API Key */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
            <h3 className="text-lg font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <Settings className="w-5 h-5" />
              API Key
            </h3>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                readOnly
                className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 text-sm font-mono"
              />
              <button
                onClick={() => {
                  navigator.clipboard.writeText(apiKey);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1 rounded bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium"
              >
                Copy
              </button>
            </div>
            <p className="text-xs text-slate-400 mt-2">
              Use this key for secure API calls from your website.
            </p>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
            <h3 className="font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-400" />
              Integration Status
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Chatbot</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Forms</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Booking</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                  Active
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-300">Services</span>
                <span className="px-2 py-1 bg-emerald-500/20 text-emerald-400 rounded text-xs font-medium">
                  Active
                </span>
              </div>
            </div>
          </div>

          {/* Tokens */}
          <div className="rounded-lg bg-slate-700/20 border border-slate-700/50 p-6">
            <h3 className="font-semibold text-slate-100 mb-4">Active Tokens</h3>
            {loading ? (
              <p className="text-sm text-slate-400">Loading tokens...</p>
            ) : tokens.length === 0 ? (
              <p className="text-sm text-slate-400 text-center py-4">No tokens yet</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto">
                {tokens.map((token) => (
                  <div
                    key={token.id}
                    className="p-3 rounded-lg bg-slate-900/50 border border-slate-700/50 hover:border-slate-600/50 transition-colors group"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{token.name}</p>
                        <p className="text-xs text-slate-500">{token.type}</p>
                      </div>
                      <button
                        onClick={() => deleteToken(token.id)}
                        className="p-1 opacity-0 group-hover:opacity-100 hover:bg-red-500/20 rounded transition-all"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    {token.lastUsed && (
                      <p className="text-xs text-slate-600">Last used {token.lastUsed}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modals */}
      <Modal
        isOpen={newTokenModal.isOpen}
        onClose={newTokenModal.close}
        title="Create New Token"
        size="sm"
        footer={
          <>
            <button
              onClick={newTokenModal.close}
              className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300 hover:bg-slate-700/50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={createToken}
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white transition-colors"
            >
              Create
            </button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Token Name</label>
            <input
              type="text"
              value={newTokenName}
              onChange={(e) => setNewTokenName(e.target.value)}
              placeholder="e.g., Website Chatbot"
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 focus:outline-none focus:border-blue-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Type</label>
            <select
              value={newTokenType}
              onChange={(e) => setNewTokenType(e.target.value as EmbedToken['type'])}
              className="w-full px-4 py-2 bg-slate-900/50 border border-slate-700/50 rounded text-slate-100 focus:outline-none focus:border-blue-500/50"
            >
              <option value="all">All Features</option>
              <option value="chatbot">Chatbot Only</option>
              <option value="forms">Forms Only</option>
              <option value="services">Services Only</option>
            </select>
          </div>
        </div>
      </Modal>
    </div>
  );
}
