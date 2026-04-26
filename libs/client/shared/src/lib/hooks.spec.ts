import { renderHook, act } from '@testing-library/react';
import {
  useLocalStorage,
  useDebounce,
  usePrevious,
  useToggle,
  useIsMounted,
  useMediaQuery,
  useOnClickOutside,
} from './hooks';

// ---------------------------------------------------------------------------
// Shared setup / teardown
// ---------------------------------------------------------------------------

beforeEach(() => {
  window.localStorage.clear();
  jest.useFakeTimers();
});

afterEach(() => {
  jest.useRealTimers();
});

// ---------------------------------------------------------------------------
// useLocalStorage
// ---------------------------------------------------------------------------

describe('useLocalStorage', () => {
  it('returns the initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('default');
  });

  it('persists a new value to localStorage', () => {
    const { result } = renderHook(() => useLocalStorage('key', 'default'));

    act(() => {
      result.current[1]('updated');
    });

    expect(result.current[0]).toBe('updated');
    expect(JSON.parse(window.localStorage.getItem('key') as string)).toBe(
      'updated',
    );
  });

  it('reads an existing value from localStorage on mount', () => {
    window.localStorage.setItem('key', JSON.stringify('stored'));
    const { result } = renderHook(() => useLocalStorage('key', 'default'));
    expect(result.current[0]).toBe('stored');
  });

  it('supports a functional updater', () => {
    const { result } = renderHook(() => useLocalStorage('count', 0));

    act(() => {
      result.current[1]((prev) => prev + 1);
    });

    expect(result.current[0]).toBe(1);
  });

  it('handles non-string types (object)', () => {
    const { result } = renderHook(() =>
      useLocalStorage<{ name: string }>('obj', { name: 'Alice' }),
    );

    act(() => {
      result.current[1]({ name: 'Bob' });
    });

    expect(result.current[0]).toEqual({ name: 'Bob' });
  });

  it('falls back to initialValue when localStorage contains invalid JSON', () => {
    window.localStorage.setItem('bad', 'not-json{{{');
    const { result } = renderHook(() => useLocalStorage('bad', 'fallback'));
    expect(result.current[0]).toBe('fallback');
  });
});

// ---------------------------------------------------------------------------
// useDebounce
// ---------------------------------------------------------------------------

describe('useDebounce', () => {
  it('returns the initial value immediately', () => {
    const { result } = renderHook(() => useDebounce('initial', 300));
    expect(result.current).toBe('initial');
  });

  it('does not update the debounced value before the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    jest.advanceTimersByTime(299);
    expect(result.current).toBe('a');
  });

  it('updates the debounced value after the delay', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    act(() => {
      jest.advanceTimersByTime(300);
    });
    expect(result.current).toBe('b');
  });

  it('resets the timer on rapid successive changes', () => {
    const { result, rerender } = renderHook(
      ({ value }) => useDebounce(value, 300),
      { initialProps: { value: 'a' } },
    );

    rerender({ value: 'b' });
    jest.advanceTimersByTime(200);
    rerender({ value: 'c' });
    jest.advanceTimersByTime(200);
    // only 200 ms have passed since last change — still stale
    expect(result.current).toBe('a');

    act(() => {
      jest.advanceTimersByTime(100);
    });
    expect(result.current).toBe('c');
  });
});

// ---------------------------------------------------------------------------
// usePrevious
// ---------------------------------------------------------------------------

describe('usePrevious', () => {
  it('returns undefined on the first render', () => {
    const { result } = renderHook(() => usePrevious(1));
    expect(result.current).toBeUndefined();
  });

  it('returns the previous value after a re-render', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 1 },
    });

    rerender({ value: 2 });
    expect(result.current).toBe(1);
  });

  it('tracks multiple value changes', () => {
    const { result, rerender } = renderHook(({ value }) => usePrevious(value), {
      initialProps: { value: 'a' },
    });

    rerender({ value: 'b' });
    expect(result.current).toBe('a');

    rerender({ value: 'c' });
    expect(result.current).toBe('b');
  });
});

// ---------------------------------------------------------------------------
// useToggle
// ---------------------------------------------------------------------------

describe('useToggle', () => {
  it('initialises with false by default', () => {
    const { result } = renderHook(() => useToggle());
    expect(result.current[0]).toBe(false);
  });

  it('initialises with the provided value', () => {
    const { result } = renderHook(() => useToggle(true));
    expect(result.current[0]).toBe(true);
  });

  it('toggles the value when toggle is called', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[1]();
    });
    expect(result.current[0]).toBe(false);
  });

  it('sets an explicit value via the third element', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      result.current[2](true);
    });
    expect(result.current[0]).toBe(true);

    act(() => {
      result.current[2](false);
    });
    expect(result.current[0]).toBe(false);
  });

  it('toggle callback is stable across renders', () => {
    const { result, rerender } = renderHook(() => useToggle(false));
    const toggle1 = result.current[1];
    rerender();
    const toggle2 = result.current[1];
    expect(toggle1).toBe(toggle2);
  });
});

