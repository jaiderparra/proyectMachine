const express = require('express');
const { authorize } = require('../../middleware/auth');

// USR-01, USR-02, USR-04
function createAuthRouter({ usersService, auth }) {
  const router = express.Router();
  router.post('/register', async (req, res) => res.status(201).json(await usersService.register(req.body)));
  router.post('/login', async (req, res) => res.json(await usersService.login(req.body)));
  router.get('/me', auth, (req, res) => res.json(req.user));
  return router;
}

// USR-03: solo ADMIN
function createUsersRouter({ usersService, auth }) {
  const router = express.Router();
  router.use(auth, authorize('ADMIN'));
  router.get('/', async (req, res) => res.json(await usersService.list()));
  router.post('/', async (req, res) => res.status(201).json(await usersService.create(req.body)));
  router.patch('/:id', async (req, res) => res.json(await usersService.update(req.user, req.params.id, req.body)));
  return router;
}

module.exports = { createAuthRouter, createUsersRouter };
