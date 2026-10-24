const { validate, parseId } = require('../../utils/validation');
const { localParts } = require('../../utils/time');
const { duplicate, notFound, businessRule } = require('../../errors');
const { createSpacesRepository } = require('./spaces.repository');

const SPACE_TYPES = ['LABORATORIO', 'AUDITORIO', 'SALA_COMPUTO'];

// ESP-01: reglas de los campos de un espacio
const spaceSchema = {
  name: { type: 'string', required: true, min: 3, max: 100 },
  type: { type: 'string', required: true, enum: SPACE_TYPES },
  capacity: { type: 'integer', required: true, min: 1, max: 1000 },
  location: { type: 'string', required: true, min: 1, max: 150 },
  resources: { type: 'string', max: 500, nullable: true },
};

const updateSchema = { ...spaceSchema, active: { type: 'boolean' } };

function createSpacesService({ db, clock }) {
  const spacesRepo = createSpacesRepository(db);

  async function getOrFail(id) {
    const space = await spacesRepo.findById(id);
    if (!space) throw notFound('Espacio no encontrado');
    return space;
  }

  return {
    // ESP-02: los solicitantes solo ven espacios activos (hallazgo H12).
    async list(user, query) {
      const { type } = validate(query, { type: { type: 'string', enum: SPACE_TYPES } }, { partial: true });
      const includeInactive = query.includeInactive === 'true' && user.role !== 'SOLICITANTE';
      return spacesRepo.list({ type, includeInactive });
    },

    async get(idParam) {
      return getOrFail(parseId(idParam));
    },

    async create(input) {
      const data = validate(input, spaceSchema);
      if (await spacesRepo.existsName(data.name)) throw duplicate('Ya existe un espacio con ese nombre');
      return spacesRepo.insert({ ...data, createdAt: clock.now().toISOString() });
    },

    // ESP-03 y ESP-04. Bloquea el espacio para que no entre una reserva mientras se inactiva.
    async update(idParam, input) {
      const id = parseId(idParam);
      const patch = validate(input, updateSchema, { partial: true });
      return db.transaction(async (tx) => {
        const repo = createSpacesRepository(tx);
        const space = await repo.findByIdForUpdate(id);
        if (!space) throw notFound('Espacio no encontrado');
        if (patch.name && (await repo.existsName(patch.name, id))) {
          throw duplicate('Ya existe un espacio con ese nombre');
        }
        if (patch.active === false && space.active) {
          const pending = await repo.countFutureActiveReservations(id, localParts(clock.now()));
          if (pending > 0) {
            throw businessRule(
              `No se puede inactivar: el espacio tiene ${pending} reserva(s) activa(s) futura(s). Cancélelas o recházelas primero.`
            );
          }
        }
        return repo.update(id, patch);
      });
    },
  };
}

module.exports = { createSpacesService, SPACE_TYPES };
