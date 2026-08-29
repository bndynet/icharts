import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  syncThemeWithElementAttribute,
  syncThemeWithMediaQuery,
} from './auto-theme.js';
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

// ---------------------------------------------------------------------------
// prefers-color-scheme sync
// ---------------------------------------------------------------------------

class FakeMediaQueryList {
  private listeners = new Set<(event: MediaQueryListEvent) => void>();

  constructor(public matches: boolean) {}

  addEventListener = (
    _type: string,
    listener: (event: MediaQueryListEvent) => void,
  ): void => {
    this.listeners.add(listener);
  };

  removeEventListener = (
    _type: string,
    listener: (event: MediaQueryListEvent) => void,
  ): void => {
    this.listeners.delete(listener);
  };

  dispatch(next: boolean): void {
    this.matches = next;
    for (const listener of [...this.listeners]) {
      listener({ matches: next } as MediaQueryListEvent);
    }
  }

  get listenerCount(): number {
    return this.listeners.size;
  }
}

function stubMatchMedia(media: unknown): void {
  vi.stubGlobal('window', { matchMedia: vi.fn(() => media) });
}

describe('syncThemeWithMediaQuery', () => {
  it('applies the current OS preference immediately', () => {
    stubMatchMedia(new FakeMediaQueryList(true));

    const stop = syncThemeWithMediaQuery();

    expect(switchTheme).toHaveBeenCalledTimes(1);
    expect(switchTheme).toHaveBeenCalledWith('dark');
    expect(typeof stop).toBe('function');
  });

  it('switches to light when the OS prefers light and the active theme is dark', () => {
    stubMatchMedia(new FakeMediaQueryList(false));
    vi.mocked(getCurrentTheme).mockReturnValue({
      name: 'dark',
    } as ReturnType<typeof getCurrentTheme>);

    syncThemeWithMediaQuery();

    expect(switchTheme).toHaveBeenCalledWith('light');
  });

  it('does not switch when the resolved theme is already active', () => {
    stubMatchMedia(new FakeMediaQueryList(false)); // light; active theme is light

    syncThemeWithMediaQuery();

    expect(switchTheme).not.toHaveBeenCalled();
  });

  it('reacts to media-query changes', () => {
    const media = new FakeMediaQueryList(false);
    stubMatchMedia(media);

    syncThemeWithMediaQuery();
    expect(switchTheme).not.toHaveBeenCalled();

    media.dispatch(true);
    expect(switchTheme).toHaveBeenCalledWith('dark');
  });

  it('supports a custom resolve map, including skipping with undefined', () => {
    const media = new FakeMediaQueryList(true);
    stubMatchMedia(media);
    const resolve = vi.fn((isDark: boolean) =>
      isDark ? 'ocean-dark' : undefined,
    );

    syncThemeWithMediaQuery('(prefers-color-scheme: dark)', { resolve });

    expect(resolve).toHaveBeenCalledWith(true);
    expect(switchTheme).toHaveBeenCalledWith('ocean-dark');

    vi.mocked(switchTheme).mockClear();
    media.dispatch(false); // resolve → undefined → keep current theme
    expect(switchTheme).not.toHaveBeenCalled();
  });

  it('stops listening after the returned cleanup runs', () => {
    const media = new FakeMediaQueryList(false);
    stubMatchMedia(media);

    const stop = syncThemeWithMediaQuery();
    expect(media.listenerCount).toBe(1);

    stop();
    expect(media.listenerCount).toBe(0);
  });

  it('falls back to addListener on legacy MediaQueryList objects', () => {
    const legacy = {
      matches: false,
      addListener: vi.fn(),
      removeListener: vi.fn(),
    };
    stubMatchMedia(legacy);

    const stop = syncThemeWithMediaQuery();
    expect(legacy.addListener).toHaveBeenCalledTimes(1);

    stop();
    expect(legacy.removeListener).toHaveBeenCalledTimes(1);
  });

  it('is a no-op when matchMedia is unavailable', () => {
    // Node environment: no `window` at all.
    const stop = syncThemeWithMediaQuery();

    expect(typeof stop).toBe('function');
    expect(switchTheme).not.toHaveBeenCalled();
    expect(() => stop()).not.toThrow();
  });
});
