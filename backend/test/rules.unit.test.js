const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { overlaps, scheduleViolation } = require('../src/modules/reservations/reservations.rules');
const { isValidDate, isValidTime } = require('../src/utils/time');

const schedule = { openTime: '07:00', closeTime: '22:00', minDurationMinutes: 30 };
const now = new Date(2030, 4, 10, 9, 0); // 2030-05-10 09:00

describe('CON-01 Definición de solapamiento (unitarias)', () => {
  const existing = { startTime: '08:00', endTime: '10:00' };

  test('CON-01-E1 solapamiento parcial', () => {
    assert.equal(overlaps(existing, { startTime: '09:00', endTime: '11:00' }), true);
    assert.equal(overlaps(existing, { startTime: '07:00', endTime: '08:30' }), true);
  });

  test('CON-01-E2 franja contenida y contenedora', () => {
    assert.equal(overlaps({ startTime: '08:00', endTime: '12:00' }, { startTime: '09:00', endTime: '10:00' }), true);
    assert.equal(overlaps(existing, { startTime: '07:00', endTime: '12:00' }), true);
    assert.equal(overlaps(existing, { startTime: '08:00', endTime: '10:00' }), true);
  });

  test('CON-01-E3 franjas contiguas no se solapan', () => {
    assert.equal(overlaps(existing, { startTime: '10:00', endTime: '12:00' }), false);
    assert.equal(overlaps(existing, { startTime: '07:00', endTime: '08:00' }), false);
  });
});

describe('RES-02 Reglas de horario (unitarias)', () => {
  const slot = (startTime, endTime, date = '2030-05-11') => ({ date, startTime, endTime });

  test('franja válida no tiene violaciones', () => {
    assert.equal(scheduleViolation(slot('08:00', '10:00'), now, schedule), null);
    assert.equal(scheduleViolation(slot('07:00', '22:00'), now, schedule), null);
  });

  test('RES-02-E1 fin anterior o igual al inicio', () => {
    assert.match(scheduleViolation(slot('10:00', '09:00'), now, schedule), /posterior/);
    assert.match(scheduleViolation(slot('10:00', '10:00'), now, schedule), /posterior/);
  });

  test('RES-02-E2 fuera del horario de operación', () => {
    assert.match(scheduleViolation(slot('21:00', '23:00'), now, schedule), /horario de operación/);
    assert.match(scheduleViolation(slot('06:30', '08:00'), now, schedule), /horario de operación/);
  });

  test('RES-02-E3 franja que ya comenzó o pasó', () => {
    assert.match(scheduleViolation(slot('08:00', '10:00', '2030-05-10'), now, schedule), /ya comenzó/);
    assert.match(scheduleViolation(slot('09:00', '10:00', '2030-05-10'), now, schedule), /ya comenzó/);
    assert.match(scheduleViolation(slot('10:00', '11:00', '2030-05-09'), now, schedule), /ya comenzó/);
    assert.equal(scheduleViolation(slot('09:30', '10:30', '2030-05-10'), now, schedule), null);
  });

  test('RES-02-E4 duración menor a 30 minutos', () => {
    assert.match(scheduleViolation(slot('08:00', '08:15'), now, schedule), /duración mínima/);
    assert.equal(scheduleViolation(slot('08:00', '08:30'), now, schedule), null);
  });

  test('RES-02-E5 validación de formato de fecha y hora', () => {
    assert.equal(isValidDate('2030-05-10'), true);
    assert.equal(isValidDate('10/05/2030'), false);
    assert.equal(isValidDate('2030-13-40'), false);
    assert.equal(isValidDate('2030-02-30'), false);
    assert.equal(isValidTime('08:00'), true);
    assert.equal(isValidTime('8am'), false);
    assert.equal(isValidTime('24:00'), false);
  });
});

describe('RES-04 Cadena contigua (unitarias)', () => {
  const { consecutiveBlockMinutes } = require('../src/modules/reservations/reservations.rules');
  const r = (startTime, endTime) => ({ startTime, endTime });

  test('sin reservas del usuario: solo cuenta la franja', () => {
    assert.equal(consecutiveBlockMinutes(r('08:00', '12:00'), []), 240);
  });

  test('suma reservas contiguas antes y después', () => {
    assert.equal(consecutiveBlockMinutes(r('10:00', '12:00'), [r('08:00', '10:00'), r('12:00', '14:00')]), 360);
  });

  test('sigue la cadena a través de varias reservas', () => {
    assert.equal(consecutiveBlockMinutes(r('11:00', '12:00'), [r('10:00', '11:00'), r('09:00', '10:00'), r('08:00', '09:00')]), 240);
  });

  test('un hueco corta la cadena', () => {
    assert.equal(consecutiveBlockMinutes(r('11:30', '13:00'), [r('08:00', '11:00')]), 90);
  });
});
