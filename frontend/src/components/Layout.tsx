import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Layout() {
  const { user, signOut } = useAuth();
  return (
    <>
      <header className="top">
        <span className="logo">retain</span>
        <nav>
          <NavLink to="/" end>Dashboard</NavLink>
          <NavLink to="/expenses">Expenses</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="who">
          <span>{user?.name}</span>
          <button className="ghost" onClick={signOut}>Sign out</button>
        </div>
      </header>
      <main><Outlet /></main>
    </>
  );
}
