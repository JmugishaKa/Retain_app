import { FormEvent, useCallback, useEffect, useState } from 'react';
import Stat from '../components/Stat';
import { api, fmtDate, money } from '../api';
import { CatStat, Category, Insights } from '../types';

function Categories() {
  const [cats, setCats] = useState<Category[]>([]);
  const [name, setName] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => { api<Category[]>('/categories').then(setCats).catch((e) => setMsg({ ok: false, text: e.message })); }, []);
  useEffect(load, [load]);

  const run = async (fn: () => Promise<string>) => {
    try { setMsg({ ok: true, text: await fn() }); load(); } catch (e) { setMsg({ ok: false, text: (e as Error).message }); }
  };
  const add = (e: FormEvent) => { e.preventDefault(); run(async () => { await api('/admin/categories', { method: 'POST', body: { name } }); setName(''); return 'Category added'; }); };
  const rename = (id: number) => run(async () => { await api(`/admin/categories/${id}`, { method: 'PUT', body: { name: editName } }); setEditId(null); return 'Category renamed'; });
  const del = (c: Category) => {
    if (!window.confirm(`Delete "${c.name}"? Its expenses will move to Uncategorized.`)) return;
    run(async () => { const r = await api<{ reassigned: number }>(`/admin/categories/${c.id}`, { method: 'DELETE' }); return `Deleted. ${r.reassigned} expense(s) moved to Uncategorized.`; });
  };

  return (
    <section className="card">
      <form className="row" onSubmit={add}>
        <input placeholder="New category name" value={name} onChange={(e) => setName(e.target.value)} required aria-label="New category name" />
        <button className="primary">Add category</button>
      </form>
      {msg && <p className={msg.ok ? 'ok' : 'error'} role="status">{msg.text}</p>}
      <ul className="plain">
        {cats.map((c) => (
          <li key={c.id} className="row between">
            {editId === c.id ? (
              <input value={editName} onChange={(e) => setEditName(e.target.value)} autoFocus aria-label="Category name" />
            ) : (
              <span>{c.name}{c.is_default && <small>Default category, cannot be changed or deleted</small>}</span>
            )}
            {!c.is_default && (
              <span className="row">
                {editId === c.id ? (
                  <><button className="primary" onClick={() => rename(c.id)}>Save</button><button className="ghost" onClick={() => setEditId(null)}>Cancel</button></>
                ) : (
                  <><button className="ghost" onClick={() => { setEditId(c.id); setEditName(c.name); }}>Rename</button><button className="ghost danger" onClick={() => del(c)}>Delete</button></>
                )}
              </span>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

const CatList = ({ title, items }: { title: string; items: CatStat[] }) => (
  <section className="card">
    <h2>{title}</h2>
    <ul className="plain">{items.map((c) => <li key={c.category} className="row between"><span>{c.category}</span><strong>{c.count} expense{c.count === 1 ? '' : 's'}</strong></li>)}</ul>
  </section>
);

function InsightsView() {
  const [d, setD] = useState<Insights | null>(null);
  const [err, setErr] = useState('');
  useEffect(() => { api<Insights>('/admin/insights').then(setD).catch((e) => setErr(e.message)); }, []);
  if (!d) return <p className="center">{err || 'Loading insights…'}</p>;
  return (
    <>
      <div className="stats four">
        <Stat label="Registered users" value={d.totalUsers} />
        <Stat label="Expenses recorded" value={d.totalExpenses} />
        <Stat label="Total value" value={money(d.totalValue)} />
        <Stat label="Recorded this month" value={d.monthExpenses} />
      </div>
      <div className="cols">
        <section className="card">
          <h2>Spending per category</h2>
          <ul className="plain">{d.perCategory.map((c) => <li key={c.category} className="row between"><span>{c.category}</span><strong>{money(c.total)}</strong></li>)}</ul>
        </section>
        <div className="stack"><CatList title="Most-used categories" items={d.top5} /><CatList title="Least-used categories" items={d.bottom5} /></div>
        <section className="card">
          <h2>Recently added expenses</h2>
          <ul className="plain">{d.recentExpenses.map((e) => <li key={e.id} className="row between"><span>{e.title}<small>{e.user_name} · {e.category} · {fmtDate(e.date)}</small></span><strong>{money(e.amount)}</strong></li>)}</ul>
        </section>
        <section className="card">
          <h2>Recently registered users</h2>
          <ul className="plain">{d.recentUsers.map((u) => <li key={u.id}><span>{u.name}<small>{u.email} · joined {fmtDate(u.created_at)}</small></span></li>)}</ul>
        </section>
      </div>
    </>
  );
}

export default function Admin() {
  const [tab, setTab] = useState<'insights' | 'categories'>('insights');
  return (
    <>
      <h1>Admin</h1>
      <div className="tabs" role="tablist">
        <button role="tab" aria-selected={tab === 'insights'} onClick={() => setTab('insights')}>Platform insights</button>
        <button role="tab" aria-selected={tab === 'categories'} onClick={() => setTab('categories')}>Categories</button>
      </div>
      {tab === 'insights' ? <InsightsView /> : <Categories />}
    </>
  );
}
