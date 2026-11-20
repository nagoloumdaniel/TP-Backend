const COLONNES = "id, site_id, owner_id, ref_lat, ref_lon, status";

export function createHivesRepository(pool) {
  return {
    // Les filtres absents (null) sont ignorés : une seule requête pour tous les rôles.
    async findAll({ site_id = null, owner_id = null } = {}) {
      const { rows } = await pool.query(
        `SELECT ${COLONNES} FROM hives
         WHERE ($1::text IS NULL OR site_id = $1) AND ($2::uuid IS NULL OR owner_id = $2)
         ORDER BY id`,
        [site_id, owner_id],
      );
      return rows;
    },
    async findById(id) {
      const { rows } = await pool.query(`SELECT ${COLONNES} FROM hives WHERE id = $1`, [id]);
      return rows[0] ?? null;
    },
  };
}
