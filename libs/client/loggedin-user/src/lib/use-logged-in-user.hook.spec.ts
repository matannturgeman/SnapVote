import { renderHook, act } from '@testing-library/react';
import { createElement, type ReactNode } from 'react';
import {
  LoggedInUserProvider,
  useLoggedInUser,
  useCurrentUser,
  useIsAuthenticated,
  useSetLoggedInUser,
  type LoggedInUser,
} from './use-logged-in-user.hook';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const mockUser: LoggedInUser = {
  id: 1,
  email: 'alice@example.com',
  name: 'Alice',
};

function makeWrapper(
  props: Omit<
    React.ComponentProps<typeof LoggedInUserProvider>,
    'children'
  > = {},
) {
  return ({ children }: { children: ReactNode }) =>
    createElement(LoggedInUserProvider, props, children);
}

// ---------------------------------------------------------------------------
// LoggedInUserProvider
// ---------------------------------------------------------------------------

describe('LoggedInUserProvider', () => {
  it('mounts without crashing and provides context to children', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toBeDefined();
  });

  it('provides the correct context shape', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toMatchObject({
      user: null,
      isLoading: false,
      isAuthenticated: false,
      setUser: expect.any(Function),
    });
  });

  it('seeds context with initialUser when provided', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ initialUser: mockUser }),
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.isLoading).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// useLoggedInUser
// ---------------------------------------------------------------------------

describe('useLoggedInUser', () => {
  it('returns user when initialUser is provided', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ initialUser: mockUser }),
    });

    expect(result.current.user).toEqual(mockUser);
  });

  it('returns null user when no initialUser and no resolveUser', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.user).toBeNull();
  });

  it('throws when used outside of a provider', () => {
    // Suppress the expected console.error from React
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useLoggedInUser())).toThrow(
      'useLoggedInUser() must be used inside a <LoggedInUserProvider>.',
    );

    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useCurrentUser
// ---------------------------------------------------------------------------

describe('useCurrentUser', () => {
  it('returns the user when authenticated', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper({ initialUser: mockUser }),
    });

    expect(result.current).toEqual(mockUser);
  });

  it('returns null when not authenticated', () => {
    const { result } = renderHook(() => useCurrentUser(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toBeNull();
  });

  it('throws when used outside of a provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useCurrentUser())).toThrow(
      'useLoggedInUser() must be used inside a <LoggedInUserProvider>.',
    );

    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useIsAuthenticated
// ---------------------------------------------------------------------------

describe('useIsAuthenticated', () => {
  it('returns true when a user is present', () => {
    const { result } = renderHook(() => useIsAuthenticated(), {
      wrapper: makeWrapper({ initialUser: mockUser }),
    });

    expect(result.current).toBe(true);
  });

  it('returns false when no user is present', () => {
    const { result } = renderHook(() => useIsAuthenticated(), {
      wrapper: makeWrapper(),
    });

    expect(result.current).toBe(false);
  });

  it('throws when used outside of a provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useIsAuthenticated())).toThrow(
      'useLoggedInUser() must be used inside a <LoggedInUserProvider>.',
    );

    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// useSetLoggedInUser
// ---------------------------------------------------------------------------

describe('useSetLoggedInUser', () => {
  it('returns a function', () => {
    const { result } = renderHook(() => useSetLoggedInUser(), {
      wrapper: makeWrapper(),
    });

    expect(typeof result.current).toBe('function');
  });

  it('updates the user in context when called with a user', () => {
    const { result } = renderHook(
      () => ({ ctx: useLoggedInUser(), setUser: useSetLoggedInUser() }),
      { wrapper: makeWrapper() },
    );

    expect(result.current.ctx.user).toBeNull();

    act(() => {
      result.current.setUser(mockUser);
    });

    expect(result.current.ctx.user).toEqual(mockUser);
    expect(result.current.ctx.isAuthenticated).toBe(true);
  });

  it('clears the user in context when called with null', () => {
    const { result } = renderHook(
      () => ({ ctx: useLoggedInUser(), setUser: useSetLoggedInUser() }),
      { wrapper: makeWrapper({ initialUser: mockUser }) },
    );

    expect(result.current.ctx.user).toEqual(mockUser);

    act(() => {
      result.current.setUser(null);
    });

    expect(result.current.ctx.user).toBeNull();
    expect(result.current.ctx.isAuthenticated).toBe(false);
  });

  it('throws when used outside of a provider', () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);

    expect(() => renderHook(() => useSetLoggedInUser())).toThrow(
      'useLoggedInUser() must be used inside a <LoggedInUserProvider>.',
    );

    consoleError.mockRestore();
  });
});

// ---------------------------------------------------------------------------
// resolveUser callback
// ---------------------------------------------------------------------------

describe('resolveUser callback', () => {
  it('is called on mount', async () => {
    const resolveUser = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    // isLoading starts true because resolveUser is provided
    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(resolveUser).toHaveBeenCalledTimes(1);
  });

  it('sets the user returned by resolveUser', async () => {
    const resolveUser = jest.fn().mockResolvedValue(mockUser);

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it('sets user to null when resolveUser returns null', async () => {
    const resolveUser = jest.fn().mockResolvedValue(null);

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);
  });

  it('handles resolveUser errors gracefully and sets user to null', async () => {
    const consoleError = jest
      .spyOn(console, 'error')
      .mockImplementation(() => undefined);
    const resolveUser = jest.fn().mockRejectedValue(new Error('Network error'));

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.isAuthenticated).toBe(false);

    consoleError.mockRestore();
  });

  it('transitions isLoading from true to false after resolveUser completes', async () => {
    const resolveUser = jest.fn().mockResolvedValue(mockUser);

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('transitions isLoading from true to false even when resolveUser rejects', async () => {
    const resolveUser = jest.fn().mockRejectedValue(new Error('auth error'));

    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper({ resolveUser }),
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
  });

  it('does not start in loading state when resolveUser is not provided', () => {
    const { result } = renderHook(() => useLoggedInUser(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.isLoading).toBe(false);
  });
});
