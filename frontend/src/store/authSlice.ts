import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { User } from '../types';
import { api } from '../services/api';
import {
  fetchMe,
  login as loginApi,
  register as registerApi,
  updateMe,
} from '../services/endpoints';

export interface AuthState {
  user: User | null;
  token: string | null;
  status: 'idle' | 'loading' | 'error';
  error: string | null;
}

const initialState: AuthState = {
  user: null,
  token: localStorage.getItem('bf_token'),
  status: 'idle',
  error: null,
};

async function loginAndFetchMe(email: string, password: string) {
  const data = await loginApi(email, password);
  api.setToken(data.access_token);
  const user = await fetchMe();
  return { token: data.access_token, user };
}

export const loginThunk = createAsyncThunk(
  'auth/login',
  async ({ email, password }: { email: string; password: string }, { rejectWithValue }) => {
    try {
      return await loginAndFetchMe(email, password);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const registerThunk = createAsyncThunk(
  'auth/register',
  async (
    payload: { email: string; full_name: string; password: string; currency?: string },
    { rejectWithValue },
  ) => {
    try {
      await registerApi(payload);
      // register ne renvoie pas de token : on se connecte directement.
      return await loginAndFetchMe(payload.email, payload.password);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const loadMeThunk = createAsyncThunk('auth/me', async (_, { rejectWithValue }) => {
  try {
    return await fetchMe();
  } catch (err) {
    return rejectWithValue((err as Error).message);
  }
});

export const updateProfileThunk = createAsyncThunk(
  'auth/updateProfile',
  async (payload: Partial<User>, { rejectWithValue }) => {
    try {
      return await updateMe(payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const logoutThunk = createAsyncThunk('auth/logout', async () => {
  api.setToken(null);
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    logout(state) {
      state.user = null;
      state.token = null;
      state.status = 'idle';
      state.error = null;
      api.setToken(null);
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loginThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.user = action.payload.user;
        if (action.payload.user.email) {
          localStorage.setItem('bf_user_json', JSON.stringify(action.payload.user));
        }
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? 'Erreur de connexion';
      })
      .addCase(registerThunk.pending, (state) => {
        state.status = 'loading';
        state.error = null;
      })
      .addCase(registerThunk.fulfilled, (state, action) => {
        state.status = 'idle';
        state.token = action.payload.token;
        state.user = action.payload.user;
        if (action.payload.user.email) {
          localStorage.setItem('bf_user_json', JSON.stringify(action.payload.user));
        }
      })
      .addCase(registerThunk.rejected, (state, action) => {
        state.status = 'error';
        state.error = (action.payload as string) ?? "Erreur d'inscription";
      })
      .addCase(loadMeThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
        if (action.payload.email) {
          localStorage.setItem('bf_user_json', JSON.stringify(action.payload));
        }
      })
      .addCase(updateProfileThunk.fulfilled, (state, action: PayloadAction<User>) => {
        state.user = action.payload;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        state.user = null;
        state.token = null;
        state.status = 'idle';
      });
  },
});

export const { logout, clearError } = authSlice.actions;
export default authSlice.reducer;