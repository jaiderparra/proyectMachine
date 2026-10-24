const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const { setup } = require('./helpers');

describe('ROL-01 Roles del sistema', () => {
  test('ROL-01-E1 asignar un rol inexistente → 400', async () => {
    const ctx = await setup();
    const admin = ctx.as(ctx.tokens.admin);
    const otro = (await admin.get('/api/users')).body.find((u) => u.email === 'otro@uni.edu');
    const res = await admin.patch(`/api/users/${otro.id}`, { role: 'SUPERUSUARIO' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
  });
});

describe('ROL-02 Autenticación obligatoria', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('ROL-02-E1 sin token → 401 UNAUTHENTICATED', async () => {
    const res = await ctx.api.get('/api/auth/me');
    assert.equal(res.status, 401);
    assert.equal(res.body.error.code, 'UNAUTHENTICATED');
  });

  test('ROL-02-E2 token alterado o firmado con otro secreto → 401', async () => {
    const forged = jwt.sign({ sub: 1 }, 'otro-secreto');
    const a = await ctx.api.get('/api/auth/me').set('Authorization', `Bearer ${forged}`);
    const b = await ctx.api.get('/api/auth/me').set('Authorization', `Bearer ${ctx.tokens.admin}x`);
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
  });

  test('ROL-02-E3 usuario desactivado con token vigente → 401', async () => {
    const admin = ctx.as(ctx.tokens.admin);
    const otro = (await admin.get('/api/users')).body.find((u) => u.email === 'otro@uni.edu');
    await admin.patch(`/api/users/${otro.id}`, { active: false });
    const res = await ctx.as(ctx.tokens.otro).get('/api/auth/me');
    assert.equal(res.status, 401);
  });

  test('ROL-02-E4 el cambio de rol tiene efecto inmediato con el mismo token', async () => {
    const admin = ctx.as(ctx.tokens.admin);
    const otro = (await admin.get('/api/users')).body.find((u) => u.email === 'otro@uni.edu');
    assert.equal((await ctx.as(ctx.tokens.otro).get('/api/users')).status, 403);
    await admin.patch(`/api/users/${otro.id}`, { role: 'ADMIN' });
    assert.equal((await ctx.as(ctx.tokens.otro).get('/api/users')).status, 200);
  });

  test('rutas públicas: /health, /auth/register y /auth/login no exigen token', async () => {
    assert.equal((await ctx.api.get('/api/health')).status, 200);
    assert.notEqual((await ctx.api.post('/api/auth/login').send({})).status, 401);
    assert.notEqual((await ctx.api.post('/api/auth/register').send({})).status, 401);
  });
});
