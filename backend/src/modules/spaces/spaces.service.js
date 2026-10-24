const { validate, parseId } = require('../../utils/validation');
const { localParts } = require('../../utils/time');
const { duplicate, notFound, businessRule } = require('../../errors');

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

function createSpacesService({ spacesRepo, clock }) {
  function getOrFail(id) {
    const space = spacesRepo.findById(id);
    if (!space) throw notFound('Espacio no encontrado');
    return space;
  }

  return {
    getOrFail,

    // ESP-02: los solicitantes solo ven espacios activos (hallazgo H12).
    list(user, query) {
      const { type } = validate(query, { type: { type: 'string', enum: SPACE_TYPES } }, { partial: true });
      const includeInactive = query.includeInactive === 'true' && user.role !== 'SOLICITANTE';
      return spacesRepo.list({ type, includeInactive });
    },

    get(idParam) {
      return getOrFail(parseId(idParam));
    },

    create(input) {
      const data = validate(input, spaceSchema);
      if (spacesRepo.existsName(data.name)) throw duplicate('Ya existe un espacio con ese nombre');
      return spacesRepo.insert({ ...data, createdAt: clock.now().toISOString() });
    },

    // ESP-03 y ESP-04
    update(idParam, input) {
      const id = parseId(idParam);
      const patch = validate(input, updateSchema, { partial: true });
      const space = getOrFail(id);
      if (patch.name && spacesRepo.existsName(patch.name, id)) {
        throw duplicate('Ya existe un espacio con ese nombre');
      }
      if (patch.active === false && space.active) {
        const pending = spacesRepo.countFutureActiveReservations(id, localParts(clock.now()));
        if (pending > 0) {
          throw businessRule(
            `No se puede inactivar: el espacio tiene ${pending} reserva(s) activa(s) futura(s). Cancélelas o recházelas primero.`
          );
        }
      }
      return spacesRepo.update(id, patch);
    },
  };
}

module.exports = { createSpacesService, SPACE_TYPES };
