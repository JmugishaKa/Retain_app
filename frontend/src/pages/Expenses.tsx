import { useEffect, useState } from 'react';
import FilterBar from '../components/FilterBar';
import ExpenseForm from '../components/ExpenseForm';
import Modal from '../components/Modal';
import { api, fmtDate, money } from '../api';
import { useAppDispatch, useAppSelector } from '../store';
import { setFilters } from '../store/filtersSlice';
import { Category, Expense, Paged } from '../types';

export default function Expenses() {
  const f = useAppSelector((s) => s.filters);
  const dispatch = useAppDispatch();
  const [data, setData] = useState<Paged | null>(null);
  const [cats, setCats] = useState<Category[]>([]);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(true);
  const [editing, setEditing] = useState<Expense | 'new' | null>(null);
  const [viewing, setViewing] = useState<Expense | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => { api<Category[]>('/categories').then(setCats).catch((e) => setErr(e.message)); }, []);

  useEffect(() => {
    let stale = false;
    const p = new URLSearchParams({ limit: '10' });
    Object.entries(f).forEach(([k, v]) => v !== '' && p.set(k, String(v)));
    setBusy(true);
    api<Paged>('/expenses?' + p)
      .then((d) => { if (!stale) { setData(d); setErr(''); } })
      .catch((e) => !stale && setErr(e.message))
      .finally(() => !stale && setBusy(false));
    return () => { stale = true; };
  }, [f, tick]);

  async function remove(e: Expense) {
    if (!window.confirm(`Delete "${e.title}"? This cannot be undone.`)) return;
    try { await api(`/expenses/${e.id}`, { method: 'DELETE' }); setViewing(null); setTick((t) => t + 1); }
    catch (x) { setErr((x as Error).message); }
  }

  return (
    <>
      <div className="row between wrap"><h1>Expenses</h1><button className="primary" onClick={() => setEditing('new')}>Add expense</button></div>
      <FilterBar categories={cats} />
      {err && <p className="error" role="alert">{err}</p>}

      <div className={`card table-card ${busy ? 'busy' : ''}`}>
        {data && data.items.length === 0 && <p className="muted pad">No expenses match. Adjust your filters or add a new expense.</p>}
        {data && data.items.length > 0 && (
          <table>
            <thead><tr><th>Date</th><th>Title</th><th>Category</th><th>Payment</th><th className="num">Amount</th><th /></tr></thead>
            <tbody>
              {data.items.map((e) => (
                <tr key={e.id}>
                  <td data-label="Date">{fmtDate(e.date)}</td>
                  <td data-label="Title"><button className="link" onClick={() => setViewing(e)}>{e.title}</button></td>
                  <td data-label="Category">{e.category}</td>
                  <td data-label="Payment">{e.payment_method}</td>
                  <td data-label="Amount" className="num">{money(e.amount)}</td>
                  <td className="actions">
                    <button className="ghost" onClick={() => setEditing(e)}>Edit</button>
                    <button className="ghost danger" onClick={() => remove(e)}>Delete</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {data && (
        <div className="row between pager">
          <span className="muted">{data.total} expense{data.total === 1 ? '' : 's'}</span>
          <div className="row">
            <button className="ghost" disabled={f.page <= 1} onClick={() => dispatch(setFilters({ page: f.page - 1 }))}>Previous</button>
            <span>Page {data.page} of {data.pages}</span>
            <button className="ghost" disabled={f.page >= data.pages} onClick={() => dispatch(setFilters({ page: f.page + 1 }))}>Next</button>
          </div>
        </div>
      )}

      {editing && (
        <ExpenseForm
          expense={editing === 'new' ? null : editing} categories={cats}
          onClose={() => setEditing(null)} onSaved={() => { setEditing(null); setTick((t) => t + 1); }}
        />
      )}
      {viewing && (
        <Modal title={viewing.title} onClose={() => setViewing(null)}>
          <dl className="details">
            <dt>Amount</dt><dd>{money(viewing.amount)}</dd>
            <dt>Date</dt><dd>{fmtDate(viewing.date)}</dd>
            <dt>Category</dt><dd>{viewing.category}</dd>
            <dt>Payment</dt><dd>{viewing.payment_method}</dd>
            <dt>Notes</dt><dd>{viewing.notes || 'No notes'}</dd>
          </dl>
          <div className="row">
            <button className="primary" onClick={() => { setEditing(viewing); setViewing(null); }}>Edit</button>
            <button className="ghost danger" onClick={() => remove(viewing)}>Delete</button>
          </div>
        </Modal>
      )}
    </>
  );
}
