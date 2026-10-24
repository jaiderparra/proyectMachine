const express = require('express');
const cors = require('cors');
const defaultConfig = require('./config');
const { openDatabase } = require('./db/database');
const { authenticate } = require('./middleware/auth');
const { notFoundHandler, errorHandler } = require('./middleware/errorHandler');
const { createUsersRepository } = require('./modules/users/users.repository');
const { createUsersService } = require('./modules/users/users.service');
const { createAuthRouter, createUsersRouter } = require('./modules/users/users.routes');
const { createSpacesRepository } = require('./modules/spaces/spaces.repository');
const { createSpacesService } = require('./modules/spaces/spaces.service');
const { createSpacesRouter } = require('./modules/spaces/spaces.routes');

const systemClock = { now: () => new Date() };

// La app recibe sus dependencias (base de datos, reloj, configuración) para poder probarla
// con SQLite en memoria y un reloj fijo.
function createApp({ db = openDatabase(':memory:'), clock = systemClock, config = {} } = {}) {
  const cfg = { ...defaultConfig, ...config };

  const usersRepo = createUsersRepository(db);
  const usersService = createUsersService({ usersRepo, clock, config: cfg });
  const spacesRepo = createSpacesRepository(db);
  const spacesService = createSpacesService({ spacesRepo, clock });
  const auth = authenticate({ usersRepo, config: cfg });

  const app = express();
  app.use(cors({ origin: cfg.corsOrigin }));
  app.use(express.json());

  app.get('/api/health', (req, res) => res.json({ status: 'ok' }));
  app.use('/api/auth', createAuthRouter({ usersService, auth }));
  app.use('/api/users', createUsersRouter({ usersService, auth }));
  app.use('/api/spaces', createSpacesRouter({ spacesService, auth }));

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

module.exports = { createApp };
