const express = require('express');
const cors = require('cors');
const defaultConfig = require('./config');
const { authenticate } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createUsersRepository } = require('./modules/users/users.repository');
const { createUsersService } = require('./modules/users/users.service');
const { createAuthRouter, createUsersRouter } = require('./modules/users/users.routes');
const { createSpacesService } = require('./modules/spaces/spaces.service');
const { createSpacesRouter } = require('./modules/spaces/spaces.routes');
const { createReservationsService } = require('./modules/reservations/reservations.service');
const {
  createReservationsRouter,
  createAvailabilityRouter,
} = require('./modules/reservations/reservations.routes');

const systemClock = { now: () => new Date() };

// La app recibe sus dependencias (base de datos, reloj, configuración) para poder probarla
// con PGlite en memoria y un reloj fijo. En producción `db` apunta a Supabase.
// Express 5 envía al manejador de errores los rechazos de los handlers async.
function createApp({ db, clock = systemClock, config = {} }) {
  if (!db) throw new Error('createApp requiere una conexión de base de datos (db)');
  const cfg = { ...defaultConfig, ...config };

  const usersRepo = createUsersRepository(db);
  const usersService = createUsersService({ usersRepo, clock, config: cfg });
  const spacesService = createSpacesService({ db, clock });
  const reservationsService = createReservationsService({ db, clock, config: cfg });
  const auth = authenticate({ usersRepo, config: cfg });

  const app = express();
  app.use(cors({ origin: cfg.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ usersService, auth }));
  app.use('/api/users', createUsersRouter({ usersService, auth }));
  app.use('/api/spaces/:id/availability', createAvailabilityRouter({ reservationsService, auth }));
  app.use('/api/spaces', createSpacesRouter({ spacesService, auth }));
  app.use('/api/reservations', createReservationsRouter({ reservationsService, auth }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
