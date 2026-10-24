const bcrypt = require('bcryptjs');

// Datos iniciales para poder usar el sistema desde el primer arranque.
const SEED_USERS = [
  { name: 'Administrador General', email: 'admin@uni.edu', password: 'Admin123!', role: 'ADMIN' },
  { name: 'Coordinadora de Espacios', email: 'coordinador@uni.edu', password: 'Coord123!', role: 'COORDINADOR' },
  { name: 'Docente Solicitante', email: 'solicitante@uni.edu', password: 'Solic123!', role: 'SOLICITANTE' },
];

const SEED_SPACES = [
  { name: 'Laboratorio de Redes', type: 'LABORATORIO', capacity: 30, location: 'Bloque A, piso 2', resources: 'Routers, switches, 15 equipos' },
  { name: 'Auditorio Principal', type: 'AUDITORIO', capacity: 200, location: 'Bloque C, piso 1', resources: 'Proyector, sonido, tarima' },
  { name: 'Sala de Cómputo 1', type: 'SALA_COMPUTO', capacity: 35, location: 'Bloque B, piso 3', resources: '35 computadores, videobeam' },
  { name: 'Laboratorio de Química', type: 'LABORATORIO', capacity: 25, location: 'Bloque D, piso 1', resources: 'Campana extractora, reactivos' },
  { name: 'Auditorio Menor', type: 'AUDITORIO', capacity: 80, location: 'Bloque C, piso 2', resources: 'Proyector, micrófono' },
];

// Solo siembra si la base está vacía, así no altera datos reales.
function seed(db, { bcryptRounds = 10, now = new Date() } = {}) {
  const { count } = db.prepare('SELECT COUNT(*) AS count FROM users').get();
  if (count > 0) return false;

  const createdAt = now.toISOString();
  const insertUser = db.prepare(
    'INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)'
  );
  for (const u of SEED_USERS) {
    insertUser.run(u.name, u.email, bcrypt.hashSync(u.password, bcryptRounds), u.role, createdAt);
  }
  const insertSpace = db.prepare(
    'INSERT INTO spaces (name, type, capacity, location, resources, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
  );
  for (const s of SEED_SPACES) {
    insertSpace.run(s.name, s.type, s.capacity, s.location, s.resources, createdAt);
  }
  return true;
}

module.exports = { seed, SEED_USERS, SEED_SPACES };
