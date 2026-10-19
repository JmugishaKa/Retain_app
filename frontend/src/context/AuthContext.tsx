import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { api, tokenStore } from '../api';
import { User } from '../types';

interface AuthResult { token: string; user: User }
interface AuthCtx {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => void;
}
const Ctx = createContext<AuthCtx | null>(null);

export function useAuth() {
  const c = useContext(Ctx);
  if (!c) throw new Error('useAuth must be used inside AuthProvider');
  return c;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(!!tokenStore.get());

  useEffect(() => {
    if (!tokenStore.get()) return;
    api<User>('/auth/me').then(setUser).catch(() => tokenStore.clear()).finally(() => setLoading(false));
  }, []);

  const finish = (r: AuthResult) => { tokenStore.set(r.token); setUser(r.user); };
  const signIn = async (email: string, password: string) =>
    finish(await api<AuthResult>('/auth/login', { method: 'POST', body: { email, password } }));
  const signUp = async (name: string, email: string, password: string) =>
    finish(await api<AuthResult>('/auth/register', { method: 'POST', body: { name, email, password } }));
  const signOut = () => { tokenStore.clear(); setUser(null); };

  return <Ctx.Provider value={{ user, loading, signIn, signUp, signOut }}>{children}</Ctx.Provider>;
}
