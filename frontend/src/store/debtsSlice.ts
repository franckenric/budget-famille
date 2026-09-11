import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { Debt } from '../types';
import { listDebts, createDebt, updateDebt, recordDebtPayment, removeDebtPayment, markDebtRepaid, deleteDebt } from '../services/endpoints';

export interface DebtsState {
  debts: Debt[];
  loading: boolean;
  error: string | null;
}

const initialState: DebtsState = {
  debts: [],
  loading: false,
  error: null,
};

export const loadDebtsThunk = createAsyncThunk(
  'debts/load',
  async (_, { rejectWithValue }) => {
    try {
      return await listDebts();
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const addDebtThunk = createAsyncThunk(
  'debts/add',
  async (
    payload: { budget_id?: string | null; lender_name: string; amount: number; debt_date: string; reason?: string; monthly_amount?: number | null; start_date?: string | null },
    { rejectWithValue },
  ) => {
    try {
      return await createDebt(payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const editDebtThunk = createAsyncThunk(
  'debts/edit',
  async ({ id, payload }: { id: string; payload: Partial<Debt> }, { rejectWithValue }) => {
    try {
      return await updateDebt(id, payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const recordPaymentThunk = createAsyncThunk(
  'debts/recordPayment',
  async ({ id, payment }: { id: string; payment: { date: string; amount: number } }, { rejectWithValue }) => {
    try {
      return await recordDebtPayment(id, payment);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const undoPaymentThunk = createAsyncThunk(
  'debts/undoPayment',
  async ({ id, index }: { id: string; index: number }, { rejectWithValue }) => {
    try {
      return await removeDebtPayment(id, index);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const toggleRepaidThunk = createAsyncThunk(
  'debts/toggleRepaid',
  async (id: string, { rejectWithValue }) => {
    try {
      return await markDebtRepaid(id);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const removeDebtThunk = createAsyncThunk(
  'debts/remove',
  async (id: string, { rejectWithValue }) => {
    try {
      await deleteDebt(id);
      return id;
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

const debtsSlice = createSlice({
  name: 'debts',
  initialState,
  reducers: {
    clearDebtError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadDebtsThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadDebtsThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.debts = action.payload;
      })
      .addCase(loadDebtsThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Erreur de chargement';
      })
      .addCase(addDebtThunk.fulfilled, (state, action) => {
        state.debts.unshift(action.payload);
      })
      .addCase(editDebtThunk.fulfilled, (state, action) => {
        const idx = state.debts.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.debts[idx] = action.payload;
      })
      .addCase(recordPaymentThunk.fulfilled, (state, action) => {
        const idx = state.debts.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.debts[idx] = action.payload;
      })
      .addCase(undoPaymentThunk.fulfilled, (state, action) => {
        const idx = state.debts.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.debts[idx] = action.payload;
      })
      .addCase(toggleRepaidThunk.fulfilled, (state, action) => {
        const idx = state.debts.findIndex((d) => d.id === action.payload.id);
        if (idx >= 0) state.debts[idx] = action.payload;
      })
      .addCase(removeDebtThunk.fulfilled, (state, action) => {
        state.debts = state.debts.filter((d) => d.id !== action.payload);
      });
  },
});

export const { clearDebtError } = debtsSlice.actions;
export default debtsSlice.reducer;
