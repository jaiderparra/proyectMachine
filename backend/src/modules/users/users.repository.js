const toUser = (row) =>
  row && {
    id: row.id,
    name: row.name,
    email: row.email,
    role: row.role,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(),
  };

function createUsersRepository(db) {
  return {
    async findById(id) {
      return toUser(await db.one('SELECT * FROM users WHERE id = $1', [id]));
    },

    // Incluye el hash: solo para verificar credenciales, nunca se expone.
    async findCredentialsByEmail(email) {
      const row = await db.one('SELECT * FROM users WHERE email = $1', [email]);
      return row && { ...toUser(row), passwordHash: row.password_hash };
    },

    async existsEmail(email) {
      return Boolean(await db.one('SELECT 1 FROM users WHERE email = $1', [email]));
    },

    async list() {
      return (await db.query('SELECT * FROM users ORDER BY name')).map(toUser);
    },

    async insert({ name, email, passwordHash, role, createdAt }) {
      const row = await db.one(
        `INSERT INTO users (name, email, password_hash, role, active, created_at)
         VALUES ($1, $2, $3, $4, TRUE, $5) RETURNING *`,
        [name, email, passwordHash, role, createdAt]
      );
      return toUser(row);
    },

    async update(id, { name, role, active }) {
      const row = await db.one(
        `UPDATE users SET
           name = COALESCE($1, name),
           role = COALESCE($2, role),
           active = COALESCE($3, active)
         WHERE id = $4 RETURNING *`,
        [name ?? null, role ?? null, active ?? null, id]
      );
      return toUser(row);
    },
  };
}

module.exports = { createUsersRepository };
