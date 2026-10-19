const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';
const CUR = import.meta.env.VITE_CURRENCY || 'USD';

export const tokenStore = {
  get: () => localStorage.getItem('retain_token'),
  set: (t: string) => localStorage.setItem('retain_token', t),
  clear: () => localStorage.removeItem('retain_token'),
};

export async function api<T>(path: string, opts: { method?: string; body?: unknown } = {}): Promise<T> {
  const token = tokenStore.get();
  let res: Response;
  try {
    res = await fetch(BASE + path, {
      method: opts.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
      body: opts.body ? JSON.stringify(opts.body) : undefined,
    });
  } catch {
    throw new Error('Cannot reach the server. Check your connection and try again.');
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export const money = (n: number) => new Intl.NumberFormat(undefined, { style: 'currency', currency: CUR }).format(n);
export const fmtDate = (d: string) =>
  new Date(d.slice(0, 10) + 'T00:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
export const today = () => new Date().toISOString().slice(0, 10);
