const express = require('express');
const { authorize } = require('../../middleware/auth');

// ESP-01..ESP-04. Consultar: cualquier usuario autenticado; modificar: solo ADMIN (ROL-03).
function createSpacesRouter({ spacesService, auth }) {
  const router = express.Router();
  router.use(auth);
  router.get('/', (req, res) => res.json(spacesService.list(req.user, req.query)));
  router.get('/:id', (req, res) => res.json(spacesService.get(req.params.id)));
  router.post('/', authorize('ADMIN'), (req, res) => res.status(201).json(spacesService.create(req.body)));
  router.patch('/:id', authorize('ADMIN'), (req, res) => res.json(spacesService.update(req.params.id, req.body)));
  return router;
}

module.exports = { createSpacesRouter };
