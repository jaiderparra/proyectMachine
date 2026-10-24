'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import { api, describeError } from '@/lib/api';
import { formatDateTime } from '@/lib/labels';

// UI-05: bandeja de solicitudes pendientes (APR-01, APR-02).
function ApprovalsInbox() {
  const [pending, setPending] = useState([]);
  const [reasons, setReasons] = useState({});
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const list = await api('/reservations?status=PENDIENTE');
      setPending([...list].sort((a, b) => `${a.date} ${a.startTime}`.localeCompare(`${b.date} ${b.startTime}`)));
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function decide(id, action) {
    setMessage(null);
    try {
      const body = action === 'reject' ? { reason: reasons[id] || '' } : undefined;
      await api(`/reservations/${id}/${action}`, { method: 'POST', body });
      setMessage({ type: 'success', text: action === 'approve' ? 'Solicitud aprobada.' : 'Solicitud rechazada.' });
      load();
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    }
  }

  return (
    <>
      <h1>Aprobaciones</h1>
      <p className="muted">Solicitudes pendientes, ordenadas por fecha de uso. Para rechazar debe indicar el motivo.</p>
      {message && <div className={`alert ${message.type}`}>{message.text}</div>}
      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Espacio</th>
              <th>Fecha y franja</th>
              <th>Solicitante</th>
              <th>Propósito</th>
              <th>Decisión</th>
            </tr>
          </thead>
          <tbody>
            {pending.map((r) => (
              <tr key={r.id}>
                <td>{r.spaceName}</td>
                <td>
                  {r.date}
                  <div className="muted">
                    {r.startTime}–{r.endTime}
                  </div>
                </td>
                <td>
                  {r.userName}
                  <div className="muted">Solicitada {formatDateTime(r.createdAt)}</div>
                </td>
                <td>
                  {r.purpose}
                  <div className="muted">{r.attendees} asistentes</div>
                </td>
                <td>
                  <div className="stack">
                    <button className="btn small" onClick={() => decide(r.id, 'approve')}>
                      Aprobar
                    </button>
                    <input
                      placeholder="Motivo del rechazo"
                      value={reasons[r.id] || ''}
                      onChange={(e) => setReasons({ ...reasons, [r.id]: e.target.value })}
                    />
                    <button className="btn danger small" onClick={() => decide(r.id, 'reject')}>
                      Rechazar
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {pending.length === 0 && (
              <tr>
                <td colSpan={5} className="muted">
                  No hay solicitudes pendientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ApprovalsPage() {
  return (
    <RequireAuth roles={['ADMIN', 'COORDINADOR']}>
      <ApprovalsInbox />
    </RequireAuth>
  );
}
