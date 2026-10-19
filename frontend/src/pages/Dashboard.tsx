import { FormEvent, useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Stat from '../components/Stat';
import { api, fmtDate, money } from '../api';
import { DashboardData } from '../types';

const LABEL = { none: 'No budget set', within: 'Within budget', approaching: 'Approaching budget', over: 'Over budget' };

export default function Dashboard() {
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [d, setD] = useState<DashboardData | null>(null);
  const [budget, setBudget] = useState('');
  const [err, setErr] = useState('');

  const load = useCallback(() => {
    api<DashboardData>(`/dashboard?month=${month}`)
      .then((x) => { setD(x); setBudget(x.budget ? String(x.budget) : ''); setErr(''); })
      .catch((e) => setErr(e.message));
  }, [month]);
  useEffect(load, [load]);

  async function saveBudget(e: FormEvent) {
    e.preventDefault();
    try { await api(`/budgets/${month}`, { method: 'PUT', body: { amount: Number(budget) } }); load(); }
    catch (x) { setErr((x as Error).message); }
  }

  if (!d) return <p className="center">{err || 'Loading your dashboard…'}</p>;
  const pct = d.budget ? Math.min((d.spent / d.budget) * 100, 100) : 0;
  const maxCat = Math.max(...d.byCategory.map((c) => c.total), 1);

  return (
    <>
      <div className="row between wrap">
        <h1>Your month</h1>
        <label className="inline">Month<input type="month" value={month} onChange={(e) => e.target.value && setMonth(e.target.value)} /></label>
      </div>
      {err && <p className="error" role="alert">{err}</p>}

      <section className={`meter-card ${d.status}`}>
        <div className="row between wrap">
          <div><span className="muted">Left to spend</span><div className="big-num">{d.remaining === null ? '—' : money(d.remaining)}</div></div>
          <span className="badge">{LABEL[d.status]}</span>
        </div>
        <div className="meter" role="progressbar" aria-valuenow={Math.round(pct)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${pct}%` }} />
        </div>
        <div className="row between wrap">
          <span>{money(d.spent)} spent{d.budget ? ` of ${money(d.budget)}` : ''}</span>
          <form className="row" onSubmit={saveBudget}>
            <input type="number" min="1" step="0.01" placeholder="Monthly budget" value={budget} onChange={(e) => setBudget(e.target.value)} required aria-label="Monthly budget" />
            <button className="primary">{d.budget ? 'Update budget' : 'Set budget'}</button>
          </form>
        </div>
      </section>

      <div className="stats">
        <Stat label="Total spent" value={money(d.spent)} />
        <Stat label="Highest expense" value={d.highest ? money(d.highest.amount) : '—'} />
        <Stat label="Biggest item" value={d.highest ? d.highest.title : 'No expenses yet'} />
      </div>

      <div className="cols">
        <section className="card">
          <h2>Spending by category</h2>
          {d.byCategory.length === 0 && <p className="muted">Nothing recorded this month. <Link to="/expenses">Add an expense</Link></p>}
          {d.byCategory.map((c) => (
            <div className="bar-row" key={c.category}>
              <span>{c.category}</span>
              <div className="bar"><i style={{ width: `${(c.total / maxCat) * 100}%` }} /></div>
              <strong>{money(c.total)}</strong>
            </div>
          ))}
        </section>
        <section className="card">
          <div className="row between"><h2>Recent expenses</h2><Link to="/expenses">See all</Link></div>
          {d.recent.length === 0 && <p className="muted">No expenses yet.</p>}
          <ul className="plain">
            {d.recent.map((e) => (
              <li key={e.id} className="row between"><span>{e.title}<small>{e.category} · {fmtDate(e.date)}</small></span><strong>{money(e.amount)}</strong></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
