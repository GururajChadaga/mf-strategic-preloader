import App from './App';
import React from 'react';
import ReactDOM from 'react-dom';
import { registerRemotes, preloadRemote } from '@module-federation/enhanced/runtime';

/**
 * Strategic Preloader for Module Federation remotes
 * Implements priority-based preloading with idle-time optimization
 * Adapted from Advanced Topics documentation example
 */
class StrategicPreloader {
  constructor() {
    /** @type {Array<{remote: string, priority: number}>} */
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * Preload remotes with strategic priority handling
   * @param {Array<{ name: string, priority: 'critical' | 'high' | 'low' }>} remotes
   */
  async preloadStrategic(remotes) {
    // Sort by priority
    const priorityMap = { critical: 0, high: 1, low: 2 };
    const sorted = remotes.sort((a, b) => priorityMap[a.priority] - priorityMap[b.priority]);

    // Preload critical immediately
    const critical = sorted.filter(r => r.priority === 'critical');
    if (critical.length > 0) {
      console.log(
        '[StrategicPreloader] Preloading CRITICAL remotes (parallel):',
        critical.map(r => r.name),
      );

      await Promise.all(
        critical.map(r => {
          const start = performance.now();
          console.log(
            `[StrategicPreloader] [START] ${r.name} (critical) preload`,
          );

          return preloadRemote([
            {
              nameOrAlias: r.name,
            },
          ]).then(() => {
            const duration = performance.now() - start;
            console.log(
              `[StrategicPreloader] [DONE] ${r.name} (critical) preloaded in ${duration.toFixed(
                2,
              )}ms`,
            );
          });
        }),
      );

      console.log('[StrategicPreloader] All CRITICAL remotes preloaded');
    }

    // Queue others for idle time
    const others = sorted.filter(r => r.priority !== 'critical');
    this.queueForIdlePreload(others);
  }

  /**
   * Queue remotes for idle-time preloading
   * @param {Array<{ name: string, priority: string }>} remotes
   */
  queueForIdlePreload(remotes) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(() => {
        this.preloadNext(remotes);
      }, { timeout: 5000 });
    } else {
      // Fallback for Safari
      setTimeout(() => this.preloadNext(remotes), 1000);
    }
  }

  /**
   * Preload next remote in queue
   * @param {Array<{ name: string, priority: string }>} remotes
   */
  async preloadNext(remotes) {
    if (this.isPreloading || remotes.length === 0) return;

    this.isPreloading = true;
    const next = remotes.shift();

    const start = performance.now();
    console.log(
      `[StrategicPreloader] [START] ${next.name} (${next.priority}) idle preload`,
    );

    try {
      await preloadRemote([
        {
          nameOrAlias: next.name,
        },
      ]);
      const duration = performance.now() - start;
      console.log(
        `[StrategicPreloader] [DONE] ${next.name} (${next.priority}) idle preloaded in ${duration.toFixed(
          2,
        )}ms`,
      );
    } catch (error) {
      console.warn(`Preload failed for ${next.name}:`, error);
    }

    this.isPreloading = false;

    if (remotes.length > 0) {
      this.queueForIdlePreload(remotes);
    }
  }
}

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

  // Step 2: Strategic preloading with priorities
  console.log('[Bootstrap] Starting strategic preloading...');
  const preloadStart = performance.now();

  try {
    const preloader = new StrategicPreloader();

    // Configure remotes with priorities
    // Change the order and priority here to control preload behavior
    await preloader.preloadStrategic([
      { name: 'app3', priority: 'low' }, // Idle time
      { name: 'app2', priority: 'high' },      // Idle time
    ]);

    console.log(`[Bootstrap] Strategic preloading initiated in ${(performance.now() - preloadStart).toFixed(2)}ms`);
  } catch (error) {
    console.error('[Bootstrap] Error during strategic preloading:', error);
  }

  // Step 3: Render the app
  console.log('[Bootstrap] Rendering app...');
  ReactDOM.render(<App />, document.getElementById('root'));
}

initApp();