// ---------------------------------------------------------------------------
// useIsMounted
// ---------------------------------------------------------------------------

describe('useIsMounted', () => {
  it('is true while the component is mounted', () => {
    const { result } = renderHook(() => useIsMounted());
    expect(result.current.current).toBe(true);
  });

  it('is false after the component unmounts', () => {
    const { result, unmount } = renderHook(() => useIsMounted());
    unmount();
    expect(result.current.current).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useMediaQuery
// ---------------------------------------------------------------------------

describe('useMediaQuery', () => {
  function mockMatchMedia(matches: boolean) {
    const listeners: ((e: MediaQueryListEvent) => void)[] = [];

    const mql = {
      matches,
      addEventListener: jest.fn(
        (_type: string, cb: (e: MediaQueryListEvent) => void) => {
          listeners.push(cb);
        },
      ),
      removeEventListener: jest.fn(
        (_type: string, cb: (e: MediaQueryListEvent) => void) => {
          const idx = listeners.indexOf(cb);
          if (idx !== -1) listeners.splice(idx, 1);
        },
      ),
      // Helper to fire a change event in tests
      _fireChange: (nextMatches: boolean) => {
        listeners.forEach((cb) =>
          cb({ matches: nextMatches } as MediaQueryListEvent),
        );
      },
    };

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      configurable: true,
      value: jest.fn(() => mql),
    });

    return mql;
  }

  it('returns the initial match state', () => {
    mockMatchMedia(true);
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    expect(result.current).toBe(true);
  });

  it('returns false when the query does not match', () => {
    mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(min-width: 1200px)'));
    expect(result.current).toBe(false);
  });

  it('updates when the media query fires a change event', () => {
    const mql = mockMatchMedia(false);
    const { result } = renderHook(() => useMediaQuery('(max-width: 768px)'));

    act(() => {
      mql._fireChange(true);
    });

    expect(result.current).toBe(true);
  });

  it('removes the event listener on unmount', () => {
    const mql = mockMatchMedia(false);
    const { unmount } = renderHook(() => useMediaQuery('(max-width: 768px)'));
    unmount();
    expect(mql.removeEventListener).toHaveBeenCalledTimes(1);
  });
});

// ---------------------------------------------------------------------------
// useOnClickOutside
// ---------------------------------------------------------------------------

describe('useOnClickOutside', () => {
  it('calls the handler when a mousedown occurs outside the ref element', () => {
    const handler = jest.fn();
    const outer = document.createElement('div');
    const inner = document.createElement('button');
    outer.appendChild(inner);
    document.body.appendChild(outer);

    // Provide the ref pointing to `inner`
    const { unmount } = renderHook(() => {
      const ref = { current: inner };
      useOnClickOutside(ref as React.RefObject<HTMLButtonElement>, handler);
    });

    // Click outside (on outer's sibling / body)
    const outsideEl = document.createElement('span');
    document.body.appendChild(outsideEl);

    act(() => {
      outsideEl.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    document.body.removeChild(outer);
    document.body.removeChild(outsideEl);
  });

  it('does not call the handler when a mousedown occurs inside the ref element', () => {
    const handler = jest.fn();
    const container = document.createElement('div');
    const child = document.createElement('span');
    container.appendChild(child);
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = { current: container };
      useOnClickOutside(ref as React.RefObject<HTMLDivElement>, handler);
    });

    act(() => {
      child.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
    });

    expect(handler).not.toHaveBeenCalled();

    unmount();
    document.body.removeChild(container);
  });

  it('calls the handler for a touchstart outside the ref element', () => {
    const handler = jest.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);

    const outside = document.createElement('span');
    document.body.appendChild(outside);

    const { unmount } = renderHook(() => {
      const ref = { current: container };
      useOnClickOutside(ref as React.RefObject<HTMLDivElement>, handler);
    });

    act(() => {
      outside.dispatchEvent(new TouchEvent('touchstart', { bubbles: true }));
    });

    expect(handler).toHaveBeenCalledTimes(1);

    unmount();
    document.body.removeChild(container);
    document.body.removeChild(outside);
  });

  it('removes event listeners on unmount', () => {
    const addSpy = jest.spyOn(document, 'addEventListener');
    const removeSpy = jest.spyOn(document, 'removeEventListener');

    const container = document.createElement('div');
    document.body.appendChild(container);

    const { unmount } = renderHook(() => {
      const ref = { current: container };
      useOnClickOutside(ref as React.RefObject<HTMLDivElement>, jest.fn());
    });

    const addCount = addSpy.mock.calls.filter(
      ([type]) => type === 'mousedown' || type === 'touchstart',
    ).length;

    unmount();

    const removeCount = removeSpy.mock.calls.filter(
      ([type]) => type === 'mousedown' || type === 'touchstart',
    ).length;

    expect(addCount).toBe(2);
    expect(removeCount).toBe(2);

    addSpy.mockRestore();
    removeSpy.mockRestore();
    document.body.removeChild(container);
  });
});
