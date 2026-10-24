const fs = require('node:fs');
const path = require('node:path');

const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

// Interfaz común para repositorios y servicios, igual con `pg` (Supabase) y con PGlite:
//   query(sql, params) → filas · one(sql, params) → primera fila
//   transaction(async (tx) => …) → tx ofrece query/one dentro de la misma transacción
function wrap(run) {
  const query = async (sql, params = []) => (await run(sql, params)).rows;
  return { query, one: async (sql, params) => (await query(sql, params))[0] };
}

const assertSchemaName = (schema) => {
  if (!/^[a-z_][a-z0-9_]*$/.test(schema)) throw new Error(`Nombre de esquema inválido: ${schema}`);
  return schema;
};

// Supabase / PostgreSQL vía pool de conexiones.
async function openPostgres(connectionString, { schema = 'reservas' } = {}) {
  const { Pool } = require('pg');
  assertSchemaName(schema);
  // search_path como parámetro de arranque: cada conexión del pool nace apuntando al esquema.
  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 10,
    options: `-c search_path=${schema}`,
  });

  const db = {
    ...wrap((sql, params) => pool.query(sql, params)),
    async transaction(fn) {
      const client = await pool.connect();
      try {
        await client.query('BEGIN');
        const result = await fn(wrap((sql, params) => client.query(sql, params)));
        await client.query('COMMIT');
        return result;
      } catch (err) {
        await client.query('ROLLBACK');
        throw err;
      } finally {
        client.release();
      }
    },
    exec: (sql) => pool.query(sql),
    close: () => pool.end(),
  };
  await db.exec(`CREATE SCHEMA IF NOT EXISTS ${schema}`);
  await db.exec(schemaSql);
  return db;
}

// PGlite: PostgreSQL compilado a WASM, en proceso. En memoria para pruebas, o en un
// directorio para desarrollo local sin credenciales de Supabase.
async function openPGlite(dataDir, { schema = 'reservas' } = {}) {
  const { PGlite } = require('@electric-sql/pglite');
  assertSchemaName(schema);
  if (dataDir) fs.mkdirSync(dataDir, { recursive: true });
  const pg = new PGlite(dataDir);
  await pg.exec(`CREATE SCHEMA IF NOT EXISTS ${schema}; SET search_path TO ${schema};`);
  await pg.exec(schemaSql);

  return {
    ...wrap((sql, params) => pg.query(sql, params)),
    transaction: (fn) => pg.transaction((tx) => fn(wrap((sql, params) => tx.query(sql, params)))),
    exec: (sql) => pg.exec(sql),
    close: () => pg.close(),
  };
}

module.exports = { openPostgres, openPGlite };
