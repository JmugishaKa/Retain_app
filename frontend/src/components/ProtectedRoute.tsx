import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Role } from '../types';

export default function ProtectedRoute({ role }: { role?: Role }) {
  const { user, loading } = useAuth();
  if (loading) return <p className="center">Loading your account…</p>;
  if (!user) return <Navigate to="/login" replace />;
  if (role && user.role !== role) return <Navigate to="/" replace />;
  return <Outlet />;
}
