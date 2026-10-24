const toUser = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active === 1,
    createdAt: row.created_at,
  };

function createUsersRepository(db) {
  return {
    findById(id) {
      return toUser(db.prepare('SELECT * FROM users WHERE id = ?').get(id));
    },

    // Incluye el hash: solo para verificar credenciales, nunca se expone.
    findCredentialsByEmail(email) {
      const row = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
      return row && { ...toUser(row), passwordHash: row.password_hash };
    },

    existsEmail(email) {
      return Boolean(db.prepare('SELECT 1 FROM users WHERE email = ?').get(email));
    },

    list() {
      return db.prepare('SELECT * FROM users ORDER BY name').all().map(toUser);
    },

    insert({ name, email, passwordHash, role, createdAt }) {
      const { lastInsertRowid } = db
        .prepare('INSERT INTO users (name, email, password_hash, role, active, created_at) VALUES (?, ?, ?, ?, 1, ?)')
        .run(name, email, passwordHash, role, createdAt);
      return this.findById(Number(lastInsertRowid));
    },

    update(id, { name, role, active }) {
      db.prepare(
        `UPDATE users SET
           name = COALESCE(?, name),
           role = COALESCE(?, role),
           active = COALESCE(?, active)
         WHERE id = ?`
      ).run(name ?? null, role ?? null, active === undefined ? null : Number(active), id);
      return this.findById(id);
    },
  };
}

module.exports = { createUsersRepository };
