const express = require('express');
const { authorize } = require('../../middleware/auth');

// RES-01, RES-03, APR-01, APR-02, CAN-01, HIS-02
function createReservationsRouter({ reservationsService, auth }) {
  const router = express.Router();
  const canDecide = authorize('ADMIN', 'COORDINADOR'); // ROL-03
  router.use(auth);
  router.post('/', (req, res) => res.status(201).json(reservationsService.create(req.user, req.body)));
  router.get('/', (req, res) => res.json(reservationsService.list(req.user, req.query)));
  router.get('/:id', (req, res) => res.json(reservationsService.get(req.user, req.params.id)));
  router.get('/:id/history', (req, res) => res.json(reservationsService.history(req.user, req.params.id)));
  router.post('/:id/approve', canDecide, (req, res) => res.json(reservationsService.approve(req.user, req.params.id)));
  router.post('/:id/reject', canDecide, (req, res) =>
    res.json(reservationsService.reject(req.user, req.params.id, req.body))
  );
  router.post('/:id/cancel', (req, res) => res.json(reservationsService.cancel(req.user, req.params.id, req.body)));
  return router;
}

// DIS-01, DIS-02 (se montan bajo /api/spaces/:id/availability)
function createAvailabilityRouter({ reservationsService, auth }) {
  const router = express.Router({ mergeParams: true });
  router.use(auth);
  router.get('/', (req, res) => res.json(reservationsService.dailyAvailability(req.params.id, req.query)));
  router.get('/check', (req, res) => res.json(reservationsService.checkSlot(req.params.id, req.query)));
  return router;
}

module.exports = { createReservationsRouter, createAvailabilityRouter };
