import { createSlice } from '@reduxjs/toolkit';

interface ThemeState {
  mode: 'light' | 'dark';
}

const getInitialMode = (): 'light' | 'dark' => {
  if (typeof window !== 'undefined') {
    const saved = localStorage.getItem('themeMode');
    if (saved === 'dark' || saved === 'light') return saved;
  }
  return 'light';
};

const themeSlice = createSlice({
  name: 'theme',
  initialState: { mode: 'light' } as ThemeState,
  reducers: {
    toggleTheme(state) {
      state.mode = state.mode === 'light' ? 'dark' : 'light';
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', state.mode);
        if (state.mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
    setTheme(state, action) {
      state.mode = action.payload;
      if (typeof window !== 'undefined') {
        localStorage.setItem('themeMode', action.payload);
        if (action.payload === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    },
  },
});

export const { toggleTheme, setTheme } = themeSlice.actions;
export default themeSlice.reducer;
