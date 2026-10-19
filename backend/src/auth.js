import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { q } from './db.js';

const r = Router();
const sign = (u) => jwt.sign({ id: u.id, role: u.role }, process.env.JWT_SECRET, { expiresIn: '7d' });
const pub = (u) => ({ id: u.id, name: u.name, email: u.email, role: u.role });

export async function requireAuth(req, res, next) {
  try {
    const token = (req.headers.authorization || '').replace('Bearer ', '');
    const { id } = jwt.verify(token, process.env.JWT_SECRET);
    const { rows } = await q('SELECT * FROM users WHERE id=$1', [id]);
    if (!rows[0]) throw new Error('no user');
    req.user = rows[0]; // role is read from the DB, never trusted from the token
    next();
  } catch {
    res.status(401).json({ error: 'Please sign in again' });
  }
}
export const requireAdmin = (req, res, next) =>
  req.user.role === 'admin' ? next() : res.status(403).json({ error: 'Admins only' });

r.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !/^\S+@\S+\.\S+$/.test(email || '') || (password || '').length < 6)
    return res.status(400).json({ error: 'Enter your name, a valid email and a password of at least 6 characters' });
  const e = email.toLowerCase();
  if ((await q('SELECT 1 FROM users WHERE email=$1', [e])).rowCount)
    return res.status(409).json({ error: 'That email is already registered' });
  const { rows } = await q('INSERT INTO users(name,email,password) VALUES($1,$2,$3) RETURNING *',
    [name.trim(), e, await bcrypt.hash(password, 10)]);
  res.status(201).json({ token: sign(rows[0]), user: pub(rows[0]) });
});

r.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  const { rows } = await q('SELECT * FROM users WHERE email=$1', [(email || '').toLowerCase()]);
  if (!rows[0] || !(await bcrypt.compare(password || '', rows[0].password)))
    return res.status(401).json({ error: 'Incorrect email or password' });
  res.json({ token: sign(rows[0]), user: pub(rows[0]) });
});

r.get('/me', requireAuth, (req, res) => res.json(pub(req.user)));

export default r;
