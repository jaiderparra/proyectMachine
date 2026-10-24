const { validate, parseId } = require('../../utils/validation');
const { transaction } = require('../../db/database');
const { notFound, forbidden, businessRule, scheduleConflict, invalidState } = require('../../errors');
const { hasStarted } = require('../../utils/time');
const { ACTIVE_STATUSES, scheduleViolation, consecutiveBlockMinutes } = require('./reservations.rules');

const STATUSES = ['PENDIENTE', 'APROBADA', 'RECHAZADA', 'CANCELADA'];
const PRIVILEGED = ['ADMIN', 'COORDINADOR'];

// RES-01 / RES-02 punto 1
const createSchema = {
  spaceId: { type: 'integer', required: true, min: 1 },
  date: { type: 'date', required: true },
  startTime: { type: 'time', required: true },
  endTime: { type: 'time', required: true },
  purpose: { type: 'string', required: true, min: 5, max: 300 },
  attendees: { type: 'integer', required: true, min: 1 },
};

const slotSchema = {
  date: { type: 'date', required: true },
  startTime: { type: 'time', required: true },
  endTime: { type: 'time', required: true },
};

// Bloque público de ocupación: sin propósito ni solicitante (DIS-01, hallazgo H3).
const toBlock = (r) => ({ id: r.id, startTime: r.startTime, endTime: r.endTime, status: r.status });

