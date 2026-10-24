const toSpace = (row) =>
  row && {
    id: row.id,
    name: row.name,
    type: row.type,
    capacity: row.capacity,
    location: row.location,
    resources: row.resources,
    active: row.active === 1,
    createdAt: row.created_at,
  };

function createSpacesRepository(db) {
  return {
    findById(id) {
      return toSpace(db.prepare('SELECT * FROM spaces WHERE id = ?').get(id));
    },

    // La columna name es COLLATE NOCASE: la comparación ignora mayúsculas (ESP-01-E2).
    existsName(name, exceptId = 0) {
      return Boolean(db.prepare('SELECT 1 FROM spaces WHERE name = ? AND id <> ?').get(name, exceptId));
    },

    list({ type, includeInactive }) {
      const where = [];
      const params = [];
      if (type) {
        where.push('type = ?');
        params.push(type);
      }
      if (!includeInactive) where.push('active = 1');
      const sql = `SELECT * FROM spaces ${where.length ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY name`;
      return db.prepare(sql).all(...params).map(toSpace);
    },

    insert({ name, type, capacity, location, resources, createdAt }) {
      const { lastInsertRowid } = db
        .prepare(
          'INSERT INTO spaces (name, type, capacity, location, resources, active, created_at) VALUES (?, ?, ?, ?, ?, 1, ?)'
        )
        .run(name, type, capacity, location, resources ?? null, createdAt);
      return this.findById(Number(lastInsertRowid));
    },

    update(id, patch) {
      const columns = { name: 'name', type: 'type', capacity: 'capacity', location: 'location', resources: 'resources', active: 'active' };
      const sets = [];
      const params = [];
      for (const [key, column] of Object.entries(columns)) {
        if (patch[key] === undefined) continue;
        sets.push(`${column} = ?`);
        params.push(key === 'active' ? Number(patch[key]) : patch[key]);
      }
      if (sets.length) db.prepare(`UPDATE spaces SET ${sets.join(', ')} WHERE id = ?`).run(...params, id);
      return this.findById(id);
    },

    // ESP-04: reservas activas cuyo inicio aún no llega.
    countFutureActiveReservations(spaceId, { date, time }) {
      return db
        .prepare(
          `SELECT COUNT(*) AS count FROM reservations
           WHERE space_id = ? AND status IN ('PENDIENTE', 'APROBADA')
             AND (date > ? OR (date = ? AND start_time > ?))`
        )
        .get(spaceId, date, date, time).count;
    },
  };
}

module.exports = { createSpacesRepository };
