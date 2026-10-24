const express = require('express');
const { authorize } = require('../../middleware/auth');

// RES-01, RES-03, APR-01, APR-02, CAN-01, HIS-02
function createReservationsRouter({ reservationsService, auth }) {
  const router = express.Router();
  const canDecide = authorize('ADMIN', 'COORDINADOR'); // ROL-03
  router.use(auth);
  router.post('/', async (req, res) => res.status(201).json(await reservationsService.create(req.user, req.body)));
  router.get('/', async (req, res) => res.json(await reservationsService.list(req.user, req.query)));
  router.get('/:id', async (req, res) => res.json(await reservationsService.get(req.user, req.params.id)));
  router.get('/:id/history', async (req, res) => res.json(await reservationsService.history(req.user, req.params.id)));
  router.post('/:id/approve', canDecide, async (req, res) => res.json(await reservationsService.approve(req.user, req.params.id)));
  router.post('/:id/reject', canDecide, async (req, res) =>
    res.json(await reservationsService.reject(req.user, req.params.id, req.body))
  );
  router.post('/:id/cancel', async (req, res) => res.json(await reservationsService.cancel(req.user, req.params.id, req.body)));
  return router;
}

// DIS-01, DIS-02 (se montan bajo /api/spaces/:id/availability)
function createAvailabilityRouter({ reservationsService, auth }) {
  const router = express.Router({ mergeParams: true });
  router.use(auth);
  router.get('/', async (req, res) => res.json(await reservationsService.dailyAvailability(req.params.id, req.query)));
  router.get('/check', async (req, res) => res.json(await reservationsService.checkSlot(req.params.id, req.query)));
  return router;
}

module.exports = { createReservationsRouter, createAvailabilityRouter };
