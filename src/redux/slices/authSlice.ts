import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  phoneNumber: string | null;
  isLocked: boolean;
}

const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const phone = localStorage.getItem('userPhone');
    const isLocked = localStorage.getItem('isLocked') === 'true';
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
        localStorage.removeItem('isLocked');
        localStorage.setItem('idle_last_active_time', Date.now().toString());
      }
    },
    lockSession(state) {
      if (state.isAuthenticated) {
        state.isLocked = true;
        if (typeof window !== 'undefined') {
          localStorage.setItem('isLocked', 'true');
        }
      }
    },
    unlockSession(state) {
      state.isLocked = false;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('isLocked');
        localStorage.setItem('idle_last_active_time', Date.now().toString());
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
        localStorage.removeItem('isLocked');
        localStorage.removeItem('idle_last_active_time');
      }
    },
  },
});

export const { setCredentials, lockSession, unlockSession, logout } = authSlice.actions;
export default authSlice.reducer;
