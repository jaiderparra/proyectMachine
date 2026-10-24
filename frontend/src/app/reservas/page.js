'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import StatusBadge from '@/components/StatusBadge';
import { useSession } from '@/components/SessionProvider';
import { api, describeError } from '@/lib/api';
import { STATUS_LABELS, formatDateTime } from '@/lib/labels';

function History({ reservationId }) {
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/reservations/${reservationId}/history`)
      .then(setEntries)
      .catch((err) => setError(describeError(err)));
  }, [reservationId]);

  if (error) return <div className="alert error">{error}</div>;
  if (!entries) return <p className="muted">Cargando historial…</p>;
  return (
    <ul className="history">
      {entries.map((h) => (
        <li key={h.id}>
          <strong>{h.fromStatus ? `${STATUS_LABELS[h.fromStatus]} → ` : 'Creada → '}{STATUS_LABELS[h.toStatus]}</strong>{' '}
          por {h.changedByName} · {formatDateTime(h.changedAt)}
          {h.comment && <div className="muted">“{h.comment}”</div>}
        </li>
      ))}
    </ul>
  );
}

// UI-04: reservas propias, cancelación (CAN-01) e historial (HIS-02, HIS-03).
function MyReservations() {
  const { user } = useSession();
  const [reservations, setReservations] = useState([]);
  const [status, setStatus] = useState('');
  const [openHistory, setOpenHistory] = useState(null);
  const [cancelReason, setCancelReason] = useState({});
  const [message, setMessage] = useState(null);

  const load = useCallback(async () => {
    try {
      const all = await api(`/reservations${status ? `?status=${status}` : ''}`);
      // Coordinadores y administradores reciben todas; esta vista muestra solo las propias.
      setReservations(all.filter((r) => r.userId === user.id));
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    }
  }, [status, user.id]);

  useEffect(() => {
    load();
  }, [load]);

  async function cancel(id) {
    setMessage(null);
    try {
      await api(`/reservations/${id}/cancel`, { method: 'POST', body: { reason: cancelReason[id] || undefined } });
      setMessage({ type: 'success', text: 'Reserva cancelada.' });
      setOpenHistory(null);
      load();
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    }
  }

  return (
    <>
      <h1>Mis reservas</h1>
      <p className="muted">Historial de todas sus solicitudes, en cualquier estado.</p>
      <div className="row" style={{ maxWidth: 300, margin: '12px 0 16px' }}>
        <label>
          Estado
          <select value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(STATUS_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>
      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      <div className="card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Espacio</th>
              <th>Fecha</th>
              <th>Franja</th>
              <th>Propósito</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {reservations.map((r) => (
              <tr key={r.id}>
                <td>{r.spaceName}</td>
                <td>{r.date}</td>
                <td>
                  {r.startTime}–{r.endTime}
                </td>
                <td>
                  {r.purpose}
                  {r.decisionReason && <div className="muted">Motivo: {r.decisionReason}</div>}
                  {openHistory === r.id && <History reservationId={r.id} />}
                </td>
                <td>
                  <StatusBadge status={r.status} />
                </td>
                <td>
                  <div className="stack">
                    <button className="btn ghost small" onClick={() => setOpenHistory(openHistory === r.id ? null : r.id)}>
                      {openHistory === r.id ? 'Ocultar historial' : 'Ver historial'}
                    </button>
                    {['PENDIENTE', 'APROBADA'].includes(r.status) && (
                      <>
                        <input
                          placeholder="Motivo (opcional)"
                          value={cancelReason[r.id] || ''}
                          onChange={(e) => setCancelReason({ ...cancelReason, [r.id]: e.target.value })}
                        />
                        <button className="btn danger small" onClick={() => cancel(r.id)}>
                          Cancelar
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {reservations.length === 0 && (
              <tr>
                <td colSpan={6} className="muted">
                  No tiene reservas{status ? ' en este estado' : ''}.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default function ReservationsPage() {
  return (
    <RequireAuth>
      <MyReservations />
    </RequireAuth>
  );
}