function createReservationsService({ db, reservationsRepo, spacesService, clock, config }) {
  const nowIso = () => clock.now().toISOString();

  function getOrFail(id) {
    const reservation = reservationsRepo.findById(id);
    if (!reservation) throw notFound('Reserva no encontrada');
    return reservation;
  }

  // RES-04: la franja, sumada a las reservas activas contiguas del mismo usuario en el mismo
  // espacio y fecha, no puede superar el máximo de minutos consecutivos.
  function assertMaxConsecutive({ userId, spaceId, date, startTime, endTime, excludeId }) {
    const sameUser = reservationsRepo.listByUserSpaceAndDate({ userId, spaceId, date, statuses: ACTIVE_STATUSES, excludeId });
    const minutes = consecutiveBlockMinutes({ startTime, endTime }, sameUser);
    const max = config.schedule.maxConsecutiveMinutes;
    if (minutes > max) {
      throw businessRule(
        `Un usuario no puede reservar el mismo espacio más de ${max / 60} horas consecutivas ` +
          `(esta reserva sumaría ${Math.floor(minutes / 60)} h ${minutes % 60} min continuos)`,
        { consecutiveMinutes: minutes, maxConsecutiveMinutes: max }
      );
    }
  }

  // ROL-04: un SOLICITANTE solo accede a sus propias reservas.
  function assertCanView(user, reservation) {
    if (!PRIVILEGED.includes(user.role) && reservation.userId !== user.id) {
      throw forbidden('Solo puede consultar sus propias reservas');
    }
  }

  return {
    // RES-01, RES-02, CON-02, CON-04, HIS-01
    create(user, input) {
      const data = validate(input, createSchema);

      return transaction(db, () => {
        const space = spacesService.getOrFail(data.spaceId);
        if (!space.active) throw businessRule('El espacio está inactivo y no admite solicitudes');

        const violation = scheduleViolation(data, clock.now(), config.schedule);
        if (violation) throw businessRule(violation);

        if (data.attendees > space.capacity) {
          throw businessRule(`El número de asistentes (${data.attendees}) supera la capacidad del espacio (${space.capacity})`);
        }

        assertMaxConsecutive({ ...data, userId: user.id });

        const conflicts = reservationsRepo.findOverlapping({ ...data, statuses: ACTIVE_STATUSES });
        if (conflicts.length > 0) throw scheduleConflict(conflicts.map(toBlock));

        const now = nowIso();
        const id = reservationsRepo.insert({ ...data, userId: user.id, status: 'PENDIENTE', now });
        reservationsRepo.addHistory({ reservationId: id, fromStatus: null, toStatus: 'PENDIENTE', changedBy: user.id, now });
        return reservationsRepo.findById(id);
      });
    },

    // RES-03, ROL-04, HIS-03
    list(user, query) {
      const filters = validate(
        {
          ...query,
          spaceId: query.spaceId === undefined ? undefined : Number(query.spaceId),
        },
        {
          status: { type: 'string', enum: STATUSES },
          spaceId: { type: 'integer', min: 1 },
          date: { type: 'date' },
        },
        { partial: true }
      );
      if (!PRIVILEGED.includes(user.role)) filters.userId = user.id;
      return reservationsRepo.list(filters);
    },

    get(user, idParam) {
      const reservation = getOrFail(parseId(idParam));
      assertCanView(user, reservation);
      return reservation;
    },

    // APR-01, CON-03
    approve(user, idParam) {
      const id = parseId(idParam);
      return transaction(db, () => {
        const reservation = getOrFail(id);
        if (reservation.status !== 'PENDIENTE') {
          throw invalidState(`Solo se pueden aprobar solicitudes pendientes (estado actual: ${reservation.status})`);
        }
        if (hasStarted(reservation.date, reservation.startTime, clock.now())) {
          throw businessRule('No se puede aprobar una solicitud cuya hora de inicio ya pasó');
        }
        assertMaxConsecutive({ ...reservation, excludeId: id }); // APR-01-E6
        const conflicts = reservationsRepo.findOverlapping({ ...reservation, statuses: ['APROBADA'], excludeId: id });
        if (conflicts.length > 0) throw scheduleConflict(conflicts.map(toBlock));

        const now = nowIso();
        reservationsRepo.updateStatus(id, { status: 'APROBADA', decidedBy: user.id, now });
        reservationsRepo.addHistory({ reservationId: id, fromStatus: 'PENDIENTE', toStatus: 'APROBADA', changedBy: user.id, now });
        return reservationsRepo.findById(id);
      });
    },

    // APR-02
    reject(user, idParam, input) {
      const id = parseId(idParam);
      const { reason } = validate(input, { reason: { type: 'string', required: true, min: 5, max: 300 } });
      return transaction(db, () => {
        const reservation = getOrFail(id);
        if (reservation.status !== 'PENDIENTE') {
          throw invalidState(`Solo se pueden rechazar solicitudes pendientes (estado actual: ${reservation.status})`);
        }
        const now = nowIso();
        reservationsRepo.updateStatus(id, { status: 'RECHAZADA', decidedBy: user.id, decisionReason: reason, now });
        reservationsRepo.addHistory({
          reservationId: id, fromStatus: 'PENDIENTE', toStatus: 'RECHAZADA', changedBy: user.id, comment: reason, now,
        });
        return reservationsRepo.findById(id);
      });
    },

    // CAN-01: propietario, COORDINADOR o ADMIN; solo activas y no iniciadas. El motivo va al historial (H16).
    cancel(user, idParam, input) {
      const id = parseId(idParam);
      const { reason } = validate(input, { reason: { type: 'string', max: 300 } }, { partial: true });
      return transaction(db, () => {
        const reservation = getOrFail(id);
        if (!PRIVILEGED.includes(user.role) && reservation.userId !== user.id) {
          throw forbidden('Solo puede cancelar sus propias reservas');
        }
        if (!ACTIVE_STATUSES.includes(reservation.status)) {
          throw invalidState(`La reserva ya está en estado final (${reservation.status})`);
        }
        if (hasStarted(reservation.date, reservation.startTime, clock.now())) {
          throw businessRule('No se puede cancelar una reserva que ya comenzó o terminó');
        }
        const now = nowIso();
        reservationsRepo.updateStatus(id, { status: 'CANCELADA', now });
        reservationsRepo.addHistory({
          reservationId: id, fromStatus: reservation.status, toStatus: 'CANCELADA', changedBy: user.id, comment: reason, now,
        });
        return reservationsRepo.findById(id);
      });
    },

    // HIS-02
    history(user, idParam) {
      const reservation = getOrFail(parseId(idParam));
      assertCanView(user, reservation);
      return reservationsRepo.listHistory(reservation.id);
    },

    // DIS-01
    dailyAvailability(spaceIdParam, query) {
      const space = spacesService.getOrFail(parseId(spaceIdParam));
      const { date } = validate(query, { date: { type: 'date', required: true } });
      const blocks = reservationsRepo.listBySpaceAndDate(space.id, date, ACTIVE_STATUSES).map(toBlock);
      return {
        spaceId: space.id,
        date,
        operatingHours: { open: config.schedule.openTime, close: config.schedule.closeTime },
        blocks,
      };
    },

    // DIS-02
    checkSlot(spaceIdParam, query) {
      const space = spacesService.getOrFail(parseId(spaceIdParam));
      const slot = validate(query, slotSchema);
      const conflicts = reservationsRepo
        .findOverlapping({ spaceId: space.id, ...slot, statuses: ACTIVE_STATUSES })
        .map(toBlock);
      return { available: conflicts.length === 0, conflicts };
    },
  };
}

module.exports = { createReservationsService, STATUSES };
