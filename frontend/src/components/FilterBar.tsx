import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '../store';
import { resetFilters, setFilters } from '../store/filtersSlice';
import { Category, PAYMENTS } from '../types';

export default function FilterBar({ categories }: { categories: Category[] }) {
  const f = useAppSelector((s) => s.filters);
  const dispatch = useAppDispatch();
  const [text, setText] = useState(f.q);

  // debounce typing, and resync when filters are reset
  useEffect(() => {
    const t = setTimeout(() => text !== f.q && dispatch(setFilters({ q: text })), 300);
    return () => clearTimeout(t);
  }, [text]);
  useEffect(() => setText(f.q), [f.q]);

  const on = (k: string) => (e: { target: { value: string } }) => dispatch(setFilters({ [k]: e.target.value }));
  const sortVal = `${f.sort}-${f.order}`;

  return (
    <section className="filters" aria-label="Filter expenses">
      <input type="search" placeholder="Search title or notes" value={text} onChange={(e) => setText(e.target.value)} />
      <select value={f.category} onChange={on('category')} aria-label="Category">
        <option value="">All categories</option>
        {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
      </select>
      <select value={f.payment} onChange={on('payment')} aria-label="Payment method">
        <option value="">Any payment method</option>
        {PAYMENTS.map((p) => <option key={p}>{p}</option>)}
      </select>
      <label>From<input type="date" value={f.from} onChange={on('from')} /></label>
      <label>To<input type="date" value={f.to} onChange={on('to')} /></label>
      <label>Min<input type="number" min="0" value={f.min} onChange={on('min')} /></label>
      <label>Max<input type="number" min="0" value={f.max} onChange={on('max')} /></label>
      <select
        value={sortVal} aria-label="Sort"
        onChange={(e) => { const [sort, order] = e.target.value.split('-'); dispatch(setFilters({ sort: sort as 'date' | 'amount', order: order as 'asc' | 'desc' })); }}
      >
        <option value="date-desc">Newest first</option><option value="date-asc">Oldest first</option>
        <option value="amount-desc">Highest amount</option><option value="amount-asc">Lowest amount</option>
      </select>
      <button className="ghost" onClick={() => dispatch(resetFilters())}>Clear filters</button>
    </section>
  );
}
