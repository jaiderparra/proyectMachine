'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useSession } from './SessionProvider';
import { ROLE_LABELS } from '@/lib/labels';

// UI-02: opciones según la matriz de permisos ROL-03.
const LINKS = [
  { href: '/espacios', label: 'Espacios', roles: ['ADMIN', 'COORDINADOR', 'SOLICITANTE'] },
  { href: '/reservas', label: 'Mis reservas', roles: ['ADMIN', 'COORDINADOR', 'SOLICITANTE'] },
  { href: '/aprobaciones', label: 'Aprobaciones', roles: ['ADMIN', 'COORDINADOR'] },
  { href: '/admin/espacios', label: 'Administrar espacios', roles: ['ADMIN'] },
  { href: '/admin/usuarios', label: 'Usuarios', roles: ['ADMIN'] },
];

export default function NavBar() {
  const { user, logout } = useSession();
  const pathname = usePathname();
  const router = useRouter();

  return (
    <header className="navbar">
      <Link href="/" className="brand">
        ReservaU
      </Link>
      {user && (
        <nav>
          {LINKS.filter((l) => l.roles.includes(user.role)).map((l) => (
            <Link key={l.href} href={l.href} className={pathname.startsWith(l.href) ? 'active' : ''}>
              {l.label}
            </Link>
          ))}
        </nav>
      )}
      <div className="session">
        {user ? (
          <>
            <span>
              {user.name} <small className="role">{ROLE_LABELS[user.role]}</small>
            </span>
            <button
              className="btn ghost"
              onClick={() => {
                logout();
                router.push('/login');
              }}
            >
              Salir
            </button>
          </>
        ) : (
          <>
            <Link href="/login">Ingresar</Link>
            <Link href="/registro">Registrarse</Link>
          </>
        )}
      </div>
    </header>
  );
}
