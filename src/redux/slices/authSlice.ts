import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  phoneNumber: string | null;
}

const getInitialState = (): AuthState => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('accessToken');
    const phone = localStorage.getItem('userPhone');
    return { token, isAuthenticated: !!token, phoneNumber: phone };
  }
  return { token: null, isAuthenticated: false, phoneNumber: null };
};

const authSlice = createSlice({
  name: 'auth',
  initialState: getInitialState(),
  reducers: {
    setCredentials(state, action: PayloadAction<{ token: string; phoneNumber: string }>) {
      state.token = action.payload.token;
      state.phoneNumber = action.payload.phoneNumber;
      state.isAuthenticated = true;
      if (typeof window !== 'undefined') {
        localStorage.setItem('accessToken', action.payload.token);
        localStorage.setItem('userPhone', action.payload.phoneNumber);
      }
    },
    logout(state) {
      state.token = null;
      state.isAuthenticated = false;
      state.phoneNumber = null;
      if (typeof window !== 'undefined') {
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('userPhone');
      }
    },
  },
});

export const { setCredentials, logout } = authSlice.actions;
export default authSlice.reducer;
