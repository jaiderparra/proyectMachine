const toSpace = (row) =>
  row && {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    location: row.location,
    resources: row.resources,
    active: row.active,
    createdAt: new Date(row.created_at).toISOString(),
  };

function createSpacesRepository(db) {
  return {
    async findById(id) {
      return toSpace(await db.one('SELECT * FROM spaces WHERE id = $1', [id]));
    },

    // CON-04: bloquea la fila del espacio hasta el fin de la transacción, de modo que las
    // operaciones sobre un mismo espacio se serializan.
    async findByIdForUpdate(id) {
      return toSpace(await db.one('SELECT * FROM spaces WHERE id = $1 FOR UPDATE', [id]));
    },

    // ESP-01-E2: comparación sin distinguir mayúsculas.
    async existsName(name, exceptId = 0) {
      return Boolean(await db.one('SELECT 1 FROM spaces WHERE lower(name) = lower($1) AND id <> $2', [name, exceptId]));
    },

    async list({ type, includeInactive }) {
      const where = [];
      const params = [];
      if (type) {
        params.push(type);
        where.push(`type = $${params.length}`);
      }
      if (!includeInactive) where.push('active');
      const sql = `SELECT * FROM spaces ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name`;
      return (await db.query(sql, params)).map(toSpace);
    },

    async insert({ name, type, capacity, location, resources, createdAt }) {
      const row = await db.one(
        `INSERT INTO spaces (name, type, capacity, location, resources, active, created_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, $6) RETURNING *`,
        [name, type, capacity, location, resources ?? null, createdAt]
      );
      return toSpace(row);
    },

    async update(id, patch) {
      const columns = ['name', 'type', 'capacity', 'location', 'resources', 'active'];
      const sets = [];
      const params = [];
      for (const column of columns) {
        if (patch[column] === undefined) continue;
        params.push(patch[column]);
        sets.push(`${column} = $${params.length}`);
      }
      if (!sets.length) return this.findById(id);
      params.push(id);
      const row = await db.one(`UPDATE spaces SET ${sets.join(', ')} WHERE id = $${params.length} RETURNING *`, params);
      return toSpace(row);
    },

    // ESP-04: reservas activas cuyo inicio aún no llega.
    async countFutureActiveReservations(spaceId, { date, time }) {
      const row = await db.one(
        `SELECT COUNT(*)::int AS count FROM reservations
         WHERE space_id = $1 AND status IN ('PENDIENTE', 'APROBADA')
           AND (date > $2::date OR (date = $2::date AND start_time > $3::time))`,
        [spaceId, date, time]
      );
      return row.count;
    },
  };
}

module.exports = { createSpacesRepository };
