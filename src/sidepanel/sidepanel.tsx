/**
 * @file sidepanel.tsx
 * @description Entry point for the Chrome Side Panel.
 * Reuses the same App component as the popup — stays open while browsing.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from '@popup/App';
import '@popup/popup.css';

const container = document.getElementById('root');
if (!container) throw new Error('[Vigil] Missing root element in sidepanel.html');

createRoot(container).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
