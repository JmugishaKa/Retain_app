import { Router } from 'express';
import { q, pool } from './db.js';
import { requireAuth, requireAdmin } from './auth.js';

const r = Router();
r.use(requireAuth);

const PAYMENTS = ['Cash', 'Card', 'Mobile Money', 'Bank Transfer'];
const MONTH = /^\d{4}-\d{2}$/;
const DATE = /^\d{4}-\d{2}-\d{2}$/;
const bad = (res, m) => res.status(400).json({ error: m });
const notFound = (res) => res.status(404).json({ error: 'Not found' });
const COLS = 'e.id,e.title,e.amount,e.date,e.payment_method,e.notes,e.category_id,c.name AS category';
const JOIN = 'FROM expenses e JOIN categories c ON c.id=e.category_id';

const validate = (b = {}) => {
  if (!b.title?.trim()) return 'Title is required';
  if (!(Number(b.amount) > 0)) return 'Amount must be greater than 0';
  if (!DATE.test(b.date || '')) return 'A valid date is required';
  if (!PAYMENTS.includes(b.payment_method)) return 'Choose a valid payment method';
  if (!Number.isInteger(Number(b.category_id))) return 'Choose a category';
};
const one = async (id, uid) =>
  (await q(`SELECT ${COLS} ${JOIN} WHERE e.id=$1 AND e.user_id=$2`, [id, uid])).rows[0];

// ---- Categories (read: any signed-in user) ----
r.get('/categories', async (_req, res) =>
  res.json((await q('SELECT * FROM categories ORDER BY is_default DESC, name')).rows));

// ---- Expenses: search, filter, sort, paginate (always scoped to the signed-in user) ----
r.get('/expenses', async (req, res) => {
  const f = req.query, p = [req.user.id], w = ['e.user_id=$1'];
  const add = (sql, v) => { p.push(v); w.push(sql.replaceAll('?', '$' + p.length)); };
  if (f.q) add('(e.title ILIKE ? OR e.notes ILIKE ?)', `%${f.q}%`);
  if (f.category) add('e.category_id=?', Number(f.category));
  if (f.payment) add('e.payment_method=?', f.payment);
  if (DATE.test(f.from || '')) add('e.date>=?', f.from);
  if (DATE.test(f.to || '')) add('e.date<=?', f.to);
  if (f.min !== undefined && f.min !== '' && !isNaN(f.min)) add('e.amount>=?', Number(f.min));
  if (f.max !== undefined && f.max !== '' && !isNaN(f.max)) add('e.amount<=?', Number(f.max));
  const col = f.sort === 'amount' ? 'e.amount' : 'e.date';
  const dir = f.order === 'asc' ? 'ASC' : 'DESC';
  const limit = Math.min(Number(f.limit) || 10, 50);
  const page = Math.max(Number(f.page) || 1, 1);
  const where = `${JOIN} WHERE ${w.join(' AND ')}`;
  const total = Number((await q(`SELECT COUNT(*) ${where}`, p)).rows[0].count);
  const { rows } = await q(
    `SELECT ${COLS} ${where} ORDER BY ${col} ${dir}, e.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`, p);
  res.json({ items: rows, total, page, pages: Math.max(Math.ceil(total / limit), 1) });
});

r.get('/expenses/:id', async (req, res) => {
  const e = await one(req.params.id, req.user.id);
  e ? res.json(e) : notFound(res);
});

r.post('/expenses', async (req, res) => {
  const m = validate(req.body);
  if (m) return bad(res, m);
  const b = req.body;
  const { rows } = await q(
    `INSERT INTO expenses(user_id,category_id,title,amount,date,payment_method,notes)
     VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`,
    [req.user.id, b.category_id, b.title.trim(), b.amount, b.date, b.payment_method, b.notes?.trim() || null]);
  res.status(201).json(await one(rows[0].id, req.user.id));
});

r.put('/expenses/:id', async (req, res) => {
  const m = validate(req.body);
  if (m) return bad(res, m);
  const b = req.body;
  const { rowCount } = await q(
    `UPDATE expenses SET category_id=$1,title=$2,amount=$3,date=$4,payment_method=$5,notes=$6
     WHERE id=$7 AND user_id=$8`,
    [b.category_id, b.title.trim(), b.amount, b.date, b.payment_method, b.notes?.trim() || null, req.params.id, req.user.id]);
  rowCount ? res.json(await one(req.params.id, req.user.id)) : notFound(res);
});

r.delete('/expenses/:id', async (req, res) => {
  const { rowCount } = await q('DELETE FROM expenses WHERE id=$1 AND user_id=$2', [req.params.id, req.user.id]);
  rowCount ? res.json({ deleted: true }) : notFound(res);
});

// ---- Budgets (one per user per month) ----
r.get('/budgets/:month', async (req, res) => {
  if (!MONTH.test(req.params.month)) return bad(res, 'Month must look like 2026-10');
  const { rows } = await q('SELECT amount FROM budgets WHERE user_id=$1 AND month=$2', [req.user.id, req.params.month]);
  res.json({ month: req.params.month, amount: rows[0]?.amount ?? null });
});

r.put('/budgets/:month', async (req, res) => {
  const amount = Number(req.body?.amount);
  if (!MONTH.test(req.params.month) || !(amount > 0)) return bad(res, 'Enter a budget greater than 0');
  await q(`INSERT INTO budgets(user_id,month,amount) VALUES($1,$2,$3)
           ON CONFLICT(user_id,month) DO UPDATE SET amount=EXCLUDED.amount`, [req.user.id, req.params.month, amount]);
  res.json({ month: req.params.month, amount });
});

