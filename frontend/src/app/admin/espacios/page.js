'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { api, describeError } from '@/lib/api';
import { SPACE_TYPE_LABELS } from '@/lib/labels';

const EMPTY = { name: '', type: 'LABORATORIO', capacity: 20, location: '', resources: '' };

function SpaceForm({ initial, onSubmit, submitLabel, onCancel }) {
  const [form, setForm] = useState(initial);
  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <form
      className="stack"
      onSubmit={(e) => {
        e.preventDefault();
        onSubmit({ ...form, capacity: Number(form.capacity), resources: form.resources || null });
      }}
    >
      <div className="row">
        <label>
          Nombre
          <input value={form.name} onChange={update('name')} required minLength={3} maxLength={100} />
        </label>
        <label>
          Tipo
          <select value={form.type} onChange={update('type')}>
            {Object.entries(SPACE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Capacidad
          <input type="number" min={1} max={1000} value={form.capacity} onChange={update('capacity')} required />
        </label>
      </div>
      <div className="row">
        <label>
          Ubicación
          <input value={form.location} onChange={update('location')} required maxLength={150} />
        </label>
        <label>
          Recursos
          <input value={form.resources || ''} onChange={update('resources')} maxLength={500} />
        </label>
      </div>
      <div className="actions">
        <button className="btn">{submitLabel}</button>
        {onCancel && (
          <button type="button" className="btn ghost" onClick={onCancel}>
            Cancelar
          </button>
        )}
      </div>
    </form>
  );
}

// UI-06: ESP-01, ESP-03, ESP-04
function SpacesAdmin() {
  const [spaces, setSpaces] = useState([]);
  const [editing, setEditing] = useState(null);
  const [formKey, setFormKey] = useState(0);
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      setSpaces(await api('/spaces?includeInactive=true'));
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

  return (
    <>
      <h1>Administrar espacios</h1>
      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <section className="card">
        <h2>Nuevo espacio</h2>
        <SpaceForm
          key={formKey}
          initial={EMPTY}
          submitLabel="Crear espacio"
          onSubmit={async (data) => {
            if (await run(() => api('/spaces', { method: 'POST', body: data }), 'Espacio creado.')) setFormKey(formKey + 1);
          }}
        />
      </section>

      <section className="card table-wrap">
        <h2>Inventario</h2>
        <table>
          <thead>
            <tr>
              <th>Nombre</th>
              <th>Tipo</th>
              <th>Capacidad</th>
              <th>Ubicación</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {spaces.map((s) =>
              editing === s.id ? (
                <tr key={s.id}>
                  <td colSpan={6}>
                    <SpaceForm
                      initial={s}
                      submitLabel="Guardar cambios"
                      onCancel={() => setEditing(null)}
                      onSubmit={async ({ name, type, capacity, location, resources }) => {
                        const ok = await run(
                          () => api(`/spaces/${s.id}`, { method: 'PATCH', body: { name, type, capacity, location, resources } }),
                          'Espacio actualizado.'
                        );
                        if (ok) setEditing(null);
                      }}
                    />
                  </td>
                </tr>
              ) : (
                <tr key={s.id}>
                  <td>{s.name}</td>
                  <td>{SPACE_TYPE_LABELS[s.type]}</td>
                  <td>{s.capacity}</td>
                  <td>{s.location}</td>
                  <td>{s.active ? 'Activo' : 'Inactivo'}</td>
                  <td>
                    <div className="actions">
                      <button className="btn ghost small" onClick={() => setEditing(s.id)}>
                        Editar
                      </button>
                      <button
                        className={`btn small ${s.active ? 'danger' : ''}`}
                        onClick={() =>
                          run(
                            () => api(`/spaces/${s.id}`, { method: 'PATCH', body: { active: !s.active } }),
                            s.active ? 'Espacio inactivado.' : 'Espacio activado.'
                          )
                        }
                      >
                        {s.active ? 'Inactivar' : 'Activar'}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}

export default function SpacesAdminPage() {
  return (
    <RequireAuth roles={['ADMIN']}>
      <SpacesAdmin />
    </RequireAuth>
  );
}
