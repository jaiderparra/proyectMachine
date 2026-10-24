const { validate, parseId } = require('../../utils/validation');
const { transaction } = require('../../db/database');
const { notFound, forbidden, businessRule, scheduleConflict } = require('../../errors');
const { ACTIVE_STATUSES, scheduleViolation } = require('./reservations.rules');

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
