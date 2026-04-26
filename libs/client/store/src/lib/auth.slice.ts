import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Slice } from '@reduxjs/toolkit';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
}

export interface AuthState {
  user: AuthenticatedUser | null;
  token: string | null;
  isAuthenticated: boolean;
}

// ---------------------------------------------------------------------------
// Initial state
// ---------------------------------------------------------------------------

const initialState: AuthState = {
  user: null,
  token: null,
  isAuthenticated: false,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const authSlice: Slice<AuthState> = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (
      state,
      action: PayloadAction<{ user: AuthenticatedUser; token: string }>,
    ) => {
      state.user = action.payload.user;
      state.token = action.payload.token;
      state.isAuthenticated = true;
    },
    clearCredentials: () => initialState,
    updateUser: (state, action: PayloadAction<Partial<AuthenticatedUser>>) => {
      if (state.user) {
        state.user = { ...state.user, ...action.payload };
      }
    },
  },
});

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

export const { setCredentials, clearCredentials, updateUser } =
  authSlice.actions;

export type SetCredentialsPayload = { user: AuthenticatedUser; token: string };
export type UpdateUserPayload = Partial<AuthenticatedUser>;
export const doSetCredentials = (payload: SetCredentialsPayload) =>
  setCredentials(payload);
export const doClearCredentials = () => clearCredentials(void 0);
export const doUpdateUser = (payload: UpdateUserPayload) => updateUser(payload);

export const authReducer = authSlice.reducer;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectCurrentUser = (state: { auth: AuthState }) =>
  state.auth.user;

export const selectAuthToken = (state: { auth: AuthState }) => state.auth.token;

export const selectIsAuthenticated = (state: { auth: AuthState }) =>
  state.auth.isAuthenticated;
