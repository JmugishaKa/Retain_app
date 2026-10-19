import pg from 'pg';
import bcrypt from 'bcryptjs';

pg.types.setTypeParser(1082, (v) => v); // DATE -> 'YYYY-MM-DD'
pg.types.setTypeParser(1700, (v) => parseFloat(v)); // NUMERIC -> number

export const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_SSL === 'true' ? { rejectUnauthorized: false } : false,
});
export const q = (text, params) => pool.query(text, params);

const DEFAULT_CATEGORIES = ['Food', 'Transport', 'Housing', 'Utilities', 'Entertainment', 'Health', 'Shopping'];

export async function init() {
  await q(`
    CREATE TABLE IF NOT EXISTS users(
      id SERIAL PRIMARY KEY, name TEXT NOT NULL, email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL, role TEXT NOT NULL DEFAULT 'user', created_at TIMESTAMPTZ DEFAULT now());
    CREATE TABLE IF NOT EXISTS categories(
      id SERIAL PRIMARY KEY, name TEXT UNIQUE NOT NULL, is_default BOOLEAN NOT NULL DEFAULT false);
    CREATE TABLE IF NOT EXISTS expenses(
      id SERIAL PRIMARY KEY, user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      category_id INT NOT NULL REFERENCES categories(id), title TEXT NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), date DATE NOT NULL,
      payment_method TEXT NOT NULL, notes TEXT, created_at TIMESTAMPTZ DEFAULT now());
    CREATE INDEX IF NOT EXISTS expenses_user_date ON expenses(user_id, date DESC);
    CREATE TABLE IF NOT EXISTS budgets(
      user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE, month CHAR(7) NOT NULL,
      amount NUMERIC(12,2) NOT NULL CHECK (amount > 0), PRIMARY KEY(user_id, month));
  `);
  await q(`INSERT INTO categories(name,is_default) VALUES('Uncategorized',true) ON CONFLICT(name) DO NOTHING`);
  for (const n of DEFAULT_CATEGORIES) await q('INSERT INTO categories(name) VALUES($1) ON CONFLICT(name) DO NOTHING', [n]);
  const { ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;
  if (ADMIN_EMAIL && ADMIN_PASSWORD) {
    await q(`INSERT INTO users(name,email,password,role) VALUES('Admin',$1,$2,'admin') ON CONFLICT(email) DO NOTHING`,
      [ADMIN_EMAIL.toLowerCase(), await bcrypt.hash(ADMIN_PASSWORD, 10)]);
  }
}
