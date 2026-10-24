const config = require('./config');
const { openPostgres, openPGlite } = require('./db/database');
const { seed } = require('./db/seed');
const { createApp } = require('./app');

async function main() {
  // Con DATABASE_URL se usa Supabase; sin ella, PGlite local (desarrollo sin credenciales).
  const db = config.databaseUrl
    ? await openPostgres(config.databaseUrl, { schema: config.dbSchema })
    : await openPGlite(config.localDataDir, { schema: config.dbSchema });
  console.log(config.databaseUrl ? `Conectado a PostgreSQL (esquema "${config.dbSchema}").` : `Usando PGlite local en ${config.localDataDir}`);

  if (config.seedOnStart && (await seed(db, { bcryptRounds: config.bcryptRounds }))) {
    console.log('Base de datos inicializada con datos de ejemplo (ver README.md).');
  }

  const app = createApp({ db, config });
  app.listen(config.port, () => {
    console.log(`API de reservas escuchando en http://localhost:${config.port}/api`);
  });
}

main().catch((err) => {
  console.error('No se pudo iniciar la API:', err.message);
  process.exit(1);
});
