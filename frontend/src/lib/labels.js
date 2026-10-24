export const ROLE_LABELS = {
  ADMIN: 'Administrador',
  COORDINADOR: 'Coordinador',
  SOLICITANTE: 'Solicitante',
};

export const SPACE_TYPE_LABELS = {
  LABORATORIO: 'Laboratorio',
  AUDITORIO: 'Auditorio',
  SALA_COMPUTO: 'Sala de cómputo',
};

export const STATUS_LABELS = {
  PENDIENTE: 'Pendiente',
  APROBADA: 'Aprobada',
  RECHAZADA: 'Rechazada',
  CANCELADA: 'Cancelada',
};

export function todayISO() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function formatDateTime(iso) {
  return new Date(iso).toLocaleString('es-CO', { dateStyle: 'medium', timeStyle: 'short' });
}
