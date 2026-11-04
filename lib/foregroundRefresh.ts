/** Refresh on launch and resume, coalescing the events browsers fire together. */
export function startForegroundRefresh(options: {
  windowTarget: EventTarget;
  documentTarget: EventTarget;
  isVisible: () => boolean;
  isOnline: () => boolean;
  refresh: (initial: boolean) => Promise<void>;
  onError: (error: unknown) => void;
  throttleMs?: number;
}) {
  let disposed = false, running = false, first = true, lastStart = -Infinity;
  const run = () => {
    if (disposed || running || !options.isVisible() || !options.isOnline()) return;
    const now = Date.now();
    if (now - lastStart < (options.throttleMs ?? 1500)) return;
    running = true;
    lastStart = now;
    const initial = first;
    first = false;
    Promise.resolve().then(() => {
      if (!disposed) return options.refresh(initial);
    }).catch(error => {
      if (!disposed) options.onError(error);
    }).finally(() => { running = false; });
  };
  const events = ['focus', 'online', 'pageshow'];
  events.forEach(event => options.windowTarget.addEventListener(event, run));
  options.documentTarget.addEventListener('visibilitychange', run);
  run();
  return () => {
    disposed = true;
    events.forEach(event => options.windowTarget.removeEventListener(event, run));
    options.documentTarget.removeEventListener('visibilitychange', run);
  };
}
