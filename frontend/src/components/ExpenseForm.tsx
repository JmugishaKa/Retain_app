import { FormEvent, useState } from 'react';
import { api, today } from '../api';
import { Category, Expense, PAYMENTS } from '../types';
import Modal from './Modal';

interface Props { expense: Expense | null; categories: Category[]; onSaved: () => void; onClose: () => void }

export default function ExpenseForm({ expense, categories, onSaved, onClose }: Props) {
  const [f, setF] = useState({
    title: expense?.title ?? '', amount: expense ? String(expense.amount) : '', date: expense?.date.slice(0, 10) ?? today(),
    category_id: String(expense?.category_id ?? categories.find((c) => c.is_default)?.id ?? ''),
    payment_method: expense?.payment_method ?? PAYMENTS[0], notes: expense?.notes ?? '',
  });
  const [err, setErr] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function submit(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setErr('');
    try {
      await api(expense ? `/expenses/${expense.id}` : '/expenses', {
        method: expense ? 'PUT' : 'POST', body: { ...f, amount: Number(f.amount), category_id: Number(f.category_id) },
      });
      onSaved();
    } catch (x) { setErr((x as Error).message); setSaving(false); }
  }

  return (
    <Modal title={expense ? 'Edit expense' : 'Add expense'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        <label>Title<input value={f.title} onChange={set('title')} required maxLength={120} autoFocus /></label>
        <div className="grid2">
          <label>Amount<input type="number" min="0.01" step="0.01" value={f.amount} onChange={set('amount')} required /></label>
          <label>Date<input type="date" value={f.date} onChange={set('date')} required /></label>
          <label>Category
            <select value={f.category_id} onChange={set('category_id')}>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </label>
          <label>Payment method
            <select value={f.payment_method} onChange={set('payment_method')}>{PAYMENTS.map((p) => <option key={p}>{p}</option>)}</select>
          </label>
        </div>
        <label>Notes (optional)<textarea rows={3} value={f.notes} onChange={set('notes')} /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary" disabled={saving}>{saving ? 'Saving…' : 'Save expense'}</button>
      </form>
    </Modal>
  );
}
