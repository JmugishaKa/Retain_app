import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export interface Filters {
  q: string; category: string; payment: string; from: string; to: string;
  min: string; max: string; sort: 'date' | 'amount'; order: 'asc' | 'desc'; page: number;
}
export const initialFilters: Filters = {
  q: '', category: '', payment: '', from: '', to: '', min: '', max: '', sort: 'date', order: 'desc', page: 1,
};

const slice = createSlice({
  name: 'filters',
  initialState: initialFilters,
  reducers: {
    // any change to a filter returns to page 1 unless a page is passed explicitly
    setFilters: (s, a: PayloadAction<Partial<Filters>>) => ({ ...s, page: 1, ...a.payload }),
    resetFilters: () => initialFilters,
  },
});
export const { setFilters, resetFilters } = slice.actions;
export default slice.reducer;
