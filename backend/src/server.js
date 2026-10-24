const config = require('./config');
const { openDatabase } = require('./db/database');
const { seed } = require('./db/seed');
const { createApp } = require('./app');

const db = openDatabase(config.dbPath);
if (config.seedOnStart && seed(db, { bcryptRounds: config.bcryptRounds })) {
  console.log('Base de datos inicializada con datos de ejemplo (ver README.md).');
}

const app = createApp({ db, config });
app.listen(config.port, () => {
  console.log(`API de reservas escuchando en http://localhost:${config.port}/api`);
});
