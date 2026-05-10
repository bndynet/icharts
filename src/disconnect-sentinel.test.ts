/**
 * @vitest-environment jsdom
 *
 * Exercises the sentinel against a real `customElements` registry and a
 * real `disconnectedCallback`. JSDOM faithfully implements the Custom
 * Elements V1 lifecycle, so these tests run the same code path the
 * browser will — no hand-rolled DOM stubs to drift out of sync.
 *
 * The behaviors locked here are the contract `IChart` depends on:
 *   1. Disposer fires when the sentinel leaves the live DOM.
 *   2. Disposer is *deferred* one microtask so synchronous
 *      detach→reattach (Vue Teleport, React Portal) self-heals.
 *   3. The handle's `remove()` is silent — explicit `chart.dispose()`
 *      must not re-enter the disposer through our own sentinel.
 *   4. No-DOM environments return `null`, letting the registry's
 *      `pruneDetachedCharts` cover the fallback path.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

import { installSentinel } from './disconnect-sentinel.js';

beforeEach(() => {
  // Fresh body for each test — avoids cross-test sentinel leaks. The
  // `customElements` registry itself is per-realm and *persists* across
  // tests in the same file, which is fine: our module's
  // `ensureRegistered` guard handles a second registration as a no-op.
  document.body.innerHTML = '';
});

/** Wait for queued microtasks to drain. The sentinel defers disposal via
 * `queueMicrotask`; tests need to await one tick to see the effect. */
function flushMicrotasks(): Promise<void> {
  return Promise.resolve();
}

describe('installSentinel', () => {
  it('returns a handle and appends the sentinel into the container', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);

    const handle = installSentinel(container, () => {});

    expect(handle).not.toBeNull();
    expect(container.children.length).toBe(1);
    expect(container.children[0]!.tagName.toLowerCase()).toBe('icharts-sentinel');
  });

  it('invokes the disposer when the container is detached from the document', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onDisconnect = vi.fn();

    installSentinel(container, onDisconnect);
    expect(onDisconnect).not.toHaveBeenCalled();

    container.remove();
    // Disposer is deferred one microtask — synchronous detach hasn't
    // fired it yet.
    expect(onDisconnect).not.toHaveBeenCalled();
    await flushMicrotasks();

    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it('skips disposal when the container is reattached in the same task (Teleport / Portal pattern)', async () => {
    const container = document.createElement('div');
    const home = document.createElement('div');
    const elsewhere = document.createElement('div');
    document.body.appendChild(home);
    document.body.appendChild(elsewhere);
    home.appendChild(container);

    const onDisconnect = vi.fn();
    installSentinel(container, onDisconnect);

    // Move the container synchronously — exactly what Vue Teleport does
    // when a `to` target changes. The browser fires
    // `disconnectedCallback` then `connectedCallback`; our microtask
    // defer means we observe the *final* state.
    home.removeChild(container);
    elsewhere.appendChild(container);
    await flushMicrotasks();

    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('fires only once even after multiple disconnect-and-reflow cycles', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onDisconnect = vi.fn();
    installSentinel(container, onDisconnect);

    // First "real" detach.
    container.remove();
    await flushMicrotasks();
    expect(onDisconnect).toHaveBeenCalledOnce();

    // Reattach and detach again. The sentinel cleared its own callback
    // after the first invocation; subsequent disconnects must not
    // fire a stale closure.
    document.body.appendChild(container);
    container.remove();
    await flushMicrotasks();

    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it('handle.remove() detaches the sentinel without invoking the disposer', async () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const onDisconnect = vi.fn();

    const handle = installSentinel(container, onDisconnect);
    expect(handle).not.toBeNull();

    handle!.remove();
    await flushMicrotasks();

    expect(container.children.length).toBe(0);
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('handles nested container detach (ancestor removal also unhooks the sentinel)', async () => {
    // The browser fires `disconnectedCallback` on all descendants when an
    // ancestor is removed, not just the direct child. `IChart` relies on
    // this — host frameworks usually unmount a *parent* wrapper, not the
    // exact `chartEl` node.
    const outer = document.createElement('section');
    const middle = document.createElement('div');
    const inner = document.createElement('div'); // chart container
    outer.appendChild(middle);
    middle.appendChild(inner);
    document.body.appendChild(outer);

    const onDisconnect = vi.fn();
    installSentinel(inner, onDisconnect);

    outer.remove(); // detach the grandparent
    await flushMicrotasks();

    expect(onDisconnect).toHaveBeenCalledOnce();
  });

  it('returns null when document is unavailable (SSR fallback)', async () => {
    // Snapshot and stub the global so the test is hermetic — restore
    // afterwards so subsequent tests see the real jsdom document.
    const realDoc = globalThis.document;
    // @ts-expect-error — deliberate undefined to simulate SSR.
    globalThis.document = undefined;
    try {
      const handle = installSentinel({} as HTMLElement, () => {});
      expect(handle).toBeNull();
    } finally {
      globalThis.document = realDoc;
    }
  });
});
