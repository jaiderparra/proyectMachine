'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from '@/components/SessionProvider';
import { api, describeError } from '@/lib/api';

// UI-01 / USR-01: el registro público siempre crea un SOLICITANTE.
export default function RegisterPage() {
  const { login } = useSession();
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await api('/auth/register', { method: 'POST', body: form });
      await login(form.email, form.password);
      router.push('/espacios');
    } catch (err) {
      setError(describeError(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card auth-box">
      <h1>Crear cuenta</h1>
      <p className="muted">Las cuentas nuevas tienen el rol Solicitante.</p>
      {error && <div className="alert error">{error}</div>}
      <form className="stack" onSubmit={onSubmit}>
        <label>
          Nombre completo
          <input value={form.name} onChange={update('name')} required minLength={2} />
        </label>
        <label>
          Correo
          <input type="email" value={form.email} onChange={update('email')} required />
        </label>
        <label>
          Contraseña (mínimo 8 caracteres)
          <input type="password" value={form.password} onChange={update('password')} required minLength={8} />
        </label>
        <button className="btn" disabled={busy}>
          {busy ? 'Creando…' : 'Registrarse'}
        </button>
      </form>
      <p className="muted">
        ¿Ya tiene cuenta? <Link href="/login">Ingrese</Link>
      </p>
    </div>
  );
}
