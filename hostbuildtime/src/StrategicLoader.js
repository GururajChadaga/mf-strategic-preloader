import { preloadRemote } from '@module-federation/enhanced/runtime';

/**
 * Strategic Loader for Module Federation remotes.
 * Implements priority-based loading with idle-time optimization.
 * Currently only 'preloadRemote' mode is supported.
 */
class StrategicLoader {
  /**
   * @param {'preloadRemote'} mode Currently only 'preloadRemote' is supported.
   */
  constructor(mode = 'preloadRemote') {
    if (mode !== 'preloadRemote') {
      throw new Error(
        `[StrategicLoader] Unsupported mode: ${mode}. Only 'preloadRemote' is supported for now.`,
      );
    }

    this.invokeRemote = name =>
      preloadRemote([
        {
          nameOrAlias: name,
        },
      ]);

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
    const sorted = remotes.sort(
      (a, b) => priorityMap[a.priority] - priorityMap[b.priority],
    );

    // Preload critical immediately
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

          return this.invokeRemote(r.name).then(() => {
            const duration = performance.now() - start;
            console.log(
              `[StrategicLoader] [DONE] ${r.name} (critical) preloaded in ${duration.toFixed(
                2,
              )}ms`,
            );
          });
        }),
      );

      console.log('[StrategicLoader] All CRITICAL remotes preloaded');
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
      requestIdleCallback(
        () => {
          this.preloadNext(remotes);
        },
        { timeout: 5000 },
      );
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
      `[StrategicLoader] [START] ${next.name} (${next.priority}) idle preload`,
    );

    try {
      await this.invokeRemote(next.name);
      const duration = performance.now() - start;
      console.log(
        `[StrategicLoader] [DONE] ${next.name} (${next.priority}) idle preloaded in ${duration.toFixed(
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

export default StrategicLoader;
