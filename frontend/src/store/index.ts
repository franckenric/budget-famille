import { configureStore, createSlice, PayloadAction } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import budgetReducer from './budgetSlice';
import templatesReducer from './templatesSlice';

export interface SettingsState {
  theme: 'auto' | 'light' | 'dark';
}

const loadTheme = (): SettingsState['theme'] => {
  const stored = localStorage.getItem('bf_theme') as SettingsState['theme'] | null;
  return stored === 'light' || stored === 'dark' ? stored : 'auto';
};

const initialState: SettingsState = {
  theme: loadTheme(),
};

const settingsSlice = createSlice({
  name: 'settings',
  initialState,
  reducers: {
    setTheme(state, action: PayloadAction<SettingsState['theme']>) {
      state.theme = action.payload;
      localStorage.setItem('bf_theme', action.payload);
    },
  },
});

export const { setTheme } = settingsSlice.actions;

export const store = configureStore({
  reducer: {
    auth: authReducer,
    budget: budgetReducer,
    templates: templatesReducer,
    settings: settingsSlice.reducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;