// ---- User dashboard ----
r.get('/dashboard', async (req, res) => {
  const month = MONTH.test(req.query.month || '') ? req.query.month : new Date().toISOString().slice(0, 7);
  const u = req.user.id;
  const W = `e.user_id=$1 AND to_char(e.date,'YYYY-MM')=$2`;
  const [s, h, c, rc, b] = await Promise.all([
    q(`SELECT COALESCE(SUM(e.amount),0) AS spent FROM expenses e WHERE ${W}`, [u, month]),
    q(`SELECT ${COLS} ${JOIN} WHERE ${W} ORDER BY e.amount DESC LIMIT 1`, [u, month]),
    q(`SELECT c.name AS category, SUM(e.amount) AS total ${JOIN} WHERE ${W} GROUP BY c.name ORDER BY total DESC`, [u, month]),
    q(`SELECT ${COLS} ${JOIN} WHERE e.user_id=$1 ORDER BY e.date DESC, e.id DESC LIMIT 5`, [u]),
    q('SELECT amount FROM budgets WHERE user_id=$1 AND month=$2', [u, month]),
  ]);
  const spent = s.rows[0].spent;
  const budget = b.rows[0]?.amount ?? null;
  const status = budget === null ? 'none' : spent > budget ? 'over' : spent >= budget * 0.8 ? 'approaching' : 'within';
  res.json({
    month, spent, budget, status, remaining: budget === null ? null : budget - spent,
    highest: h.rows[0] || null, byCategory: c.rows, recent: rc.rows,
  });
});

// ---- Admin: categories ----
const nameOf = (b) => (b?.name || '').trim();
r.post('/admin/categories', requireAdmin, async (req, res) => {
  const name = nameOf(req.body);
  if (!name) return bad(res, 'Category name is required');
  if ((await q('SELECT 1 FROM categories WHERE lower(name)=lower($1)', [name])).rowCount)
    return res.status(409).json({ error: 'That category already exists' });
  res.status(201).json((await q('INSERT INTO categories(name) VALUES($1) RETURNING *', [name])).rows[0]);
});

r.put('/admin/categories/:id', requireAdmin, async (req, res) => {
  const name = nameOf(req.body);
  if (!name) return bad(res, 'Category name is required');
  if ((await q('SELECT 1 FROM categories WHERE lower(name)=lower($1) AND id<>$2', [name, req.params.id])).rowCount)
    return res.status(409).json({ error: 'That category already exists' });
  const { rows } = await q('UPDATE categories SET name=$1 WHERE id=$2 RETURNING *', [name, req.params.id]);
  rows[0] ? res.json(rows[0]) : notFound(res);
});

// Deleting a category moves its expenses to the default "Uncategorized" category (one transaction).
r.delete('/admin/categories/:id', requireAdmin, async (req, res) => {
  const cat = (await q('SELECT * FROM categories WHERE id=$1', [req.params.id])).rows[0];
  if (!cat) return notFound(res);
  if (cat.is_default) return bad(res, 'The default category cannot be deleted');
  const c = await pool.connect();
  try {
    await c.query('BEGIN');
    const def = (await c.query('SELECT id FROM categories WHERE is_default')).rows[0].id;
    const moved = await c.query('UPDATE expenses SET category_id=$1 WHERE category_id=$2', [def, cat.id]);
    await c.query('DELETE FROM categories WHERE id=$1', [cat.id]);
    await c.query('COMMIT');
    res.json({ deleted: true, reassigned: moved.rowCount });
  } catch (e) {
    await c.query('ROLLBACK');
    throw e;
  } finally {
    c.release();
  }
});

// ---- Admin: platform insights ----
r.get('/admin/insights', requireAdmin, async (_req, res) => {
  const [t, m, pc, re, ru] = await Promise.all([
    q(`SELECT (SELECT COUNT(*) FROM users) AS users, COUNT(*) AS expenses, COALESCE(SUM(amount),0) AS total FROM expenses`),
    q(`SELECT COUNT(*) AS n FROM expenses WHERE to_char(created_at,'YYYY-MM')=to_char(now(),'YYYY-MM')`),
    q(`SELECT c.name AS category, COUNT(e.id) AS count, COALESCE(SUM(e.amount),0) AS total
       FROM categories c LEFT JOIN expenses e ON e.category_id=c.id GROUP BY c.id ORDER BY count DESC, c.name`),
    q(`SELECT e.id,e.title,e.amount,e.date,c.name AS category,u.name AS user_name
       FROM expenses e JOIN categories c ON c.id=e.category_id JOIN users u ON u.id=e.user_id
       ORDER BY e.created_at DESC LIMIT 5`),
    q('SELECT id,name,email,created_at FROM users ORDER BY created_at DESC LIMIT 5'),
  ]);
  const cats = pc.rows.map((x) => ({ category: x.category, count: Number(x.count), total: x.total }));
  res.json({
    totalUsers: Number(t.rows[0].users), totalExpenses: Number(t.rows[0].expenses), totalValue: t.rows[0].total,
    monthExpenses: Number(m.rows[0].n), perCategory: cats,
    top5: cats.slice(0, 5), bottom5: [...cats].reverse().slice(0, 5),
    recentExpenses: re.rows, recentUsers: ru.rows,
  });
});

export default r;
