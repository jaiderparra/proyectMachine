// Reglas de negocio puras (sin BD ni HTTP), probadas de forma unitaria.
const { toMinutes, hasStarted } = require('../../utils/time');

const ACTIVE_STATUSES = ['PENDIENTE', 'APROBADA']; // CON-02 (hallazgo H2)

// CON-01: intervalos semiabiertos [inicio, fin); las franjas contiguas no se solapan.
function overlaps(a, b) {
  return a.startTime < b.endTime && b.startTime < a.endTime;
}

// RES-02 puntos 2 a 5. Devuelve el mensaje de la primera regla incumplida, o null.
function scheduleViolation({ date, startTime, endTime }, now, schedule) {
  if (endTime <= startTime) return 'La hora de fin debe ser posterior a la hora de inicio';
  if (startTime < schedule.openTime || endTime > schedule.closeTime) {
    return `La franja debe estar dentro del horario de operación (${schedule.openTime} a ${schedule.closeTime})`;
  }
  if (hasStarted(date, startTime, now)) return 'No se puede reservar una franja que ya comenzó o pasó';
  if (toMinutes(endTime) - toMinutes(startTime) < schedule.minDurationMinutes) {
    return `La duración mínima de una reserva es de ${schedule.minDurationMinutes} minutos`;
  }
  return null;
}

module.exports = { ACTIVE_STATUSES, overlaps, scheduleViolation };
