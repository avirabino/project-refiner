/**
 * @file index.tsx
 * @description React 18 entry point for the extension popup UI.
 */

import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './popup.css';

// Create React root and render App
const container = document.getElementById('root');
if (!container) {
  throw new Error('[Vigil] Missing root element in popup.html');
}

const root = createRoot(container);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
