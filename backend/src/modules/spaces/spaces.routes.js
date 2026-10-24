const express = require('express');
const { authorize } = require('../../middleware/auth');

// ESP-01..ESP-04. Consultar: cualquier usuario autenticado; modificar: solo ADMIN (ROL-03).
function createSpacesRouter({ spacesService, auth }) {
  const router = express.Router();
  router.use(auth);
  router.get('/', async (req, res) => res.json(await spacesService.list(req.user, req.query)));
  router.get('/:id', async (req, res) => res.json(await spacesService.get(req.params.id)));
  router.post('/', authorize('ADMIN'), async (req, res) => res.status(201).json(await spacesService.create(req.body)));
  router.patch('/:id', authorize('ADMIN'), async (req, res) => res.json(await spacesService.update(req.params.id, req.body)));
  return router;
}

module.exports = { createSpacesRouter };
