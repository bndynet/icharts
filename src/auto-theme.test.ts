import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { syncThemeWithElementAttribute } from './auto-theme.js';
import { switchTheme, getCurrentTheme } from './themes/index.js';

// Keep the test focused on the sync/observer logic: mock the theme engine so
// we don't pull ColorHub + ECharts into this node-environment test.
vi.mock('./themes/index.js', () => ({
  switchTheme: vi.fn(),
  getCurrentTheme: vi.fn(() => ({ name: 'light' })),
}));

class FakeMutationObserver {
  static instances: FakeMutationObserver[] = [];

  callback: MutationCallback;
  observed: Element | null = null;
  disconnected = false;

  constructor(callback: MutationCallback) {
    this.callback = callback;
    FakeMutationObserver.instances.push(this);
  }

  observe(target: Element): void {
    this.observed = target;
  }

  disconnect(): void {
    this.disconnected = true;
  }

  trigger(): void {
    this.callback([], this as unknown as MutationObserver);
  }
}

// A DOM element fake with a controllable attribute value.
const attrValues = new Map<string, string | null>();
const fakeElement = {
  getAttribute: (name: string): string | null =>
    attrValues.has(name) ? (attrValues.get(name) ?? null) : null,
} as unknown as Element;

beforeEach(() => {
  vi.clearAllMocks();
  FakeMutationObserver.instances = [];
  attrValues.clear();
  vi.stubGlobal('MutationObserver', FakeMutationObserver);
  vi.stubGlobal('document', { documentElement: fakeElement });
  vi.mocked(getCurrentTheme).mockReturnValue({
    name: 'light',
  } as ReturnType<typeof getCurrentTheme>);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('syncThemeWithElementAttribute', () => {
  it('applies the current attribute value immediately on start', () => {
    attrValues.set('data-theme', 'dark');

    const stop = syncThemeWithElementAttribute('data-theme');

    expect(switchTheme).toHaveBeenCalledTimes(1);
    expect(switchTheme).toHaveBeenCalledWith('dark');
    expect(FakeMutationObserver.instances).toHaveLength(1);
    expect(FakeMutationObserver.instances[0].observed).toBe(fakeElement);
    expect(typeof stop).toBe('function');
  });

  it('does not switch when the value already matches the active theme', () => {
    attrValues.set('data-theme', 'light'); // getCurrentTheme → 'light'

    syncThemeWithElementAttribute('data-theme');

    expect(switchTheme).not.toHaveBeenCalled();
  });

  it('switches when the observed attribute changes', () => {
    attrValues.set('data-theme', 'light');
    syncThemeWithElementAttribute('data-theme');

    attrValues.set('data-theme', 'dark');
    FakeMutationObserver.instances[0].trigger();

    expect(switchTheme).toHaveBeenCalledTimes(1);
    expect(switchTheme).toHaveBeenCalledWith('dark');
  });

  it('maps the attribute value through options.resolve', () => {
    attrValues.set('data-color-mode', 'night');

    syncThemeWithElementAttribute('data-color-mode', {
      resolve: (value) => (value === 'night' ? 'my-dark' : value ?? undefined),
    });

    expect(switchTheme).toHaveBeenCalledWith('my-dark');
  });

  it('skips the switch when options.resolve returns undefined', () => {
    attrValues.set('data-theme', 'system');

    syncThemeWithElementAttribute('data-theme', {
      resolve: () => undefined,
    });

    expect(switchTheme).not.toHaveBeenCalled();
  });

  it('observes an explicit target element', () => {
    const body = {
      getAttribute: (name: string) => (name === 'data-theme' ? 'dark' : null),
    } as unknown as Element;

    syncThemeWithElementAttribute('data-theme', { target: body });

    expect(FakeMutationObserver.instances[0].observed).toBe(body);
    expect(switchTheme).toHaveBeenCalledWith('dark');
  });

  it('returns a stop function that disconnects the observer', () => {
    attrValues.set('data-theme', 'light');
    const stop = syncThemeWithElementAttribute('data-theme');

    stop();

    expect(FakeMutationObserver.instances[0].disconnected).toBe(true);
  });

  it('degrades to a no-op stop handle without MutationObserver', () => {
    vi.stubGlobal('MutationObserver', undefined);

    attrValues.set('data-theme', 'dark');
    const stop = syncThemeWithElementAttribute('data-theme');

    expect(FakeMutationObserver.instances).toHaveLength(0);
    expect(switchTheme).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });

  it('degrades to a no-op stop handle without document', () => {
    vi.stubGlobal('document', undefined);

    const stop = syncThemeWithElementAttribute('data-theme');

    expect(() => stop()).not.toThrow();
  });
});
