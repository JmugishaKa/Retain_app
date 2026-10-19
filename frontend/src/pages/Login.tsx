import { FormEvent, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login({ register = false }: { register?: boolean }) {
  const { user, signIn, signUp } = useAuth();
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  if (user) return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setErr('');
    try { register ? await signUp(f.name, f.email, f.password) : await signIn(f.email, f.password); }
    catch (x) { setErr((x as Error).message); setBusy(false); }
  }
  const set = (k: string) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  return (
    <div className="auth">
      <div className="auth-side">
        <span className="logo big">retain</span>
        <p>Know what you spent, what is left, and where it went.</p>
      </div>
      <form className="form auth-form" onSubmit={submit}>
        <h1>{register ? 'Create your account' : 'Sign in'}</h1>
        {register && <label>Name<input value={f.name} onChange={set('name')} required /></label>}
        <label>Email<input type="email" value={f.email} onChange={set('email')} required /></label>
        <label>Password<input type="password" minLength={register ? 6 : undefined} value={f.password} onChange={set('password')} required /></label>
        {err && <p className="error" role="alert">{err}</p>}
        <button className="primary" disabled={busy}>{busy ? 'Please wait…' : register ? 'Sign up' : 'Sign in'}</button>
        <p className="muted">
          {register ? <>Already have an account? <Link to="/login">Sign in</Link></> : <>New here? <Link to="/register">Create an account</Link></>}
        </p>
      </form>
    </div>
  );
}
