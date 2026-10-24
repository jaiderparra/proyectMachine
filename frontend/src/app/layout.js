import './globals.css';
import { SessionProvider } from '@/components/SessionProvider';
import NavBar from '@/components/NavBar';

export const metadata = {
  title: 'ReservaU — Reservas de espacios académicos',
  description: 'Sistema de gestión de reservas de laboratorios, auditorios y salas de cómputo',
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <SessionProvider>
          <NavBar />
          <main className="container">{children}</main>
        </SessionProvider>
      </body>
    </html>
  );
}
