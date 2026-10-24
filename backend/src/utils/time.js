// Fechas `YYYY-MM-DD` y horas `HH:MM` en hora local de la institución (sdd/project.md).

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

function isValidDate(value) {
  if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function isValidTime(value) {
  return typeof value === 'string' && TIME_RE.test(value);
}

function toMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

const pad = (n) => String(n).padStart(2, '0');

// Descompone un Date en fecha y hora local.
function localParts(date) {
  return {
    date: `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`,
    time: `${pad(date.getHours())}:${pad(date.getMinutes())}`,
  };
}

// true si el instante (date, time) ya llegó según el reloj.
function hasStarted(date, time, now) {
  const current = localParts(now);
  return `${date} ${time}` <= `${current.date} ${current.time}`;
}

module.exports = { isValidDate, isValidTime, toMinutes, localParts, hasStarted };
