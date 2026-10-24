const express = require('express');

// RES-01, RES-03
function createReservationsRouter({ reservationsService, auth }) {
  const router = express.Router();
  router.use(auth);
  router.post('/', (req, res) => res.status(201).json(reservationsService.create(req.user, req.body)));
  router.get('/', (req, res) => res.json(reservationsService.list(req.user, req.query)));
  router.get('/:id', (req, res) => res.json(reservationsService.get(req.user, req.params.id)));
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
