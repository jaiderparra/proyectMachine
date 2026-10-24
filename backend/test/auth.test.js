const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { setup } = require('./helpers');

describe('USR-01 Registro público', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('USR-01-E1 registro exitoso sin contraseña en la respuesta', async () => {
    const res = await ctx.api
      .post('/api/auth/register')
      .send({ name: 'Ana Pérez', email: 'ana@uni.edu', password: 'secreta123' });
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'SOLICITANTE');
    assert.equal(res.body.email, 'ana@uni.edu');
    assert.equal(res.body.password, undefined);
    assert.equal(res.body.passwordHash, undefined);
  });

  test('USR-01-E2 correo duplicado sin distinguir mayúsculas → 409 DUPLICATE', async () => {
    await ctx.api.post('/api/auth/register').send({ name: 'Ana', email: 'ana@uni.edu', password: 'secreta123' });
    const res = await ctx.api
      .post('/api/auth/register')
      .send({ name: 'Ana Dos', email: 'ANA@uni.edu', password: 'secreta123' });
    assert.equal(res.status, 409);
    assert.equal(res.body.error.code, 'DUPLICATE');
  });

  test('USR-01-E3 correo mal formado o contraseña corta → 400', async () => {
    const res = await ctx.api.post('/api/auth/register').send({ name: 'Ana', email: 'no-es-correo', password: '123' });
    assert.equal(res.status, 400);
    assert.equal(res.body.error.code, 'VALIDATION_ERROR');
    assert.ok(res.body.error.details.email);
    assert.ok(res.body.error.details.password);
  });

  test('USR-01-E4 el rol enviado se ignora y queda SOLICITANTE', async () => {
    const res = await ctx.api
      .post('/api/auth/register')
      .send({ name: 'Pirata', email: 'pirata@uni.edu', password: 'secreta123', role: 'ADMIN' });
    assert.equal(res.status, 201);
    assert.equal(res.body.role, 'SOLICITANTE');
  });
});

describe('USR-02 Inicio de sesión', () => {
  let ctx;
  beforeEach(async () => {
    ctx = await setup();
  });

  test('USR-02-E1 credenciales válidas devuelven token y usuario', async () => {
    const res = await ctx.api.post('/api/auth/login').send({ email: 'admin@uni.edu', password: 'Admin123!' });
    assert.equal(res.status, 200);
    assert.ok(res.body.token);
    assert.equal(res.body.user.role, 'ADMIN');
    assert.equal(res.body.user.passwordHash, undefined);
  });

  test('USR-02-E2 correo inexistente y contraseña incorrecta dan el mismo 401', async () => {
    const a = await ctx.api.post('/api/auth/login').send({ email: 'nadie@uni.edu', password: 'x' });
    const b = await ctx.api.post('/api/auth/login').send({ email: 'admin@uni.edu', password: 'incorrecta' });
    assert.equal(a.status, 401);
    assert.equal(b.status, 401);
    assert.equal(a.body.error.message, b.body.error.message);
  });

  test('USR-02-E3 cuenta desactivada → 403', async () => {
    const users = await ctx.as(ctx.tokens.admin).get('/api/users');
    const otro = users.body.find((u) => u.email === 'otro@uni.edu');
    await ctx.as(ctx.tokens.admin).patch(`/api/users/${otro.id}`, { active: false });
    const res = await ctx.api.post('/api/auth/login').send({ email: 'otro@uni.edu', password: 'Otro1234!' });
    assert.equal(res.status, 403);
  });
});

describe('USR-04 Perfil propio', () => {
  test('USR-04-E1 GET /auth/me devuelve los datos sin contraseña', async () => {
    const ctx = await setup();
    const res = await ctx.as(ctx.tokens.solic).get('/api/auth/me');
    assert.equal(res.status, 200);
    assert.equal(res.body.email, 'solicitante@uni.edu');
    assert.equal(res.body.passwordHash, undefined);
  });
});
