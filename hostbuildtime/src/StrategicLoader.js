import { preloadRemote, loadRemote } from '@module-federation/enhanced/runtime';

/**
 * Strategic Loader for Module Federation remotes.
 * Implements priority-based loading with idle-time optimization.
 * Supports both 'preloadRemote' and 'loadRemote' modes.
 */
class StrategicLoader {
  /**
   * @param {'preloadRemote' | 'loadRemote'} mode
   */
  constructor(mode = 'preloadRemote') {
    switch (mode) {
      case 'preloadRemote': {
        this.invoker = name =>
          preloadRemote([
            {
              nameOrAlias: name,
            },
          ]);
        break;
      }
      case 'loadRemote': {
        this.invoker = key => loadRemote(key);
        break;
      }
      default: {
        throw new Error(
          `[StrategicLoader] Unsupported mode: ${mode}. Use 'preloadRemote' or 'loadRemote'.`,
        );
      }
    }

    /** @type {Array<{remote: string, priority: number}>} */
    this.preloadQueue = [];
    this.isPreloading = false;
  }

  /**
   * Load remotes with strategic priority handling
   * @param {Array<{ name: string, priority: 'critical' | 'high' | 'low' }>} remotes
   * @param {(name: string, mod: any) => void} [onLoaded]
   * @param {(name: string, error: unknown) => void} [onError]
   */
  async loadStrategic(remotes, onLoaded, onError) {
    // Sort by priority
    const priorityMap = { critical: 0, high: 1, low: 2 };
    const sorted = remotes.sort(
      (a, b) => priorityMap[a.priority] - priorityMap[b.priority],
    );

    // Preload/load critical immediately
    const critical = sorted.filter(r => r.priority === 'critical');
    if (critical.length > 0) {
      console.log(
        '[StrategicLoader] Preloading CRITICAL remotes (parallel):',
        critical.map(r => r.name),
      );

      await Promise.all(
        critical.map(r => {
          const start = performance.now();
          console.log(
            `[StrategicLoader] [START] ${r.name} (critical) preload`,
          );

          return this.invoker(r.name)
            .then(mod => {
              const duration = performance.now() - start;
              console.log(
                `[StrategicLoader] [DONE] ${r.name} (critical) preloaded in ${duration.toFixed(
                  2,
                )}ms`,
              );
              if (onLoaded) {
                onLoaded(r.name, mod);
              }
            })
            .catch(error => {
              console.warn(
                `[StrategicLoader] Preload failed for CRITICAL remote ${r.name}:`,
                error,
              );
              if (onError) {
                onError(r.name, error);
              }
            });
        }),
      );

      console.log('[StrategicLoader] All CRITICAL remotes preloaded');
    }

    // Queue others for idle time
    const others = sorted.filter(r => r.priority !== 'critical');
    this.queueForIdlePreload(others, onLoaded, onError);
  }

  /**
   * Queue remotes for idle-time preloading
   * @param {Array<{ name: string, priority: string }>} remotes
   * @param {(name: string, mod: any) => void} [onLoaded]
   * @param {(name: string, error: unknown) => void} [onError]
   */
  queueForIdlePreload(remotes, onLoaded, onError) {
    if ('requestIdleCallback' in window) {
      requestIdleCallback(
        () => {
          this.preloadNext(remotes, onLoaded, onError);
        },
        { timeout: 5000 },
      );
    } else {
      // Fallback for Safari
      setTimeout(() => this.preloadNext(remotes, onLoaded, onError), 1000);
    }
  }

  /**
   * Preload next remote in queue
   * @param {Array<{ name: string, priority: string }>} remotes
   * @param {(name: string, mod: any) => void} [onLoaded]
   * @param {(name: string, error: unknown) => void} [onError]
   */
  async preloadNext(remotes, onLoaded, onError) {
    if (this.isPreloading || remotes.length === 0) return;

    this.isPreloading = true;
    const next = remotes.shift();

    const start = performance.now();
    console.log(
      `[StrategicLoader] [START] ${next.name} (${next.priority}) idle preload`,
    );

    try {
      const mod = await this.invoker(next.name);
      const duration = performance.now() - start;
      console.log(
        `[StrategicLoader] [DONE] ${next.name} (${next.priority}) idle preloaded in ${duration.toFixed(
          2,
        )}ms`,
      );
      if (onLoaded) {
        onLoaded(next.name, mod);
      }
    } catch (error) {
      console.warn(`Preload failed for ${next.name}:`, error);
      if (onError) {
        onError(next.name, error);
      }
    }

    this.isPreloading = false;

    if (remotes.length > 0) {
      this.queueForIdlePreload(remotes, onLoaded, onError);
    }
  }
}

export default StrategicLoader;
