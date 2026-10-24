const jwt = require('jsonwebtoken');
const { unauthenticated, forbidden } = require('../errors');

// ROL-02: token obligatorio. El usuario se relee en cada petición, así un usuario desactivado
// pierde el acceso de inmediato y el rol vigente es el de la base de datos (hallazgo H10).
function authenticate({ usersRepo, config }) {
  return async (req, res, next) => {
    const header = req.headers.authorization || '';
    const [scheme, token] = header.split(' ');
    if (scheme !== 'Bearer' || !token) return next(unauthenticated());

    let payload;
    try {
      payload = jwt.verify(token, config.jwtSecret);
    } catch {
      return next(unauthenticated('Token inválido o expirado'));
    }

    const user = await usersRepo.findById(payload.sub);
    if (!user || !user.active) return next(unauthenticated('Usuario inexistente o desactivado'));
    req.user = user;
    next();
  };
}

// ROL-03: autoriza según la matriz de permisos.
function authorize(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) return next(forbidden());
    next();
  };
}

module.exports = { authenticate, authorize };
