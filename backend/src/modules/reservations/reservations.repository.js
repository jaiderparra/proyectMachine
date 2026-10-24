const toReservation = (row) =>
  row && {
    id: row.id,
    spaceId: row.space_id,
    spaceName: row.space_name,
    userId: row.user_id,
    userName: row.user_name,
    date: row.date,
    startTime: row.start_time,
    endTime: row.end_time,
    purpose: row.purpose,
    attendees: row.attendees,
    status: row.status,
    decidedBy: row.decided_by,
    decisionReason: row.decision_reason,
    createdAt: new Date(row.created_at).toISOString(),
    updatedAt: new Date(row.updated_at).toISOString(),
  };

const toHistoryEntry = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  changedBy: row.changed_by,
  changedByName: row.changed_by_name,
  comment: row.comment,
  changedAt: new Date(row.changed_at).toISOString(),
});

// La API expone fecha y hora como `YYYY-MM-DD` y `HH:MM` (sdd/project.md).
const SELECT_WITH_NAMES = `
  SELECT r.id, r.space_id, r.user_id, r.purpose, r.attendees, r.status, r.decided_by,
         r.decision_reason, r.created_at, r.updated_at,
         to_char(r.date, 'YYYY-MM-DD') AS date,
         to_char(r.start_time, 'HH24:MI') AS start_time,
         to_char(r.end_time, 'HH24:MI') AS end_time,
         s.name AS space_name, u.name AS user_name
  FROM reservations r
  JOIN spaces s ON s.id = r.space_id
  JOIN users u ON u.id = r.user_id`;

function createReservationsRepository(db) {
  return {
    async findById(id) {
      return toReservation(await db.one(`${SELECT_WITH_NAMES} WHERE r.id = $1`, [id]));
    },

    // Bloquea la reserva hasta el fin de la transacción (evita dos transiciones simultáneas).
    async lockById(id) {
      return Boolean(await db.one('SELECT id FROM reservations WHERE id = $1 FOR UPDATE', [id]));
    },

    async list({ userId, status, spaceId, date }) {
      const where = [];
      const params = [];
      for (const [column, value] of [['r.user_id', userId], ['r.status', status], ['r.space_id', spaceId], ['r.date', date]]) {
        if (value === undefined) continue;
        params.push(value);
        where.push(`${column} = $${params.length}`);
      }
      const sql = `${SELECT_WITH_NAMES} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY r.date DESC, r.start_time DESC, r.id DESC`;
      return (await db.query(sql, params)).map(toReservation);
    },

    // CON-01/CON-02: reservas del espacio en la fecha, con los estados dados, que se solapan con la franja.
    async findOverlapping({ spaceId, date, startTime, endTime, statuses, excludeId = 0 }) {
      const rows = await db.query(
        `${SELECT_WITH_NAMES}
         WHERE r.space_id = $1 AND r.date = $2::date AND r.id <> $3
           AND r.status = ANY($4::text[])
           AND r.start_time < $5::time AND $6::time < r.end_time
         ORDER BY r.start_time`,
        [spaceId, date, excludeId, statuses, endTime, startTime]
      );
      return rows.map(toReservation);
    },

    // DIS-01: bloques ocupados de un día.
    async listBySpaceAndDate(spaceId, date, statuses) {
      const rows = await db.query(
        `${SELECT_WITH_NAMES}
         WHERE r.space_id = $1 AND r.date = $2::date AND r.status = ANY($3::text[])
         ORDER BY r.start_time`,
        [spaceId, date, statuses]
      );
      return rows.map(toReservation);
    },

    // RES-04: reservas de un usuario en un espacio y fecha, con los estados dados.
    async listByUserSpaceAndDate({ userId, spaceId, date, statuses, excludeId = 0 }) {
      const rows = await db.query(
        `${SELECT_WITH_NAMES}
         WHERE r.user_id = $1 AND r.space_id = $2 AND r.date = $3::date AND r.id <> $4
           AND r.status = ANY($5::text[])
         ORDER BY r.start_time`,
        [userId, spaceId, date, excludeId, statuses]
      );
      return rows.map(toReservation);
    },

    async insert({ spaceId, userId, date, startTime, endTime, purpose, attendees, status, now }) {
      const row = await db.one(
        `INSERT INTO reservations
           (space_id, user_id, date, start_time, end_time, purpose, attendees, status, created_at, updated_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9) RETURNING id`,
        [spaceId, userId, date, startTime, endTime, purpose, attendees, status, now]
      );
      return row.id;
    },

    async updateStatus(id, { status, decidedBy, decisionReason, now }) {
      await db.query(
        `UPDATE reservations SET
           status = $1,
           decided_by = COALESCE($2, decided_by),
           decision_reason = COALESCE($3, decision_reason),
           updated_at = $4
         WHERE id = $5`,
        [status, decidedBy ?? null, decisionReason ?? null, now, id]
      );
    },

    // HIS-01: solo inserción (la BD además lo impone con triggers).
    async addHistory({ reservationId, fromStatus, toStatus, changedBy, comment, now }) {
      await db.query(
        `INSERT INTO reservation_history (reservation_id, from_status, to_status, changed_by, comment, changed_at)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [reservationId, fromStatus ?? null, toStatus, changedBy, comment ?? null, now]
      );
    },

    async listHistory(reservationId) {
      const rows = await db.query(
        `SELECT h.*, u.name AS changed_by_name
         FROM reservation_history h JOIN users u ON u.id = h.changed_by
         WHERE h.reservation_id = $1 ORDER BY h.id`,
        [reservationId]
      );
      return rows.map(toHistoryEntry);
    },
  };
}

module.exports = { createReservationsRepository };
