interface StorageLike {
  getItem: (key: string) => string | null;
  setItem: (key: string, value: string) => void;
  removeItem: (key: string) => void;
}

function getLocalStorage(): StorageLike | null {
  const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
  return storage ?? null;
}

export function getPersistedToken(): string | null {
  return getLocalStorage()?.getItem('accessToken') ?? null;
}

export function clearPersistedToken(): void {
  getLocalStorage()?.removeItem('accessToken');
}

export function persistToken(token: string): void {
  getLocalStorage()?.setItem('accessToken', token);
}
