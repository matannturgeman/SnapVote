import { act, fireEvent, render, screen } from '@testing-library/react';
import { ThemeProvider, useTheme } from './theme.context';

// Helper component that surfaces theme context values
function ThemeConsumer() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  return (
    <div>
      <span data-testid="theme">{theme}</span>
      <span data-testid="resolved">{resolvedTheme}</span>
      <button onClick={() => setTheme('light')}>set-light</button>
      <button onClick={() => setTheme('dark')}>set-dark</button>
      <button onClick={() => setTheme('system')}>set-system</button>
    </div>
  );
}

function renderWithProvider() {
  return render(
    <ThemeProvider>
      <ThemeConsumer />
    </ThemeProvider>,
  );
}

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      delete store[key];
    },
    clear: () => {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock matchMedia
function mockMatchMedia(prefersDark: boolean) {
  const listeners: ((e: MediaQueryListEvent) => void)[] = [];
  const mq = {
    matches: prefersDark,
    addEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      listeners.push(cb);
    },
    removeEventListener: (_: string, cb: (e: MediaQueryListEvent) => void) => {
      const idx = listeners.indexOf(cb);
      if (idx !== -1) listeners.splice(idx, 1);
    },
    dispatchChange: (matches: boolean) => {
      listeners.forEach((cb) => cb({ matches } as MediaQueryListEvent));
    },
  };
  window.matchMedia = jest.fn().mockReturnValue(mq);
  return mq;
}

beforeEach(() => {
  localStorageMock.clear();
  document.documentElement.classList.remove('dark');
});

describe('ThemeProvider', () => {
  it('defaults to system theme when no localStorage value is set', () => {
    mockMatchMedia(false);
    renderWithProvider();
    expect(screen.getByTestId('theme').textContent).toBe('system');
  });

  it('resolves to light when system preference is light and theme is system', () => {
    mockMatchMedia(false);
    renderWithProvider();
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves to dark when system preference is dark and theme is system', () => {
    mockMatchMedia(true);
    renderWithProvider();
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('resolves to light when theme is manually set to light regardless of system', () => {
    mockMatchMedia(true); // system is dark
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('set-light'));
    });
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('resolves to dark when theme is manually set to dark regardless of system', () => {
    mockMatchMedia(false); // system is light
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('set-dark'));
    });
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('persists theme choice to localStorage', () => {
    mockMatchMedia(false);
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('set-dark'));
    });
    expect(localStorageMock.getItem('snapvote-theme')).toBe('dark');
  });

  it('reads persisted theme from localStorage on mount', () => {
    mockMatchMedia(false); // system is light
    localStorageMock.setItem('snapvote-theme', 'dark');
    renderWithProvider();
    expect(screen.getByTestId('theme').textContent).toBe('dark');
    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('tracks system preference changes in real time when theme is system', () => {
    const mq = mockMatchMedia(false);
    renderWithProvider();
    expect(screen.getByTestId('resolved').textContent).toBe('light');

    act(() => {
      mq.dispatchChange(true);
    });

    expect(screen.getByTestId('resolved').textContent).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  it('does NOT track system changes when a manual theme is set', () => {
    const mq = mockMatchMedia(false);
    renderWithProvider();
    act(() => {
      fireEvent.click(screen.getByText('set-light'));
    });

    act(() => {
      mq.dispatchChange(true); // OS switches to dark
    });

    // Manual light override should hold
    expect(screen.getByTestId('resolved').textContent).toBe('light');
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('removes .dark class when switching from dark to light', () => {
    mockMatchMedia(true);
    renderWithProvider();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    act(() => {
      fireEvent.click(screen.getByText('set-light'));
    });
    expect(document.documentElement.classList.contains('dark')).toBe(false);
  });

  it('throws if useTheme is used outside ThemeProvider', () => {
    const spy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    expect(() => render(<ThemeConsumer />)).toThrow(
      'useTheme must be used inside ThemeProvider',
    );
    spy.mockRestore();
  });
});
