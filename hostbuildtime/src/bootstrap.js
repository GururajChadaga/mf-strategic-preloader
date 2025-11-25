import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerRemotes, preloadRemote } from '@module-federation/enhanced/runtime';

async function initApp() {
  // Step 1: Register remotes
  console.log('[Bootstrap] Registering remotes...');
  const registerStart = performance.now();

  registerRemotes([
    {
      name: 'app2',
      entry: 'http://localhost:3002/mf-manifest.json',
    },
    {
      name: 'app3',
      entry: 'http://localhost:3003/mf-manifest.json',
    },
  ]);

  console.log(`[Bootstrap] Remotes registered in ${(performance.now() - registerStart).toFixed(2)}ms`);

  // Step 2: Preload remotes
  console.log('[Bootstrap] Preloading remotes...');
  const preloadStart = performance.now();

  try {
    // Preload both app2 and app3 in a single call
    await preloadRemote([
      {
        nameOrAlias: 'app2',
        resourceCategory: 'all',
        exposes: ['./Widget'],
      },
      {
        nameOrAlias: 'app3',
        resourceCategory: 'all',
        exposes: ['./Widget'],
      },
    ]);

    console.log(`[Bootstrap] All remotes preloaded in ${(performance.now() - preloadStart).toFixed(2)}ms`);
  } catch (error) {
    console.error('[Bootstrap] Error preloading remotes:', error);
  }

  // Step 3: Render the app
  console.log('[Bootstrap] Rendering app...');
  ReactDOM.render(<App />, document.getElementById('root'));
}

initApp();
