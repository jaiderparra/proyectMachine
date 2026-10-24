const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

describe('USR-03 Administración de usuarios', () => {
  let ctx;
  let admin;
  beforeEach(async () => {
    ctx = await setup();
    admin = ctx.as(ctx.tokens.admin);
  });

  const findByEmail = async (email) => (await admin.get('/api/users')).body.find((u) => u.email === email);

  test('USR-03-E1 el ADMIN crea un COORDINADOR', async () => {
    const res = await admin.post('/api/users', {
      name: 'Nuevo Coordinador',
      email: 'nuevo.coord@uni.edu',
      password: 'Coord9999!',
      role: 'COORDINADOR',
    });
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'COORDINADOR');
  });

  test('USR-03-E2 cambio de rol de SOLICITANTE a COORDINADOR', async () => {
    const otro = await findByEmail('otro@uni.edu');
    const res = await admin.patch(`/api/users/${otro.id}`, { role: 'COORDINADOR' });
    assert.equal(res.status, 200);
    assert.equal(res.body.role, 'COORDINADOR');
  });

  test('USR-03-E3 desactivar usuario', async () => {
    const otro = await findByEmail('otro@uni.edu');
    const res = await admin.patch(`/api/users/${otro.id}`, { active: false });
    assert.equal(res.status, 200);
    assert.equal(res.body.active, false);
  });

  test('USR-03-E4 un COORDINADOR no puede listar usuarios → 403', async () => {
    const res = await ctx.as(ctx.tokens.coord).get('/api/users');
    assert.equal(res.status, 403);
    assert.equal(res.body.error.code, 'FORBIDDEN');
  });

  test('USR-03-E5 el ADMIN no puede desactivarse ni quitarse el rol → 422', async () => {
    const me = (await admin.get('/api/auth/me')).body;
    const a = await admin.patch(`/api/users/${me.id}`, { active: false });
    const b = await admin.patch(`/api/users/${me.id}`, { role: 'SOLICITANTE' });
    assert.equal(a.status, 422);
    assert.equal(b.status, 422);
    assert.equal(a.body.error.code, 'BUSINESS_RULE');
  });

  test('usuario inexistente → 404', async () => {
    const res = await admin.patch('/api/users/9999', { name: 'Nadie' });
    assert.equal(res.status, 404);
  });
});
