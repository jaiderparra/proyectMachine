const path = require('node:path');

// Configuración centralizada. Las reglas de horario son constantes únicas (hallazgo H4 de la revisión).
module.exports = {
  port: Number(process.env.PORT) || 4000,
  jwtSecret: process.env.JWT_SECRET || 'dev-secret-cambiar-en-produccion',
  jwtExpiresIn: '8h', // USR-02
  dbPath: process.env.DB_PATH || path.join(__dirname, '..', 'data', 'reservas.db'),
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:3000',
  bcryptRounds: Number(process.env.BCRYPT_ROUNDS) || 10,
  seedOnStart: process.env.SEED !== 'false',
  schedule: {
    openTime: '07:00', // RES-02 / DIS-01
    closeTime: '22:00',
    minDurationMinutes: 30,
  },
};
