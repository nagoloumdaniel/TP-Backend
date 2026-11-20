export function createMeasuresRepository(pool) {
  // Relit une mesure au format de l'API : même requête que findByHive, filtrée sur l'instant.
  async function findOne(hiveId, timestamp) {
    const { rows } = await pool.query(
      `SELECT m.hive_id, h.site_id, m.measured_at AS timestamp,
              m.lat AS position_lat, m.lon AS position_lon,
              m.weight_kg, m.temp_internal_c, m.temp_external_c, m.humidity_pct,
              m.acoustic_activity_score, m.battery_pct
       FROM measures m
       JOIN hives h ON h.id = m.hive_id
       WHERE m.hive_id = $1 AND m.measured_at = $2`,
      [hiveId, timestamp],
    );
    return rows[0] ?? null;
  }

  return {
    // Idempotent : la clé (hive_id, measured_at) existe déjà = trame déjà reçue, rien n'est écrit.
    async add(m) {
      const { rowCount } = await pool.query(
        `INSERT INTO measures (hive_id, measured_at, weight_kg, temp_internal_c, temp_external_c,
           humidity_pct, acoustic_activity_score, battery_pct, lat, lon)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
         ON CONFLICT (hive_id, measured_at) DO NOTHING`,
        [
          m.hive_id, m.timestamp, m.weight_kg, m.temp_internal_c ?? null, m.temp_external_c ?? null,
          m.humidity_pct ?? null, m.acoustic_activity_score ?? null, m.battery_pct ?? null,
          m.position_lat ?? null, m.position_lon ?? null,
        ],
      );
      // rowCount vaut 1 si la ligne a été insérée, 0 si elle existait déjà.
      return { measure: await findOne(m.hive_id, m.timestamp), created: rowCount === 1 };
    },

    async findByHive(hiveId, { limit = 50, offset = 0 } = {}) {
      const { rows } = await pool.query(
        `SELECT m.hive_id, h.site_id, m.measured_at AS timestamp, m.weight_kg, m.temp_internal_c,
           m.temp_external_c, m.humidity_pct, m.acoustic_activity_score, m.battery_pct,
           m.lat AS position_lat, m.lon AS position_lon
         FROM measures m JOIN hives h ON h.id = m.hive_id
         WHERE m.hive_id = $1
         ORDER BY m.measured_at DESC
         LIMIT $2 OFFSET $3`,
        [hiveId, limit, offset],
      );
      return rows;
    },
  };
}
