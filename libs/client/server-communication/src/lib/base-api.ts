import { createApi, fetchBaseQuery } from '@reduxjs/toolkit/query/react';
import type {
  BaseQueryFn,
  FetchArgs,
  FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react';

export const BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:3000/api';

interface AuthTokenState {
  auth: { token: string | null };
}

interface StorageLike {
  getItem: (key: string) => string | null;
  removeItem: (key: string) => void;
}

function getLocalStorage(): StorageLike | null {
  const storage = (globalThis as { localStorage?: StorageLike }).localStorage;
  return storage ?? null;
}

export function readPersistedToken(): string | null {
  return getLocalStorage()?.getItem('accessToken') ?? null;
}

function clearPersistedToken(): void {
  getLocalStorage()?.removeItem('accessToken');
}

export type ApiTagType = 'User' | 'Auth' | 'Poll' | 'ShareLink' | 'Vote';

const rawBaseQuery = fetchBaseQuery({
  baseUrl: BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const reduxToken = (getState() as AuthTokenState).auth.token;
    const token = reduxToken || readPersistedToken();

    if (token) {
      headers.set('Authorization', `Bearer ${token}`);
    }

    return headers;
  },
});

// Endpoints that legitimately return 401 for "wrong credentials" (not expired session).
// These should NOT trigger a logout.
const CREDENTIAL_CHECK_ENDPOINTS = [
  '/auth/change-password',
  '/auth/login',
  '/auth/reactivate',
];

export const baseQueryWithReauth: BaseQueryFn<
  string | FetchArgs,
  unknown,
  FetchBaseQueryError
> = async (args, api, extraOptions) => {
  const result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const url = typeof args === 'string' ? args : args.url;
    const isCredentialCheck = CREDENTIAL_CHECK_ENDPOINTS.some((ep) =>
      url.includes(ep),
    );
    if (!isCredentialCheck) {
      api.dispatch({ type: 'auth/clearCredentials' });
      clearPersistedToken();
    }
  }

  if (result.error) {
    const requestId =
      result.meta?.response?.headers?.get('x-backend-request-id') ?? undefined;

    if (
      requestId &&
      typeof result.error.data === 'object' &&
      result.error.data !== null
    ) {
      (result.error.data as Record<string, unknown>)['requestId'] = requestId;
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: 'api',
  baseQuery: baseQueryWithReauth,
  tagTypes: [
    'User',
    'Auth',
    'Poll',
    'ShareLink',
    'Vote',
  ] satisfies ApiTagType[],
  endpoints: () => ({}),
});
