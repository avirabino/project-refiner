/**
 * @file App.tsx
 * @description Root component for the Refine popup. State-based routing between pages.
 */

import React, { useState } from 'react';
import SessionList from './pages/SessionList';
import NewSession from './pages/NewSession';
import SessionDetail from './pages/SessionDetail';
import type { Session } from '@shared/types';

type Page = 'list' | 'new' | 'detail';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('list');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);

  const handleCreated = (_session: Session) => {
    setPage('list');
  };

  const handleSelectSession = (id: string) => {
    setSelectedSessionId(id);
    setPage('detail');
  };

  return (
    <div className="w-[360px] h-[520px] bg-gray-950 text-white flex flex-col overflow-hidden">
      {page === 'list' && (
        <SessionList
          onNewSession={() => setPage('new')}
          onSelectSession={handleSelectSession}
        />
      )}
      {page === 'new' && (
        <NewSession onBack={() => setPage('list')} onCreated={handleCreated} />
      )}
      {page === 'detail' && selectedSessionId && (
        <SessionDetail
          sessionId={selectedSessionId}
          onBack={() => setPage('list')}
        />
      )}
    </div>
  );
};

export default App;
