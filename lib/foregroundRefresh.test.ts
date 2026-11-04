import { afterEach, describe, expect, it, vi } from 'vitest';
import { startForegroundRefresh } from './foregroundRefresh';

afterEach(() => vi.useRealTimers());

const settle = async () => { for (let i = 0; i < 8; i++) await Promise.resolve(); };
function setup(refresh = vi.fn(async (_initial: boolean) => {})) {
  const windowTarget = new EventTarget(), documentTarget = new EventTarget();
  const state = { visible: true, online: true };
  const onError = vi.fn();
  const dispose = startForegroundRefresh({ windowTarget, documentTarget, isVisible: () => state.visible, isOnline: () => state.online, refresh, onError });
  return { windowTarget, documentTarget, state, dispose, refresh, onError };
}

describe('app launch and foreground refresh', () => {
  it('refreshes immediately on launch and again when a phone resumes', async () => {
    vi.useFakeTimers();
    const app = setup();
    await settle();
    expect(app.refresh).toHaveBeenCalledWith(true);
    app.state.visible = false;
    app.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await vi.advanceTimersByTimeAsync(2000);
    expect(app.refresh).toHaveBeenCalledTimes(1);
    app.state.visible = true;
    app.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(app.refresh).toHaveBeenLastCalledWith(false);
    expect(app.refresh).toHaveBeenCalledTimes(2);
    app.dispose();
  });
  it('coalesces focus, pageshow and visibility events instead of duplicating work', async () => {
    vi.useFakeTimers();
    const app = setup();
    await settle();
    await vi.advanceTimersByTimeAsync(2000);
    app.windowTarget.dispatchEvent(new Event('focus'));
    app.windowTarget.dispatchEvent(new Event('pageshow'));
    app.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await settle();
    app.windowTarget.dispatchEvent(new Event('focus'));
    await settle();
    expect(app.refresh).toHaveBeenCalledTimes(2);
    app.dispose();
  });
  it('waits for connectivity and refreshes when the device reconnects', async () => {
    vi.useFakeTimers();
    const app = setup();
    await settle();
    app.state.online = false;
    await vi.advanceTimersByTimeAsync(2000);
    app.windowTarget.dispatchEvent(new Event('focus'));
    await settle();
    expect(app.refresh).toHaveBeenCalledTimes(1);
    app.state.online = true;
    app.windowTarget.dispatchEvent(new Event('online'));
    await settle();
    expect(app.refresh).toHaveBeenCalledTimes(2);
    app.dispose();
  });
  it('does not overlap slow refreshes and removes listeners on cleanup', async () => {
    vi.useFakeTimers();
    let finish!: () => void;
    const refresh = vi.fn((_initial: boolean) => new Promise<void>(resolve => { finish = resolve; }));
    const app = setup(refresh);
    await settle();
    await vi.advanceTimersByTimeAsync(5000);
    app.windowTarget.dispatchEvent(new Event('focus'));
    await settle();
    expect(refresh).toHaveBeenCalledTimes(1);
    finish(); await settle(); app.dispose();
    app.windowTarget.dispatchEvent(new Event('pageshow'));
    app.documentTarget.dispatchEvent(new Event('visibilitychange'));
    await settle();
    expect(refresh).toHaveBeenCalledTimes(1);
  });
  it('reports failures and permits a subsequent retry', async () => {
    vi.useFakeTimers();
    const error = new Error('Offline');
    const refresh = vi.fn(async (_initial: boolean) => {}).mockRejectedValueOnce(error);
    const app = setup(refresh);
    await settle();
    expect(app.onError).toHaveBeenCalledWith(error);
    await vi.advanceTimersByTimeAsync(2000);
    app.windowTarget.dispatchEvent(new Event('focus'));
    await settle();
    expect(refresh).toHaveBeenCalledTimes(2);
    app.dispose();
  });
});
