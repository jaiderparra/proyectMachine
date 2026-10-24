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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };

const toHistoryEntry = (row) => ({
  id: row.id,
  reservationId: row.reservation_id,
  fromStatus: row.from_status,
  toStatus: row.to_status,
  changedBy: row.changed_by,
  changedByName: row.changed_by_name,
  comment: row.comment,
  changedAt: row.changed_at,
});

const SELECT_WITH_NAMES = `
  SELECT r.*, s.name AS space_name, u.name AS user_name
  FROM reservations r
  JOIN spaces s ON s.id = r.space_id
  JOIN users u ON u.id = r.user_id`;

function createReservationsRepository(db) {
  return {
    findById(id) {
      return toReservation(db.prepare(`${SELECT_WITH_NAMES} WHERE r.id = ?`).get(id));
    },

    list({ userId, status, spaceId, date }) {
      const where = [];
      const params = [];
      for (const [column, value] of [['r.user_id', userId], ['r.status', status], ['r.space_id', spaceId], ['r.date', date]]) {
        if (value === undefined) continue;
        where.push(`${column} = ?`);
        params.push(value);
      }
      const sql = `${SELECT_WITH_NAMES} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
        ORDER BY r.date DESC, r.start_time DESC, r.id DESC`;
      return db.prepare(sql).all(...params).map(toReservation);
    },

    // CON-01/CON-02: reservas del espacio en la fecha, con los estados dados, que se solapan con la franja.
    findOverlapping({ spaceId, date, startTime, endTime, statuses, excludeId = 0 }) {
      const placeholders = statuses.map(() => '?').join(', ');
      return db
        .prepare(
          `${SELECT_WITH_NAMES}
           WHERE r.space_id = ? AND r.date = ? AND r.id <> ?
             AND r.status IN (${placeholders})
             AND r.start_time < ? AND ? < r.end_time
           ORDER BY r.start_time`
        )
        .all(spaceId, date, excludeId, ...statuses, endTime, startTime)
        .map(toReservation);
    },

    // DIS-01: bloques ocupados de un día.
    listBySpaceAndDate(spaceId, date, statuses) {
      const placeholders = statuses.map(() => '?').join(', ');
      return db
        .prepare(
          `${SELECT_WITH_NAMES}
           WHERE r.space_id = ? AND r.date = ? AND r.status IN (${placeholders})
           ORDER BY r.start_time`
        )
        .all(spaceId, date, ...statuses)
        .map(toReservation);
    },

    // RES-04: reservas de un usuario en un espacio y fecha, con los estados dados.
    listByUserSpaceAndDate({ userId, spaceId, date, statuses, excludeId = 0 }) {
      const placeholders = statuses.map(() => '?').join(', ');
      return db
        .prepare(
          `${SELECT_WITH_NAMES}
           WHERE r.user_id = ? AND r.space_id = ? AND r.date = ? AND r.id <> ?
             AND r.status IN (${placeholders})
           ORDER BY r.start_time`
        )
        .all(userId, spaceId, date, excludeId, ...statuses)
        .map(toReservation);
    },

    insert({ spaceId, userId, date, startTime, endTime, purpose, attendees, status, now }) {
      const { lastInsertRowid } = db
        .prepare(
          `INSERT INTO reservations
             (space_id, user_id, date, start_time, end_time, purpose, attendees, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .run(spaceId, userId, date, startTime, endTime, purpose, attendees, status, now, now);
      return Number(lastInsertRowid);
    },

    updateStatus(id, { status, decidedBy, decisionReason, now }) {
      db.prepare(
        `UPDATE reservations SET
           status = ?,
           decided_by = COALESCE(?, decided_by),
           decision_reason = COALESCE(?, decision_reason),
           updated_at = ?
         WHERE id = ?`
      ).run(status, decidedBy ?? null, decisionReason ?? null, now, id);
    },

    // HIS-01: solo inserción (la BD además lo impone con triggers).
    addHistory({ reservationId, fromStatus, toStatus, changedBy, comment, now }) {
      db.prepare(
        `INSERT INTO reservation_history (reservation_id, from_status, to_status, changed_by, comment, changed_at)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).run(reservationId, fromStatus ?? null, toStatus, changedBy, comment ?? null, now);
    },

    listHistory(reservationId) {
      return db
        .prepare(
          `SELECT h.*, u.name AS changed_by_name
           FROM reservation_history h JOIN users u ON u.id = h.changed_by
           WHERE h.reservation_id = ? ORDER BY h.id`
        )
        .all(reservationId)
        .map(toHistoryEntry);
    },
  };
}

module.exports = { createReservationsRepository };
