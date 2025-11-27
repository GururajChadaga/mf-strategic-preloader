import { preloadRemote, loadRemote } from '@module-federation/enhanced/runtime';

/**
 * Strategic Loader for Module Federation remotes.
 * Implements priority-based loading with idle-time optimization.
 *
 * Use `preloadRemoteStrategic()` to preload remotes (manifests only).
 * Use `loadRemoteStrategic()` to load remotes and get module factories.
 */
class StrategicLoader {
  constructor() {
    /** @type {(name: string) => Promise<any>} */
    this.invoker = null;
    /** @type {Array<{remote: string, priority: number}>} */
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * Strategically preload remotes using `preloadRemote`.
   * @param {Array<{ name: string, priority: 'critical' | 'high' | 'low' }>} remotes
   * @returns {Promise<Map<string, any>>} Map of remote name to preload result
   */
  preloadRemoteStrategic(remotes) {
    this.invoker = name =>
      preloadRemote([
        {
          nameOrAlias: name,
        },
      ]);
    return this.loadStrategic(remotes);
  }

  /**
   * Strategically load remotes using `loadRemote`.
   * @param {Array<{ name: string, priority: 'critical' | 'high' | 'low' }>} remotes
   * @returns {Promise<Map<string, any>>} Map of remote name to module factory
   */
  loadRemoteStrategic(remotes) {
    this.invoker = key => loadRemote(key);
    return this.loadStrategic(remotes);
  }

  /**
   * Load a single remote with priority (convenience method for loadMicroFrontend).
   * @param {string} name - Remote name (e.g., "app2/Widget")
   * @param {'critical' | 'high' | 'low'} [priority='high'] - Loading priority
   * @returns {Promise<any>} The loaded module factory
   */
  async loadRemoteStrategicSingle(name, priority = 'high') {
    const results = await this.loadRemoteStrategic([{ name, priority }]);
    return results.get(name);
  }

  /**
   * Load remotes with strategic priority handling
   * @param {Array<{ name: string, priority: 'critical' | 'high' | 'low' }>} remotes
   * @returns {Promise<Map<string, any>>} Map of remote name to loaded module
   */
  async loadStrategic(remotes) {
    const results = new Map();
    const errors = new Map();

    // Sort by priority
    const priorityMap = { critical: 0, high: 1, low: 2 };
    const sorted = remotes.sort(
      (a, b) => priorityMap[a.priority] - priorityMap[b.priority],
    );

    // Preload/load critical immediately
    const critical = sorted.filter(r => r.priority === 'critical');
    if (critical.length > 0) {
      console.log(
        '[StrategicLoader] Loading CRITICAL remotes (parallel):',
        critical.map(r => r.name),
      );

      await Promise.all(
        critical.map(async r => {
          const start = performance.now();
          console.log(
            `[StrategicLoader] [START] ${r.name} (critical) load`,
          );

          try {
            const mod = await this.invoker(r.name);
            const duration = performance.now() - start;
            console.log(
              `[StrategicLoader] [DONE] ${r.name} (critical) loaded in ${duration.toFixed(
                2,
              )}ms`,
            );
            results.set(r.name, mod);
          } catch (error) {
            console.warn(
              `[StrategicLoader] Load failed for CRITICAL remote ${r.name}:`,
              error,
            );
            errors.set(r.name, error);
          }
        }),
      );

      console.log('[StrategicLoader] All CRITICAL remotes loaded');
    }

    // Queue others for idle time
    const others = sorted.filter(r => r.priority !== 'critical');
    if (others.length > 0) {
      this.queueForIdlePreload(others, results, errors);
    }

    return results;
  }

  /**
   * Queue remotes for idle-time loading
   * @param {Array<{ name: string, priority: string }>} remotes
   * @param {Map<string, any>} results - Map to store loaded modules
   * @param {Map<string, Error>} errors - Map to store errors
   */
  queueForIdlePreload(remotes, results, errors) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          this.preloadNext(remotes, results, errors);
        },
        { timeout: 5000 },
      );
    } else {
      // Fallback for Safari
      setTimeout(() => this.preloadNext(remotes, results, errors), 1000);
    }
  }

  /**
   * Load next remote in queue
   * @param {Array<{ name: string, priority: string }>} remotes
   * @param {Map<string, any>} results - Map to store loaded modules
   * @param {Map<string, Error>} errors - Map to store errors
   */
  async preloadNext(remotes, results, errors) {
    if (this.isPreloading || remotes.length === 0) return;

    this.isPreloading = true;
    const next = remotes.shift();

    const start = performance.now();
    console.log(
      `[StrategicLoader] [START] ${next.name} (${next.priority}) idle load`,
    );

    try {
      const mod = await this.invoker(next.name);
      const duration = performance.now() - start;
      console.log(
        `[StrategicLoader] [DONE] ${next.name} (${next.priority}) idle loaded in ${duration.toFixed(
          2,
        )}ms`,
      );
      results.set(next.name, mod);
    } catch (error) {
      console.warn(`Load failed for ${next.name}:`, error);
      errors.set(next.name, error);
    }

    this.isPreloading = false;

    if (remotes.length > 0) {
      this.queueForIdlePreload(remotes, results, errors);
    }
  }
}

export default StrategicLoader;
