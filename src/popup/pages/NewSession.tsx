/**
 * @file NewSession.tsx
 * @description New session creation form. Sends CREATE_SESSION to background.
 */

import React, { useState, useEffect } from 'react';
import { MessageType } from '@shared/types';
import type { Session } from '@shared/types';

interface NewSessionProps {
  onBack: () => void;
  onCreated: (session: Session) => void;
}

const NewSession: React.FC<NewSessionProps> = ({ onBack, onCreated }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [activeTabUrl, setActiveTabUrl] = useState('');
  const [activeTabId, setActiveTabId] = useState<number | undefined>(undefined);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]?.url) {
        setActiveTabUrl(tabs[0].url);
      } else {
        setError('No active tab found. Navigate to a webpage before starting a session.');
      }
      if (tabs[0]?.id) setActiveTabId(tabs[0].id);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setLoading(true);
    setError(null);

    chrome.runtime.sendMessage(
      {
        type: MessageType.CREATE_SESSION,
        payload: {
          name: name.trim(),
          description: description.trim(),
          url: activeTabUrl,
          tabId: activeTabId,
        },
        source: 'popup',
      },
      (response) => {
        setLoading(false);
        if (chrome.runtime.lastError) {
          setError(chrome.runtime.lastError.message ?? 'Failed to start session');
          return;
        }
        if (response?.ok && response.data) {
          onCreated(response.data as Session);
          window.close();
        } else {
          setError(response?.error ?? 'Failed to start session');
        }
      }
    );
  };

  return (
    <div className="flex flex-col h-full p-4">
      <div className="flex items-center gap-3 mb-5">
        <button
          onClick={onBack}
          className="text-gray-400 hover:text-gray-200 transition-colors text-sm"
        >
          ← Back
        </button>
        <h2 className="text-base font-bold text-white">New Recording Session</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-4 flex-1">
        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Session Name *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Login flow QA pass"
            data-testid="input-session-name"
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors"
            autoFocus
            required
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Description
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What are you testing?"
            rows={3}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg px-3 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-indigo-500 transition-colors resize-none"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">
            Starting URL
          </label>
          <div className="w-full bg-gray-900 border border-gray-800 rounded-lg px-3 py-2 text-xs text-gray-500 truncate">
            {activeTabUrl || 'Loading…'}
          </div>
        </div>

        {error && (
          <div className="text-xs text-red-400 bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={!name.trim() || loading}
          data-testid="btn-start-recording"
          className="mt-auto w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition-colors text-sm"
        >
          {loading ? 'Starting…' : '▶ Start Recording'}
        </button>
      </form>
    </div>
  );
};

export default NewSession;
