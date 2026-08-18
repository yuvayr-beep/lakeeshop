import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  phoneNumber: string | null;
  isLocked: boolean;
}

const IS_LOCKED_KEY = 'idle_is_locked';
const LEGACY_LOCKED_KEY = 'isLocked';
const LAST_ACTIVE_KEY = 'idle_last_active_time';

const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const phone = localStorage.getItem('userPhone');
    const isLocked =
      localStorage.getItem(IS_LOCKED_KEY) === 'true' ||
      localStorage.getItem(LEGACY_LOCKED_KEY) === 'true';
    return { token, isAuthenticated: !!token, phoneNumber: phone, isLocked: !!token && isLocked };
  }
  return { token: null, isAuthenticated: false, phoneNumber: null, isLocked: false };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; phoneNumber: string }>) {
      state.token = action.payload.token;
      state.phoneNumber = action.payload.phoneNumber;
      state.isAuthenticated = true;
      state.isLocked = false;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('userPhone', action.payload.phoneNumber);
        localStorage.removeItem(IS_LOCKED_KEY);
        localStorage.removeItem(LEGACY_LOCKED_KEY);
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    },
    lockSession(state) {
      if (state.isAuthenticated) {
        state.isLocked = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem(IS_LOCKED_KEY, 'true');
          localStorage.setItem(LEGACY_LOCKED_KEY, 'true');
        }
      }
    },
    unlockSession(state) {
      state.isLocked = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem(IS_LOCKED_KEY);
        localStorage.removeItem(LEGACY_LOCKED_KEY);
        localStorage.setItem(LAST_ACTIVE_KEY, Date.now().toString());
      }
    },
    logout(state) {
      state.token = null;
      state.isAuthenticated = false;
      state.phoneNumber = null;
      state.isLocked = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userPhone');
        localStorage.removeItem(IS_LOCKED_KEY);
        localStorage.removeItem(LEGACY_LOCKED_KEY);
        localStorage.removeItem(LAST_ACTIVE_KEY);
      }
    },
  },
});

export const { setCredentials, lockSession, unlockSession, logout } = authSlice.actions;
export default authSlice.reducer;
