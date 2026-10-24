const fs = require('node:fs');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');

const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');

function openDatabase(file = ':memory:') {
  if (file !== ':memory:') fs.mkdirSync(path.dirname(file), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec('PRAGMA foreign_keys = ON;');
  db.exec(schema);
  return db;
}

// CON-04: verificación y escritura en la misma transacción. BEGIN IMMEDIATE toma el bloqueo
// de escritura al inicio, de modo que dos solicitudes no pueden verificar a la vez.
function transaction(db, fn) {
  db.exec('BEGIN IMMEDIATE');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}

module.exports = { openDatabase, transaction };
