'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';

// UI-01-E2: sin sesión redirige a /login. Con `roles`, oculta la página a otros roles (UI-02).
// La autorización real la hace la API (ROL-03); esto es solo experiencia de usuario.
export default function RequireAuth({ roles, children }) {
  const { user, loading } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  if (loading || !user) return <p className="muted">Cargando…</p>;
  if (roles && !roles.includes(user.role)) {
    return <div className="alert error">No tiene permiso para ver esta página.</div>;
  }
  return children;
}
