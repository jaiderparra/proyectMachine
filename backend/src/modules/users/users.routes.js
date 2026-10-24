const express = require('express');
const { authorize } = require('../../middleware/auth');

// USR-01, USR-02, USR-04
function createAuthRouter({ usersService, auth }) {
  const router = express.Router();
  router.post('/register', (req, res) => res.status(201).json(usersService.register(req.body)));
  router.post('/login', (req, res) => res.json(usersService.login(req.body)));
  router.get('/me', auth, (req, res) => res.json(req.user));
  return router;
}

// USR-03: solo ADMIN
function createUsersRouter({ usersService, auth }) {
  const router = express.Router();
  router.use(auth, authorize('ADMIN'));
  router.get('/', (req, res) => res.json(usersService.list()));
  router.post('/', (req, res) => res.status(201).json(usersService.create(req.body)));
  router.patch('/:id', (req, res) => res.json(usersService.update(req.user, req.params.id, req.body)));
  return router;
}

module.exports = { createAuthRouter, createUsersRouter };
