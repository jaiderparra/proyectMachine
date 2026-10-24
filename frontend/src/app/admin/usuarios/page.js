'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { useSession } from '@/components/SessionProvider';
import { api, describeError } from '@/lib/api';
import { ROLE_LABELS } from '@/lib/labels';

const EMPTY = { name: '', email: '', password: '', role: 'SOLICITANTE' };

// UI-06: USR-03
function UsersAdmin() {
  const { user: me } = useSession();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setUsers(await api('/users'));
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function run(action, successText) {
    setMessage(null);
    try {
      await action();
      setMessage({ type: 'success', text: successText });
      load();
      return true;
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
      return false;
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <h1>Usuarios</h1>
      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <section className="card">
        <h2>Nuevo usuario</h2>
        <form
          className="stack"
          onSubmit={async (e) => {
            e.preventDefault();
            if (await run(() => api('/users', { method: 'POST', body: form }), 'Usuario creado.')) setForm(EMPTY);
          }}
        >
          <div className="row">
            <label>
              Nombre
              <input value={form.name} onChange={update('name')} required minLength={2} />
            </label>
            <label>
              Correo
              <input type="email" value={form.email} onChange={update('email')} required />
            </label>
            <label>
              Contraseña inicial
              <input type="password" value={form.password} onChange={update('password')} required minLength={8} />
            </label>
            <label>
              Rol
              <select value={form.role} onChange={update('role')}>
                {Object.entries(ROLE_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div>
            <button className="btn">Crear usuario</button>
          </div>
        </form>
      </section>

      <section className="card table-wrap">
        <h2>Usuarios registrados</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Correo</th>
              <th>Rol</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u.id}>
                <td>
                  {u.name}
                  {u.id === me.id && <span className="muted"> (usted)</span>}
                </td>
                <td>{u.email}</td>
                <td>
                  <select
                    value={u.role}
                    onChange={(e) =>
                      run(() => api(`/users/${u.id}`, { method: 'PATCH', body: { role: e.target.value } }), 'Rol actualizado.')
                    }
                  >
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </td>
                <td>{u.active ? 'Activo' : 'Desactivado'}</td>
                <td>
                  <button
                    className={`btn small ${u.active ? 'danger' : ''}`}
                    onClick={() =>
                      run(
                        () => api(`/users/${u.id}`, { method: 'PATCH', body: { active: !u.active } }),
                        u.active ? 'Usuario desactivado.' : 'Usuario activado.'
                      )
                    }
                  >
                    {u.active ? 'Desactivar' : 'Activar'}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </>
  );
}

export default function UsersAdminPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <UsersAdmin />
    </RequireAuth>
  );
}
