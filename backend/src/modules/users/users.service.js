const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { validate, parseId } = require('../../utils/validation');
const { duplicate, notFound, unauthenticated, forbidden, businessRule } = require('../../errors');

const ROLES = ['ADMIN', 'COORDINADOR', 'SOLICITANTE']; // ROL-01

const registerSchema = {
  name: { type: 'string', required: true, min: 2, max: 100 },
  email: { type: 'string', required: true, email: true, max: 150, lowercase: true },
  password: { type: 'string', required: true, min: 8, max: 100 },
};

const adminCreateSchema = {
  ...registerSchema,
  role: { type: 'string', required: true, enum: ROLES },
};

const adminUpdateSchema = {
  name: { type: 'string', min: 2, max: 100 },
  role: { type: 'string', enum: ROLES },
  active: { type: 'boolean' },
};

function createUsersService({ usersRepo, clock, config }) {
  async function createUser({ name, email, password, role }) {
    if (await usersRepo.existsEmail(email)) throw duplicate('Ya existe un usuario con ese correo');
    const passwordHash = bcrypt.hashSync(password, config.bcryptRounds);
    return usersRepo.insert({ name, email, passwordHash, role, createdAt: clock.now().toISOString() });
  }

  return {
    // USR-01: el registro público siempre crea SOLICITANTE (se ignora cualquier rol enviado).
    async register(input) {
      const data = validate(input, registerSchema);
      return createUser({ ...data, role: 'SOLICITANTE' });
    },

    // USR-02: mismo mensaje para correo inexistente y contraseña incorrecta.
    async login(input) {
      const { email, password } = validate(input, {
        email: { type: 'string', required: true, lowercase: true },
        password: { type: 'string', required: true },
      });
      const user = await usersRepo.findCredentialsByEmail(email);
      if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        throw unauthenticated('Correo o contraseña incorrectos');
      }
      if (!user.active) throw forbidden('La cuenta está desactivada');
      const { passwordHash, ...publicUser } = user;
      const token = jwt.sign({ sub: user.id }, config.jwtSecret, { expiresIn: config.jwtExpiresIn });
      return { token, user: publicUser };
    },

    list() {
      return usersRepo.list();
    },

    // USR-03
    async create(input) {
      return createUser(validate(input, adminCreateSchema));
    },

    // USR-03 + USR-03-E5 (sin autobloqueo del administrador)
    async update(actor, idParam, input) {
      const id = parseId(idParam);
      const patch = validate(input, adminUpdateSchema, { partial: true });
      const target = await usersRepo.findById(id);
      if (!target) throw notFound('Usuario no encontrado');
      if (actor.id === id && (patch.active === false || (patch.role && patch.role !== 'ADMIN'))) {
        throw businessRule('Un administrador no puede desactivarse ni quitarse su propio rol');
      }
      return usersRepo.update(id, patch);
    },
  };
}

module.exports = { createUsersService, ROLES };
