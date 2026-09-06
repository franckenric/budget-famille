import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { FixedChargeTemplate } from '../types';
import { isOnline } from '../services/connectivity';
import { loadSnapshot } from '../services/storage';
import {
  createFixedChargeTemplate,
  deleteFixedChargeTemplate,
  listFixedChargeTemplates,
  updateFixedChargeTemplate,
} from '../services/endpoints';
import {
  offlineDeleteFixedChargeTemplate,
  offlineUpsertFixedChargeTemplate,
} from '../services/sync';
import { nowISO, uid } from '../utils/format';

export interface TemplatesState {
  templates: FixedChargeTemplate[];
  loading: boolean;
  error: string | null;
}

const initialState: TemplatesState = {
  templates: [],
  loading: false,
  error: null,
};

export const loadTemplatesThunk = createAsyncThunk(
  'templates/load',
  async (_, { rejectWithValue }) => {
    try {
      if (isOnline()) {
        return await listFixedChargeTemplates();
      }
      const snap = await loadSnapshot();
      return snap.templates ?? [];
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const addTemplateThunk = createAsyncThunk(
  'templates/add',
  async (
    payload: {
      name: string;
      default_amount: number;
      due_day: number;
      category: FixedChargeTemplate['category'];
    },
    { rejectWithValue, getState },
  ) => {
    try {
      if (isOnline()) {
        return await createFixedChargeTemplate(payload);
      }
      const user = (getState() as { auth: { user?: { id?: string } } }).auth.user;
      const template: FixedChargeTemplate = {
        id: uid(),
        user_id: user?.id,
        name: payload.name,
        default_amount: payload.default_amount,
        due_day: payload.due_day,
        category: payload.category,
        created_at: nowISO(),
        updated_at: nowISO(),
      };
      await offlineUpsertFixedChargeTemplate(template);
      return template;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const editTemplateThunk = createAsyncThunk(
  'templates/edit',
  async (
    { id, payload }: { id: string; payload: Partial<FixedChargeTemplate> },
    { rejectWithValue, getState },
  ) => {
    try {
      if (isOnline()) {
        return await updateFixedChargeTemplate(id, payload);
      }
      const current = (getState() as { templates: TemplatesState }).templates.templates.find(
        (t) => t.id === id,
      );
      if (!current) throw new Error('template not found');
      const updated: FixedChargeTemplate = {
        ...current,
        ...payload,
        id,
        updated_at: nowISO(),
      };
      await offlineUpsertFixedChargeTemplate(updated);
      return updated;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const removeTemplateThunk = createAsyncThunk(
  'templates/remove',
  async (id: string, { rejectWithValue }) => {
    try {
      if (isOnline()) {
        await deleteFixedChargeTemplate(id);
      } else {
        await offlineDeleteFixedChargeTemplate(id);
      }
      return id;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

const templatesSlice = createSlice({
  name: 'templates',
  initialState,
  reducers: {
    clearTemplatesError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadTemplatesThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(loadTemplatesThunk.fulfilled, (state, action: PayloadAction<FixedChargeTemplate[]>) => {
        state.loading = false;
        state.templates = action.payload;
      })
      .addCase(loadTemplatesThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Erreur de chargement';
      })
      .addCase(addTemplateThunk.fulfilled, (state, action: PayloadAction<FixedChargeTemplate>) => {
        state.templates = [...state.templates, action.payload];
      })
      .addCase(editTemplateThunk.fulfilled, (state, action: PayloadAction<FixedChargeTemplate>) => {
        const idx = state.templates.findIndex((t) => t.id === action.payload.id);
        if (idx >= 0) {
          const copy = [...state.templates];
          copy[idx] = action.payload;
          state.templates = copy;
        }
      })
      .addCase(removeTemplateThunk.fulfilled, (state, action: PayloadAction<string>) => {
        state.templates = state.templates.filter((t) => t.id !== action.payload);
      })
      .addCase(addTemplateThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? "Erreur d'ajout";
      })
      .addCase(editTemplateThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? "Erreur de modification";
      })
      .addCase(removeTemplateThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur de suppression';
      });
  },
});

export const { clearTemplatesError } = templatesSlice.actions;
export default templatesSlice.reducer;
