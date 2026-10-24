'use client';

import { useCallback, useEffect, useState } from 'react';
import RequireAuth from '@/components/RequireAuth';
import StatusBadge from '@/components/StatusBadge';
import { api, describeError } from '@/lib/api';
import { SPACE_TYPE_LABELS, todayISO } from '@/lib/labels';

const toMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// Barra visual del día: verde libre, rojo aprobado, ámbar pendiente.
function Timeline({ availability }) {
  const open = toMinutes(availability.operatingHours.open);
  const close = toMinutes(availability.operatingHours.close);
  const span = close - open;
  return (
    <>
      <div className="timeline" aria-hidden="true">
        {availability.blocks.map((b) => (
          <span
            key={b.id}
            className={b.status.toLowerCase()}
            style={{
              left: `${((toMinutes(b.startTime) - open) / span) * 100}%`,
              width: `${((toMinutes(b.endTime) - toMinutes(b.startTime)) / span) * 100}%`,
            }}
          />
        ))}
      </div>
      <div className="timeline-scale">
        <span>{availability.operatingHours.open}</span>
        <span>{availability.operatingHours.close}</span>
      </div>
    </>
  );
}

// UI-03: consultar disponibilidad (DIS-01) y solicitar (RES-01).
function SpacesView() {
  const [spaces, setSpaces] = useState([]);
  const [type, setType] = useState('');
  const [selected, setSelected] = useState(null);
  const [date, setDate] = useState(todayISO());
  const [availability, setAvailability] = useState(null);
  const [form, setForm] = useState({ startTime: '08:00', endTime: '10:00', purpose: '', attendees: 1 });
  const [message, setMessage] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api(`/spaces${type ? `?type=${type}` : ''}`)
      .then(setSpaces)
      .catch((err) => setMessage({ type: 'error', text: describeError(err) }));
  }, [type]);

  const loadAvailability = useCallback(async () => {
    if (!selected || !date) return;
    try {
      setAvailability(await api(`/spaces/${selected.id}/availability?date=${date}`));
    } catch (err) {
      setAvailability(null);
      setMessage({ type: 'error', text: describeError(err) });
    }
  }, [selected, date]);

  useEffect(() => {
    loadAvailability();
  }, [loadAvailability]);

  async function onSubmit(e) {
    e.preventDefault();
    setMessage(null);
    setBusy(true);
    try {
      await api('/reservations', {
        method: 'POST',
        body: { spaceId: selected.id, date, ...form, attendees: Number(form.attendees) },
      });
      setMessage({ type: 'success', text: 'Solicitud registrada. Quedó pendiente de aprobación.' });
      setForm({ ...form, purpose: '' });
      loadAvailability();
    } catch (err) {
      setMessage({ type: 'error', text: describeError(err) });
    } finally {
      setBusy(false);
    }
  }

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <>
      <h1>Espacios académicos</h1>
      <p className="muted">Seleccione un espacio y una fecha para ver su ocupación y solicitar una reserva.</p>

      <div className="row" style={{ marginBottom: 16, maxWidth: 360 }}>
        <label>
          Tipo de espacio
          <select value={type} onChange={(e) => setType(e.target.value)}>
            <option value="">Todos</option>
            {Object.entries(SPACE_TYPE_LABELS).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="grid" style={{ marginBottom: 24 }}>
        {spaces.map((s) => (
          <button
            key={s.id}
            type="button"
            className={`space-card ${selected?.id === s.id ? 'selected' : ''}`}
            onClick={() => {
              setSelected(s);
              setMessage(null);
            }}
          >
            <h3>{s.name}</h3>
            <div className="muted">
              {SPACE_TYPE_LABELS[s.type]} · {s.capacity} personas
            </div>
            <div className="muted">{s.location}</div>
          </button>
        ))}
        {spaces.length === 0 && <p className="muted">No hay espacios disponibles.</p>}
      </div>

      {message && <div className={`alert ${message.type}`}>{message.text}</div>}

      {selected && (
        <div className="two-columns">
          <section className="card">
            <h2>Ocupación de {selected.name}</h2>
            <label>
              Fecha
              <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </label>
            {availability && (
              <>
                <Timeline availability={availability} />
                {availability.blocks.length === 0 ? (
                  <p className="muted">Sin reservas: todo el horario está libre.</p>
                ) : (
                  <ul className="blocks">
                    {availability.blocks.map((b) => (
                      <li key={b.id}>
                        <span>
                          {b.startTime} – {b.endTime}
                        </span>
                        <StatusBadge status={b.status} />
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
            {selected.resources && <p className="muted">Recursos: {selected.resources}</p>}
          </section>

          <section className="card">
            <h2>Solicitar reserva</h2>
            <p className="muted">
              Horario de 07:00 a 22:00, mínimo 30 minutos. Una persona no puede reservar el mismo espacio más de{' '}
              <strong>4 horas consecutivas</strong>.
            </p>
            <form className="stack" onSubmit={onSubmit}>
              <div className="row">
                <label>
                  Hora de inicio
                  <input type="time" value={form.startTime} onChange={update('startTime')} required />
                </label>
                <label>
                  Hora de fin
                  <input type="time" value={form.endTime} onChange={update('endTime')} required />
                </label>
                <label>
                  Asistentes
                  <input type="number" min={1} max={selected.capacity} value={form.attendees} onChange={update('attendees')} required />
                </label>
              </div>
              <label>
                Propósito
                <textarea value={form.purpose} onChange={update('purpose')} required minLength={5} maxLength={300} />
              </label>
              <button className="btn" disabled={busy}>
                {busy ? 'Enviando…' : `Solicitar para el ${date}`}
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export default function SpacesPage() {
  return (
    <RequireAuth>
      <SpacesView />
    </RequireAuth>
  );
}
