// Cliente de la API REST. Las reglas de negocio viven en el backend: aquí solo se transporta
// la petición y se expone el mensaje de error que devuelve la API (UI-03).

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const TOKEN_KEY = 'reservas.token';

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.error?.message || `Error ${status}`);
    this.status = status;
    this.code = body?.error?.code;
    this.details = body?.error?.details;
  }
}

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    // almacenamiento no disponible: la sesión dura solo mientras la página esté abierta
  }
}

export async function api(path, { method = 'GET', body } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let res;
  try {
    res = await fetch(`${API_URL}${path}`, { method, headers, body: body ? JSON.stringify(body) : undefined });
  } catch {
    throw new ApiError(0, { error: { message: 'No se pudo conectar con el servidor. ¿Está el backend en ejecución?' } });
  }
  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(res.status, data);
  return data;
}

// Describe un error de la API para mostrarlo al usuario, incluyendo el detalle por campo.
export function describeError(err) {
  if (!(err instanceof ApiError)) return err?.message || 'Error inesperado';
  if (err.details && err.code === 'VALIDATION_ERROR') {
    const fields = Object.entries(err.details)
      .map(([field, msg]) => `${field}: ${msg}`)
      .join(' · ');
    return `${err.message} — ${fields}`;
  }
  if (err.code === 'SCHEDULE_CONFLICT' && err.details?.conflicts?.length) {
    const slots = err.details.conflicts.map((c) => `${c.startTime}–${c.endTime}`).join(', ');
    return `${err.message} (ocupado: ${slots})`;
  }
  return err.message;
}
