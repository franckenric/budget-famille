import { createAsyncThunk, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type {
  Budget,
  BudgetSummary,
  CategoryStats,
  FixedCharge,
  VariableExpense,
} from '../types';
import {
  createExpense,
  createFixedCharge,
  deleteExpense,
  deleteFixedCharge,
  ensureBudget,
  fetchStats,
  fetchSummary,
  listExpenses,
  listFixedCharges,
  markChargePaid,
  updateBudget,
  updateExpense,
  updateFixedCharge,
} from '../services/endpoints';
import { currentMonth } from '../utils/format';

export interface BudgetState {
  month: string;
  budget: Budget | null;
  summary: BudgetSummary | null;
  stats: CategoryStats | null;
  fixedCharges: FixedCharge[];
  expenses: VariableExpense[];
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: BudgetState = {
  month: currentMonth(),
  budget: null,
  summary: null,
  stats: null,
  fixedCharges: [],
  expenses: [],
  loading: false,
  saving: false,
  error: null,
};

async function loadAll(budgetId: string, month: string) {
  const [summary, stats, fixedCharges, expenses] = await Promise.all([
    fetchSummary(month),
    fetchStats(month),
    listFixedCharges(budgetId),
    listExpenses(month),
  ]);
  return { month, summary, stats, fixedCharges, expenses };
}

export const loadMonthThunk = createAsyncThunk(
  'budget/loadMonth',
  async (month: string, { rejectWithValue }) => {
    try {
      const budget = await ensureBudget(month);
      const rest = await loadAll(budget.id, month);
      return { budget, ...rest };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const refreshMonthThunk = createAsyncThunk(
  'budget/refresh',
  async (month: string, { rejectWithValue, getState }) => {
    try {
      const { budget } = (getState() as { budget: BudgetState }).budget;
      const budgetId = budget?.id;
      if (!budgetId) throw new Error('no budget');
      return await loadAll(budgetId, month);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const saveBudgetThunk = createAsyncThunk(
  'budget/save',
  async ({ budgetId, payload }: { budgetId: string; payload: Partial<Budget> }, { rejectWithValue }) => {
    try {
      return await updateBudget(budgetId, payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const addExpenseThunk = createAsyncThunk(
  'budget/addExpense',
  async (
    payload: Partial<VariableExpense> & { budget_id: string },
    { rejectWithValue },
  ) => {
    try {
      return await createExpense(payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const editExpenseThunk = createAsyncThunk(
  'budget/editExpense',
  async ({ id, payload }: { id: string; payload: Partial<VariableExpense> }, { rejectWithValue }) => {
    try {
      return await updateExpense(id, payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const removeExpenseThunk = createAsyncThunk(
  'budget/removeExpense',
  async ({ id, month }: { id: string; month: string }, { rejectWithValue }) => {
    try {
      await deleteExpense(id);
      return { id, month };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const addFixedChargeThunk = createAsyncThunk(
  'budget/addFixedCharge',
  async (payload: Partial<FixedCharge> & { budget_id: string }, { rejectWithValue }) => {
    try {
      return await createFixedCharge(payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const editFixedChargeThunk = createAsyncThunk(
  'budget/editFixedCharge',
  async ({ id, payload }: { id: string; payload: Partial<FixedCharge> }, { rejectWithValue }) => {
    try {
      return await updateFixedCharge(id, payload);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const togglePaidThunk = createAsyncThunk(
  'budget/togglePaid',
  async ({ id, isPaid }: { id: string; isPaid: boolean }, { rejectWithValue }) => {
    try {
      return await markChargePaid(id, isPaid);
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

export const removeFixedChargeThunk = createAsyncThunk(
  'budget/removeFixedCharge',
  async ({ id, month }: { id: string; month: string }, { rejectWithValue }) => {
    try {
      await deleteFixedCharge(id);
      return { id, month };
    } catch (err) {
      return rejectWithValue((err as Error).message);
    }
  },
);

const budgetSlice = createSlice({
  name: 'budget',
  initialState,
  reducers: {
    setMonth(state, action: PayloadAction<string>) {
      state.month = action.payload;
    },
    clearError(state) {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadMonthThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loadMonthThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.month = action.payload.month;
        state.budget = action.payload.budget;
        state.summary = action.payload.summary;
        state.stats = action.payload.stats;
        state.fixedCharges = action.payload.fixedCharges;
        state.expenses = action.payload.expenses;
      })
      .addCase(loadMonthThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = (action.payload as string) ?? 'Erreur de chargement';
      })
      .addCase(refreshMonthThunk.fulfilled, (state, action) => {
        state.month = action.payload.month;
        state.summary = action.payload.summary;
        state.stats = action.payload.stats;
        state.fixedCharges = action.payload.fixedCharges;
        state.expenses = action.payload.expenses;
      })
      .addCase(refreshMonthThunk.rejected, (state, action) => {
        state.error = (action.payload as string) ?? 'Erreur de rafraîchissement';
      })
      .addCase(saveBudgetThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(saveBudgetThunk.fulfilled, (state, action: PayloadAction<Budget>) => {
        state.saving = false;
        state.budget = action.payload;
      })
      .addCase(saveBudgetThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? 'Erreur de sauvegarde';
      })
      .addCase(addExpenseThunk.pending, (state) => {
        state.saving = true;
      })
      .addCase(addExpenseThunk.fulfilled, (state) => {
        state.saving = false;
      })
      .addCase(addExpenseThunk.rejected, (state, action) => {
        state.saving = false;
        state.error = (action.payload as string) ?? "Erreur d'ajout";
      })
      .addCase(togglePaidThunk.fulfilled, (state, action: PayloadAction<FixedCharge>) => {
        const idx = state.fixedCharges.findIndex((c) => c.id === action.payload.id);
        if (idx >= 0) state.fixedCharges[idx] = action.payload;
      })
      .addCase(removeExpenseThunk.fulfilled, (state, action) => {
        state.expenses = state.expenses.filter((e) => e.id !== action.payload.id);
      })
      .addCase(removeFixedChargeThunk.fulfilled, (state, action) => {
        state.fixedCharges = state.fixedCharges.filter((c) => c.id !== action.payload.id);
      });
  },
});

export const { setMonth, clearError } = budgetSlice.actions;
export default budgetSlice.reducer;