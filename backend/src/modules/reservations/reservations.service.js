const { validate, parseId } = require('../../utils/validation');
const { notFound, forbidden, businessRule, scheduleConflict, invalidState } = require('../../errors');
const { hasStarted } = require('../../utils/time');
const { createSpacesRepository } = require('../spaces/spaces.repository');
const { createReservationsRepository } = require('./reservations.repository');
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

// Repositorios ligados a un ejecutor: la BD o la transacción en curso.
const reposFor = (executor) => ({
  spaces: createSpacesRepository(executor),
  reservations: createReservationsRepository(executor),
});

function createReservationsService({ db, clock, config }) {
  const nowIso = () => clock.now().toISOString();
  const { spaces: spacesRepo, reservations: reservationsRepo } = reposFor(db);

  async function getOrFail(repo, id) {
    const reservation = await repo.findById(id);
    if (!reservation) throw notFound('Reserva no encontrada');
    return reservation;
  }

  async function getSpaceOrFail(repo, id, { lock = false } = {}) {
    const space = lock ? await repo.findByIdForUpdate(id) : await repo.findById(id);
    if (!space) throw notFound('Espacio no encontrado');
    return space;
  }

  // Bloquea la reserva (evita dos transiciones simultáneas) y la devuelve.
  async function lockReservation(repos, id) {
    if (!(await repos.reservations.lockById(id))) throw notFound('Reserva no encontrada');
    return repos.reservations.findById(id);
  }

  // RES-04: la franja, sumada a las reservas activas contiguas del mismo usuario en el mismo
  // espacio y fecha, no puede superar el máximo de minutos consecutivos.
  async function assertMaxConsecutive(repo, { userId, spaceId, date, startTime, endTime, excludeId }) {
    const sameUser = await repo.listByUserSpaceAndDate({ userId, spaceId, date, statuses: ACTIVE_STATUSES, excludeId });
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
    // RES-01, RES-02, RES-04, CON-02, CON-04, HIS-01
    async create(user, input) {
      const data = validate(input, createSchema);

      return db.transaction(async (tx) => {
        const repos = reposFor(tx);
        // CON-04: el bloqueo del espacio serializa las solicitudes concurrentes sobre él.
        const space = await getSpaceOrFail(repos.spaces, data.spaceId, { lock: true });
        if (!space.active) throw businessRule('El espacio está inactivo y no admite solicitudes');

        const violation = scheduleViolation(data, clock.now(), config.schedule);
        if (violation) throw businessRule(violation);

        if (data.attendees > space.capacity) {
          throw businessRule(`El número de asistentes (${data.attendees}) supera la capacidad del espacio (${space.capacity})`);
        }

        await assertMaxConsecutive(repos.reservations, { ...data, userId: user.id });

        const conflicts = await repos.reservations.findOverlapping({ ...data, statuses: ACTIVE_STATUSES });
        if (conflicts.length > 0) throw scheduleConflict(conflicts.map(toBlock));

        const now = nowIso();
        const id = await repos.reservations.insert({ ...data, userId: user.id, status: 'PENDIENTE', now });
        await repos.reservations.addHistory({ reservationId: id, fromStatus: null, toStatus: 'PENDIENTE', changedBy: user.id, now });
        return repos.reservations.findById(id);
      });
    },

    // RES-03, ROL-04, HIS-03
    async list(user, query) {
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

    async get(user, idParam) {
      const reservation = await getOrFail(reservationsRepo, parseId(idParam));
      assertCanView(user, reservation);
      return reservation;
    },

    // APR-01, CON-03
    async approve(user, idParam) {
      const id = parseId(idParam);
      return db.transaction(async (tx) => {
        const repos = reposFor(tx);
        const reservation = await lockReservation(repos, id);
        if (reservation.status !== 'PENDIENTE') {
          throw invalidState(`Solo se pueden aprobar solicitudes pendientes (estado actual: ${reservation.status})`);
        }
        if (hasStarted(reservation.date, reservation.startTime, clock.now())) {
          throw businessRule('No se puede aprobar una solicitud cuya hora de inicio ya pasó');
        }
        await getSpaceOrFail(repos.spaces, reservation.spaceId, { lock: true }); // CON-04
        await assertMaxConsecutive(repos.reservations, { ...reservation, excludeId: id }); // APR-01-E6
        const conflicts = await repos.reservations.findOverlapping({ ...reservation, statuses: ['APROBADA'], excludeId: id });
        if (conflicts.length > 0) throw scheduleConflict(conflicts.map(toBlock));

        const now = nowIso();
        await repos.reservations.updateStatus(id, { status: 'APROBADA', decidedBy: user.id, now });
        await repos.reservations.addHistory({ reservationId: id, fromStatus: 'PENDIENTE', toStatus: 'APROBADA', changedBy: user.id, now });
        return repos.reservations.findById(id);
      });
    },

    // APR-02
    async reject(user, idParam, input) {
      const id = parseId(idParam);
      const { reason } = validate(input, { reason: { type: 'string', required: true, min: 5, max: 300 } });
      return db.transaction(async (tx) => {
        const repos = reposFor(tx);
        const reservation = await lockReservation(repos, id);
        if (reservation.status !== 'PENDIENTE') {
          throw invalidState(`Solo se pueden rechazar solicitudes pendientes (estado actual: ${reservation.status})`);
        }
        const now = nowIso();
        await repos.reservations.updateStatus(id, { status: 'RECHAZADA', decidedBy: user.id, decisionReason: reason, now });
        await repos.reservations.addHistory({
          reservationId: id, fromStatus: 'PENDIENTE', toStatus: 'RECHAZADA', changedBy: user.id, comment: reason, now,
        });
        return repos.reservations.findById(id);
      });
    },

    // CAN-01: propietario, COORDINADOR o ADMIN; solo activas y no iniciadas. El motivo va al historial (H16).
    async cancel(user, idParam, input) {
      const id = parseId(idParam);
      const { reason } = validate(input, { reason: { type: 'string', max: 300 } }, { partial: true });
      return db.transaction(async (tx) => {
        const repos = reposFor(tx);
        const reservation = await lockReservation(repos, id);
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
        await repos.reservations.updateStatus(id, { status: 'CANCELADA', now });
        await repos.reservations.addHistory({
          reservationId: id, fromStatus: reservation.status, toStatus: 'CANCELADA', changedBy: user.id, comment: reason, now,
        });
        return repos.reservations.findById(id);
      });
    },

    // HIS-02
    async history(user, idParam) {
      const reservation = await getOrFail(reservationsRepo, parseId(idParam));
      assertCanView(user, reservation);
      return reservationsRepo.listHistory(reservation.id);
    },

    // DIS-01
    async dailyAvailability(spaceIdParam, query) {
      const space = await getSpaceOrFail(spacesRepo, parseId(spaceIdParam));
      const { date } = validate(query, { date: { type: 'date', required: true } });
      const blocks = (await reservationsRepo.listBySpaceAndDate(space.id, date, ACTIVE_STATUSES)).map(toBlock);
      return {
        spaceId: space.id,
        date,
        operatingHours: { open: config.schedule.openTime, close: config.schedule.closeTime },
        blocks,
      };
    },

    // DIS-02
    async checkSlot(spaceIdParam, query) {
      const space = await getSpaceOrFail(spacesRepo, parseId(spaceIdParam));
      const slot = validate(query, slotSchema);
      const conflicts = (await reservationsRepo.findOverlapping({ spaceId: space.id, ...slot, statuses: ACTIVE_STATUSES })).map(toBlock);
      return { available: conflicts.length === 0, conflicts };
    },
  };
}

module.exports = { createReservationsService, STATUSES };
