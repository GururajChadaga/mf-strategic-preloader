import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerRemotes } from '@module-federation/enhanced/runtime';
import StrategicLoader from './StrategicLoader';

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

  console.log(
    `[Bootstrap] Remotes registered in ${(performance.now() - registerStart).toFixed(2)}ms`,
  );

  // Step 2: Strategic preloading with priorities
  // console.log('[Bootstrap] Starting strategic preloading...');
  // const preloadStart = performance.now();

  // try {
  //   const preloader = new StrategicLoader('preloadRemote');

  //   // Configure remotes with priorities
  //   // Change the order and priority here to control preload behavior
  //   await preloader.loadStrategic([
  //     { name: 'app3', priority: 'critical' }, // Blocking
  //     { name: 'app2', priority: 'high' }, // Idle time
  //   ]);

  //   console.log(
  //     `[Bootstrap] Strategic preloading initiated in ${(performance.now() - preloadStart).toFixed(2)}ms`,
  //   );
  // } catch (error) {
  //   console.error('[Bootstrap] Error during strategic preloading:', error);
  // }

  // Step 3: Render the app
  console.log('[Bootstrap] Rendering app...');
  ReactDOM.render(<App />, document.getElementById('root'));
}

initApp();
